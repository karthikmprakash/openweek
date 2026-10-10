import { Brand, Field, Flash } from "@/components/ui";
import { signupAction } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main id="main" className="wrap page" style={{ maxWidth: 520 }}>
      <Brand />
      <h1 style={{ marginTop: 24 }}>Open your studio</h1>
      <p className="muted">This creates the owner login. Members do not need one to book a drop-in.</p>
      <Flash message={query.error} />
      <form className="grid-form" action={signupAction}>
        <Field label="Studio name" name="studioName" required autoComplete="organization" />
        <Field label="Web address" name="slug" required hint="Letters, numbers, and dashes. Members will visit /s/this-name." />
        <Field label="Your name" name="ownerName" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <label className="field">
          <span>Timezone</span>
          <select name="timezone" defaultValue="America/Los_Angeles">
            <option value="America/Los_Angeles">Pacific</option>
            <option value="America/Denver">Mountain</option>
            <option value="America/Chicago">Central</option>
            <option value="America/New_York">Eastern</option>
            <option value="Europe/London">London</option>
            <option value="Asia/Kolkata">India</option>
          </select>
        </label>
        <button className="btn btn-primary btn-lg" type="submit">
          Create studio
        </button>
      </form>
    </main>
  );
}
