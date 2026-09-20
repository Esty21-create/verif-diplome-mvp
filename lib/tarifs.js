// Tarifs INDICATIFS uniquement — aucun système de paiement n'est branché sur
// ces montants pour l'instant (hors périmètre du MVP, cf. Cahier des Charges
// section 3). Affichés pour rendre le modèle économique visible et testable
// avant d'intégrer un vrai prestataire de paiement (ex: CamPay).
export const TARIFS = {
  ATTESTATION_REUSSITE: { local: 1500, diaspora: 8000 },
  ATTESTATION_SCOLARITE: { local: 1500, diaspora: 8000 },
  RELEVE_NOTES: { local: 2000, diaspora: 8000 },
  ATTESTATION_DIPLOME: { local: 3000, diaspora: 10000 },
};

export const LABELS_TYPE_DOCUMENT = {
  ATTESTATION_REUSSITE: 'Attestation de réussite',
  ATTESTATION_SCOLARITE: 'Attestation de scolarité',
  RELEVE_NOTES: 'Relevé de notes',
  ATTESTATION_DIPLOME: 'Attestation de diplôme',
};

export function formaterTarif(typeDocument) {
  const t = TARIFS[typeDocument];
  if (!t) return null;
  return {
    local: `${t.local.toLocaleString('fr-FR')} FCFA`,
    diaspora: `${t.diaspora.toLocaleString('fr-FR')} FCFA`,
  };
}

// Frais de PLATEFORME uniquement pour une demande de duplicata (traitement
// de la demande) — distincts des frais de duplicata que l'ENSPY fixe et
// encaisse elle-même séparément pour réémettre physiquement le document.
export const TARIF_DUPLICATA = { local: 1000, diaspora: 5 };

export function formaterTarifDuplicata() {
  return {
    local: `${TARIF_DUPLICATA.local.toLocaleString('fr-FR')} FCFA`,
    diaspora: `${TARIF_DUPLICATA.diaspora.toLocaleString('fr-FR')} EUR`,
  };
}
