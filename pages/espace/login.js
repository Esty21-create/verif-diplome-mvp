import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LogoEnspy from '../../components/LogoEnspy';
import { matriculeSessionValide } from '../../lib/etudiantSession';
import { useLangue } from '../../lib/i18n/LangueContext';

// Si déjà connecté, inutile de repasser par le formulaire.
export async function getServerSideProps({ req }) {
  if (matriculeSessionValide(req)) {
    return { redirect: { destination: '/espace', permanent: false } };
  }
  return { props: {} };
}

export default function ConnexionEtudiant() {
  const router = useRouter();
  const { t } = useLangue();
  const [matricule, setMatricule] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [accepteCGU, setAccepteCGU] = useState(false);
  const [cguRequise, setCguRequise] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const connecter = async (accepterMaintenant) => {
    setEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch('/api/espace/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule, dateNaissance, accepteCGU: accepterMaintenant }),
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        // Les messages renvoyés par l'API restent en français (voir README) ;
        // seuls les messages produits ici suivent la langue choisie.
        setErreur(donnees.erreur || t('espaceLogin.erreurGenerique'));
      } else if (donnees.cguRequise) {
        // Première connexion : identifiants valides, mais il faut accepter
        // les CGU avant que la session ne soit posée.
        setCguRequise(true);
      } else {
        router.push('/espace');
      }
    } catch {
      setErreur(t('espaceLogin.erreurReseau'));
    } finally {
      setEnCours(false);
    }
  };

  const soumettreIdentifiants = (e) => {
    e.preventDefault();
    connecter(false);
  };

  const confirmerCGU = (e) => {
    e.preventDefault();
    if (!accepteCGU) return;
    connecter(true);
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <LogoEnspy taille={40} />
        <h1 style={{ fontSize: 20, margin: 0 }}>{t('espaceLogin.titre')}</h1>
      </div>

      {!cguRequise ? (
        <form onSubmit={soumettreIdentifiants} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#444' }}>{t('espaceLogin.matricule')}</span>
            <input
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              required
              autoFocus
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#444' }}>{t('espaceLogin.dateNaissance')}</span>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
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
            {enCours ? t('espaceLogin.connexionEnCours') : t('espaceLogin.accederEspace')}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmerCGU} style={{ display: 'grid', gap: 12 }}>
          <p style={{ fontSize: 14, color: '#444', margin: 0 }}>
            {t('espaceLogin.bienvenueCGU')}
          </p>
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
            }}
          >
            {enCours ? t('espaceLogin.connexionEnCours') : t('espaceLogin.accepterEtAcceder')}
          </button>
        </form>
      )}

      {erreur && <p style={{ color: '#c0392b' }}>{erreur}</p>}
    </div>
  );
}
