import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const downDir = join(root, 'prisma', 'down');
const rollBackAll = process.argv.includes('--all');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function psql(sql) {
  const args = ['compose', 'exec', '-T', 'db', 'psql', '-U', 'devtrack', '-d', 'devtrack', '-v', 'ON_ERROR_STOP=1', '-tA'];
  try {
    return execFileSync('docker', args, { cwd: root, input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    const text = String(error.stderr || error.message).trim();
    const err = new Error(text);
    err.missingTable = text.includes('_prisma_migrations') && text.includes('does not exist');
    throw err;
  }
}

if (process.env.NODE_ENV === 'production') {
  fail('Refusing to roll back migrations in production.');
}

let applied;
try {
  applied = psql(
    'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name DESC;',
  )
    .split(/\r?\n/)
    .filter(Boolean);
} catch (error) {
  if (error.missingTable) {
    console.log('Nothing to roll back: no migrations have been applied.');
    process.exit(0);
  }
  fail(`Could not read applied migrations. Is the database running (npm run db:up)?\n${error.message}`);
}

if (applied.length === 0) {
  console.log('Nothing to roll back: no migrations have been applied.');
  process.exit(0);
}

const targets = rollBackAll ? applied : applied.slice(0, 1);

for (const name of targets) {
  if (!/^[0-9]{14}_[a-z0-9_]+$/.test(name)) fail(`Unexpected migration name: ${name}`);
  const file = join(downDir, name, 'down.sql');
  if (!existsSync(file)) fail(`Missing ${file}. Add a down.sql for this migration.`);
}

for (const name of targets) {
  const down = readFileSync(join(downDir, name, 'down.sql'), 'utf8');
  console.log(`Rolling back ${name} ...`);
  try {
    psql(`BEGIN;\n${down}\nDELETE FROM _prisma_migrations WHERE migration_name = '${name}';\nCOMMIT;`);
  } catch (error) {
    fail(`Rollback of ${name} failed and was not applied:\n${error.message}`);
  }
  console.log(`Rolled back ${name}.`);
}