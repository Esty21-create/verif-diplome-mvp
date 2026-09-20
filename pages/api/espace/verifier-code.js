import { prisma } from '../../../lib/prisma';
import { enTeteCookieConnexion } from '../../../lib/etudiantSession';
import { verifierCodeConnexion } from '../../../lib/codeConnexion';

// Termine la connexion par code (voir /espace/code) : si le code saisi est
// bon, pose la même session que /api/espace/login. Réponse d'échec unique
// pour code faux, expiré, bloqué ou matricule inconnu.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const matricule = String(req.body?.matricule || '').trim();
  const code = String(req.body?.code || '').trim();
  if (!matricule || !code) {
    return res.status(400).json({ erreur: 'Matricule et code requis', code: 'CHAMPS_MANQUANTS' });
  }

  try {
    const valide = await verifierCodeConnexion(prisma, matricule, code);
    if (!valide) {
      return res.status(401).json({ erreur: 'Code invalide ou expiré', code: 'CODE_INVALIDE' });
    }

    res.setHeader('Set-Cookie', enTeteCookieConnexion(matricule));
    return res.status(200).json({ message: 'Connecté' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erreur: 'Une erreur est survenue', code: 'ERREUR_SERVEUR' });
  }
}
