import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LogoEnspy from '../../components/LogoEnspy';
import { matriculeSessionValide } from '../../lib/etudiantSession';
import { useLangue } from '../../lib/i18n/LangueContext';
import { FILIERES_ENSPY, CYCLES_ENSPY } from '../../lib/filieresEnspy';
import { CLE_INSCRIPTION_EN_COURS } from '../../lib/inscriptionEnCours';

// Auto-inscription d'un étudiant pas encore en base. Déjà connecté : inutile.
export async function getServerSideProps({ req }) {
  if (matriculeSessionValide(req)) {
    return { redirect: { destination: '/espace', permanent: false } };
  }
  return { props: {} };
}

const CHAMPS_VIDES = {
  matricule: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  email: '',
  filiere: FILIERES_ENSPY[0],
  cycle: CYCLES_ENSPY[0],
  anneeEntree: '',
  anneeSortie: '',
};

export default function InscriptionEtudiant() {
  const router = useRouter();
  const { t } = useLangue();
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [accepteCGU, setAccepteCGU] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [matriculeExistant, setMatriculeExistant] = useState(false);

  const modifier = (nom) => (e) => setChamps({ ...champs, [nom]: e.target.value });

  const soumettre = async (e) => {
    e.preventDefault();
    if (!accepteCGU) return;
    setEnCours(true);
    setErreur(null);
    setMatriculeExistant(false);

    try {
      const reponse = await fetch('/api/espace/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...champs, accepteCGU: true }),
      });
      const donnees = await reponse.json();

      if (reponse.ok) {
        // Le code (démo) est transmis à la page suivante par sessionStorage :
        // jamais dans l'URL (historique, journaux de serveur).
        try {
          window.sessionStorage.setItem(
            CLE_INSCRIPTION_EN_COURS,
            JSON.stringify({ matricule: champs.matricule.trim(), codeDemo: donnees.codeDemo || null })
          );
        } catch {
          // sessionStorage indisponible : la page suivante demandera le matricule.
        }
        router.push('/espace/code');
      } else if (donnees.code === 'MATRICULE_EXISTANT') {
        setMatriculeExistant(true);
      } else {
        const cle = `inscription.erreurs.${donnees.code}`;
        const traduit = t(cle);
        setErreur(traduit !== cle ? traduit : donnees.erreur || t('inscription.erreurs.ERREUR_SERVEUR'));
      }
    } catch {
      setErreur(t('espaceLogin.erreurReseau'));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <LogoEnspy taille={40} />
        <h1 style={{ fontSize: 20, margin: 0 }}>{t('inscription.titre')}</h1>
      </div>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>{t('inscription.intro')}</p>

      <form onSubmit={soumettre} style={{ display: 'grid', gap: 12 }}>
        <Champ label={t('inscription.matricule')} valeur={champs.matricule} onChange={modifier('matricule')} requis autoFocus maxLength={30} />
        <Champ label={t('inscription.nom')} valeur={champs.nom} onChange={modifier('nom')} requis maxLength={100} />
        <Champ label={t('inscription.prenom')} valeur={champs.prenom} onChange={modifier('prenom')} requis maxLength={100} />
        <Champ label={t('inscription.dateNaissance')} type="date" valeur={champs.dateNaissance} onChange={modifier('dateNaissance')} requis />
        <Champ label={t('inscription.email')} type="email" valeur={champs.email} onChange={modifier('email')} requis maxLength={200} />

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>{t('inscription.filiere')}</span>
          <select value={champs.filiere} onChange={modifier('filiere')} style={{ padding: 8 }}>
            {FILIERES_ENSPY.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>{t('inscription.cycle')}</span>
          <select value={champs.cycle} onChange={modifier('cycle')} style={{ padding: 8 }}>
            {CYCLES_ENSPY.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <Champ label={t('inscription.anneeEntree')} type="number" valeur={champs.anneeEntree} onChange={modifier('anneeEntree')} requis min={1990} max={new Date().getFullYear()} />
        <Champ label={t('inscription.anneeSortie')} type="number" valeur={champs.anneeSortie} onChange={modifier('anneeSortie')} min={1990} max={new Date().getFullYear() + 1} />

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#444' }}>
          <input
            type="checkbox"
            checked={accepteCGU}
            onChange={(e) => setAccepteCGU(e.target.checked)}
            required
            style={{ marginTop: 3 }}
          />
          <span>
            {t('espaceLogin.accepteCGU')}{' '}
            <Link href="/cgu" target="_blank">
              {t('espaceLogin.lienCGU')}
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={enCours || !accepteCGU}
          style={{
            padding: '10px 16px',
            background: '#1e8449',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            opacity: enCours || !accepteCGU ? 0.6 : 1,
          }}
        >
          {enCours ? t('inscription.creationEnCours') : t('inscription.creer')}
        </button>
      </form>

      {matriculeExistant && (
        <div role="alert" style={{ marginTop: 16, padding: 12, background: '#fff8e6', border: '1px solid #f0d9a0', borderRadius: 6 }}>
          <p style={{ margin: 0 }}>{t('inscription.erreurs.MATRICULE_EXISTANT')}</p>
          <p style={{ margin: '8px 0 0' }}>
            <Link href="/espace/login" style={{ color: '#1e8449', fontWeight: 600 }}>
              {t('inscription.allerConnexion')}
            </Link>
          </p>
        </div>
      )}
      {erreur && <p role="alert" style={{ color: '#c0392b' }}>{erreur}</p>}

      <p style={{ fontSize: 13, marginTop: 20 }}>
        <Link href="/espace/login" style={{ color: '#666' }}>
          {t('inscription.dejaUnAcces')}
        </Link>
      </p>
    </div>
  );
}

function Champ({ label, valeur, onChange, type = 'text', requis = false, ...reste }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 13, color: '#444' }}>{label}{requis ? ' *' : ''}</span>
      <input
        type={type}
        value={valeur}
        onChange={onChange}
        required={requis}
        style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        {...reste}
      />
    </label>
  );
}
