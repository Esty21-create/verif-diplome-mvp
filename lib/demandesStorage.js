import fs from 'fs';
import path from 'path';

// Stockage volontairement HORS de /public : tant qu'une demande n'est pas
// validée par un agent, son fichier ne doit pas être accessible par simple
// URL. Seule l'API admin authentifiée peut le lire (voir
// pages/api/admin/demandes/[id]/fichier.js).
const DOSSIER_DEMANDES = path.join(process.cwd(), 'storage', 'demandes-en-attente');

const EXTENSIONS_PAR_MIME = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export function enregistrerFichierDemande(id, buffer, mimeType) {
  if (!fs.existsSync(DOSSIER_DEMANDES)) {
    fs.mkdirSync(DOSSIER_DEMANDES, { recursive: true });
  }
  const extension = EXTENSIONS_PAR_MIME[mimeType] || 'bin';
  const nomFichier = `${id}.${extension}`;
  const cheminComplet = path.join(DOSSIER_DEMANDES, nomFichier);
  fs.writeFileSync(cheminComplet, buffer);
  // Chemin stocké en base, relatif au dossier de stockage privé.
  return nomFichier;
}

export function lireFichierDemande(cheminFichier) {
  return fs.readFileSync(path.join(DOSSIER_DEMANDES, cheminFichier));
}

export function supprimerFichierDemande(cheminFichier) {
  fs.unlink(path.join(DOSSIER_DEMANDES, cheminFichier), () => {});
}
