import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Brand, Field } from "@/components/ui";
import { loginAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await currentStaff()) redirect("/studio");
  return (
    <main id="main" className="auth-shell">
      <div className="auth-panel glass-strong">
        <Brand />
        <div className="stack-sm">
          <h1 className="page-title">Log in</h1>
          <p className="muted">For studio owners and instructors. Members don’t need to log in to book.</p>
        </div>
        <ActionForm action={loginAction} className="grid-form">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Password" name="password" type="password" required autoComplete="current-password" />
          <SubmitButton className="btn btn-primary btn-lg" pendingLabel="Logging in…">
            Log in
          </SubmitButton>
        </ActionForm>
        <p className="muted">
          New to Openweek? <Link href="/signup">Open a studio</Link>
        </p>
      </div>
    </main>
  );
}
