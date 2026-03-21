import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../prisma/generated/prisma-worker/client";

export interface WorkerDatabaseBinding {
  prepare: (...args: any[]) => any;
  batch?: (...args: any[]) => any;
  exec?: (...args: any[]) => any;
}

export const createWorkerClient = (database: WorkerDatabaseBinding) => {
  const adapter = new PrismaD1(database as any);
  return new PrismaClient({
    adapter,
    log: ["error"],
  });
};
