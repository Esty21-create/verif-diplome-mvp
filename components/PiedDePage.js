import Link from 'next/link';
import { useLangue } from '../lib/i18n/LangueContext';

const URL_WHATSAPP = 'https://wa.me/237641683656';

// Pied de page des pages publiques (voir pages/_app.js) : lien d'assistance
// WhatsApp, et sur /verifier/[code] le lien vers les CGU. Volontairement
// sobre : petit texte gris, aucune action requise du visiteur.
export default function PiedDePage({ avecCGU = false }) {
  const { t } = useLangue();

  return (
    <footer
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '16px 24px 32px',
        fontFamily: 'sans-serif',
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
      }}
    >
      <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>
          {t('piedDePage.aide')}
        </a>
        {avecCGU && (
          <div style={{ marginTop: 6 }}>
            <Link href="/cgu" style={{ color: '#888' }}>
              {t('verifier.mentionsLegales')}
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
}
