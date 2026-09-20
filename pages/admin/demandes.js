import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { sessionValide } from '../../lib/adminSession';
import { LABELS_TYPE_DOCUMENT } from '../../lib/tarifs';

// Page protégée : file d'attente des demandes de publication soumises par
// les étudiants eux-mêmes depuis /demande-publication.
export async function getServerSideProps({ req }) {
  if (!sessionValide(req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  const demandes = await prisma.demandePublication.findMany({
    orderBy: { dateSoumission: 'desc' },
  });

  return {
    props: {
      demandes: demandes.map((d) => ({
        id: d.id,
        nature: d.nature,
        matricule: d.matricule,
        nom: d.nom,
        prenom: d.prenom,
        typeDocument: d.typeDocument,
        statut: d.statut,
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

export default function AdminDemandes({ demandes }) {
  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20 }}>Demandes de publication — ENSPY (pilote)</h1>
        <Link href="/admin/emettre" style={{ fontSize: 13, color: '#666' }}>
          Publier un document directement
        </Link>
      </div>
      <p style={{ color: '#666', fontSize: 14 }}>
        Demandes soumises par les étudiants eux-mêmes depuis /demande-publication : publication
        d'un fichier déjà transmis, ou demande de duplicata (badge <strong>Duplicata</strong>) pour
        un document perdu. Aucune n'est publiée automatiquement.
      </p>

      {demandes.length === 0 ? (
        <p style={{ color: '#888', marginTop: 24 }}>Aucune demande pour le moment.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', fontSize: 13, color: '#666' }}>
              <th style={{ padding: '8px 6px' }}>Étudiant</th>
              <th style={{ padding: '8px 6px' }}>Matricule</th>
              <th style={{ padding: '8px 6px' }}>Document</th>
              <th style={{ padding: '8px 6px' }}>Soumise le</th>
              <th style={{ padding: '8px 6px' }}>Statut</th>
              <th style={{ padding: '8px 6px' }}></th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => {
              const statut = LABELS_STATUT[d.statut] || LABELS_STATUT.EN_ATTENTE;
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 6px' }}>{d.nom} {d.prenom}</td>
                  <td style={{ padding: '8px 6px' }}>{d.matricule}</td>
                  <td style={{ padding: '8px 6px' }}>
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
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    {new Date(d.dateSoumission).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
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
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <Link href={`/admin/demandes/${d.id}`} style={{ color: '#1e8449', fontSize: 13 }}>
                      {d.statut === 'EN_ATTENTE' ? 'Examiner' : 'Voir'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
