import Link from "next/link";

export function MemberHeader({
  studioName,
  href,
  findHref,
  findLabel = "Find my booking",
  studioHref,
}: {
  studioName: string;
  href: string;
  findHref?: string;
  findLabel?: string;
  studioHref?: string;
}) {
  const initial = studioName.trim().charAt(0).toUpperCase() || "S";
  return (
    <header className="topbar">
      <div className="topbar-inner wrap-wide">
        <Link className="studio-brand" href={href}>
          <span className="studio-initial" aria-hidden="true">
            {initial}
          </span>
          <span className="studio-brand-name">{studioName}</span>
        </Link>
        {findHref || studioHref ? (
          <div className="topbar-end">
            {studioHref ? (
              <Link className="topbar-find" href={studioHref}>
                Studio
              </Link>
            ) : null}
            {findHref ? (
              <a className="topbar-find" href={findHref}>
                {findLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function PoweredBy() {
  return (
    <footer className="powered">
      <p>
        Bookings by <Link href="/">Openweek</Link>
      </p>
    </footer>
  );
}
