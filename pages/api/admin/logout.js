import { enTeteCookieDeconnexion } from '../../../lib/adminSession';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  res.setHeader('Set-Cookie', enTeteCookieDeconnexion());
  return res.status(200).json({ message: 'Déconnecté' });
}
