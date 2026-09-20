import { prisma } from '../../../../lib/prisma';
import { sessionValide } from '../../../../lib/adminSession';
import { dechiffrerDonneesEtudiant } from '../../../../lib/etudiantChiffrement';

// Recherche un étudiant déjà enregistré par matricule, pour pré-remplir le
// formulaire d'émission (/admin/emettre) quand ce n'est pas son premier
// document. Ne renvoie que ce qui sert à pré-remplir le formulaire.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  if (!sessionValide(req)) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }

  const { matricule } = req.query;
  const etudiant = await prisma.etudiant.findUnique({ where: { matricule } });

  if (!etudiant) {
    return res.status(404).json({ erreur: 'Aucun étudiant trouvé pour ce matricule' });
  }

  const { nom, prenom, dateNaissance } = dechiffrerDonneesEtudiant(etudiant);

  return res.status(200).json({
    etudiant: {
      nom,
      prenom,
      dateNaissance: dateNaissance.toISOString().slice(0, 10),
      cycle: etudiant.cycle,
      filiere: etudiant.filiere,
      anneeEntree: etudiant.anneeEntree,
      anneeSortie: etudiant.anneeSortie,
    },
  });
}
