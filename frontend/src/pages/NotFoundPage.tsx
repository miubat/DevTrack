import { Link } from 'react-router';

function NotFoundPage() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Go to home</Link>
    </main>
  );
}

export default NotFoundPage;
