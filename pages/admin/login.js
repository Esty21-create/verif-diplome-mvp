import { useState } from 'react';
import { useRouter } from 'next/router';
import LogoEnspy from '../../components/LogoEnspy';
import { sessionValide } from '../../lib/adminSession';

// Si déjà connecté, inutile de repasser par le formulaire.
export async function getServerSideProps({ req }) {
  if (sessionValide(req)) {
    return { redirect: { destination: '/admin/emettre', permanent: false } };
  }
  return { props: {} };
}

export default function ConnexionAdmin() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasse }),
      });

      if (!reponse.ok) {
        const donnees = await reponse.json();
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        router.push('/admin/emettre');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <LogoEnspy taille={40} />
        <h1 style={{ fontSize: 20, margin: 0 }}>Connexion agent de la scolarité</h1>
      </div>

      <form onSubmit={soumettre} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Mot de passe</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              autoFocus
              style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            />
            <button
              type="button"
              onClick={() => setMotDePasseVisible((visible) => !visible)}
              style={{
                padding: '0 12px',
                border: '1px solid #ccc',
                borderRadius: 4,
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {motDePasseVisible ? 'Masquer' : 'Afficher'}
            </button>
          </div>
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
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
        {erreur && <p style={{ color: '#c0392b' }}>{erreur}</p>}
      </form>
    </div>
  );
}
