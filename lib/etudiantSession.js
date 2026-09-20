import crypto from 'crypto';

// Session étudiant pour /espace et /demande-publication : un cookie signé
// (HMAC-SHA256) porte le matricule authentifié (matricule + date de
// naissance vérifiés une fois à la connexion). Pas de base de données de
// sessions : on revérifie la signature et l'âge du cookie à chaque requête.
// Secret dédié (ETUDIANT_SESSION_SECRET), distinct de celui de l'admin :
// compromettre l'un ne doit pas compromettre l'autre.
const NOM_COOKIE = 'etudiant_session';
const DUREE_MAX_SECONDES = 24 * 60 * 60; // 24h

function obtenirSecret() {
  const secret = process.env.ETUDIANT_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ETUDIANT_SESSION_SECRET manquant dans les variables d'environnement (voir .env.example)"
    );
  }
  return secret;
}

function signer(valeur) {
  return crypto.createHmac('sha256', obtenirSecret()).update(valeur).digest('hex');
}

// La charge (matricule + date d'émission) est encodée en base64url pour
// pouvoir être signée et transportée sans ambiguïté de séparateur.
export function creerValeurCookie(matricule) {
  const charge = Buffer.from(JSON.stringify({ m: matricule, t: Date.now() })).toString('base64url');
  return `${charge}.${signer(charge)}`;
}

export function enTeteCookieConnexion(matricule) {
  const valeur = creerValeurCookie(matricule);
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

// Vérifie le cookie de session présent dans la requête et renvoie le
// matricule authentifié, ou null si absent/invalide/expiré.
export function matriculeSessionValide(req) {
  const valeur = req.cookies?.[NOM_COOKIE];
  if (!valeur) return null;

  const [charge, signature] = valeur.split('.');
  if (!charge || !signature) return null;

  const signatureAttendue = signer(charge);
  const a = Buffer.from(signature);
  const b = Buffer.from(signatureAttendue);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let donnees;
  try {
    donnees = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const { m: matricule, t: timestamp } = donnees;
  if (!matricule || !timestamp) return null;

  const age = (Date.now() - timestamp) / 1000;
  if (!(age >= 0 && age <= DUREE_MAX_SECONDES)) return null;

  return matricule;
}

export { NOM_COOKIE };
