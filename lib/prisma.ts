import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production" || connectionString?.includes("supabase.com") || connectionString?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 10,
});

pool.on("error", (err) => {
  console.warn("PostgreSQL Pool error (non-fatal):", err.message);
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function safeDbQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T,
  timeoutMs: number = 3000
): Promise<T> {
  if (!connectionString) {
    return fallbackValue;
  }

  try {
    const timeoutPromise = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), timeoutMs)
    );
    const result = await Promise.race([queryFn(), timeoutPromise]);
    return result ?? fallbackValue;
  } catch (error) {
    console.warn("Prisma query failed, using resilient fallback:", error instanceof Error ? error.message : error);
    return fallbackValue;
  }
}
