import { prisma } from '../../../lib/prisma';
import { dechiffrer } from '../../../lib/chiffrement';

// Route PUBLIQUE et volontairement minimale : on ne renvoie JAMAIS de notes,
// de date de naissance ou d'autres informations sensibles. Seulement de quoi
// confirmer qu'un document donné est authentique.
export default async function handler(req, res) {
  const { code } = req.query;

  const document = await prisma.document.findUnique({
    where: { codeVerif: code },
    include: { etudiant: true },
  });

  if (!document) {
    return res.status(404).json({ valide: false, message: 'Aucun document trouvé pour ce code' });
  }

  if (document.revoque) {
    return res.status(200).json({
      valide: false,
      message: 'Ce document a été révoqué par l\'université émettrice',
    });
  }

  return res.status(200).json({
    valide: true,
    universite: document.universite,
    intitule: document.intitule,
    nomComplet: `${dechiffrer(document.etudiant.nom)} ${dechiffrer(document.etudiant.prenom)}`,
    filiere: document.etudiant.filiere,
    niveau: document.niveau,
    anneeAcademique: document.anneeAcademique,
    semestre: document.semestre,
    dateEmission: document.dateEmission,
  });
}
