// Clé de sessionStorage par laquelle /espace/inscription passe le matricule
// (et, en mode démo, le code) à /espace/code. sessionStorage plutôt que l'URL :
// le code ne doit pas finir dans l'historique ni les journaux de serveur.
export const CLE_INSCRIPTION_EN_COURS = 'verif-diplome:inscription-en-cours';
