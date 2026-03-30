import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const createClient = (connectionString: string) => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  return prisma;
};

export const prisma = process.env.DATABASE_URL
  ? createClient(process.env.DATABASE_URL)
  : (undefined as unknown as PrismaClient);
