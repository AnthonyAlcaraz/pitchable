/**
 * Startup migration: add new enum values that prisma generate knows about
 * but haven't been pushed to the database yet.
 *
 * Uses $executeRawUnsafe so we don't need the prisma CLI / schema engine at runtime.
 * PostgreSQL 12+ supports ALTER TYPE ... ADD VALUE IF NOT EXISTS inside transactions.
 */
import { PrismaClient } from '../dist/generated/prisma/client.js';

const prisma = new PrismaClient();

const enumAdditions = [
  `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'OUTLINE_GENERATION'`,
  `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'SLIDE_MODIFICATION'`,
  `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE'`,
];

try {
  for (const sql of enumAdditions) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Enum migration complete');
} catch (err) {
  console.error('Enum migration failed:', err.message);
  // Non-fatal: the values may already exist or the enum type may not exist yet
} finally {
  await prisma.$disconnect();
}
