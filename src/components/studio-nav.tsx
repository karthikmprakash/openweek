"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  type LucideIcon,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Ellipsis,
  ExternalLink,
  House,
  LogOut,
  Settings,
  ShieldCheck,
  Ticket,
  Upload,
  Users,
  X,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

const groups: Array<{ title: string; items: Item[] }> = [
  {
    title: "Today",
    items: [
      { href: "/studio", label: "Home", icon: House },
      { href: "/studio/check-in", label: "Roster", icon: ClipboardCheck },
    ],
  },
  {
    title: "Run the studio",
    items: [
      { href: "/studio/schedule", label: "Schedule", icon: CalendarDays },
      { href: "/studio/members", label: "Members", icon: Users },
      { href: "/studio/offerings", label: "Passes", icon: Ticket },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/studio/policies", label: "Policies", icon: ShieldCheck },
      { href: "/studio/reports", label: "Reports", icon: ChartColumn },
      { href: "/studio/import", label: "Import", icon: Upload },
      { href: "/studio/settings", label: "Settings", icon: Settings },
    ],
  },
];

const all = groups.flatMap((group) => group.items);
const tabs = ["/studio", "/studio/schedule", "/studio/check-in", "/studio/members"];
const more = all.filter((item) => !tabs.includes(item.href));

function isCurrent(pathname: string, href: string) {
  if (href === "/studio") return pathname === "/studio";
  if (href === "/studio/schedule" && pathname.startsWith("/studio/sessions/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="side-nav" aria-label="Studio">
      {groups.map((group) => (
        <div className="side-group" key={group.title}>
          <p className="side-group-title">{group.title}</p>
          {group.items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined}>
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function StudioTabBar({ memberHref, logout }: { memberHref: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const moreActive = more.some((item) => isCurrent(pathname, item.href));

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <nav className="tab-bar" aria-label="Studio sections">
        {all
          .filter((item) => tabs.includes(item.href))
          .sort((a, b) => tabs.indexOf(a.href) - tabs.indexOf(b.href))
          .map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined}>
              <Icon size={20} aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        <button
          type="button"
          className={moreActive ? "is-active" : undefined}
          aria-haspopup="dialog"
          aria-controls="studio-more"
          onClick={() => dialog.current?.showModal()}
        >
          <Ellipsis size={20} aria-hidden />
          <span>More</span>
        </button>
      </nav>
      <dialog
        ref={dialog}
        id="studio-more"
        className="sheet"
        aria-label="More studio pages"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="sheet-body">
          <div className="sheet-head">
            <p className="sheet-title">More</p>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => dialog.current?.close()}>
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="sheet-links">
            {more.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined}>
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ))}
            <a href={memberHref} target="_blank" rel="noreferrer">
              <ExternalLink size={18} aria-hidden />
              Member schedule
            </a>
            <form action={logout}>
              <button type="submit">
                <LogOut size={18} aria-hidden />
                Log out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
