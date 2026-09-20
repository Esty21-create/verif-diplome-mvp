import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { sessionValide } from '../../../lib/adminSession';
import { LABELS_TYPE_DOCUMENT } from '../../../lib/tarifs';
import {
  FILIERES_ENSPY,
  CYCLES_ENSPY,
  SEMESTRES_ENSPY,
  niveauxDisponibles,
  genererAnneesAcademiques,
} from '../../../lib/filieresEnspy';

export async function getServerSideProps({ req, params }) {
  if (!sessionValide(req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  const demande = await prisma.demandePublication.findUnique({ where: { id: params.id } });
  if (!demande) {
    return { notFound: true };
  }

  return {
    props: {
      demande: {
        id: demande.id,
        nature: demande.nature,
        matricule: demande.matricule,
        nom: demande.nom,
        prenom: demande.prenom,
        typeDocument: demande.typeDocument,
        statut: demande.statut,
        commentaireEtudiant: demande.commentaireEtudiant,
        commentaireAdmin: demande.commentaireAdmin,
        dateSoumission: demande.dateSoumission.toISOString(),
      },
    },
  };
}

const ANNEES_ACADEMIQUES = genererAnneesAcademiques();

export default function DemandeDetail({ demande }) {
  const router = useRouter();

  const [champs, setChamps] = useState({
    dateNaissance: '',
    anneeEntree: '',
    anneeSortie: '',
    cycle: CYCLES_ENSPY[0],
    filiere: FILIERES_ENSPY[0],
    niveau: niveauxDisponibles(CYCLES_ENSPY[0], FILIERES_ENSPY[0])[0],
    anneeAcademique: ANNEES_ACADEMIQUES[0],
    semestre: SEMESTRES_ENSPY[2],
    intitule: LABELS_TYPE_DOCUMENT[demande.typeDocument] || '',
  });
  const [etudiantConnu, setEtudiantConnu] = useState(null); // null | true | false
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [afficherRejet, setAfficherRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState('');

  // Si l'étudiant a déjà un dossier (document antérieur), on récupère ses
  // informations pour éviter à l'agent de tout ressaisir. Inutile pour un
  // duplicata : aucun document n'est publié à cette étape.
  useEffect(() => {
    if (demande.nature !== 'PUBLICATION') return;
    let ignore = false;
    fetch(`/api/admin/etudiant/${encodeURIComponent(demande.matricule)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((donnees) => {
        if (ignore || !donnees) {
          if (!ignore) setEtudiantConnu(false);
          return;
        }
        const { etudiant } = donnees;
        setChamps((precedent) => ({
          ...precedent,
          dateNaissance: etudiant.dateNaissance,
          anneeEntree: String(etudiant.anneeEntree),
          anneeSortie: etudiant.anneeSortie ? String(etudiant.anneeSortie) : '',
          cycle: etudiant.cycle,
          filiere: etudiant.filiere,
          niveau: niveauxDisponibles(etudiant.cycle, etudiant.filiere)[0],
        }));
        setEtudiantConnu(true);
      })
      .catch(() => setEtudiantConnu(false));
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modifierChamp = (nom) => (e) => setChamps({ ...champs, [nom]: e.target.value });
  const niveaux = niveauxDisponibles(champs.cycle, champs.filiere);

  const changerCycle = (e) => {
    const cycle = e.target.value;
    setChamps({ ...champs, cycle, niveau: niveauxDisponibles(cycle, champs.filiere)[0] });
  };

  const changerFiliere = (e) => {
    const filiere = e.target.value;
    setChamps({ ...champs, filiere, niveau: niveauxDisponibles(champs.cycle, filiere)[0] });
  };

  const valider = async (e) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch(`/api/admin/demandes/${demande.id}/valider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(champs),
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        setResultat(donnees);
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  const validerDuplicata = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/admin/demandes/${demande.id}/valider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        setResultat(donnees);
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  const confirmerRejet = async (e) => {
    e.preventDefault();
    if (!motifRejet.trim()) return;

    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/admin/demandes/${demande.id}/rejeter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaireAdmin: motifRejet.trim() }),
      });
      if (!reponse.ok) {
        const donnees = await reponse.json();
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        router.push('/admin/demandes');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <Link href="/admin/demandes" style={{ fontSize: 13, color: '#666' }}>
        ← Retour aux demandes
      </Link>
      <h1 style={{ fontSize: 20, marginTop: 8 }}>
        Demande de {demande.nom} {demande.prenom}
        {demande.nature === 'DUPLICATA' && (
          <span
            style={{
              marginLeft: 10,
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              color: '#6b46c1',
              background: '#f1eafc',
              verticalAlign: 'middle',
            }}
          >
            Duplicata
          </span>
        )}
      </h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Matricule <strong>{demande.matricule}</strong> — {LABELS_TYPE_DOCUMENT[demande.typeDocument] || demande.typeDocument} —
        soumise le {new Date(demande.dateSoumission).toLocaleDateString('fr-FR')}
      </p>

      {demande.nature === 'PUBLICATION' ? (
        <p>
          <a href={`/api/admin/demandes/${demande.id}/fichier`} target="_blank" rel="noreferrer">
            Voir le fichier téléversé par l'étudiant
          </a>
        </p>
      ) : (
        <p style={{ color: '#666', fontSize: 14 }}>
          Aucun fichier : l'étudiant a déclaré ne plus posséder ce document.
        </p>
      )}

      {demande.commentaireEtudiant && (
        <p style={{ fontSize: 14 }}>
          <strong>Circonstances données par l'étudiant :</strong> {demande.commentaireEtudiant}
        </p>
      )}

      {demande.statut !== 'EN_ATTENTE' && (
        <div style={{ marginTop: 16, padding: 16, background: '#f4f4f4', borderRadius: 6 }}>
          <p>
            Cette demande a déjà été traitée — statut : <strong>{demande.statut}</strong>
          </p>
          {demande.commentaireAdmin && <p>Motif : {demande.commentaireAdmin}</p>}
        </div>
      )}

      {demande.statut === 'EN_ATTENTE' && !resultat && demande.nature === 'DUPLICATA' && (
        <>
          <div style={{ marginTop: 16, padding: 16, background: '#f1eafc', borderRadius: 6 }}>
            <p style={{ margin: 0 }}>
              Valider ne déclenche aucun tamponnage : cela notifie seulement que la demande est
              légitime et que le duplicata physique doit être traité en interne. Une fois le
              duplicata émis par l'école, revenez publier le document normalement depuis{' '}
              <Link href="/admin/emettre">/admin/emettre</Link>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={validerDuplicata}
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
              {enCours ? 'Traitement…' : 'Valider la demande de duplicata'}
            </button>
            {!afficherRejet && (
              <button
                type="button"
                onClick={() => setAfficherRejet(true)}
                disabled={enCours}
                style={{
                  padding: '10px 16px',
                  background: 'white',
                  color: '#c0392b',
                  border: '1px solid #c0392b',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Rejeter
              </button>
            )}
          </div>

          {afficherRejet && (
            <BlocRejet
              motifRejet={motifRejet}
              setMotifRejet={setMotifRejet}
              confirmerRejet={confirmerRejet}
              annuler={() => { setAfficherRejet(false); setMotifRejet(''); }}
              enCours={enCours}
            />
          )}
        </>
      )}

      {demande.statut === 'EN_ATTENTE' && !resultat && demande.nature === 'PUBLICATION' && (
        <>
          {etudiantConnu === true && (
            <p style={{ fontSize: 12, color: '#1e8449' }}>
              Étudiant déjà connu — informations pré-remplies ci-dessous.
            </p>
          )}
          {etudiantConnu === false && (
            <p style={{ fontSize: 12, color: '#888' }}>
              Nouvel étudiant — renseignez ses informations à partir du document téléversé.
            </p>
          )}

          <form onSubmit={valider} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
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
              <span style={{ fontSize: 13, color: '#444' }}>Niveau concerné par ce document</span>
              <select value={champs.niveau} onChange={modifierChamp('niveau')}>
                {niveaux.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#444' }}>Année académique concernée</span>
              <select value={champs.anneeAcademique} onChange={modifierChamp('anneeAcademique')}>
                {ANNEES_ACADEMIQUES.map((a) => (
                  <option key={a} value={a}>{a}</option>
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

            <Champ
              label="Intitulé exact (affiché sur le document)"
              value={champs.intitule}
              onChange={modifierChamp('intitule')}
              requis
            />

            <div style={{ display: 'flex', gap: 12 }}>
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
                {enCours ? 'Traitement…' : 'Valider et publier'}
              </button>
              {!afficherRejet && (
                <button
                  type="button"
                  onClick={() => setAfficherRejet(true)}
                  disabled={enCours}
                  style={{
                    padding: '10px 16px',
                    background: 'white',
                    color: '#c0392b',
                    border: '1px solid #c0392b',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Rejeter
                </button>
              )}
            </div>
          </form>

          {afficherRejet && (
            <BlocRejet
              motifRejet={motifRejet}
              setMotifRejet={setMotifRejet}
              confirmerRejet={confirmerRejet}
              annuler={() => { setAfficherRejet(false); setMotifRejet(''); }}
              enCours={enCours}
            />
          )}
        </>
      )}

      {erreur && <p style={{ color: '#c0392b', marginTop: 16 }}>{erreur}</p>}

      {resultat && resultat.nature === 'DUPLICATA' && (
        <div style={{ marginTop: 24, padding: 16, background: '#eafaf1', borderRadius: 6 }}>
          <p>{resultat.message}</p>
        </div>
      )}

      {resultat && resultat.nature !== 'DUPLICATA' && (
        <div style={{ marginTop: 24, padding: 16, background: '#eafaf1', borderRadius: 6 }}>
          <p>
            <strong>Document publié.</strong> Code : {resultat.codeVerif}
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

function BlocRejet({ motifRejet, setMotifRejet, confirmerRejet, annuler, enCours }) {
  return (
    <form
      onSubmit={confirmerRejet}
      style={{ display: 'grid', gap: 8, marginTop: 16, padding: 16, border: '1px solid #f0c4bd', borderRadius: 6 }}
    >
      <span style={{ fontSize: 13, color: '#444' }}>
        Motif du rejet (obligatoire, ex : "ne correspond pas aux archives",
        "informations incohérentes") *
      </span>
      <textarea
        value={motifRejet}
        onChange={(e) => setMotifRejet(e.target.value)}
        required
        rows={3}
        style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          disabled={enCours || !motifRejet.trim()}
          style={{
            padding: '8px 14px',
            background: '#c0392b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {enCours ? 'Rejet en cours…' : 'Confirmer le rejet'}
        </button>
        <button
          type="button"
          onClick={annuler}
          disabled={enCours}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
        >
          Annuler
        </button>
      </div>
    </form>
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
