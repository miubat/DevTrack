import fs from 'node:fs';
import path from 'node:path';

// Load e2e/.env if it exists. CI passes the same names as environment variables instead.
const envFile = path.resolve(import.meta.dirname, '../.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export type Target = 'local' | 'staging';

export function getTarget(): Target {
  const target = process.env.TARGET ?? 'local';
  if (target !== 'local' && target !== 'staging') {
    throw new Error(`TARGET must be "local" or "staging", got "${target}"`);
  }
  return target;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
