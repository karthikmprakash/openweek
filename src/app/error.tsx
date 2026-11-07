"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function developmentMessage(error: ErrorPageProps["error"]): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const message = developmentMessage(error);

  return (
    <main id="main" className="wrap page">
      <h1>Something went wrong</h1>
      <p className="muted">The studio hit an unexpected problem. Try again in a moment.</p>
      {message ? (
        <p className="banner" role="alert">
          {message}
        </p>
      ) : null}
      <div className="row">
        <button className="btn btn-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link className="btn btn-secondary" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
