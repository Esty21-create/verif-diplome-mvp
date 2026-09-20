import crypto from 'crypto';

// Chiffrement au repos des données personnelles sensibles (nom, prénom,
// date de naissance de l'étudiant). AES-256-GCM : authentifié, donc toute
// altération du texte chiffré (ou tentative de déchiffrement avec la
// mauvaise clé) est détectée à l'échec plutôt que de renvoyer un résultat
// corrompu silencieusement.
const ALGORITHME = 'aes-256-gcm';
const LONGUEUR_IV = 12; // taille recommandée pour GCM (96 bits)

function obtenirCle() {
  const cle = process.env.ENCRYPTION_KEY;
  if (!cle) {
    throw new Error(
      "ENCRYPTION_KEY manquant dans les variables d'environnement (voir .env.example)"
    );
  }
  const buffer = Buffer.from(cle, 'hex');
  if (buffer.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY doit représenter exactement 32 octets en hexadécimal (64 caractères)'
    );
  }
  return buffer;
}

// Chiffre une chaîne en clair. Le résultat encode "iv:authTag:contenu" (les
// trois en base64) : l'IV et le tag d'authentification GCM sont nécessaires
// au déchiffrement, ils ne sont pas secrets en eux-mêmes et peuvent être
// stockés à côté du texte chiffré.
export function chiffrer(texte) {
  const iv = crypto.randomBytes(LONGUEUR_IV);
  const chiffreur = crypto.createCipheriv(ALGORITHME, obtenirCle(), iv);
  const contenu = Buffer.concat([chiffreur.update(String(texte), 'utf8'), chiffreur.final()]);
  const authTag = chiffreur.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), contenu.toString('base64')].join(':');
}

// Déchiffre une chaîne produite par chiffrer(). Lève une erreur si le format
// est invalide, si la clé est incorrecte, ou si le contenu a été altéré
// (l'authentification GCM échoue alors explicitement plutôt que de renvoyer
// un texte corrompu).
export function dechiffrer(texteChiffre) {
  const parties = String(texteChiffre).split(':');
  if (parties.length !== 3) {
    throw new Error('Format de donnée chiffrée invalide');
  }
  const [ivBase64, authTagBase64, contenuBase64] = parties;

  const dechiffreur = crypto.createDecipheriv(ALGORITHME, obtenirCle(), Buffer.from(ivBase64, 'base64'));
  dechiffreur.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const texte = Buffer.concat([
    dechiffreur.update(Buffer.from(contenuBase64, 'base64')),
    dechiffreur.final(),
  ]);
  return texte.toString('utf8');
}
