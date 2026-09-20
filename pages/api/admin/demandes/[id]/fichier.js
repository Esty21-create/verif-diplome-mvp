import { prisma } from '../../../../../lib/prisma';
import { sessionValide } from '../../../../../lib/adminSession';
import { lireFichierDemande } from '../../../../../lib/demandesStorage';

// Sert le fichier brut d'une demande en attente. Réservé aux agents
// connectés : le fichier n'est pas dans /public tant que la demande n'est
// pas validée (voir lib/demandesStorage.js).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  if (!demande.cheminFichier) {
    return res.status(404).json({ erreur: 'Cette demande ne comporte aucun fichier (duplicata)' });
  }

  try {
    const buffer = lireFichierDemande(demande.cheminFichier);
    res.setHeader('Content-Type', demande.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${demande.nomFichierOriginal}"`);
    return res.status(200).send(buffer);
  } catch (erreur) {
    console.error(erreur);
    return res.status(404).json({ erreur: 'Fichier introuvable' });
  }
}
