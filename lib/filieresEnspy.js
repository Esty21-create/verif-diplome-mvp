// Filières réellement enseignées à l'ENSPY (source : ancienne étudiante
// ENSPY, plus fiable que le site officiel de l'école). À ajuster si
// l'administration signale un changement (ouverture/fermeture de filière,
// renommage).
export const FILIERES_ENSPY = [
  'Génie Électrique (GELE)',
  'Génie Télécommunications (GET)',
  'Génie Informatique (GI)',
  'Génie Industriel (GIND)',
  'Génie Mécanique (GM)',
  'Génie Civil et Urbanisme (GCU)',
  'Mathématiques et Sciences Physiques (MSP)', // cycle préparatoire commun (1ère-2ème année)
  'Modélisation et Applications Industrielles (MAI)',
  'Météorologie (MET)',
];

// Niveaux du cycle ingénieur ENSPY : 2 ans de tronc commun (MSP) + 3 ans de
// spécialité. Un étudiant qui redouble peut avoir deux documents pour le
// même niveau mais des années académiques différentes.
export const NIVEAUX_ENSPY = [
  '1ère année (cycle préparatoire)',
  '2ème année (cycle préparatoire)',
  '3ème année (cycle ingénieur)',
  '4ème année (cycle ingénieur)',
  '5ème année (cycle ingénieur)',
];

// Les deux cycles réels de l'ENSPY.
export const CYCLES_ENSPY = [
  'Ingénieur (5 ans)',
  "Licence en Sciences de l'Ingénieur (3 ans)",
];

// Nombre de niveaux selon le cycle : le cycle Licence s'arrête après la
// 3ème année, il n'a pas de 4ème/5ème année.
const NIVEAUX_PAR_CYCLE = {
  'Ingénieur (5 ans)': NIVEAUX_ENSPY,
  "Licence en Sciences de l'Ingénieur (3 ans)": NIVEAUX_ENSPY.slice(0, 3),
};

// MSP est le tronc commun (1ère et 2ème année) partagé par les deux cycles :
// ce n'est pas une filière de spécialité, donc aucun document ne peut y être
// rattaché au-delà de la 2ème année, quel que soit le cycle choisi.
export const FILIERE_TRONC_COMMUN = 'Mathématiques et Sciences Physiques (MSP)';

// Calcule les niveaux valides pour un couple (cycle, filière) donné, à
// utiliser à la fois côté formulaire (menu déroulant) et côté API (validation).
export function niveauxDisponibles(cycle, filiere) {
  if (filiere === FILIERE_TRONC_COMMUN) {
    return NIVEAUX_ENSPY.slice(0, 2);
  }
  return NIVEAUX_PAR_CYCLE[cycle] || NIVEAUX_ENSPY;
}

// Portée d'un relevé/document : semestriel ou annuel, selon ce que demande l'étudiant.
export const SEMESTRES_ENSPY = ['Semestre 1', 'Semestre 2', 'Annuel'];

// Construit la liste des années académiques possibles pour les menus déroulants
// (ex: "2014-2015", "2015-2016", ... jusqu'à l'année en cours).
export function genererAnneesAcademiques(anneeDebut = 2005) {
  const anneeActuelle = new Date().getFullYear();
  const annees = [];
  for (let a = anneeActuelle; a >= anneeDebut; a--) {
    annees.push(`${a}-${a + 1}`);
  }
  return annees;
}
