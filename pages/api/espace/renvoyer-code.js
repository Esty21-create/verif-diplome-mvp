import { prisma } from '../../../lib/prisma';
import { dechiffrer } from '../../../lib/chiffrement';
import { creerCodeConnexion, modeDemoActif } from '../../../lib/codeConnexion';
import { envoyerCodeConnexion } from '../../../lib/envoiEmail';

// Renvoie un nouveau code par email (le précédent expire au bout de 10 min ou
// peut s'être perdu). Réponse TOUJOURS identique, que le matricule existe ou
// non, qu'il ait un email ou non, que l'envoi réussisse ou non : cette route
// ne doit pas servir à deviner quels matricules existent.
// - En mode démo elle ne fait rien : renvoyer le code à l'écran pour un
//   matricule quelconque permettrait de se connecter à la place de n'importe qui.
// - Un délai minimal entre deux envois évite d'inonder la boîte d'un tiers.
const DELAI_MIN_ENTRE_ENVOIS_MS = 60 * 1000;

const REPONSE_GENERIQUE = {
  message: "Si un accès avec email existe pour ce matricule, un nouveau code vient d'être envoyé.",
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const matricule = String(req.body?.matricule || '').trim();
  if (!matricule) {
    return res.status(400).json({ erreur: 'Matricule requis', code: 'CHAMPS_MANQUANTS' });
  }

  try {
    if (modeDemoActif()) return res.status(200).json(REPONSE_GENERIQUE);

    const etudiant = await prisma.etudiant.findUnique({ where: { matricule } });
    if (!etudiant?.email) return res.status(200).json(REPONSE_GENERIQUE);

    const existant = await prisma.codeConnexion.findUnique({ where: { matricule } });
    if (existant && Date.now() - existant.creeLe.getTime() < DELAI_MIN_ENTRE_ENVOIS_MS) {
      return res.status(200).json(REPONSE_GENERIQUE);
    }

    const code = await creerCodeConnexion(prisma, matricule);
    await envoyerCodeConnexion(dechiffrer(etudiant.email), code);
  } catch (e) {
    console.error("Échec du renvoi du code de connexion :", e?.message || e);
  }
  return res.status(200).json(REPONSE_GENERIQUE);
}
