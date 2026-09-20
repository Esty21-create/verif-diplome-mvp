import { useRouter } from 'next/router';
import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { matriculeSessionValide } from '../../lib/etudiantSession';
import { dechiffrer } from '../../lib/chiffrement';
import LogoEnspy from '../../components/LogoEnspy';
import { formaterTarif, LABELS_TYPE_DOCUMENT } from '../../lib/tarifs';

// Page protégée : même principe que /admin/emettre côté agent, mais pour
// l'étudiant (session posée par /espace/login, matricule + date de naissance).
export async function getServerSideProps({ req }) {
  const matricule = matriculeSessionValide(req);
  if (!matricule) {
    return { redirect: { destination: '/espace/login', permanent: false } };
  }

  const etudiant = await prisma.etudiant.findUnique({
    where: { matricule },
    include: { documents: { where: { revoque: false }, orderBy: { dateEmission: 'desc' } } },
  });

  // Session valide mais étudiant disparu entre-temps (cas limite) : on
  // force une reconnexion plutôt que de planter.
  if (!etudiant) {
    return { redirect: { destination: '/espace/login', permanent: false } };
  }

  const demandes = await prisma.demandePublication.findMany({
    where: { matricule },
    orderBy: { dateSoumission: 'desc' },
  });

  return {
    props: {
      etudiant: {
        nom: dechiffrer(etudiant.nom),
        prenom: dechiffrer(etudiant.prenom),
        filiere: etudiant.filiere,
        scolarite: `${etudiant.anneeEntree} - ${etudiant.anneeSortie || 'en cours'}`,
      },
      documents: etudiant.documents.map((d) => ({
        id: d.id,
        type: d.type,
        intitule: d.intitule,
        niveau: d.niveau,
        anneeAcademique: d.anneeAcademique,
        semestre: d.semestre,
        dateEmission: d.dateEmission.toISOString(),
        codeVerif: d.codeVerif,
        urlTelechargement: `/${d.cheminFichier}`,
      })),
      demandes: demandes.map((d) => ({
        id: d.id,
        nature: d.nature,
        typeDocument: d.typeDocument,
        statut: d.statut,
        commentaireAdmin: d.commentaireAdmin,
        dateSoumission: d.dateSoumission.toISOString(),
      })),
    },
  };
}

const LABELS_STATUT = {
  EN_ATTENTE: { texte: 'En attente', couleur: '#b7791f', fond: '#fff8e6' },
  VALIDEE: { texte: 'Validée', couleur: '#1e8449', fond: '#eafaf1' },
  REJETEE: { texte: 'Rejetée', couleur: '#c0392b', fond: '#fdecea' },
};

export default function EspacePersonnel({ etudiant, documents, demandes }) {
  const router = useRouter();

  const seDeconnecter = async () => {
    await fetch('/api/espace/logout', { method: 'POST' });
    router.push('/espace/login');
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoEnspy taille={40} />
          Mon espace — Anciens étudiants ENSPY
        </h1>
        <button
          type="button"
          onClick={seDeconnecter}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}
        >
          Se déconnecter
        </button>
      </div>

      <p>Bonjour {etudiant.prenom} {etudiant.nom}</p>
      <p style={{ fontSize: 13, color: '#666' }}>
        {etudiant.filiere} — Scolarité : {etudiant.scolarite}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <h2 style={{ fontSize: 16 }}>Mes documents publiés</h2>
        <Link
          href="/demande-publication"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
            background: '#1e8449',
            padding: '8px 14px',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Soumettre un document ou demander un duplicata
        </Link>
      </div>

      {documents.length === 0 ? (
        <p style={{ color: '#666' }}>Aucun document disponible pour le moment.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
          {documents.map((doc) => {
            const tarif = formaterTarif(doc.type);
            return (
              <li key={doc.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 500 }}>{doc.intitule}</div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {doc.niveau} — Année académique {doc.anneeAcademique} — {doc.semestre}
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  Émis le {new Date(doc.dateEmission).toLocaleDateString('fr-FR')} — Code : {doc.codeVerif}
                </div>
                {tarif && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Tarif indicatif de délivrance : {tarif.local} (local) / {tarif.diaspora} (diaspora)
                  </div>
                )}
                <a href={doc.urlTelechargement} target="_blank" rel="noreferrer">
                  Télécharger le PDF
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Mes demandes en cours</h2>
      {demandes.length === 0 ? (
        <p style={{ color: '#666' }}>Aucune demande soumise pour le moment.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
          {demandes.map((d) => {
            const statut = LABELS_STATUT[d.statut] || LABELS_STATUT.EN_ATTENTE;
            return (
              <li key={d.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>
                    {LABELS_TYPE_DOCUMENT[d.typeDocument] || d.typeDocument}
                    {d.nature === 'DUPLICATA' && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#6b46c1',
                          background: '#f1eafc',
                        }}
                      >
                        Duplicata
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      color: statut.couleur,
                      background: statut.fond,
                    }}
                  >
                    {statut.texte}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  Soumise le {new Date(d.dateSoumission).toLocaleDateString('fr-FR')}
                </div>
                {d.statut === 'REJETEE' && d.commentaireAdmin && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    <strong>Motif :</strong> {d.commentaireAdmin}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
