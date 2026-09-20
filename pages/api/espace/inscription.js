import { prisma } from '../../../lib/prisma';
import { chiffrer } from '../../../lib/chiffrement';
import { chiffrerDonneesEtudiant } from '../../../lib/etudiantChiffrement';
import { FILIERES_ENSPY, CYCLES_ENSPY } from '../../../lib/filieresEnspy';
import { creerCodeConnexion, modeDemoActif } from '../../../lib/codeConnexion';

// Auto-inscription d'un étudiant absent de la base (/espace/inscription).
// Réponses d'erreur : { erreur: <texte FR>, code: <identifiant stable> } — la
// page traduit à partir de `code` (les textes FR restent le repli).
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ANNEE_MIN = 1990;

function erreur(res, statut, code, texte) {
  return res.status(statut).json({ erreur: texte, code });
}

function entierOuNull(valeur) {
  if (valeur === undefined || valeur === null || String(valeur).trim() === '') return null;
  const n = Number(valeur);
  return Number.isInteger(n) ? n : NaN;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  const corps = req.body || {};
  const matricule = String(corps.matricule || '').trim();
  const nom = String(corps.nom || '').trim();
  const prenom = String(corps.prenom || '').trim();
  const email = String(corps.email || '').trim();
  const { filiere, cycle } = corps;
  const anneeEntree = entierOuNull(corps.anneeEntree);
  const anneeSortie = entierOuNull(corps.anneeSortie);

  if (!matricule || !nom || !prenom || !email || !corps.dateNaissance || anneeEntree === null) {
    return erreur(res, 400, 'CHAMPS_MANQUANTS', 'Tous les champs obligatoires doivent être renseignés');
  }
  if (matricule.length > 30 || nom.length > 100 || prenom.length > 100 || email.length > 200) {
    return erreur(res, 400, 'CHAMPS_INVALIDES', 'Un des champs est trop long');
  }
  if (!REGEX_EMAIL.test(email)) {
    return erreur(res, 400, 'EMAIL_INVALIDE', "L'adresse email n'est pas valide");
  }

  const dateNaissance = new Date(corps.dateNaissance);
  const maintenant = new Date();
  if (
    Number.isNaN(dateNaissance.getTime()) ||
    dateNaissance > maintenant ||
    dateNaissance.getFullYear() < 1930
  ) {
    return erreur(res, 400, 'DATE_INVALIDE', 'La date de naissance est invalide');
  }

  if (!FILIERES_ENSPY.includes(filiere) || !CYCLES_ENSPY.includes(cycle)) {
    return erreur(res, 400, 'CHAMPS_INVALIDES', 'Filière ou cycle invalide');
  }

  const anneeCourante = maintenant.getFullYear();
  if (
    Number.isNaN(anneeEntree) || anneeEntree < ANNEE_MIN || anneeEntree > anneeCourante ||
    Number.isNaN(anneeSortie) ||
    (anneeSortie !== null && (anneeSortie < anneeEntree || anneeSortie > anneeCourante + 1))
  ) {
    return erreur(res, 400, 'ANNEES_INVALIDES', "Les années d'entrée/sortie sont invalides");
  }

  // Consentement explicite et traçable (loi n°2024/017) : condition
  // obligatoire de la création d'accès, vérifiée côté serveur.
  if (corps.accepteCGU !== true) {
    return erreur(
      res, 400, 'CGU_REQUISES',
      "Vous devez accepter les Conditions Générales d'Utilisation pour créer votre accès"
    );
  }

  // Sans envoi d'email branché ET sans mode démo, on ne saurait pas remettre
  // le code : on refuse avant de créer quoi que ce soit.
  if (!modeDemoActif()) {
    return erreur(
      res, 503, 'ENVOI_NON_CONFIGURE',
      "L'envoi d'email n'est pas encore configuré : la création d'accès est indisponible"
    );
  }

  const messageExistant = 'Ce matricule a déjà un accès, connectez-vous normalement';

  try {
    // Comparaison insensible à la casse : "2013p086" ne doit pas pouvoir
    // doubler "2013P086" (l'unicité SQLite, elle, distingue les casses).
    const existants = await prisma.$queryRaw`
      SELECT 1 AS present FROM Etudiant WHERE lower(matricule) = lower(${matricule}) LIMIT 1
    `;
    if (existants.length > 0) {
      return erreur(res, 409, 'MATRICULE_EXISTANT', messageExistant);
    }

    // Étudiant + code créés ensemble : pas d'accès créé sans code remis.
    const code = await prisma.$transaction(async (tx) => {
      await tx.etudiant.create({
        data: {
          matricule,
          ...chiffrerDonneesEtudiant({ nom, prenom, dateNaissance }),
          email: chiffrer(email),
          anneeEntree,
          anneeSortie,
          filiere,
          cycle,
          dateAcceptationCGU: new Date(),
        },
      });
      return creerCodeConnexion(tx, matricule);
    });

    // TODO envoi réel : à brancher ici (SMTP, Resend, etc.) puis passer
    // MODE_DEMO_CODE_CONNEXION à "false". En démo, le code est renvoyé au
    // navigateur pour affichage à l'écran.
    return res.status(201).json({
      message: 'Accès créé. Saisissez le code de connexion pour continuer.',
      codeDemo: code,
    });
  } catch (e) {
    // Course entre deux inscriptions simultanées du même matricule.
    if (e?.code === 'P2002') {
      return erreur(res, 409, 'MATRICULE_EXISTANT', messageExistant);
    }
    console.error(e);
    return erreur(res, 500, 'ERREUR_SERVEUR', "Erreur lors de la création de l'accès");
  }
}
