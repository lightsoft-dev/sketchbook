/**
 * Prisma 클라이언트 싱글톤.
 * dev HMR 에서 클라이언트가 중복 생성되지 않도록 global 캐싱.
 */

import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { _skPrisma?: PrismaClient };

export const prisma =
  globalForPrisma._skPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma._skPrisma = prisma;
