import { prisma } from '../../../../../lib/prisma';
import { sessionValide } from '../../../../../lib/adminSession';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  if (!sessionValide(req)) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }

  const { id } = req.query;
  const demande = await prisma.demandePublication.findUnique({ where: { id } });

  if (!demande) {
    return res.status(404).json({ erreur: 'Demande introuvable' });
  }
  if (demande.statut !== 'EN_ATTENTE') {
    return res.status(400).json({ erreur: 'Cette demande a déjà été traitée' });
  }

  const commentaireAdmin = (req.body?.commentaireAdmin || '').trim();
  if (!commentaireAdmin) {
    return res.status(400).json({ erreur: 'Le motif du rejet est obligatoire' });
  }

  await prisma.demandePublication.update({
    where: { id },
    data: { statut: 'REJETEE', dateTraitement: new Date(), commentaireAdmin },
  });

  return res.status(200).json({ message: 'Demande rejetée' });
}
