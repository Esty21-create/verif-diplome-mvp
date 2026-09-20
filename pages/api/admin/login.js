import { enTeteCookieConnexion } from '../../../lib/adminSession';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const { motDePasse } = req.body;
  const motDePasseAttendu = process.env.ADMIN_PASSWORD;

  if (!motDePasseAttendu) {
    return res.status(500).json({ erreur: "ADMIN_PASSWORD n'est pas configuré côté serveur" });
  }

  if (!motDePasse || motDePasse !== motDePasseAttendu) {
    return res.status(401).json({ erreur: 'Mot de passe incorrect' });
  }

  res.setHeader('Set-Cookie', enTeteCookieConnexion());
  return res.status(200).json({ message: 'Connecté' });
}
