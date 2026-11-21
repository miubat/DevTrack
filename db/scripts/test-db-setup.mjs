// Creates (or resets) the devtrack_test database for the API tests.
// Same Docker Postgres as the dev database; your dev data is not touched.
// Usage: npm run db:test:setup   (the db container must be running: npm run db:up)
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_DB = 'devtrack_test';
const TEST_URL = `postgresql://devtrack:devtrack@localhost:5432/${TEST_DB}?schema=public`;

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to set up a test database in production.');
  process.exit(1);
}

function psql(sql) {
  const args = ['compose', 'exec', '-T', 'db', 'psql', '-U', 'devtrack', '-d', 'devtrack', '-v', 'ON_ERROR_STOP=1', '-tA'];
  return execFileSync('docker', args, { cwd: root, input: sql, encoding: 'utf8' }).trim();
}

function npmRun(script) {
  execFileSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true, // needed on Windows to find npm
    env: { ...process.env, DATABASE_URL: TEST_URL },
  });
}

// 1) Create the database once
const exists = psql(`SELECT 1 FROM pg_database WHERE datname = '${TEST_DB}';`);
if (exists === '1') {
  console.log(`Database ${TEST_DB} already exists.`);
} else {
  psql(`CREATE DATABASE ${TEST_DB};`);
  console.log(`Created database ${TEST_DB}.`);
}

// 2) Apply migrations, 3) load fresh seed data (the seed empties the tables first)
npmRun('db:migrate');
npmRun('db:seed');

console.log(`\n${TEST_DB} is ready. Run the API tests: cd ../backend && npm run test:e2e`);
