import Link from "next/link";
import { Brand, Field, Flash } from "@/components/ui";
import { loginAction } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main id="main" className="wrap page" style={{ maxWidth: 480 }}>
      <Brand />
      <h1 style={{ marginTop: 24 }}>Log in</h1>
      <Flash message={query.error} />
      <form className="grid-form" action={loginAction}>
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <button className="btn btn-primary" type="submit">
          Log in
        </button>
      </form>
      <p className="muted">
        New here? <Link href="/signup">Open a studio</Link>
      </p>
    </main>
  );
}
