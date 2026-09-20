import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Écrit dans /public/documents-emis : Next.js sert automatiquement tout
// fichier placé dans /public à la racine du site (ex: /documents-emis/xxx.pdf).
const DOSSIER_DOCUMENTS = path.join(process.cwd(), 'public', 'documents-emis');

const FORMATS_ACCEPTES = ['application/pdf', 'image/png', 'image/jpeg'];

// Dimensions du tampon, volontairement petites pour ne recouvrir ni texte,
// ni cachet, ni signature du document original — juste un repère discret
// dans le coin bas droit de la page.
const MARGE_PAGE = 20;
const TAILLE_QR = 46;
const LARGEUR_BLOC = 118;
const TAILLE_TEXTE = 5.2;
const TAILLE_CODE = 6.5;
const INTERLIGNE = 6.5;

// Résolution supposée d'un scan papier, pour convertir les pixels de l'image
// téléversée en une taille de page PDF physiquement plausible (une image
// scannée n'a pas de dimensions "en points" comme un vrai PDF).
const DPI_SUPPOSE_SCAN = 150;

export class ErreurFormatNonSupporte extends Error {}

// Bandeau de logos du tampon : même logique que components/Logo*.js — on
// utilise public/logo-xxx.png s'il existe, sinon un badge placeholder avec
// le sigle (pour ne pas utiliser un logo officiel sans accord préalable).
const TAILLE_LOGO = 20;
const ECART_LOGOS = 8;
const LOGOS = [
  { sigle: 'ENSPY', fichier: 'logo-enspy.png' },
  { sigle: 'MINESUP', fichier: 'logo-minesup.png' },
  { sigle: 'ANTIC', fichier: 'logo-antic.png' },
];

async function chargerLogo(pdfDoc, fichier) {
  const chemin = path.join(process.cwd(), 'public', fichier);
  if (!fs.existsSync(chemin)) return null;
  try {
    return await pdfDoc.embedPng(fs.readFileSync(chemin));
  } catch {
    return null; // fichier illisible ou pas un vrai PNG : on retombe sur le badge
  }
}

async function dessinerLogos(pdfDoc, page, { xCentre, y, police }) {
  const largeurTotale = LOGOS.length * TAILLE_LOGO + (LOGOS.length - 1) * ECART_LOGOS;
  let x = xCentre - largeurTotale / 2;

  for (const { sigle, fichier } of LOGOS) {
    const image = await chargerLogo(pdfDoc, fichier);
    if (image) {
      const echelle = Math.min(TAILLE_LOGO / image.width, TAILLE_LOGO / image.height);
      const w = image.width * echelle;
      const h = image.height * echelle;
      page.drawImage(image, { x: x + (TAILLE_LOGO - w) / 2, y: y + (TAILLE_LOGO - h) / 2, width: w, height: h });
    } else {
      const vert = rgb(0.118, 0.518, 0.286);
      page.drawCircle({
        x: x + TAILLE_LOGO / 2,
        y: y + TAILLE_LOGO / 2,
        size: TAILLE_LOGO / 2,
        color: rgb(0.918, 0.98, 0.945),
        borderColor: vert,
        borderWidth: 0.7,
      });
      // Taille du sigle ajustée pour tenir dans le cercle (MINESUP est long).
      const taille = Math.min(5, ((TAILLE_LOGO - 4) / police.widthOfTextAtSize(sigle, 1)));
      centrerTexte(page, sigle, {
        x: x + TAILLE_LOGO / 2,
        y: y + TAILLE_LOGO / 2 - taille * 0.35,
        taille,
        police,
        couleur: vert,
      });
    }
    x += TAILLE_LOGO + ECART_LOGOS;
  }
}

function centrerTexte(page, texte, { x, y, taille, police, couleur = rgb(0.15, 0.15, 0.15) }) {
  const largeur = police.widthOfTextAtSize(texte, taille);
  page.drawText(texte, { x: x - largeur / 2, y, size: taille, font: police, color: couleur });
}

// Découpe un texte sans espaces (une URL) en plusieurs lignes qui tiennent
// chacune dans `largeurMax`, en coupant caractère par caractère si besoin.
function envelopperTexte(texte, police, taille, largeurMax) {
  const lignes = [];
  let ligneActuelle = '';
  for (const caractere of texte) {
    const essai = ligneActuelle + caractere;
    if (ligneActuelle && police.widthOfTextAtSize(essai, taille) > largeurMax) {
      lignes.push(ligneActuelle);
      ligneActuelle = caractere;
    } else {
      ligneActuelle = essai;
    }
  }
  if (ligneActuelle) lignes.push(ligneActuelle);
  return lignes;
}

