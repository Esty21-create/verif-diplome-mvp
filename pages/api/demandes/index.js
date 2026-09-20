import crypto from 'crypto';
import fs from 'fs';
import { formidable } from 'formidable';
import { prisma } from '../../../lib/prisma';
import { FORMATS_ACCEPTES } from '../../../lib/tamponnerDocument';
import { enregistrerFichierDemande } from '../../../lib/demandesStorage';
import { matriculeSessionValide } from '../../../lib/etudiantSession';
import { dechiffrer } from '../../../lib/chiffrement';

// Route protégée par la session étudiante (/espace/login) : un ancien/actuel
// étudiant soumet soit son document déjà en sa possession (nature
// "PUBLICATION", avec fichier), soit une demande de duplicata pour un
// document perdu (nature "DUPLICATA", sans fichier). Matricule/nom/prénom
// viennent du dossier déjà en base, jamais du formulaire — on ne fait
// confiance qu'à la session pour identifier l'étudiant. Rien n'est tamponné
// ni publié ici — juste une entrée en attente qu'un agent de la scolarité
// examinera sur /admin/demandes.
export const config = {
  api: { bodyParser: false },
};

const TAILLE_MAX_FICHIER = 15 * 1024 * 1024;

function champUnique(valeur) {
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

async function parserFormulaire(req) {
  const form = formidable({ maxFileSize: TAILLE_MAX_FICHIER });
  const [fieldsBruts, filesBruts] = await form.parse(req);

  const fields = {};
  for (const [nom, valeur] of Object.entries(fieldsBruts)) {
    fields[nom] = champUnique(valeur);
  }

  const fichier = champUnique(filesBruts.fichier);
  return { fields, fichier };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const matricule = matriculeSessionValide(req);
  if (!matricule) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }

  let fields;
  let fichier;
  try {
    ({ fields, fichier } = await parserFormulaire(req));
  } catch (erreur) {
    console.error(erreur);
    return res.status(400).json({ erreur: 'Fichier trop volumineux ou requête invalide' });
  }

  try {
    const etudiant = await prisma.etudiant.findUnique({ where: { matricule } });
    if (!etudiant) {
      return res.status(401).json({ erreur: 'Non autorisé' });
    }

    // Filet de sécurité : le consentement est normalement déjà acquis à la
    // première connexion (/espace/login). S'il ne l'est pas encore, cette
    // soumission doit elle-même porter une acceptation explicite.
    if (!etudiant.dateAcceptationCGU) {
      if (fields.accepteCGU !== 'true') {
        return res.status(400).json({
          erreur: "Vous devez accepter les Conditions Générales d'Utilisation pour continuer",
        });
      }
      await prisma.etudiant.update({
        where: { matricule: etudiant.matricule },
        data: { dateAcceptationCGU: new Date() },
      });
    }

    const { typeDocument, commentaireEtudiant } = fields;
    const nature = fields.nature === 'DUPLICATA' ? 'DUPLICATA' : 'PUBLICATION';

    if (!typeDocument) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
    }

    // Une demande de duplicata n'a par définition pas de fichier : l'étudiant
    // n'a plus son document, c'est justement pour ça qu'il en redemande un.
    if (nature === 'PUBLICATION') {
      if (!fichier) {
        return res.status(400).json({
          erreur: 'Le fichier du document déjà en votre possession est obligatoire (PDF ou image scannée)',
        });
      }
      if (!FORMATS_ACCEPTES.includes(fichier.mimetype)) {
        return res.status(400).json({
          erreur: `Format de fichier non supporté (${fichier.mimetype}). Formats acceptés : PDF, PNG, JPEG.`,
        });
      }
    }

    const id = crypto.randomUUID();

    let cheminFichier = null;
    let nomFichierOriginal = null;
    let mimeType = null;

    if (nature === 'PUBLICATION') {
      const bufferFichier = fs.readFileSync(fichier.filepath);
      fs.unlink(fichier.filepath, () => {});
      cheminFichier = enregistrerFichierDemande(id, bufferFichier, fichier.mimetype);
      nomFichierOriginal = fichier.originalFilename || 'document';
      mimeType = fichier.mimetype;
    }

    await prisma.demandePublication.create({
      data: {
        id,
        nature,
        matricule: etudiant.matricule,
        nom: dechiffrer(etudiant.nom),
        prenom: dechiffrer(etudiant.prenom),
        typeDocument,
        cheminFichier,
        nomFichierOriginal,
        mimeType,
        commentaireEtudiant: commentaireEtudiant?.trim() || null,
      },
    });

    return res.status(201).json({
      message: 'Votre demande a été transmise à l\'ENSPY. Délai de vérification estimé : 3 à 5 jours ouvrés.',
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ erreur: "Erreur lors de l'enregistrement de la demande" });
  }
}
