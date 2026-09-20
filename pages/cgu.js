import Link from 'next/link';

// Texte intégral tel que fourni dans CGU_Plateforme_Diplomes.docx — ne pas
// reformuler : c'est un document juridique, toute modification de fond doit
// venir du document source, pas d'une édition directe de cette page.
const ARTICLES = [
  {
    titre: 'Article 1 — Objet',
    paragraphes: [
      "Les présentes Conditions Générales d'Utilisation (« CGU ») ont pour objet de définir les modalités et conditions d'accès et d'utilisation de la plateforme de vérification numérique de documents académiques (« la Plateforme »), actuellement en phase de pilote avec l'École Nationale Supérieure Polytechnique de Yaoundé (« l'ENSPY »).",
      "L'utilisation de la Plateforme, sous quelque forme que ce soit, vaut acceptation pleine et entière des présentes CGU par l'utilisateur.",
    ],
  },
  {
    titre: 'Article 2 — Définitions',
    liste: [
      '« Plateforme » : le site et les services décrits dans les présentes CGU.',
      "« Utilisateur » : toute personne physique accédant à la Plateforme, qu'elle soit étudiant, ancien étudiant, agent de la scolarité, ou tiers vérificateur.",
      '« Document » : tout document académique (attestation de réussite, de diplôme, de scolarité, relevé de notes) concerné par les services de la Plateforme.',
      "« Publication » : l'action, réservée à un agent habilité de la scolarité, consistant à rendre un Document vérifiable en ligne au moyen d'un code de vérification et d'un QR code.",
    ],
  },
  {
    titre: 'Article 3 — Description du service',
    paragraphes: [
      "La Plateforme ne délivre ni n'émet aucun document académique. Elle permet uniquement de publier une version numérique vérifiable d'un document déjà délivré, dans son format officiel, par l'établissement d'enseignement concerné. La validité juridique d'un Document demeure entièrement déterminée par l'établissement émetteur ; la Plateforme atteste uniquement que la version numérique consultée correspond, sans altération, au document ayant fait l'objet d'une Publication.",
      "Toute demande de publication d'un Document par un Utilisateur fait l'objet d'une vérification par un agent habilité de la scolarité avant toute Publication effective, et peut être rejetée si le Document ne peut être authentifié.",
    ],
  },
  {
    titre: 'Article 4 — Accès à la Plateforme',
    paragraphes: [
      "L'accès à l'espace personnel d'un étudiant ou ancien étudiant nécessite une authentification par matricule et code de vérification à usage unique transmis par voie électronique. L'accès à l'espace de la scolarité est réservé aux personnes habilitées par l'ENSPY. La page de vérification publique d'un Document est accessible librement, sans authentification, à toute personne disposant du code de vérification ou du QR code correspondant.",
    ],
  },
  {
    titre: "Article 5 — Obligations de l'utilisateur",
    liste: [
      'Fournir des informations exactes lors de toute demande de publication ou de duplicata.',
      'Ne soumettre que des documents dont il est le titulaire légitime.',
      'Ne pas tenter de publier, faire publier ou altérer un document dans l\'intention de tromper un tiers.',
      "Ne pas tenter de contourner les mécanismes d'authentification ou de vérification de la Plateforme.",
    ],
    apres: [
      "Toute violation des obligations ci-dessus peut entraîner le rejet de la demande, la révocation d'un Document déjà publié, et, le cas échéant, être portée à la connaissance de l'ENSPY et des autorités compétentes.",
    ],
  },
  {
    titre: 'Article 6 — Protection des données à caractère personnel',
    paragraphes: [
      "Conformément à la Loi n°2024/017 du 23 décembre 2024 portant protection des données à caractère personnel au Cameroun, les données collectées (nom, prénom, date de naissance, matricule, adresse électronique, et documents transmis) font l'objet d'un traitement dont les finalités sont limitées à la vérification et à la publication des Documents concernés.",
      "L'Utilisateur dispose, dans les conditions prévues par la loi, d'un droit d'accès, de rectification, d'opposition et de suppression des données le concernant, qu'il peut exercer auprès du responsable du traitement dont les coordonnées figurent à l'Article 10.",
      "La Plateforme met en œuvre des mesures techniques appropriées, notamment le chiffrement des données à caractère personnel sensibles, afin d'en garantir la confidentialité et l'intégrité.",
      "Le consentement de l'Utilisateur est recueilli de façon libre, spécifique et éclairée avant toute collecte de données, et peut être retiré à tout moment, sans effet rétroactif sur les traitements déjà réalisés.",
    ],
  },
  {
    titre: 'Article 7 — Tarifs',
    paragraphes: [
      "Les tarifs affichés sur la Plateforme au titre de la présente phase pilote sont communiqués à titre indicatif. Aucun système de paiement effectif n'est, à ce stade, intégré à la Plateforme. Les tarifs de duplicata fixés par l'ENSPY, le cas échéant, demeurent distincts et sont à régler séparément auprès de l'établissement.",
    ],
  },
  {
    titre: 'Article 8 — Responsabilité',
    paragraphes: [
      "La Plateforme, en phase de pilote, est fournie « en l'état ». Elle ne saurait être tenue responsable des conséquences résultant d'une indisponibilité temporaire du service, d'une erreur de saisie commise par un Utilisateur, ou d'un usage non conforme aux présentes CGU. La Plateforme ne se substitue en aucun cas aux documents officiels délivrés par l'établissement émetteur, dont l'original conserve seul pleine valeur juridique sauf disposition contraire de l'établissement.",
    ],
  },
  {
    titre: 'Article 9 — Modification des CGU',
    paragraphes: [
      'Les présentes CGU peuvent être modifiées à tout moment. Les Utilisateurs seront informés de toute modification substantielle avant sa prise d\'effet.',
    ],
  },
  {
    titre: 'Article 10 — Droit applicable et contact',
    paragraphes: [
      'Les présentes CGU sont soumises au droit camerounais. Pour toute question relative aux présentes CGU ou à l\'exercice de vos droits sur vos données personnelles, vous pouvez contacter : [adresse email de contact à compléter].',
    ],
  },
];

export default function ConditionsGeneralesUtilisation() {
  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ fontSize: 13, color: '#666' }}>
        ← Retour à l'accueil
      </Link>

      <h1 style={{ fontSize: 22, marginTop: 12 }}>Conditions Générales d'Utilisation</h1>
      <p style={{ color: '#666', fontSize: 14, marginTop: -8 }}>
        Plateforme de vérification numérique de diplômes — Pilote ENSPY
      </p>

      {ARTICLES.map((article) => (
        <section key={article.titre} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16 }}>{article.titre}</h2>
          {article.paragraphes?.map((p, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: '#333' }}>
              {p}
            </p>
          ))}
          {article.liste && (
            <ul style={{ fontSize: 14, lineHeight: 1.6, color: '#333', paddingLeft: 20 }}>
              {article.liste.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {article.apres?.map((p, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: '#333' }}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
