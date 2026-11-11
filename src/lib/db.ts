import { Pool } from "pg";
import { required } from "./env";

const g = globalThis as unknown as { _pool?: Pool };
export function pool(): Pool {
  if (!g._pool) g._pool = new Pool({ connectionString: required("DATABASE_URL"), max: 10 });
  return g._pool;
}
// All queries are parameterized ($1, $2...) - never concatenate user input into SQL.
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query(text, params)).rows as T[];
}
export async function q1<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}
