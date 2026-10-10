import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { logoutAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const links = [
  ["/studio", "Home"],
  ["/studio/schedule", "Schedule"],
  ["/studio/offerings", "Passes"],
  ["/studio/check-in", "Roster"],
  ["/studio/members", "Members"],
  ["/studio/policies", "Policies"],
  ["/studio/reports", "Reports"],
  ["/studio/import", "Import"],
  ["/studio/settings", "Settings"],
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  return (
    <>
      <header className="topbar">
        <div className="wrap" style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Brand href="/studio" />
          <div className="row">
            <span className="muted">{staff.studioName}</span>
            <form action={logoutAction}>
              <button className="btn btn-ghost btn-sm" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="wrap">
        <nav className="nav" aria-label="Studio" style={{ padding: "12px 0" }}>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <main id="main" className="wrap page">
        {children}
      </main>
    </>
  );
}
