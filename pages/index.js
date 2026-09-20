import LogoEnspy from '../components/LogoEnspy';

export default function Accueil() {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoEnspy taille={44} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Plateforme de vérification de diplômes</h1>
      </div>
      <p style={{ color: '#666' }}>MVP — pilote ENSPY</p>

      <div style={{ display: 'grid', gap: 12, marginTop: 32 }}>
        <a href="/admin/emettre" style={lienStyle}>
          → Publier un document (agent de la scolarité)
        </a>
        <a href="/admin/demandes" style={lienStyle}>
          → Demandes de publication à examiner (agent de la scolarité)
        </a>
        <a href="/espace" style={lienStyle}>
          → Mon espace (ancien/actuel étudiant) — documents, demandes de
          publication et duplicatas
        </a>
        <p style={{ fontSize: 13, color: '#999' }}>
          La page de vérification publique s'ouvre en scannant le QR code d'un document,
          à l'adresse /verifier/[code].
        </p>
        <a href="/cgu" style={{ fontSize: 13, color: '#666' }}>
          Conditions Générales d'Utilisation
        </a>
      </div>
    </div>
  );
}

const lienStyle = {
  display: 'block',
  padding: 14,
  border: '1px solid #ddd',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#1e8449',
  fontWeight: 500,
};
