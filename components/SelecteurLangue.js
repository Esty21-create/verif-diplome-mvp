import { useLangue } from '../lib/i18n/LangueContext';

// Affiché en haut de chaque page (voir pages/_app.js). Volontairement
// discret : deux boutons FR / EN, la langue active mise en évidence.
export default function SelecteurLangue() {
  const { langue, setLangue } = useLangue();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 6,
        alignItems: 'center',
        padding: '8px 24px',
        fontFamily: 'sans-serif',
        fontSize: 13,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <BoutonLangue code="fr" texte="FR" actif={langue === 'fr'} onClick={setLangue} />
      <span style={{ color: '#ccc' }}>|</span>
      <BoutonLangue code="en" texte="EN" actif={langue === 'en'} onClick={setLangue} />
    </div>
  );
}

function BoutonLangue({ code, texte, actif, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(code)}
      aria-pressed={actif}
      aria-label={`${texte === 'FR' ? 'Français' : 'English'}`}
      style={{
        border: 'none',
        background: 'none',
        cursor: actif ? 'default' : 'pointer',
        fontWeight: actif ? 700 : 400,
        color: actif ? '#1e8449' : '#999',
        padding: '2px 4px',
      }}
    >
      {texte}
    </button>
  );
}
