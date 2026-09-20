import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { prisma } from '../lib/prisma';
import { matriculeSessionValide } from '../lib/etudiantSession';
import { dechiffrer } from '../lib/chiffrement';
import { formaterTarif, formaterTarifDuplicata, LABELS_TYPE_DOCUMENT } from '../lib/tarifs';

const TYPES_DOCUMENTS = Object.entries(LABELS_TYPE_DOCUMENT).map(([valeur, label]) => ({ valeur, label }));

// Page protégée : fusionnée dans l'espace personnel étudiant (même session
// que /espace, posée par /espace/login). Matricule/nom/prénom viennent du
// dossier déjà en base — l'étudiant n'a plus qu'à choisir le type de
// document et l'option upload/duplicata.
export async function getServerSideProps({ req }) {
  const matricule = matriculeSessionValide(req);
  if (!matricule) {
    return { redirect: { destination: '/espace/login', permanent: false } };
  }

  const etudiant = await prisma.etudiant.findUnique({ where: { matricule } });
  if (!etudiant) {
    return { redirect: { destination: '/espace/login', permanent: false } };
  }

  return {
    props: {
      etudiant: {
        matricule: etudiant.matricule,
        nom: dechiffrer(etudiant.nom),
        prenom: dechiffrer(etudiant.prenom),
      },
      // Filet de sécurité : normalement déjà acceptées à la première connexion
      // (/espace/login). Ne redemande le consentement ici que si, pour une
      // raison quelconque (session antérieure à cette fonctionnalité...), ce
      // n'est pas encore le cas.
      cguDejaAcceptees: Boolean(etudiant.dateAcceptationCGU),
    },
  };
}

const CHAMPS_VIDES = {
  nature: 'PUBLICATION', // 'PUBLICATION' | 'DUPLICATA'
  typeDocument: TYPES_DOCUMENTS[0].valeur,
  commentaireEtudiant: '',
};

