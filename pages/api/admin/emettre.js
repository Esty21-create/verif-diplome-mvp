import fs from 'fs';
import { formidable } from 'formidable';
import { prisma } from '../../../lib/prisma';
import { genererCodeVerif, hasherFichier } from '../../../lib/verification';
import { tamponnerDocument, ErreurFormatNonSupporte, FORMATS_ACCEPTES } from '../../../lib/tamponnerDocument';
import { sessionValide } from '../../../lib/adminSession';
import { niveauxDisponibles } from '../../../lib/filieresEnspy';
import { chiffrerDonneesEtudiant } from '../../../lib/etudiantChiffrement';

// Le formulaire envoie maintenant un fichier (multipart/form-data) : on
// désactive le bodyParser JSON par défaut de Next.js pour laisser formidable
// lire le flux brut de la requête.
export const config = {
  api: { bodyParser: false },
};

const TAILLE_MAX_FICHIER = 15 * 1024 * 1024; // 15 Mo, largement suffisant pour un scan

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

  if (!sessionValide(req)) {
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
    const {
      matricule, nom, prenom, dateNaissance, anneeEntree, anneeSortie, cycle, filiere,
      typeDocument, intitule, niveau, anneeAcademique, semestre,
    } = fields;

    if (!matricule || !nom || !prenom || !dateNaissance || !anneeEntree || !cycle || !typeDocument || !intitule) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
    }

    if (!fichier) {
      return res.status(400).json({
        erreur: "Le fichier du document officiel (PDF ou image scannée) est obligatoire",
      });
    }

    if (!FORMATS_ACCEPTES.includes(fichier.mimetype)) {
      return res.status(400).json({
        erreur: `Format de fichier non supporté (${fichier.mimetype}). Formats acceptés : PDF, PNG, JPEG.`,
      });
    }

    const niveauxValides = niveauxDisponibles(cycle, filiere);
    if (niveau && !niveauxValides.includes(niveau)) {
      return res.status(400).json({
        erreur: `Niveau invalide pour ce cycle/cette filière. Niveaux possibles : ${niveauxValides.join(', ')}`,
      });
    }

    // Chiffrées au repos : nom, prénom, date de naissance (données personnelles
    // sensibles, loi n°2024/017). matricule reste en clair (critère de recherche).
    const donneesChiffrees = chiffrerDonneesEtudiant({ nom, prenom, dateNaissance });

    // On retrouve l'étudiant s'il existe déjà (documents précédents), sinon on le crée
    const etudiant = await prisma.etudiant.upsert({
      where: { matricule },
      update: {
        nom: donneesChiffrees.nom, prenom: donneesChiffrees.prenom, filiere, cycle,
        anneeEntree: Number(anneeEntree),
        anneeSortie: anneeSortie ? Number(anneeSortie) : null,
      },
      create: {
        matricule,
        ...donneesChiffrees,
        anneeEntree: Number(anneeEntree),
        anneeSortie: anneeSortie ? Number(anneeSortie) : null,
        filiere,
        cycle,
      },
    });

    const codeVerif = genererCodeVerif();
    const dateEmission = new Date();
    const urlVerification = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verifier/${codeVerif}`;

    // Le hash d'intégrité porte sur le contenu réel du fichier téléversé —
    // c'est ce fichier-là (le document officiel) qui fait foi, pas les
    // informations d'indexation saisies à côté.
    const bufferFichier = fs.readFileSync(fichier.filepath);
    fs.unlink(fichier.filepath, () => {});
    const hash = hasherFichier(bufferFichier);

    const { cheminRelatif } = await tamponnerDocument({
      buffer: bufferFichier,
      mimeType: fichier.mimetype,
      codeVerif,
      urlVerification,
    });

    const document = await prisma.document.create({
      data: {
        codeVerif,
        hash,
        type: typeDocument,
        intitule,
        dateEmission,
        niveau: niveau || '',
        anneeAcademique: anneeAcademique || '',
        semestre: semestre || 'Annuel',
        cheminFichier: cheminRelatif,
        etudiantId: etudiant.id,
      },
    });

    return res.status(201).json({
      message: 'Document publié avec succès',
      codeVerif: document.codeVerif,
      urlVerification,
      urlTelechargement: `/${cheminRelatif}`,
    });
  } catch (erreur) {
    if (erreur instanceof ErreurFormatNonSupporte) {
      return res.status(400).json({ erreur: erreur.message });
    }
    console.error(erreur);
    return res.status(500).json({ erreur: 'Erreur lors de la publication du document' });
  }
}
