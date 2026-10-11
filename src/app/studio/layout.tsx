import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { StudioSidebarNav, StudioTabBar } from "@/components/studio-nav";
import { Brand } from "@/components/ui";
import { logoutAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const memberHref = `/s/${staff.slug}`;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand href="/studio" />
        <div className="sidebar-studio">
          <p className="sidebar-studio-name" title={staff.studioName}>
            {staff.studioName}
          </p>
          <p className="muted">{staff.name}</p>
        </div>
        <StudioSidebarNav />
        <div className="sidebar-foot">
          <a className="side-link" href={memberHref} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden />
            Member schedule
          </a>
          <form action={logoutAction}>
            <button className="side-link" type="submit">
              <LogOut size={16} aria-hidden />
              Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <Brand href="/studio" />
          <span className="chip" title={staff.studioName}>
            {staff.studioName}
          </span>
        </header>
        <main id="main" className="app-content">
          {children}
        </main>
      </div>
      <StudioTabBar memberHref={memberHref} logout={logoutAction} />
    </div>
  );
}