export default function DemandePublication({ etudiant, cguDejaAcceptees }) {
  const router = useRouter();
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [fichier, setFichier] = useState(null);
  const [accepteCGU, setAccepteCGU] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);
  const [erreur, setErreur] = useState(null);

  const modifierChamp = (nom) => (e) => setChamps({ ...champs, [nom]: e.target.value });
  const estDuplicata = champs.nature === 'DUPLICATA';
  const tarif = estDuplicata ? formaterTarifDuplicata() : formaterTarif(champs.typeDocument);

  const soumettre = async (e) => {
    e.preventDefault();

    if (!estDuplicata && !fichier) {
      setErreur('Merci de joindre le document déjà en votre possession (PDF ou image scannée)');
      return;
    }

    if (!cguDejaAcceptees && !accepteCGU) {
      setErreur("Merci d'accepter les Conditions Générales d'Utilisation pour continuer");
      return;
    }

    setEnCours(true);
    setErreur(null);

    try {
      const donneesFormulaire = new FormData();
      Object.entries(champs).forEach(([nom, valeur]) => donneesFormulaire.append(nom, valeur));
      if (!estDuplicata) {
        donneesFormulaire.append('fichier', fichier);
      }
      if (!cguDejaAcceptees) {
        donneesFormulaire.append('accepteCGU', 'true');
      }

      const reponse = await fetch('/api/demandes', { method: 'POST', body: donneesFormulaire });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.erreur || 'Une erreur est survenue');
      } else {
        setEnvoyee(true);
        setChamps(CHAMPS_VIDES);
        setFichier(null);
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setEnCours(false);
    }
  };

  if (envoyee) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
        <div style={{ padding: 16, background: '#eafaf1', borderRadius: 6 }}>
          <p>
            <strong>Votre demande a été transmise à l'ENSPY.</strong> Délai de vérification estimé :
            3 à 5 jours ouvrés.
          </p>
          <p style={{ margin: 0 }}>
            Retrouvez son avancement à tout moment dans <Link href="/espace">Mon espace</Link>, à
            côté de vos documents déjà publiés.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setEnvoyee(false)}
            style={{ background: 'none', border: 'none', color: '#1e8449', cursor: 'pointer', fontSize: 13 }}
          >
            Envoyer une autre demande
          </button>
          <button
            type="button"
            onClick={() => router.push('/espace')}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}
          >
            Retour à mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <Link href="/espace" style={{ fontSize: 13, color: '#666' }}>
        ← Retour à mon espace
      </Link>
      <h1 style={{ fontSize: 20, marginTop: 8 }}>Demander la publication d'un document — ENSPY</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Vous souhaitez obtenir une version vérifiable en ligne (QR code) d'une attestation, d'un
        relevé de notes ou d'un diplôme émis par l'école ? Un agent de la scolarité vérifiera
        votre demande avant toute publication — rien n'est publié automatiquement.
      </p>
      <p style={{ fontSize: 13, color: '#666', background: '#f7f7f7', padding: 10, borderRadius: 6 }}>
        Demande soumise pour <strong>{etudiant.prenom} {etudiant.nom}</strong> — matricule{' '}
        <strong>{etudiant.matricule}</strong>
      </p>

      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <OptionNature
          valeur="PUBLICATION"
          selectionnee={champs.nature === 'PUBLICATION'}
          onSelect={() => setChamps({ ...champs, nature: 'PUBLICATION' })}
          titre="J'ai déjà mon document en ma possession"
          description="Je le téléverse (PDF ou image scannée) pour le faire vérifier et publier."
        />
        <OptionNature
          valeur="DUPLICATA"
          selectionnee={estDuplicata}
          onSelect={() => setChamps({ ...champs, nature: 'DUPLICATA' })}
          titre="Je n'ai plus mon document (demande de duplicata)"
          description="L'école doit d'abord me réémettre le document avant toute publication."
        />
      </div>

      <form onSubmit={soumettre} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>
            {estDuplicata ? 'Type de document perdu' : 'Type de document'}
          </span>
          <select value={champs.typeDocument} onChange={modifierChamp('typeDocument')}>
            {TYPES_DOCUMENTS.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {estDuplicata ? (
          <>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#444' }}>
                Expliquez les circonstances (optionnel)
              </span>
              <textarea
                value={champs.commentaireEtudiant}
                onChange={modifierChamp('commentaireEtudiant')}
                rows={3}
                placeholder="ex: document perdu lors d'un déménagement"
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical' }}
              />
            </label>

            {tarif && (
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                Tarif indicatif : {tarif.local} (local) / {tarif.diaspora} (diaspora). Ce montant
                correspond uniquement aux frais de traitement de la demande sur la plateforme. Des
                frais de duplicata fixés par l'ENSPY s'ajoutent, à régler séparément auprès de
                l'école.
              </p>
            )}
          </>
        ) : (
          <>
            {tarif && (
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                Tarif indicatif : {tarif.local} (local) / {tarif.diaspora} (diaspora) —
                aucun paiement n'est encore branché sur ce MVP, affichage informatif seulement.
              </p>
            )}

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#444' }}>
                Document déjà en votre possession (PDF ou image scannée) *
              </span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                required
                onChange={(e) => setFichier(e.target.files?.[0] || null)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, background: 'white' }}
              />
            </label>
          </>
        )}

        {!cguDejaAcceptees && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#444' }}>
            <input
              type="checkbox"
              checked={accepteCGU}
              onChange={(e) => setAccepteCGU(e.target.checked)}
              required
              style={{ marginTop: 3 }}
            />
            <span>
              J'ai lu et j'accepte les{' '}
              <Link href="/cgu" target="_blank">
                Conditions Générales d'Utilisation
              </Link>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={enCours || (!cguDejaAcceptees && !accepteCGU)}
          style={{
            padding: '10px 16px',
            background: '#1e8449',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {enCours ? 'Envoi en cours…' : 'Envoyer ma demande'}
        </button>
      </form>

      {erreur && <p style={{ color: '#c0392b', marginTop: 16 }}>{erreur}</p>}
    </div>
  );
}

function OptionNature({ valeur, selectionnee, onSelect, titre, description }) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: 12,
        border: `1px solid ${selectionnee ? '#1e8449' : '#ddd'}`,
        borderRadius: 6,
        background: selectionnee ? '#eafaf1' : 'white',
        cursor: 'pointer',
      }}
    >
      <input
        type="radio"
        name="nature"
        value={valeur}
        checked={selectionnee}
        onChange={onSelect}
        style={{ marginTop: 3 }}
      />
      <span>
        <span style={{ display: 'block', fontWeight: 500 }}>{titre}</span>
        <span style={{ display: 'block', fontSize: 13, color: '#666' }}>{description}</span>
      </span>
    </label>
  );
}