// Ajoute le tampon numérique (QR code + code lisible + mention de
// vérification) dans le coin bas droit d'une page, sans toucher au reste
// du contenu déjà présent sur cette page.
async function tamponnerPage(pdfDoc, page, { codeVerif, urlVerification }) {
  const policeNormale = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const policeGrasse = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();

  const qrDataUrl = await QRCode.toDataURL(urlVerification, { margin: 0, width: 220 });
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));

  const lignesUrl = envelopperTexte(
    urlVerification.replace(/^https?:\/\//, ''),
    policeNormale,
    TAILLE_TEXTE,
    LARGEUR_BLOC - 6
  );

  const xDroite = width - MARGE_PAGE;
  const xGauche = xDroite - LARGEUR_BLOC;
  const xCentre = xGauche + LARGEUR_BLOC / 2;

  // On empile le contenu de bas en haut (origine PDF = bas-gauche de la page).
  let y = MARGE_PAGE;
  const yLignesUrl = new Array(lignesUrl.length);
  for (let i = lignesUrl.length - 1; i >= 0; i--) {
    yLignesUrl[i] = y;
    y += INTERLIGNE;
  }
  const yMention = y;
  y += INTERLIGNE;
  const yCode = y;
  y += TAILLE_CODE + 5;
  const yQr = y;
  y += TAILLE_QR + 5;
  const yLogos = y;
  y += TAILLE_LOGO;

  const hauteurBloc = y - MARGE_PAGE + 6;

  page.drawRectangle({
    x: xGauche - 6,
    y: MARGE_PAGE - 5,
    width: LARGEUR_BLOC + 12,
    height: hauteurBloc,
    color: rgb(1, 1, 1),
    opacity: 0.85,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
  });

  await dessinerLogos(pdfDoc, page, { xCentre, y: yLogos, police: policeGrasse });
  page.drawImage(qrImage, { x: xCentre - TAILLE_QR / 2, y: yQr, width: TAILLE_QR, height: TAILLE_QR });
  centrerTexte(page, codeVerif, { x: xCentre, y: yCode, taille: TAILLE_CODE, police: policeGrasse });
  centrerTexte(page, 'Vérifiable en ligne sur :', { x: xCentre, y: yMention, taille: TAILLE_TEXTE, police: policeNormale });
  lignesUrl.forEach((ligne, i) => {
    centrerTexte(page, ligne, { x: xCentre, y: yLignesUrl[i], taille: TAILLE_TEXTE, police: policeNormale });
  });
}

async function chargerPdfDepuisFichier(pdfDoc, buffer, mimeType) {
  if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
    const image = mimeType === 'image/png' ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);
    const largeurPt = (image.width / DPI_SUPPOSE_SCAN) * 72;
    const hauteurPt = (image.height / DPI_SUPPOSE_SCAN) * 72;
    const page = pdfDoc.addPage([largeurPt, hauteurPt]);
    page.drawImage(image, { x: 0, y: 0, width: largeurPt, height: hauteurPt });
    return pdfDoc;
  }
  throw new ErreurFormatNonSupporte(`Format non supporté : ${mimeType}`);
}

// Prend le document déjà produit par l'école dans sa forme officielle
// (PDF ou image scannée) et lui superpose un tampon numérique de
// vérification, SANS recréer ni modifier le reste de son contenu.
export async function tamponnerDocument({ buffer, mimeType, codeVerif, urlVerification }) {
  if (!FORMATS_ACCEPTES.includes(mimeType)) {
    throw new ErreurFormatNonSupporte(
      `Format de fichier non supporté (${mimeType}). Formats acceptés : PDF, PNG, JPEG.`
    );
  }

  if (!fs.existsSync(DOSSIER_DOCUMENTS)) {
    fs.mkdirSync(DOSSIER_DOCUMENTS, { recursive: true });
  }

  const pdfDoc = mimeType === 'application/pdf'
    ? await PDFDocument.load(buffer, { ignoreEncryption: true })
    : await chargerPdfDepuisFichier(await PDFDocument.create(), buffer, mimeType);

  const pages = pdfDoc.getPages();
  const dernierePage = pages[pages.length - 1];
  await tamponnerPage(pdfDoc, dernierePage, { codeVerif, urlVerification });

  const pdfBytes = await pdfDoc.save();
  const nomFichier = `${codeVerif}.pdf`;
  const cheminComplet = path.join(DOSSIER_DOCUMENTS, nomFichier);
  fs.writeFileSync(cheminComplet, pdfBytes);

  return { cheminRelatif: `documents-emis/${nomFichier}`, cheminComplet };
}

export { FORMATS_ACCEPTES };
