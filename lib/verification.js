import crypto from 'crypto';

const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I pour éviter les confusions

function blocAleatoire() {
  return Array.from({ length: 4 }, () => ALPHABET_CODE[crypto.randomInt(0, ALPHABET_CODE.length)]).join('');
}

// Génère un code court et lisible (ex: "ENSPY-7X9K-2QRT") que l'utilisateur
// peut recopier à la main si le QR code ne scanne pas (imprimante de mauvaise
// qualité, photocopie, etc.)
export function genererCodeVerif() {
  return `ENSPY-${blocAleatoire()}-${blocAleatoire()}`;
}

// Calcule une empreinte SHA-256 à partir des octets bruts du fichier
// téléversé (le document déjà produit par l'école, tamponné ou non).
// Si quelqu'un altère ne serait-ce qu'un octet du fichier, le hash recalculé
// ne correspondra plus -> preuve de falsification.
export function hasherFichier(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
