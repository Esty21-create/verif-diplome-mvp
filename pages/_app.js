import Head from 'next/head';
import { useRouter } from 'next/router';
import { LangueProvider } from '../lib/i18n/LangueContext';
import { InstallationProvider } from '../lib/installationPWA';
import SelecteurLangue from '../components/SelecteurLangue';
import PiedDePage from '../components/PiedDePage';

// Sélecteur de langue affiché en haut de TOUTES les pages. Le contenu
// traduit lui-même (via useLangue()/t()) n'est pour l'instant implémenté
// que sur /verifier/[code] et /espace (voir README) ; les autres pages
// restent en français quel que soit le réglage, pour l'instant.
// Le pied de page (assistance WhatsApp) n'apparaît que sur les pages
// publiques : pas dans le back-office /admin.
export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  const estPageAdmin = pathname.startsWith('/admin');

  return (
    <LangueProvider>
      <InstallationProvider>
        {/* Installabilité PWA : manifeste + icônes, communs à toutes les pages. */}
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="theme-color" content="#1E8449" />
        </Head>
        <SelecteurLangue />
        <Component {...pageProps} />
        {!estPageAdmin && <PiedDePage avecCGU={pathname.startsWith('/verifier')} />}
      </InstallationProvider>
    </LangueProvider>
  );
}
