// Runs before every API test file.
// Safety check: the API tests log in, create tokens and change data,
// so they must never run against your normal dev database.

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.test.example to backend/.env.test.',
  );
}

const dbName = new URL(url).pathname.replace(/^\//, '');
const isCi = process.env.CI === 'true';

if (!dbName.endsWith('_test') && !isCi) {
  throw new Error(
    `API tests refuse to run on database "${dbName}". ` +
      'Use a database whose name ends with _test (see backend/.env.test.example).',
  );
}
