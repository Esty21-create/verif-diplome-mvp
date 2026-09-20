import { prisma } from '../../../../../lib/prisma';
import { genererCodeVerif, hasherFichier } from '../../../../../lib/verification';
import { tamponnerDocument, ErreurFormatNonSupporte } from '../../../../../lib/tamponnerDocument';
import { sessionValide } from '../../../../../lib/adminSession';
import { niveauxDisponibles } from '../../../../../lib/filieresEnspy';
import { lireFichierDemande, supprimerFichierDemande } from '../../../../../lib/demandesStorage';
import { chiffrerDonneesEtudiant } from '../../../../../lib/etudiantChiffrement';

// Valide une demande. Deux natures très différentes :
// - "PUBLICATION" : le fichier déjà téléversé (jamais re-demandé à l'agent)
//   est tamponné et publié ici même, exactement comme depuis /admin/emettre.
// - "DUPLICATA" : il n'y a pas encore de document à publier — l'étudiant a
//   perdu le sien. Valider signifie juste "on va lui réémettre le duplicata
//   physique en interne" ; aucun tamponnage n'a lieu ici. L'agent reviendra
//   publier normalement une fois le duplicata effectivement émis par l'école.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  if (!sessionValide(req)) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }

  const { id } = req.query;
  const demande = await prisma.demandePublication.findUnique({ where: { id } });

  if (!demande) {
    return res.status(404).json({ erreur: 'Demande introuvable' });
  }
  if (demande.statut !== 'EN_ATTENTE') {
    return res.status(400).json({ erreur: 'Cette demande a déjà été traitée' });
  }

  if (demande.nature === 'DUPLICATA') {
    await prisma.demandePublication.update({
      where: { id },
      data: { statut: 'VALIDEE', dateTraitement: new Date() },
    });
    return res.status(200).json({
      nature: 'DUPLICATA',
      message: "Demande de duplicata validée. Aucun tamponnage n'a été déclenché : traitez le "
        + "duplicata physique en interne, puis revenez publier le document normalement (via "
        + "/admin/emettre) une fois émis par l'école.",
    });
  }

  try {
    const {
      dateNaissance, anneeEntree, anneeSortie, cycle, filiere,
      niveau, anneeAcademique, semestre, intitule,
    } = req.body;

    if (!dateNaissance || !anneeEntree || !cycle || !filiere || !intitule) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants' });
    }

    const niveauxValides = niveauxDisponibles(cycle, filiere);
    if (niveau && !niveauxValides.includes(niveau)) {
      return res.status(400).json({
        erreur: `Niveau invalide pour ce cycle/cette filière. Niveaux possibles : ${niveauxValides.join(', ')}`,
      });
    }

    // demande.nom/demande.prenom sont la copie en clair propre à la demande
    // (hors périmètre du chiffrement, cf. README) ; on les chiffre ici avant
    // de les écrire sur le dossier Etudiant.
    const donneesChiffrees = chiffrerDonneesEtudiant({ nom: demande.nom, prenom: demande.prenom, dateNaissance });

    const etudiant = await prisma.etudiant.upsert({
      where: { matricule: demande.matricule },
      update: {
        nom: donneesChiffrees.nom, prenom: donneesChiffrees.prenom, filiere, cycle,
        anneeEntree: Number(anneeEntree),
        anneeSortie: anneeSortie ? Number(anneeSortie) : null,
      },
      create: {
        matricule: demande.matricule,
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

    const bufferFichier = lireFichierDemande(demande.cheminFichier);
    const hash = hasherFichier(bufferFichier);

    const { cheminRelatif } = await tamponnerDocument({
      buffer: bufferFichier,
      mimeType: demande.mimeType,
      codeVerif,
      urlVerification,
    });

    const document = await prisma.document.create({
      data: {
        codeVerif,
        hash,
        type: demande.typeDocument,
        intitule,
        dateEmission,
        niveau: niveau || '',
        anneeAcademique: anneeAcademique || '',
        semestre: semestre || 'Annuel',
        cheminFichier: cheminRelatif,
        etudiantId: etudiant.id,
      },
    });

    await prisma.demandePublication.update({
      where: { id },
      data: { statut: 'VALIDEE', dateTraitement: new Date(), documentId: document.id },
    });

    // Le contenu téléversé par l'étudiant est désormais superflu : sa version
    // tamponnée et publiée fait foi (même hash source, contenu inchangé).
    supprimerFichierDemande(demande.cheminFichier);

    return res.status(200).json({
      nature: 'PUBLICATION',
      message: 'Demande validée et document publié',
      codeVerif: document.codeVerif,
      urlVerification,
      urlTelechargement: `/${cheminRelatif}`,
    });
  } catch (erreur) {
    if (erreur instanceof ErreurFormatNonSupporte) {
      return res.status(400).json({ erreur: erreur.message });
    }
    console.error(erreur);
    return res.status(500).json({ erreur: 'Erreur lors de la validation de la demande' });
  }
}
