import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FILIERES_ENSPY,
  CYCLES_ENSPY,
  SEMESTRES_ENSPY,
  niveauxDisponibles,
  genererAnneesAcademiques,
} from '../../lib/filieresEnspy';
import { formaterTarif, LABELS_TYPE_DOCUMENT } from '../../lib/tarifs';
import { sessionValide } from '../../lib/adminSession';

// Page protégée : on vérifie le cookie de session côté serveur, avant même
// d'envoyer le HTML, et on redirige vers le formulaire de connexion sinon.
export async function getServerSideProps({ req }) {
  if (!sessionValide(req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
}

const ANNEES_ACADEMIQUES = genererAnneesAcademiques();

const TYPES_DOCUMENTS = Object.entries(LABELS_TYPE_DOCUMENT).map(([valeur, label]) => ({ valeur, label }));

// Délai avant de lancer la recherche automatique après une frappe, pour ne
// pas interroger le serveur à chaque caractère tapé.
const DELAI_RECHERCHE_MS = 500;
const LONGUEUR_MIN_RECHERCHE = 3;

const CHAMPS_VIDES = {
  matricule: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  anneeEntree: '',
  anneeSortie: '',
  cycle: CYCLES_ENSPY[0],
  filiere: FILIERES_ENSPY[0],
  typeDocument: TYPES_DOCUMENTS[0].valeur,
  niveau: niveauxDisponibles(CYCLES_ENSPY[0], FILIERES_ENSPY[0])[0],
  anneeAcademique: ANNEES_ACADEMIQUES[0],
  semestre: SEMESTRES_ENSPY[2],
  intitule: '',
};

export default function EmettreDocument() {
  const router = useRouter();
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [fichier, setFichier] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [statutRecherche, setStatutRecherche] = useState(null); // null | 'recherche' | 'trouve' | 'nouveau' | 'erreur'

  // Sert à ignorer la réponse d'une recherche devenue obsolète (l'agent a
  // continué à taper pendant que la requête précédente était en vol).
  const matriculeActuelRef = useRef('');

  const seDeconnecter = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const modifierChamp = (nom) => (e) => setChamps({ ...champs, [nom]: e.target.value });
  const tarif = formaterTarif(champs.typeDocument);
  const niveaux = niveauxDisponibles(champs.cycle, champs.filiere);

  const rechercherEtudiant = async (matricule) => {
    if (!matricule) return;
    setStatutRecherche('recherche');
    try {
      const reponse = await fetch(`/api/admin/etudiant/${encodeURIComponent(matricule)}`);

      // La réponse arrive après que l'agent a déjà modifié le champ matricule
      // : on l'ignore, une recherche plus récente est en cours ou va suivre.
      if (matriculeActuelRef.current.trim() !== matricule) return;

      if (reponse.status === 404) {
        setStatutRecherche('nouveau');
        return;
      }
      if (!reponse.ok) {
        setStatutRecherche('erreur');
        return;
      }

      const { etudiant } = await reponse.json();
      setChamps((precedent) => ({
        ...precedent,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        dateNaissance: etudiant.dateNaissance,
        cycle: etudiant.cycle,
        filiere: etudiant.filiere,
        anneeEntree: String(etudiant.anneeEntree),
        anneeSortie: etudiant.anneeSortie ? String(etudiant.anneeSortie) : '',
        // Le niveau reste propre au document à émettre, mais doit rester
        // valide pour le cycle/filière de l'étudiant retrouvé.
        niveau: niveauxDisponibles(etudiant.cycle, etudiant.filiere)[0],
      }));
      setStatutRecherche('trouve');
    } catch {
      setStatutRecherche('erreur');
    }
  };

  // Recherche automatique après un court délai d'inactivité de saisie.
  useEffect(() => {
    const matricule = champs.matricule.trim();
    matriculeActuelRef.current = matricule;

    if (matricule.length < LONGUEUR_MIN_RECHERCHE) {
      setStatutRecherche(null);
      return;
    }

    const minuteur = setTimeout(() => rechercherEtudiant(matricule), DELAI_RECHERCHE_MS);
    return () => clearTimeout(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champs.matricule]);

  // Changer le cycle ou la filière peut invalider le niveau sélectionné
  // (ex: cycle Licence n'a que 3 niveaux, filière MSP n'a que 2 niveaux) :
  // on retombe alors sur le premier niveau valide.
  const changerCycle = (e) => {
    const cycle = e.target.value;
    setChamps({ ...champs, cycle, niveau: niveauxDisponibles(cycle, champs.filiere)[0] });
  };

  const changerFiliere = (e) => {
    const filiere = e.target.value;
    setChamps({ ...champs, filiere, niveau: niveauxDisponibles(champs.cycle, filiere)[0] });
  };

  const soumettre = async (e) => {
    e.preventDefault();

    if (!fichier) {
      setErreur('Merci de téléverser le document officiel déjà produit (PDF ou image scannée)');
      return;
    }

    setEnCours(true);
    setErreur(null);
    setResultat(null);

    try {
      const donneesFormulaire = new FormData();
      Object.entries(champs).forEach(([nom, valeur]) => donneesFormulaire.append(nom, valeur));
      donneesFormulaire.append('fichier', fichier);

      // Pas de header Content-Type manuel : le navigateur définit lui-même
      // "multipart/form-data" avec le bon boundary à partir du FormData.
      const reponse = await fetch('/api/admin/emettre', {
        method: 'POST',
        body: donneesFormulaire,
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        setResultat(donnees);
        setChamps(CHAMPS_VIDES);
        setFichier(null);
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20 }}>Publier un document — ENSPY (pilote)</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <a href="/admin/demandes" style={{ color: '#666', fontSize: 13 }}>
            Demandes à examiner
          </a>
          <a href="/admin/statistiques" style={{ color: '#666', fontSize: 13 }}>
            Statistiques
          </a>
          <button
            type="button"
            onClick={seDeconnecter}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
      <p style={{ color: '#666', fontSize: 14 }}>
        Cette action publie une version numérique vérifiable (QR code) d'un document déjà délivré
        par l'école dans son format habituel. Usage interne uniquement, accès protégé par mot de
        passe partagé.
      </p>

      <form onSubmit={soumettre} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Matricule *</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={champs.matricule}
              onChange={modifierChamp('matricule')}
              required
              style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            />
            <button
              type="button"
              onClick={() => rechercherEtudiant(champs.matricule.trim())}
              disabled={!champs.matricule.trim() || statutRecherche === 'recherche'}
              style={{
                padding: '0 14px',
                border: '1px solid #ccc',
                borderRadius: 4,
                background: '#f4f4f4',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Rechercher
            </button>
          </div>
          {statutRecherche === 'recherche' && (
            <span style={{ fontSize: 12, color: '#888' }}>Recherche…</span>
          )}
          {statutRecherche === 'trouve' && (
            <span style={{ fontSize: 12, color: '#1e8449' }}>
              Étudiant déjà connu — informations pré-remplies ci-dessous.
            </span>
          )}
          {statutRecherche === 'nouveau' && (
            <span style={{ fontSize: 12, color: '#888' }}>
              Nouveau matricule — renseignez les informations de l'étudiant.
            </span>
          )}
          {statutRecherche === 'erreur' && (
            <span style={{ fontSize: 12, color: '#c0392b' }}>Erreur lors de la recherche.</span>
          )}
        </label>
        <Champ label="Nom" value={champs.nom} onChange={modifierChamp('nom')} requis />
        <Champ label="Prénom" value={champs.prenom} onChange={modifierChamp('prenom')} requis />
        <Champ
          label="Date de naissance"
          type="date"
          value={champs.dateNaissance}
          onChange={modifierChamp('dateNaissance')}
          requis
        />
        <Champ
          label="Année d'entrée dans le cycle (ex: 2015)"
          type="number"
          value={champs.anneeEntree}
          onChange={modifierChamp('anneeEntree')}
          requis
        />
        <Champ
          label="Année de sortie / diplômation (laisser vide si en cours)"
          type="number"
          value={champs.anneeSortie}
          onChange={modifierChamp('anneeSortie')}
        />

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Cycle</span>
          <select value={champs.cycle} onChange={changerCycle}>
            {CYCLES_ENSPY.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Filière</span>
          <select value={champs.filiere} onChange={changerFiliere}>
            {FILIERES_ENSPY.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>
            Niveau concerné par ce document
          </span>
          <select value={champs.niveau} onChange={modifierChamp('niveau')}>
            {niveaux.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>
            Année académique concernée
            <span style={{ color: '#999', fontWeight: 400 }}>
              {' '}(en cas de reprise de classe, choisir l'année réellement suivie)
            </span>
          </span>
          <select value={champs.anneeAcademique} onChange={modifierChamp('anneeAcademique')}>
            {ANNEES_ACADEMIQUES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Type de document</span>
          <select value={champs.typeDocument} onChange={modifierChamp('typeDocument')}>
            {TYPES_DOCUMENTS.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Semestre concerné</span>
          <select value={champs.semestre} onChange={modifierChamp('semestre')}>
            {SEMESTRES_ENSPY.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        {tarif && (
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            Tarif indicatif : {tarif.local} (local) / {tarif.diaspora} (diaspora) —
            aucun paiement n'est encore branché sur ce MVP, affichage informatif seulement.
          </p>
        )}

        <Champ
          label="Intitulé exact (affiché sur le document)"
          value={champs.intitule}
          onChange={modifierChamp('intitule')}
          placeholder="ex: Attestation de réussite - Master Génie Informatique"
          requis
        />

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>
            Document officiel déjà produit par l'ENSPY (PDF ou image scannée) *
          </span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            required
            onChange={(e) => setFichier(e.target.files?.[0] || null)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, background: 'white' }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>
            Ce fichier n'est pas recréé : un tampon numérique (QR code + code de vérification)
            est simplement superposé dans son coin bas droit.
          </span>
        </label>

        <button
          type="submit"
          disabled={enCours}
          style={{
            padding: '10px 16px',
            background: '#1e8449',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {enCours ? 'Publication en cours…' : 'Publier la version numérique vérifiable'}
        </button>
      </form>

      {erreur && <p style={{ color: '#c0392b', marginTop: 16 }}>{erreur}</p>}

      {resultat && (
        <div style={{ marginTop: 24, padding: 16, background: '#eafaf1', borderRadius: 6 }}>
          <p>
            <strong>Version numérique publiée.</strong> Code : {resultat.codeVerif}
          </p>
          <p>
            <a href={resultat.urlTelechargement} target="_blank" rel="noreferrer">
              Télécharger le PDF
            </a>
          </p>
          <p>
            <a href={resultat.urlVerification} target="_blank" rel="noreferrer">
              Voir la page de vérification publique
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function Champ({ label, requis, ...props }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 13, color: '#444' }}>
        {label} {requis && '*'}
      </span>
      <input {...props} required={requis} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
    </label>
  );
}
