import { useInstallation } from '../lib/installationPWA';
import { useLangue } from '../lib/i18n/LangueContext';

// Bouton d'installation (Chrome/Edge/Android...) ou, sur iPhone/iPad où
// `beforeinstallprompt` n'existe pas, courte instruction. N'affiche rien
// ailleurs (navigateur sans support, ou app déjà installée).
export default function InstallerApplication() {
  const { peutInstaller, iosManuel, installer } = useInstallation();
  const { t } = useLangue();

  if (peutInstaller) {
    return (
      <button
        type="button"
        onClick={installer}
        style={{
          padding: '8px 14px',
          background: 'white',
          color: '#1e8449',
          border: '1px solid #1e8449',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t('espace.installer')}
      </button>
    );
  }

  if (iosManuel) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: '#666', background: '#f7f7f7', padding: 10, borderRadius: 6 }}>
        {t('espace.instructionIOS')}
      </p>
    );
  }

  return null;
}
