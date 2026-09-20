// Identité enregistrée dans le journal tant que l'admin n'a qu'un mot de
// passe partagé (voir lib/adminSession.js et le modèle JournalEmission).
export const PUBLIE_PAR_AGENT = 'agent-scolarite';

// Crée le document ET sa ligne de journal dans une même transaction : pas de
// document publié sans trace, ni de trace pour un document jamais créé.
export function creerDocumentJournalise(prisma, donneesDocument, { source, demandeId = null }) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.create({ data: donneesDocument });
    await tx.journalEmission.create({
      data: {
        codeVerif: document.codeVerif,
        publiePar: PUBLIE_PAR_AGENT,
        source,
        demandeId,
      },
    });
    return document;
  });
}
