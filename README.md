# Plateforme de vérification de diplômes — MVP (pilote ENSPY)

MVP pour tester le concept : émission de documents académiques certifiés
(QR code + empreinte cryptographique), vérification publique instantanée,
et espace personnel pour les anciens étudiants.

## Installation

Prérequis : Node.js 18+ installé sur ta machine.

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Créer la base de données locale (SQLite, aucun serveur à configurer)
npm run prisma:migrate

# 4. (Optionnel) Ajouter un étudiant de test
npm run seed

# 5. Lancer le serveur de développement
npm run dev
```

Ouvre ensuite http://localhost:3000

## Comment tester le flux complet

1. Va sur **/admin/emettre**, remplis le formulaire et téléverse le document
   déjà produit par l'école (PDF ou image scannée) pour publier un document
   (utilise le matricule de test `15G0123` si tu as lancé `npm run seed`,
   avec la date de naissance `1995-03-12`).
2. Une fois émis, clique sur "Voir la page de vérification publique" —
   c'est ce que verra un employeur ou une ambassade en scannant le QR code.
3. Va sur **/espace**, connecte-toi avec le même matricule + date de naissance
   (formulaire sur `/espace/login`), et vérifie que le document apparaît et
   se télécharge.
4. Depuis **/espace**, clique sur "Soumettre un document ou demander un
   duplicata" (lien vers `/demande-publication`, protégé par la même
   session — matricule/nom/prénom sont déjà pré-remplis). Soumets un
   document : la demande apparaît aussitôt dans la section "Mes demandes en
   cours" de `/espace`, avec son statut (pas de code de suivi séparé).
5. Va sur **/admin/demandes** pour examiner cette demande, compléter les
   informations manquantes puis la valider (ou la rejeter avec un motif
   obligatoire) — le statut se met à jour côté étudiant dans `/espace`.
6. Toujours depuis `/demande-publication`, choisis l'option "Je n'ai plus mon
   document (demande de duplicata)" : aucun fichier n'est demandé. Sur
   **/admin/demandes**, cette demande porte un badge "Duplicata" — la
   valider ne publie rien (juste un accusé interne) ; l'agent traite le
   duplicata physique puis revient publier le document via `/admin/emettre`
   une fois celui-ci réémis par l'école.

## Structure du projet

```
prisma/schema.prisma      → modèle de données (Étudiant, Document, DemandePublication)
lib/verification.js       → génération du code de vérification + hash d'intégrité
lib/tamponnerDocument.js  → tampon numérique (QR code) superposé au fichier téléversé
lib/demandesStorage.js    → stockage privé (hors /public) des fichiers en attente d'examen
lib/etudiantSession.js    → cookie de session étudiant (/espace, /demande-publication)
lib/chiffrement.js        → chiffrer()/dechiffrer() génériques (AES-256-GCM)
lib/etudiantChiffrement.js → chiffrement/déchiffrement groupé des 3 champs sensibles de l'Étudiant
lib/package.json          → { "type": "module" } : permet à prisma/seed.js (CommonJS) d'importer
                             lib/etudiantChiffrement.js via import() dynamique ; sans incidence sur
                             Next.js, qui transpile déjà tout /lib et /pages indépendamment de ce champ
