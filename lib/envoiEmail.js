import nodemailer from 'nodemailer';

// Envoi d'email par SMTP (nodemailer) : fonctionne avec n'importe quel
// fournisseur (Gmail avec mot de passe d'application, Brevo, Mailgun, OVH,
// serveur d'établissement...). Configuration par variables d'environnement,
// voir .env.example : SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
// SMTP_FROM. Le code de connexion ne doit JAMAIS être écrit dans les journaux.

// Envoi réel possible dès qu'un serveur et un expéditeur sont configurés
// (user/pass facultatifs : certains relais internes n'en demandent pas).
export function smtpConfigure() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transport = null;

function obtenirTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 = TLS implicite ; sinon STARTTLS négocié automatiquement.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
      // Un serveur SMTP muet ne doit pas bloquer indéfiniment l'inscription.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

// "jean.dupont@example.com" -> "j***@example.com" : confirme à l'étudiant où le
// code est parti sans afficher l'adresse en entier.
export function masquerEmail(email) {
  const [local, domaine] = String(email).split('@');
  if (!domaine) return '***';
  return `${local.slice(0, 1)}***@${domaine}`;
}

// Message bilingue (FR puis EN) : le destinataire n'a pas encore choisi de
// langue côté serveur, autant qu'il comprenne dans les deux.
function composerMessage(code) {
  const sujet = 'Votre code de connexion / Your login code — Plateforme de vérification ENSPY';
  const texte = [
    `Votre code de connexion : ${code}`,
    'Il est valable 10 minutes et ne peut être utilisé qu\'une seule fois.',
    'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.',
    '',
    `Your login code: ${code}`,
    'It is valid for 10 minutes and can only be used once.',
    'If you did not request this, please ignore this message.',
  ].join('\n');
  const html = `<div style="font-family:sans-serif;max-width:480px">
<p>Votre code de connexion :</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace">${code}</p>
<p style="color:#666;font-size:13px">Il est valable 10 minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
<hr style="border:none;border-top:1px solid #eee">
<p>Your login code:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace">${code}</p>
<p style="color:#666;font-size:13px">It is valid for 10 minutes and can only be used once. If you did not request this, please ignore this message.</p>
</div>`;
  return { sujet, texte, html };
}

// Envoie le code à l'adresse donnée. Lève une erreur si l'envoi échoue : à
// l'appelant de décider quoi faire (annuler l'inscription, etc.).
export async function envoyerCodeConnexion(email, code) {
  const { sujet, texte, html } = composerMessage(code);
  await obtenirTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: sujet,
    text: texte,
    html,
  });
}
