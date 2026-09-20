import LogoEnspy from '../components/LogoEnspy';
import { useLangue } from '../lib/i18n/LangueContext';

export default function Accueil() {
  const { t } = useLangue();

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoEnspy taille={44} />
        <h1 style={{ fontSize: 22, margin: 0 }}>{t('accueil.titre')}</h1>
      </div>
      <p style={{ color: '#666' }}>{t('accueil.sousTitre')}</p>

      <div style={{ display: 'grid', gap: 12, marginTop: 32 }}>
        <a href="/admin/emettre" style={lienStyle}>
          {t('accueil.publier')}
        </a>
        <a href="/admin/demandes" style={lienStyle}>
          {t('accueil.demandes')}
        </a>
        <a href="/admin/documents" style={lienStyle}>
          {t('accueil.documents')}
        </a>
        <a href="/espace" style={lienStyle}>
          {t('accueil.espace')}
        </a>
        <p style={{ fontSize: 13, color: '#999' }}>{t('accueil.noteVerification')}</p>
        <a href="/cgu" style={{ fontSize: 13, color: '#666' }}>
          {t('accueil.cgu')}
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
