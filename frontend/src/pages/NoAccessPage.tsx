import { Link } from 'react-router';

function NoAccessPage() {
  return (
    <main className="page">
      <h1>No access</h1>
      <p>
        You don't have access to this page. Ask an administrator if you need it.
      </p>
      <Link to="/">Go to home</Link>
    </main>
  );
}

export default NoAccessPage;
