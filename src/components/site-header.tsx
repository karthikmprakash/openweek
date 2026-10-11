import type { ReactNode } from "react";
import { Brand } from "@/components/ui";

export function SiteHeader({
  brandHref = "/",
  end,
  wide = false,
}: {
  brandHref?: string;
  end?: ReactNode;
  wide?: boolean;
}) {
  return (
    <header className="topbar">
      <div className={`topbar-inner ${wide ? "wrap-wide" : "wrap"}`}>
        <Brand href={brandHref} />
        {end ? <div className="topbar-end">{end}</div> : null}
      </div>
    </header>
  );
}
