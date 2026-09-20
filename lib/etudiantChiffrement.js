import { chiffrer, dechiffrer } from './chiffrement.js';

// Regroupe le chiffrement des trois champs sensibles du modèle Etudiant
// (nom, prenom, dateNaissance), pour éviter de répéter cette logique à
// chaque point d'écriture (formulaire admin, validation de demande, script
// de seed...). matricule reste en clair : c'est le critère de recherche en
// base (Etudiant.matricule est indexé/unique). L'email (Etudiant.email,
// renseigné à l'auto-inscription) est lui aussi chiffré, mais directement
// avec chiffrer()/dechiffrer() car il n'existe pas pour les étudiants créés
// par un agent.
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
