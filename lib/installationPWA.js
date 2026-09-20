import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Installabilité PWA (icône + manifeste uniquement : pas de service worker ni
// de mode hors-ligne à ce stade). Le navigateur ne déclenche
// `beforeinstallprompt` qu'UNE fois, tôt au chargement : l'écoute doit donc
// vivre au niveau de l'app (pages/_app.js) et non dans la page /espace, sinon
// l'événement, émis sur /espace/login, serait déjà perdu quand l'étudiant
// arrive sur /espace par navigation interne.
const InstallationContext = createContext({ peutInstaller: false, installer: async () => {}, iosManuel: false });

function estDejaInstallee() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

function estIOS() {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ se présente comme un Mac : on le distingue par l'écran tactile.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
}

export function InstallationProvider({ children }) {
  const [evenement, setEvenement] = useState(null);
  const [installee, setInstallee] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (estDejaInstallee()) {
      setInstallee(true);
      return undefined;
    }
    setIos(estIOS());

    const surInvite = (e) => {
      e.preventDefault(); // on affiche notre propre bouton plutôt que la mini-barre du navigateur
      setEvenement(e);
    };
    const surInstallation = () => {
      setInstallee(true);
      setEvenement(null);
    };

    window.addEventListener('beforeinstallprompt', surInvite);
    window.addEventListener('appinstalled', surInstallation);
    return () => {
      window.removeEventListener('beforeinstallprompt', surInvite);
      window.removeEventListener('appinstalled', surInstallation);
    };
  }, []);

  const valeur = useMemo(
    () => ({
      // Bouton uniquement si le navigateur propose réellement l'installation.
      peutInstaller: !installee && evenement !== null,
      // Safari iOS n'a pas cet événement : on affichera une instruction à la place.
      iosManuel: !installee && ios && evenement === null,
      installer: async () => {
        if (!evenement) return;
        evenement.prompt();
        try {
          await evenement.userChoice;
        } finally {
          setEvenement(null); // l'événement n'est utilisable qu'une seule fois
        }
      },
    }),
    [evenement, installee, ios]
  );

  return <InstallationContext.Provider value={valeur}>{children}</InstallationContext.Provider>;
}

export function useInstallation() {
  return useContext(InstallationContext);
}
