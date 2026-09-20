// En développement, Next.js recharge le code souvent : on évite de recréer
// une connexion à chaque rechargement en réutilisant une instance globale.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
