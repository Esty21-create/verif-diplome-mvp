import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LogoEnspy from '../../components/LogoEnspy';
import { matriculeSessionValide } from '../../lib/etudiantSession';
import { useLangue } from '../../lib/i18n/LangueContext';
import { CLE_INSCRIPTION_EN_COURS } from '../../lib/inscriptionEnCours';

// Saisie du code de connexion, étape finale de l'auto-inscription. Déjà
// connecté : inutile.
export async function getServerSideProps({ req }) {
  if (matriculeSessionValide(req)) {
    return { redirect: { destination: '/espace', permanent: false } };
  }
  return { props: {} };
}

export default function SaisieCode() {
  const router = useRouter();
  const { t } = useLangue();
  const [matricule, setMatricule] = useState('');
  const [code, setCode] = useState('');
  const [codeDemo, setCodeDemo] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Reprend le matricule (et le code démo) laissés par /espace/inscription.
  useEffect(() => {
    try {
      const brut = window.sessionStorage.getItem(CLE_INSCRIPTION_EN_COURS);
      if (brut) {
        const donnees = JSON.parse(brut);
        setMatricule(donnees.matricule || '');
        setCodeDemo(donnees.codeDemo || null);
      }
    } catch {
      // Pas de données : l'étudiant saisit lui-même son matricule.
    }
  }, []);

  const valider = async (e) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch('/api/espace/verifier-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule, code }),
      });
      const donnees = await reponse.json();

      if (reponse.ok) {
        try {
          window.sessionStorage.removeItem(CLE_INSCRIPTION_EN_COURS);
        } catch {
          // sans incidence
        }
        router.push('/espace');
      } else {
        const cle = `codeConnexion.erreurs.${donnees.code}`;
        const traduit = t(cle);
        setErreur(traduit !== cle ? traduit : donnees.erreur || t('codeConnexion.erreurs.ERREUR_SERVEUR'));
      }
    } catch {
      setErreur(t('espaceLogin.erreurReseau'));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <LogoEnspy taille={40} />
        <h1 style={{ fontSize: 20, margin: 0 }}>{t('codeConnexion.titre')}</h1>
      </div>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>{t('codeConnexion.intro')}</p>

      {codeDemo && (
        <div
          role="status"
          style={{ margin: '0 0 16px', padding: 12, background: '#fff8e6', border: '1px solid #f0d9a0', borderRadius: 6, fontSize: 14 }}
        >
          {t('codeConnexion.demo', { code: '' })}
          <strong style={{ fontSize: 20, letterSpacing: 3, fontFamily: 'monospace' }}>{codeDemo}</strong>
        </div>
      )}

      <form onSubmit={valider} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>{t('codeConnexion.matricule')}</span>
          <input
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>{t('codeConnexion.code')}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, letterSpacing: 3, fontFamily: 'monospace' }}
          />
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
          {enCours ? t('codeConnexion.verificationEnCours') : t('codeConnexion.valider')}
        </button>
      </form>

      {erreur && <p role="alert" style={{ color: '#c0392b' }}>{erreur}</p>}

      <p style={{ fontSize: 13, marginTop: 20 }}>
        <Link href="/espace/login" style={{ color: '#666' }}>
          {t('codeConnexion.retour')}
        </Link>
      </p>
    </div>
  );
}
