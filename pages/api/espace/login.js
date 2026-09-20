import { prisma } from '../../../lib/prisma';
import { enTeteCookieConnexion } from '../../../lib/etudiantSession';
import { dechiffrer } from '../../../lib/chiffrement';

// NOTE MVP : authentification simplifiée à l'extrême (matricule + date de
// naissance). Suffisant pour tester le concept, mais À REMPLACER avant toute
// mise en usage réel par un vrai système (email + code à usage unique, etc.),
// car la date de naissance seule n'est pas un secret fiable.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const { matricule, dateNaissance, accepteCGU } = req.body;
  if (!matricule || !dateNaissance) {
    return res.status(400).json({ erreur: 'Matricule et date de naissance requis' });
  }

  const etudiant = await prisma.etudiant.findUnique({ where: { matricule } });

  const dateFournie = new Date(dateNaissance).toDateString();
  const dateAttendue = etudiant ? new Date(dechiffrer(etudiant.dateNaissance)).toDateString() : null;

  if (!etudiant || dateFournie !== dateAttendue) {
    return res.status(401).json({ erreur: 'Matricule ou date de naissance incorrects' });
  }

  // Consentement explicite et traçable (loi n°2024/017) : à la toute première
  // connexion, on exige l'acceptation des CGU avant de poser la session. Les
  // connexions suivantes n'ont plus à re-demander un consentement déjà acquis.
  if (!etudiant.dateAcceptationCGU) {
    if (!accepteCGU) {
      return res.status(200).json({ cguRequise: true });
    }
    await prisma.etudiant.update({
      where: { matricule: etudiant.matricule },
      data: { dateAcceptationCGU: new Date() },
    });
  }

  res.setHeader('Set-Cookie', enTeteCookieConnexion(etudiant.matricule));
  return res.status(200).json({ message: 'Connecté' });
}
