import { chiffrer, dechiffrer } from './chiffrement.js';

// Regroupe le chiffrement des trois champs sensibles du modèle Etudiant
// (nom, prenom, dateNaissance), pour éviter de répéter cette logique à
// chaque point d'écriture (formulaire admin, validation de demande, script
// de seed...). matricule et email restent en clair : ce sont des critères
// de recherche en base (Etudiant.matricule est indexé/unique).
export function chiffrerDonneesEtudiant({ nom, prenom, dateNaissance }) {
  return {
    nom: chiffrer(nom),
    prenom: chiffrer(prenom),
    dateNaissance: chiffrer(dateNaissance instanceof Date ? dateNaissance.toISOString() : dateNaissance),
  };
}

// Inverse de chiffrerDonneesEtudiant : nom/prenom en clair, dateNaissance en
// objet Date prêt à l'emploi (comparaisons, formatage...).
export function dechiffrerDonneesEtudiant({ nom, prenom, dateNaissance }) {
  return {
    nom: dechiffrer(nom),
    prenom: dechiffrer(prenom),
    dateNaissance: new Date(dechiffrer(dateNaissance)),
  };
}
