import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { dechiffrer } from '../../lib/chiffrement';
import { useLangue } from '../../lib/i18n/LangueContext';
import LogoEnspy from '../../components/LogoEnspy';
import LogoMinesup from '../../components/LogoMinesup';
import LogoAntic from '../../components/LogoAntic';

// Rendu côté serveur : la page fonctionne même si le visiteur (employeur,
// ambassade...) désactive JavaScript, et évite un aller-retour API visible.
// Sans JavaScript, le contenu reste en français (langue par défaut) — le
// sélecteur FR/EN (voir pages/_app.js) nécessite en revanche du JS pour
// basculer la traduction affichée.
export async function getServerSideProps({ params }) {
  const document = await prisma.document.findUnique({
    where: { codeVerif: params.code },
    include: { etudiant: true },
  });

  if (!document) {
    return { props: { statut: 'introuvable' } };
  }

  if (document.revoque) {
    return { props: { statut: 'revoque' } };
  }

  return {
    props: {
      statut: 'valide',
      document: {
        universite: document.universite,
        intitule: document.intitule,
        nomComplet: `${dechiffrer(document.etudiant.nom)} ${dechiffrer(document.etudiant.prenom)}`,
        filiere: document.etudiant.filiere,
        niveau: document.niveau,
        anneeAcademique: document.anneeAcademique,
        semestre: document.semestre,
        dateEmission: document.dateEmission.toISOString(),
        codeVerif: document.codeVerif,
      },
    },
  };
}

export default function PageVerification({ statut, document }) {
  const { t, localeDate } = useLangue();

  if (statut === 'introuvable') {
    return (
      <Conteneur>
        <Badge couleur="#c0392b" texte={t('verifier.introuvable')} />
        <p>{t('verifier.introuvableTexte')}</p>
      </Conteneur>
    );
  }

  if (statut === 'revoque') {
    return (
      <Conteneur>
        <Badge couleur="#c0392b" texte={t('verifier.revoque')} />
        <p>{t('verifier.revoqueTexte')}</p>
      </Conteneur>
    );
  }

  return (
    <Conteneur>
      <Badge couleur="#1e8449" texte={t('verifier.authentique')} />
      <table style={{ marginTop: 24, width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <Ligne label={t('verifier.universite')} valeur={document.universite} />
          <Ligne label={t('verifier.document')} valeur={document.intitule} />
          <Ligne label={t('verifier.titulaire')} valeur={document.nomComplet} />
          <Ligne label={t('verifier.filiere')} valeur={document.filiere} />
          <Ligne label={t('verifier.niveau')} valeur={document.niveau} />
          <Ligne label={t('verifier.anneeAcademique')} valeur={document.anneeAcademique} />
          <Ligne label={t('verifier.semestre')} valeur={document.semestre} />
          <Ligne
            label={t('verifier.dateEmission')}
            valeur={new Date(document.dateEmission).toLocaleDateString(localeDate)}
          />
          <Ligne label={t('verifier.codeVerification')} valeur={document.codeVerif} />
        </tbody>
      </table>
    </Conteneur>
  );
}

function Conteneur({ children }) {
  const { t } = useLangue();
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <LogoEnspy taille={40} />
        <LogoMinesup taille={40} />
        <LogoAntic taille={40} />
      </div>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>{t('verifier.titre')}</h1>
      {children}
      {/* Simple lien : aucune acceptation ni action requise pour consulter le résultat. */}
      <footer style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #eee', fontSize: 12 }}>
        <Link href="/cgu" style={{ color: '#888' }}>
          {t('verifier.mentionsLegales')}
        </Link>
      </footer>
    </div>
  );
}

function Badge({ couleur, texte }) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: 6,
        background: couleur,
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      {texte}
    </div>
  );
}

function Ligne({ label, valeur }) {
  return (
    <tr style={{ borderBottom: '1px solid #eee' }}>
      <td style={{ padding: '10px 0', color: '#666', width: '40%' }}>{label}</td>
      <td style={{ padding: '10px 0', fontWeight: 500 }}>{valeur}</td>
    </tr>
  );
}
