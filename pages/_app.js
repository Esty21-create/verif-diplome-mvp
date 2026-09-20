import { LangueProvider } from '../lib/i18n/LangueContext';
import SelecteurLangue from '../components/SelecteurLangue';

// Sélecteur de langue affiché en haut de TOUTES les pages. Le contenu
// traduit lui-même (via useLangue()/t()) n'est pour l'instant implémenté
// que sur /verifier/[code] et /espace (voir README) ; les autres pages
// restent en français quel que soit le réglage, pour l'instant.
export default function App({ Component, pageProps }) {
  return (
    <LangueProvider>
      <SelecteurLangue />
      <Component {...pageProps} />
    </LangueProvider>
  );
}
