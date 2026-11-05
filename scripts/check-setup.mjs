import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_SERVICE = 'db';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function run(command, cwd = root) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim() };
}

function check(name, fn) {
  try {
    const [status, detail] = fn();
    results.push({ name, status, detail });
  } catch (error) {
    results.push({ name, status: 'fail', detail: error.message });
  }
}

function major(version) {
  return Number(version.replace(/^v/, '').split('.')[0]);
}

function databaseUrl() {
  const envFile = join(root, 'backend', '.env');
  if (!existsSync(envFile)) return null;
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='));
  return line ? new URL(line.slice('DATABASE_URL='.length).trim()) : null;
}

check('Node.js 20+', () => [
  major(process.version) >= 20 ? 'pass' : 'fail',
  process.version,
]);

check('npm 10+', () => {
  const r = run('npm -v');
  if (!r.ok) return ['fail', 'npm not found'];
  return [major(r.out) >= 10 ? 'pass' : 'fail', r.out];
});

check('Git', () => {
  const r = run('git --version');
  return [r.ok ? 'pass' : 'fail', r.ok ? r.out : 'git not found'];
});

check('Docker running', () => {
  const r = run('docker info --format "{{.ServerVersion}}"');
  return r.ok
    ? ['pass', `Docker ${r.out}`]
    : ['fail', 'Docker is not installed, or Docker Desktop is not open'];
});

check('Docker Compose', () => {
  const r = run('docker compose version --short');
  return [r.ok ? 'pass' : 'fail', r.ok ? r.out : 'docker compose not found'];
});

for (const app of ['backend', 'frontend']) {
  check(`${app}: npm install`, () =>
    existsSync(join(root, app, 'node_modules'))
      ? ['pass', 'node_modules found']
      : ['fail', `run: cd ${app}; npm install`],
  );
  check(`${app}: .env file`, () =>
    existsSync(join(root, app, '.env'))
      ? ['pass', '.env found']
      : ['fail', `copy ${app}/.env.example to ${app}/.env`],
  );
}

const hasCompose =
  existsSync(join(root, 'docker-compose.yml')) ||
  existsSync(join(root, 'compose.yml'));
const hasPrisma = existsSync(join(root, 'backend', 'prisma', 'schema.prisma'));

check('Database container running', () => {
  if (!hasCompose) return ['skip', 'no docker-compose.yml yet (AGL-04)'];
  const r = run('docker compose ps --status running --services');
  const running = r.ok && r.out.split(/\r?\n/).includes(DB_SERVICE);
  return running
    ? ['pass', `service "${DB_SERVICE}" is running`]
    : ['fail', 'run: docker compose up -d'];
});

check('Migrations applied', () => {
  if (!hasPrisma) return ['skip', 'no Prisma schema yet (AGL-04)'];
  const r = run('npx prisma migrate status', join(root, 'backend'));
  return r.ok
    ? ['pass', 'database schema is up to date']
    : ['fail', 'run: cd backend; npx prisma migrate dev'];
});

check('Seed data loaded', () => {
  if (!hasCompose || !hasPrisma)
    return ['skip', 'no database setup yet (AGL-04)'];
  const url = databaseUrl();
  if (!url) return ['fail', 'DATABASE_URL missing in backend/.env'];
  const user = decodeURIComponent(url.username);
  const db = url.pathname.slice(1);
  const sql =
    'SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM projects), (SELECT count(*) FROM issues)';
  const r = run(
    `docker compose exec -T ${DB_SERVICE} psql -U ${user} -d ${db} -At -F , -c "${sql}"`,
  );
  if (!r.ok) return ['fail', 'could not read the database'];
  const [users, projects, issues] = r.out.split(',').map(Number);
  const detail = `${users} users, ${projects} projects, ${issues} issues`;
  return [users > 0 && projects > 0 && issues > 0 ? 'pass' : 'fail', detail];
});

const label = { pass: '[PASS]', fail: '[FAIL]', skip: '[SKIP]' };
console.log(`\nDevTrack setup check on ${hostname()}\n`);
for (const { name, status, detail } of results) {
  console.log(`${label[status]} ${name.padEnd(28)} ${detail}`);
}

const count = (s) => results.filter((r) => r.status === s).length;
const summary = `${count('pass')} pass, ${count('fail')} fail, ${count('skip')} skip`;
console.log(`\nResult: ${summary}\n`);
process.exitCode = count('fail') > 0 ? 1 : 0;
