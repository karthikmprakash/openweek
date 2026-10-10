import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="wrap page">
      <h1>That page is not here</h1>
      <p className="muted">The schedule link may be mistyped.</p>
      <Link className="btn btn-primary" href="/">
        Go home
      </Link>
    </main>
  );
}
