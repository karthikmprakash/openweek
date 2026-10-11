import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { SignupEnhancer } from "@/components/signup-enhancer";
import { TimezoneSelect } from "@/components/timezone-select";
import { Brand, Field } from "@/components/ui";
import { signupAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Open your studio" };

export default async function SignupPage() {
  if (await currentStaff()) redirect("/studio");
  return (
    <main id="main" className="auth-shell">
      <div className="auth-panel glass-strong auth-panel-wide">
        <Brand />
        <div className="stack-sm">
          <h1 className="page-title">Open your studio</h1>
          <p className="muted">Takes a minute. Members never need an account to book.</p>
        </div>
        <ActionForm action={signupAction} className="grid-form">
          <Field label="Studio name" name="studioName" required minLength={2} maxLength={80} autoComplete="organization" />
          <div className="field">
            <label htmlFor="slug">Web address</label>
            <span className="affix">
              <span className="affix-text" aria-hidden="true">
                /s/
              </span>
              <input
                id="slug"
                name="slug"
                required
                minLength={3}
                maxLength={40}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="slug-hint slug-preview"
              />
            </span>
            <p className="help" id="slug-hint">
              Lowercase letters, numbers, and dashes.
            </p>
            <SignupEnhancer />
          </div>
          <Field label="Your name" name="ownerName" required minLength={2} autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Password" name="password" type="password" required autoComplete="new-password" minLength={8} hint="At least 8 characters." />
          <div className="field">
            <label htmlFor="timezone">Time zone</label>
            <TimezoneSelect defaultValue="America/Los_Angeles" />
          </div>
          <SubmitButton className="btn btn-primary btn-lg" pendingLabel="Creating your studio…">
            Create studio
          </SubmitButton>
        </ActionForm>
        <p className="muted">
          Already have a studio? <Link href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
