import { prisma } from '../../lib/prisma';
import { dechiffrer } from '../../lib/chiffrement';
import LogoEnspy from '../../components/LogoEnspy';

// Rendu côté serveur : la page fonctionne même si le visiteur (employeur,
// ambassade...) désactive JavaScript, et évite un aller-retour API visible.
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
  if (statut === 'introuvable') {
    return (
      <Conteneur>
        <Badge couleur="#c0392b" texte="✕ Document introuvable" />
        <p>Aucun document ne correspond à ce code. Vérifiez qu'il a été correctement saisi.</p>
      </Conteneur>
    );
  }

  if (statut === 'revoque') {
    return (
      <Conteneur>
        <Badge couleur="#c0392b" texte="✕ Document révoqué" />
        <p>Ce document a été révoqué par l'université émettrice et n'est plus valide.</p>
      </Conteneur>
    );
  }

  return (
    <Conteneur>
      <Badge couleur="#1e8449" texte="✓ Document authentique" />
      <table style={{ marginTop: 24, width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <Ligne label="Université émettrice" valeur={document.universite} />
          <Ligne label="Document" valeur={document.intitule} />
          <Ligne label="Titulaire" valeur={document.nomComplet} />
          <Ligne label="Filière" valeur={document.filiere} />
          <Ligne label="Niveau" valeur={document.niveau} />
          <Ligne label="Année académique" valeur={document.anneeAcademique} />
          <Ligne label="Semestre" valeur={document.semestre} />
          <Ligne
            label="Date d'émission"
            valeur={new Date(document.dateEmission).toLocaleDateString('fr-FR')}
          />
          <Ligne label="Code de vérification" valeur={document.codeVerif} />
        </tbody>
      </table>
    </Conteneur>
  );
}

function Conteneur({ children }) {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoEnspy taille={40} />
        Vérification de document académique
      </h1>
      {children}
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
