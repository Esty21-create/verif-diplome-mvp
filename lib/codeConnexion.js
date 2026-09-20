import crypto from 'crypto';

// Code de connexion à usage unique : 6 chiffres, valable 10 minutes, 5 essais
// maximum. Stocké sous forme d'empreinte HMAC (clé = ETUDIANT_SESSION_SECRET,
// liée au matricule) : une fuite de la base ne révèle pas les codes en cours.
const DUREE_VALIDITE_MS = 10 * 60 * 1000;
const TENTATIVES_MAX = 5;

function obtenirSecret() {
  const secret = process.env.ETUDIANT_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ETUDIANT_SESSION_SECRET manquant dans les variables d'environnement (voir .env.example)"
    );
  }
  return secret;
}

function hasher(matricule, code) {
  return crypto.createHmac('sha256', obtenirSecret()).update(`${matricule}:${code}`).digest('hex');
}

function genererCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// MODE DÉMO : aucun service d'envoi d'email n'est encore branché. Tant que
// MODE_DEMO_CODE_CONNEXION n'est pas explicitement "false", le code est
// renvoyé au navigateur pour être affiché à l'écran. À METTRE À "false" en
// usage réel : afficher le code à l'écran annule tout l'intérêt de l'email
// (n'importe qui pourrait alors se connecter avec un simple matricule).
export function modeDemoActif() {
  return process.env.MODE_DEMO_CODE_CONNEXION !== 'false';
}

// Crée (ou remplace) le code actif d'un matricule. `client` est le client
// Prisma ou un client de transaction. Renvoie le code EN CLAIR : à n'utiliser
// que pour l'envoi par email ou l'affichage démo, jamais pour le stocker.
export async function creerCodeConnexion(client, matricule) {
  const code = genererCode();
  const donnees = {
    codeHash: hasher(matricule, code),
    expireLe: new Date(Date.now() + DUREE_VALIDITE_MS),
    tentatives: 0,
    creeLe: new Date(),
  };
  await client.codeConnexion.upsert({
    where: { matricule },
    update: donnees,
    create: { matricule, ...donnees },
  });
  return code;
}

// Vérifie un code saisi. Renvoie true et consomme le code s'il est bon ;
// false dans tous les autres cas (inconnu, expiré, bloqué, faux) sans
// distinguer lesquels, pour ne rien apprendre à quelqu'un qui devine.
export async function verifierCodeConnexion(client, matricule, code) {
  const ligne = await client.codeConnexion.findUnique({ where: { matricule } });
  if (!ligne) return false;

  if (ligne.expireLe.getTime() < Date.now()) {
    await client.codeConnexion.delete({ where: { matricule } }).catch(() => {});
    return false;
  }

  // Le compteur est incrémenté AVANT la comparaison et de façon atomique :
  // des essais simultanés ne peuvent pas dépasser la limite.
  const misAJour = await client.codeConnexion.update({
    where: { matricule },
    data: { tentatives: { increment: 1 } },
  });
  if (misAJour.tentatives > TENTATIVES_MAX) return false;

  const attendu = Buffer.from(ligne.codeHash);
  const fourni = Buffer.from(hasher(matricule, String(code).trim()));
  if (attendu.length !== fourni.length || !crypto.timingSafeEqual(attendu, fourni)) {
    return false;
  }

  await client.codeConnexion.delete({ where: { matricule } }).catch(() => {});
  return true;
}

export { TENTATIVES_MAX, DUREE_VALIDITE_MS };
