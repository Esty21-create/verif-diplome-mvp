import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { sessionValide } from '../../lib/adminSession';
import { dechiffrer } from '../../lib/chiffrement';

const NB_DOCUMENTS = 100;
const NB_JOURNAL = 20;

const LABELS_SOURCE = {
  EMISSION_DIRECTE: 'Publication directe',
  VALIDATION_DEMANDE: 'Validation de demande',
};

// Page protégée : documents publiés + journal des dernières publications.
export async function getServerSideProps({ req }) {
  if (!sessionValide(req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  const [documents, journal] = await Promise.all([
    prisma.document.findMany({
      orderBy: { dateEmission: 'desc' },
      take: NB_DOCUMENTS,
      include: { etudiant: true },
    }),
    prisma.journalEmission.findMany({ orderBy: { date: 'desc' }, take: NB_JOURNAL }),
  ]);

  return {
    props: {
      documents: documents.map((d) => ({
        id: d.id,
        codeVerif: d.codeVerif,
        intitule: d.intitule,
        titulaire: `${dechiffrer(d.etudiant.nom)} ${dechiffrer(d.etudiant.prenom)}`,
        matricule: d.etudiant.matricule,
        dateEmission: d.dateEmission.toISOString(),
        revoque: d.revoque,
        urlTelechargement: `/${d.cheminFichier}`,
      })),
      journal: journal.map((j) => ({
        id: j.id,
        date: j.date.toISOString(),
        codeVerif: j.codeVerif,
        publiePar: j.publiePar,
        source: j.source,
        demandeId: j.demandeId,
      })),
    },
  };
}

const th = { padding: '8px 6px' };
const td = { padding: '8px 6px' };

export default function AdminDocuments({ documents, journal }) {
  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20 }}>Documents publiés — ENSPY (pilote)</h1>
        <Link href="/admin/emettre" style={{ fontSize: 13, color: '#666' }}>
          Publier un document
        </Link>
      </div>

      {documents.length === 0 ? (
        <p style={{ color: '#888', marginTop: 24 }}>Aucun document publié pour le moment.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', fontSize: 13, color: '#666' }}>
                <th style={th}>Code</th>
                <th style={th}>Document</th>
                <th style={th}>Titulaire</th>
                <th style={th}>Émis le</th>
                <th style={th}>Statut</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ ...td, fontFamily: 'monospace' }}>
                    <Link href={`/verifier/${d.codeVerif}`} style={{ color: '#1e8449' }}>
                      {d.codeVerif}
                    </Link>
                  </td>
                  <td style={td}>{d.intitule}</td>
                  <td style={td}>
                    {d.titulaire} <span style={{ color: '#999', fontSize: 12 }}>({d.matricule})</span>
                  </td>
                  <td style={td}>{new Date(d.dateEmission).toLocaleDateString('fr-FR')}</td>
                  <td style={td}>
                    {d.revoque ? (
                      <span style={{ color: '#c0392b', fontWeight: 500 }}>Révoqué</span>
                    ) : (
                      <span style={{ color: '#1e8449' }}>Valide</span>
                    )}
                  </td>
                  <td style={td}>
                    <a href={d.urlTelechargement} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 40 }}>Journal des publications</h2>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Les {NB_JOURNAL} dernières publications. L'accès admin étant un mot de passe partagé, le
        « publié par » indique le rôle, pas un agent en particulier.
      </p>

      {journal.length === 0 ? (
        <p style={{ color: '#888' }}>Aucune publication journalisée pour le moment.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', fontSize: 13, color: '#666' }}>
                <th style={th}>Date</th>
                <th style={th}>Code du document</th>
                <th style={th}>Publié par</th>
                <th style={th}>Origine</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((j) => (
                <tr key={j.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{new Date(j.date).toLocaleString('fr-FR')}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{j.codeVerif}</td>
                  <td style={td}>{j.publiePar}</td>
                  <td style={td}>
                    {j.demandeId ? (
                      <Link href={`/admin/demandes/${j.demandeId}`} style={{ color: '#1e8449' }}>
                        {LABELS_SOURCE[j.source] || j.source}
                      </Link>
                    ) : (
                      LABELS_SOURCE[j.source] || j.source
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
