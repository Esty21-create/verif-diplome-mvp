import crypto from 'crypto';

// Session admin très simple : un mot de passe partagé (ADMIN_PASSWORD) donne
// droit à un cookie signé (HMAC-SHA256) contenant juste une date d'émission.
// Pas de base de données de sessions : on revérifie la signature et l'âge du
// cookie à chaque requête.
const NOM_COOKIE = 'admin_session';
const DUREE_MAX_SECONDES = 8 * 60 * 60; // 8h

function obtenirSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET manquant dans les variables d'environnement (voir .env.example)"
    );
  }
  return secret;
}

function signer(valeur) {
  return crypto.createHmac('sha256', obtenirSecret()).update(valeur).digest('hex');
}

// Construit la valeur du cookie : "<timestamp>.<signature>"
export function creerValeurCookie() {
  const timestamp = Date.now().toString();
  const signature = signer(timestamp);
  return `${timestamp}.${signature}`;
}

export function enTeteCookieConnexion() {
  const valeur = creerValeurCookie();
  const attributs = [
    `${NOM_COOKIE}=${valeur}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${DUREE_MAX_SECONDES}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    attributs.push('Secure');
  }
  return attributs.join('; ');
}

export function enTeteCookieDeconnexion() {
  return `${NOM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Vérifie le cookie de session présent dans la requête (API route ou SSR).
export function sessionValide(req) {
  const valeur = req.cookies?.[NOM_COOKIE];
  if (!valeur) return false;

  const [timestamp, signature] = valeur.split('.');
  if (!timestamp || !signature) return false;

  const signatureAttendue = signer(timestamp);
  const a = Buffer.from(signature);
  const b = Buffer.from(signatureAttendue);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const age = (Date.now() - Number(timestamp)) / 1000;
  return age >= 0 && age <= DUREE_MAX_SECONDES;
}

export { NOM_COOKIE };
