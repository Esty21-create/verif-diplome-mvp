// Ajoute un étudiant de test pour vérifier rapidement que tout fonctionne.
// Lancer avec : npm run seed (après prisma:migrate)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // lib/etudiantChiffrement.js est un module ES (voir lib/package.json) :
  // import() dynamique nécessaire pour le consommer depuis ce script CommonJS.
  const { chiffrerDonneesEtudiant } = await import('../lib/etudiantChiffrement.js');

  const donnees = chiffrerDonneesEtudiant({
    nom: 'MBALLA',
    prenom: 'Estelle',
    dateNaissance: new Date('1995-03-12'),
  });

  await prisma.etudiant.upsert({
    where: { matricule: '15G0123' },
    update: {},
    create: {
      matricule: '15G0123',
      ...donnees,
      anneeEntree: 2015,
      anneeSortie: 2020, // 1 an de plus que la normale : illustre une reprise de classe
      filiere: 'Génie Télécommunications (GET)',
      cycle: 'Ingénieur (5 ans)',
    },
  });
  console.log('Étudiant de test créé : matricule 15G0123, née le 12/03/1995');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
