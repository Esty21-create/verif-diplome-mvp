import { Html, Head, Main, NextScript } from 'next/document';

// lang="fr" au rendu serveur (langue par défaut) ; LangueProvider met
// l'attribut à jour côté client quand l'utilisateur bascule en anglais.
export default function Document() {
  return (
    <Html lang="fr">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
