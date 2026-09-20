import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { sessionValide } from '../../lib/adminSession';
import { LABELS_TYPE_DOCUMENT } from '../../lib/tarifs';

const STATUTS = [
  { valeur: 'EN_ATTENTE', label: 'En attente', couleur: '#b7791f', fond: '#fff8e6' },
  { valeur: 'VALIDEE', label: 'Validées', couleur: '#1e8449', fond: '#eafaf1' },
  { valeur: 'REJETEE', label: 'Rejetées', couleur: '#c0392b', fond: '#fdecea' },
];

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// Page protégée (agent de la scolarité). Tout est calculé à la volée : à
// l'échelle d'un MVP pilote, quelques requêtes de comptage suffisent.
export async function getServerSideProps({ req }) {
  if (!sessionValide(req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  const il_y_a_30_jours = new Date(Date.now() - 30 * MS_PAR_JOUR);

  const [
    nbEtudiants,
    nbDocuments,
    nbDocumentsRevoques,
    documentsParType,
    demandesGroupees,
    demandesValidees,
    nbConsultations,
    nbConsultations30j,
  ] = await Promise.all([
    prisma.etudiant.count(), // matricule @unique : un enregistrement = un étudiant distinct
    prisma.document.count(),
    prisma.document.count({ where: { revoque: true } }),
    prisma.document.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.demandePublication.groupBy({ by: ['nature', 'statut'], _count: { _all: true } }),
    prisma.demandePublication.findMany({
      where: { statut: 'VALIDEE', dateTraitement: { not: null } },
      select: { dateSoumission: true, dateTraitement: true },
    }),
    prisma.consultationVerification.count(),
    prisma.consultationVerification.count({ where: { date: { gte: il_y_a_30_jours } } }),
  ]);

  const parType = {};
  for (const g of documentsParType) parType[g.type] = g._count._all;

  const demandes = { PUBLICATION: {}, DUPLICATA: {} };
  for (const g of demandesGroupees) {
    if (demandes[g.nature]) demandes[g.nature][g.statut] = g._count._all;
  }

  const delaiMoyenJours = demandesValidees.length
    ? demandesValidees.reduce(
        (somme, d) => somme + (d.dateTraitement.getTime() - d.dateSoumission.getTime()),
        0
      ) /
      demandesValidees.length /
      MS_PAR_JOUR
    : null;

  return {
    props: {
      nbEtudiants,
      nbDocuments,
      nbDocumentsRevoques,
      parType,
      demandes,
      delaiMoyenJours,
      nbDemandesValidees: demandesValidees.length,
      nbConsultations,
      nbConsultations30j,
    },
  };
}

export default function AdminStatistiques({
  nbEtudiants,
  nbDocuments,
  nbDocumentsRevoques,
  parType,
  demandes,
  delaiMoyenJours,
  nbDemandesValidees,
  nbConsultations,
  nbConsultations30j,
}) {
  // Types connus d'abord (même à 0), puis d'éventuels types inattendus en base.
  const typesAffiches = [
    ...Object.keys(LABELS_TYPE_DOCUMENT),
    ...Object.keys(parType).filter((t) => !(t in LABELS_TYPE_DOCUMENT)),
  ];

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20 }}>Statistiques — ENSPY (pilote)</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/admin/demandes" style={{ fontSize: 13, color: '#666' }}>
            Demandes à examiner
          </Link>
          <Link href="/admin/emettre" style={{ fontSize: 13, color: '#666' }}>
            Publier un document
          </Link>
        </div>
      </div>

      <Section titre="Étudiants">
        <Compteur valeur={nbEtudiants} label="Étudiants distincts enregistrés" />
      </Section>

      <Section titre="Documents publiés">
        <Compteur
          valeur={nbDocuments}
          label="Documents publiés au total"
          note={nbDocumentsRevoques > 0 ? `dont ${nbDocumentsRevoques} révoqué${nbDocumentsRevoques > 1 ? 's' : ''}` : null}
        />
        {typesAffiches.map((type) => (
          <Compteur key={type} valeur={parType[type] || 0} label={LABELS_TYPE_DOCUMENT[type] || type} petit />
        ))}
      </Section>

      <Section titre="Demandes des étudiants">
        <GroupeDemandes titre="Demandes de publication" comptes={demandes.PUBLICATION} />
        <GroupeDemandes titre="Demandes de duplicata" comptes={demandes.DUPLICATA} />
      </Section>

      <Section titre="Délai de traitement">
        <Compteur
          valeur={delaiMoyenJours === null ? '—' : formaterJours(delaiMoyenJours)}
          label="Délai moyen entre soumission et validation"
          note={
            delaiMoyenJours === null
              ? 'aucune demande validée pour le moment'
              : `calculé sur ${nbDemandesValidees} demande${nbDemandesValidees > 1 ? 's' : ''} validée${nbDemandesValidees > 1 ? 's' : ''}`
          }
        />
      </Section>

      <Section titre="Consultations de la page de vérification">
        <Compteur valeur={nbConsultations} label="Consultations au total" />
        <Compteur valeur={nbConsultations30j} label="Sur les 30 derniers jours" />
        <p style={{ flexBasis: '100%', margin: 0, fontSize: 12, color: '#888' }}>
          Chaque chargement de /verifier/[code] pour un document existant compte pour une
          consultation (un même visiteur qui recharge la page est compté plusieurs fois). Aucune
          information sur le visiteur n'est conservée. Le comptage démarre à l'activation de cette
          fonctionnalité.
        </p>
      </Section>
    </div>
  );
}

function formaterJours(jours) {
  if (jours < 1) return '< 1 jour';
  const arrondi = Math.round(jours * 10) / 10;
  return `${String(arrondi).replace('.', ',')} j`;
}

function Section({ titre, children }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{titre}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{children}</div>
    </section>
  );
}

function Compteur({ valeur, label, note, petit = false, couleur = '#222', fond = '#fafafa' }) {
  return (
    <div
      style={{
        flex: petit ? '1 1 150px' : '1 1 200px',
        minWidth: 0,
        padding: petit ? 12 : 16,
        border: '1px solid #eee',
        borderRadius: 8,
        background: fond,
      }}
    >
      <div style={{ fontSize: petit ? 24 : 32, fontWeight: 700, color: couleur, lineHeight: 1.1 }}>{valeur}</div>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{label}</div>
      {note && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function GroupeDemandes({ titre, comptes }) {
  const total = STATUTS.reduce((s, st) => s + (comptes[st.valeur] || 0), 0);
  return (
    <div style={{ flexBasis: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 8px' }}>
        {titre} <span style={{ fontWeight: 400, color: '#888' }}>({total} au total)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {STATUTS.map((st) => (
          <Compteur
            key={st.valeur}
            valeur={comptes[st.valeur] || 0}
            label={st.label}
            petit
            couleur={st.couleur}
            fond={st.fond}
          />
        ))}
      </div>
    </div>
  );
}