pages/admin/emettre.js    → formulaire d'émission directe (back-office, avec téléversement du fichier)
pages/api/admin/emettre.js → API qui reçoit l'upload (multipart) et crée le document
pages/espace/login.js     → connexion étudiant (matricule + date de naissance)
pages/espace/index.js     → espace personnel : documents publiés + statut des demandes en cours
pages/api/espace/login.js → vérifie matricule/date de naissance, pose le cookie de session
pages/demande-publication.js → protégée par la session étudiante, matricule/nom/prénom pré-remplis
pages/api/demandes/index.js  → API protégée qui enregistre la demande en attente (rien n'est publié)
pages/admin/demandes.js      → file d'attente des demandes à examiner (back-office)
pages/admin/demandes/[id].js → examen d'une demande : compléter les infos, valider ou rejeter
pages/admin/documents.js  → documents publiés + journal des 20 dernières publications (modèle JournalEmission)
pages/admin/statistiques.js → compteurs : étudiants, documents par type, demandes par statut/nature, délai moyen de validation, consultations (modèle ConsultationVerification, sans donnée sur le visiteur)
public/manifest.json + lib/installationPWA.js + components/InstallerApplication.js → PWA installable (manifeste + icônes, SANS service worker ni hors-ligne) ; bouton d'installation sur /espace
lib/journalEmission.js    → crée document + ligne de journal dans une même transaction
pages/verifier/[code].js  → page PUBLIQUE de vérification (ouverte via QR)
pages/cgu.js              → page PUBLIQUE : Conditions Générales d'Utilisation
lib/i18n/fr.js, lib/i18n/en.js → dictionnaires de traduction (bilingue FR/EN)
lib/i18n/LangueContext.js → contexte React (langue, t(), localeDate) — voir section dédiée
pages/_app.js             → affiche le sélecteur de langue en haut de toutes les pages
pages/_document.js        → <html lang="fr"> par défaut, mis à jour côté client au changement de langue
```

## Interface bilingue (FR/EN)

Approche volontairement minimale pour ce MVP, sans librairie i18n : un
dictionnaire par langue (`lib/i18n/fr.js`, `lib/i18n/en.js`) et un contexte
React (`lib/i18n/LangueContext.js`) qui expose `t(cle, variables)` et
`localeDate` (pour `toLocaleDateString`). `pages/_app.js` enveloppe toute
l'application dans ce contexte et affiche le sélecteur **FR | EN** en haut
de chaque page. Le français reste la langue par défaut ; le choix de
l'utilisateur est mémorisé en `localStorage` (perdu en navigation privée ou
sans JavaScript — sans incidence sur `/verifier/[code]`, qui reste
pleinement lisible en français par défaut sans JS).

Le contenu est intégralement traduit sur **`/verifier/[code]`** et
**`/espace`** (+ `/espace/login`), les deux priorités demandées, ainsi que
sur la page d'accueil `/`. Les autres pages (back-office admin,
`/demande-publication`, `/cgu`...) affichent bien le sélecteur mais restent
en français pour l'instant quel que soit le réglage — à étendre au besoin en ajoutant leurs clés dans `lib/i18n/*.js` et
en appelant `useLangue()` dans ces pages. Les messages d'erreur renvoyés par
les API (ex: identifiants invalides) restent également en français : les
traduire supposerait de transmettre la langue au serveur, hors du périmètre
"le plus simple possible" demandé pour ce MVP.

## Principe du tampon numérique

Le contenu officiel du document (texte, cachet, signature) n'est jamais
recréé ni modifié par la plateforme : l'agent de la scolarité téléverse le
fichier PDF ou l'image scannée déjà produit par l'ENSPY. La plateforme se
contente d'ajouter, dans le coin bas droit de la dernière page, un petit
tampon numérique (QR code + code lisible + mention "Vérifiable en ligne
sur…") sans toucher au reste de la page. Le hash d'intégrité (SHA-256) est
calculé sur le contenu brut du fichier téléversé, avant tamponnage.

## Consentement CGU

Conformément à la loi camerounaise n°2024/017 sur la protection des données
à caractère personnel (voir `/cgu`, Article 6), l'acceptation des CGU par un
étudiant est explicite et tracée : le champ `Etudiant.dateAcceptationCGU`
enregistre le moment précis de ce consentement. Il est demandé une seule
fois, à la toute première connexion sur `/espace/login` (case à cocher
obligatoire, session posée seulement après acceptation). `/demande-publication`
revérifie ce champ et ne redemande la case que si, exceptionnellement, il
n'est pas encore renseigné (ex: session ouverte avant le déploiement de
cette fonctionnalité).

## Chiffrement des données personnelles

Les champs `nom`, `prenom` et `dateNaissance` du modèle `Etudiant` sont
chiffrés au repos (AES-256-GCM, module `crypto` natif de Node — voir
`lib/chiffrement.js`) avant toute écriture en base, et déchiffrés après
lecture partout où ils sont utilisés (formulaire admin, espace personnel,
page de vérification publique). `matricule` reste en clair : c'est le
critère de recherche utilisé dans toutes les requêtes en base.

**⚠️ `ENCRYPTION_KEY` (dans `.env`) : à ne JAMAIS commiter, et à sauvegarder
en lieu sûr, séparément du reste du projet** (gestionnaire de secrets,
coffre-fort numérique de l'équipe...). Cette clé n'est pas récupérable si
elle est perdue, et **sa perte rend irrécupérables toutes les données déjà
chiffrées avec elle** (aucune fonction de recherche/réinitialisation
possible — c'est le prix du vrai chiffrement, pas une limite du MVP). Avant
de régénérer ou remplacer cette clé sur une base contenant déjà des
étudiants, il faut d'abord déchiffrer avec l'ancienne clé puis rechiffrer
avec la nouvelle (voir le script de migration utilisé lors de l'introduction
de cette fonctionnalité, non conservé dans le dépôt car à usage unique).

## Limites connues du MVP (à corriger avant tout usage réel)

- **`DemandePublication.nom`/`.prenom` restent en clair** : ce sont des
  copies dénormalisées propres au flux de demande (hors périmètre de cette
  tâche, qui ne couvrait que le modèle `Etudiant`). À chiffrer également
  avant tout usage réel si l'on veut une protection cohérente de bout en bout.
- **Aucune protection sur /admin/emettre** : n'importe qui connaissant l'URL
  peut émettre un document. À sécuriser avec une authentification avant tout
  test avec de vraies données.
- **Authentification étudiant très simplifiée** (matricule + date de
  naissance) : suffisant pour démontrer le concept, mais pas un vrai secret.
  À remplacer par un code envoyé par email/SMS avant un usage réel.
- **SQLite en fichier local** : parfait pour développer et démontrer, mais à
  migrer vers une vraie base de données (PostgreSQL) avant un déploiement
  avec plusieurs utilisateurs simultanés.
- **PDF stockés en fichiers locaux** : fonctionne pour la démo, migrer vers
  un stockage cloud (ex: S3) avant la production.

## Prochaines étapes suggérées

1. Protéger `/admin/emettre` par mot de passe.
2. Ajouter la révocation de document (le champ `revoque` existe déjà en base).
3. Remplacer l'authentification étudiant par un vrai système à usage unique.
4. Migrer vers PostgreSQL + stockage cloud pour un déploiement réel.
