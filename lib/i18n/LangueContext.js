import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import fr from './fr';
import en from './en';

// Approche volontairement minimale pour ce MVP : un dictionnaire par langue
// (fr.js / en.js) + un contexte React, sans librairie i18n. Le français
// reste la langue par défaut (contenu déjà rédigé en français partout) ; le
// choix de l'utilisateur est mémorisé dans localStorage, donc perdu en
// navigation privée ou si le JavaScript est désactivé — acceptable ici car
// le français par défaut reste pleinement fonctionnel sans JS (voir
// pages/verifier/[code].js).
const DICTIONNAIRES = { fr, en };
const LOCALES_DATE = { fr: 'fr-FR', en: 'en-GB' };
const CLE_STOCKAGE = 'verif-diplome:langue';

const LangueContext = createContext(null);

export function LangueProvider({ children }) {
  const [langue, setLangueEtat] = useState('fr');

  useEffect(() => {
    try {
      const enregistree = window.localStorage.getItem(CLE_STOCKAGE);
      if (enregistree === 'fr' || enregistree === 'en') {
        setLangueEtat(enregistree);
      }
    } catch {
      // localStorage indisponible (navigation privée, etc.) : on reste en français.
    }
  }, []);

  // Garde <html lang> synchronisé (lecteurs d'écran, traduction automatique
  // du navigateur) ; le rendu serveur part de lang="fr", voir pages/_document.js.
  useEffect(() => {
    document.documentElement.lang = langue;
  }, [langue]);

  const setLangue = (nouvelleLangue) => {
    setLangueEtat(nouvelleLangue);
    try {
      window.localStorage.setItem(CLE_STOCKAGE, nouvelleLangue);
    } catch {
      // Le choix ne survivra pas à un rechargement, tant pis.
    }
  };

  const valeur = useMemo(() => {
    const dictionnaire = DICTIONNAIRES[langue];

    // t("espace.bonjour", { prenom, nom }) : va chercher la clé à points
    // dans le dictionnaire courant, puis remplace les {{variables}}.
    function t(cle, variables) {
      const brut = cle
        .split('.')
        .reduce((acc, segment) => (acc && typeof acc === 'object' ? acc[segment] : undefined), dictionnaire);
      let texte = typeof brut === 'string' ? brut : cle;
      if (variables) {
        for (const [nom, val] of Object.entries(variables)) {
          texte = texte.replaceAll(`{{${nom}}}`, val ?? '');
        }
      }
      return texte;
    }

    return { langue, setLangue, t, localeDate: LOCALES_DATE[langue] };
  }, [langue]);

  return <LangueContext.Provider value={valeur}>{children}</LangueContext.Provider>;
}

export function useLangue() {
  const contexte = useContext(LangueContext);
  if (!contexte) {
    throw new Error('useLangue() doit être appelé sous LangueProvider (voir pages/_app.js)');
  }
  return contexte;
}
