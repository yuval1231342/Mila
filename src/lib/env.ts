export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConfigError(name);
  return v;
}
export class ConfigError extends Error {
  constructor(public variable: string) { super(`MISSING CONFIGURATION: ${variable}`); }
}
export const optional = (n: string) => process.env[n] || undefined;
