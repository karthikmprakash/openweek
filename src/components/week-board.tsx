import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatDayShort, formatTime, zonedYmd } from "@/lib/week";

export type BoardItem = {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  instructor: string;
  priceCents: number;
  capacity: number;
  left: number;
  waiting?: number;
  manageHref?: string;
  waitlisted?: boolean;
};

type Mode = { kind: "member"; slug: string } | { kind: "staff" };

export function sessionState(item: Pick<BoardItem, "startsAt" | "endsAt" | "left">, now: Date) {
  const nowIso = now.toISOString();
  if (item.endsAt <= nowIso) return "ended" as const;
  if (item.startsAt <= nowIso) return "started" as const;
  if (item.left === 0) return "full" as const;
  if (item.left <= 3) return "tight" as const;
  return "open" as const;
}

function spotsText(left: number) {
  return left === 0 ? "Full" : left === 1 ? "1 spot left" : `${left} spots left`;
}

export function WeekBoard({
  days,
  items,
  timeZone,
  now,
  mode,
}: {
  days: Date[];
  items: BoardItem[];
  timeZone: string;
  now: Date;
  mode: Mode;
}) {
  const today = zonedYmd(now, timeZone);
  const tomorrow = zonedYmd(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone);
  const byDay = days.map((day) => {
    const key = zonedYmd(day, timeZone);
    return { day, key, label: formatDayShort(day.toISOString(), timeZone), rows: items.filter((item) => zonedYmd(new Date(item.startsAt), timeZone) === key) };
  });
  const relative = (key: string) => (key === today ? "Today" : key === tomorrow ? "Tomorrow" : null);

  return (
    <div className="week-wrap">
      <nav className="day-strip" aria-label="Jump to a day">
        {byDay.map(({ key, label, rows }) => (
          <a key={key} href={`#day-${key}`} data-today={key === today || undefined} data-empty={rows.length === 0 || undefined}>
            <span className="day-strip-weekday">{label.weekday}</span>
            <span className="day-strip-date">{label.date.split(" ")[1]}</span>
            <span className="visually-hidden">
              {label.date}, {rows.length === 0 ? "no classes" : `${rows.length} class${rows.length === 1 ? "" : "es"}`}
            </span>
          </a>
        ))}
      </nav>
      <div className="week">
        {byDay.map(({ key, label, rows }) => {
          const tag = relative(key);
          return (
            <section className="day" key={key} id={`day-${key}`} aria-labelledby={`day-label-${key}`} data-empty={rows.length === 0 || undefined}>
              <h2 className="day-label" id={`day-label-${key}`} data-today={key === today || undefined}>
                <span className="day-weekday">{label.weekday}</span>
                <span className="day-date">{label.date}</span>
                {tag ? <span className="day-tag">{tag}</span> : null}
              </h2>
              {rows.length === 0 ? <p className="day-empty">No classes</p> : null}
              {rows.map((item) => (
                <ClassCard key={item.id} item={item} timeZone={timeZone} now={now} mode={mode} dayLabel={`${label.weekday} ${label.date}`} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ClassCard({ item, timeZone, now, mode, dayLabel }: { item: BoardItem; timeZone: string; now: Date; mode: Mode; dayLabel: string }) {
  const state = sessionState(item, now);
  const time = formatTime(item.startsAt, timeZone);
  const past = state === "ended" || state === "started";
  const booked = item.capacity - item.left;
  return (
    <article className="class-card" data-state={state} data-link={mode.kind === "staff" || (!past && mode.kind === "member") || undefined}>
      <div className="class-when">
        <p className="class-time">{time}</p>
        <p className="class-length">{item.durationMin} min</p>
      </div>
      <div className="class-main">
        <h3>
          {mode.kind === "staff" ? (
            <Link className="card-link" href={`/studio/sessions/${item.id}`}>
              {item.className}
            </Link>
          ) : (
            item.className
          )}
        </h3>
        {item.instructor ? <p className="class-meta">{item.instructor}</p> : null}
        <div className="class-tags">
          {mode.kind === "staff" ? (
            <>
              <span className="spot" data-tight={item.left === 0 || undefined}>
                {booked}/{item.capacity} booked
              </span>
              {item.waiting ? <span className="tag">{item.waiting} waiting</span> : null}
            </>
          ) : past ? (
            <span className="tag">{state === "started" ? "In progress" : "Ended"}</span>
          ) : (
            <span className="spot" data-tight={state === "tight" || state === "full" || undefined}>
              {spotsText(item.left)}
            </span>
          )}
          {item.priceCents > 0 ? <span className="tag">{formatMoney(item.priceCents)}</span> : null}
        </div>
      </div>
      {mode.kind === "member" && !past ? (
        <div className="class-action">
          {item.manageHref ? (
            <Link
              className="btn btn-sm btn-secondary"
              href={item.manageHref}
              aria-label={`Manage your spot in ${item.className}, ${dayLabel} at ${time}`}
            >
              Your spot
            </Link>
          ) : item.waitlisted ? (
            <Link
              className="btn btn-sm btn-secondary"
              href={`/s/${mode.slug}/book/${item.id}`}
              aria-label={`You’re on the waitlist for ${item.className}, ${dayLabel} at ${time}`}
            >
              On waitlist
            </Link>
          ) : (
            <Link
              className={`btn btn-sm ${state === "full" ? "btn-secondary" : "btn-primary"}`}
              href={`/s/${mode.slug}/book/${item.id}`}
              aria-label={`${state === "full" ? "Join waitlist for" : "Reserve"} ${item.className}, ${dayLabel} at ${time}`}
            >
              {state === "full" ? "Join waitlist" : "Reserve"}
            </Link>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function WeekPager({
  links,
  allowPast = false,
}: {
  links: { previous: string; next: string; today: string; isCurrent: boolean; startsBeforeToday: boolean; label: string };
  allowPast?: boolean;
}) {
  const canGoBack = allowPast || (!links.isCurrent && !links.startsBeforeToday);
  return (
    <nav className="pager" aria-label="Week">
      {canGoBack ? (
        <Link className="icon-btn" href={links.previous} aria-label="Previous week">
          <ChevronLeft size={20} aria-hidden />
        </Link>
      ) : (
        <span className="icon-btn" aria-hidden="true" data-disabled>
          <ChevronLeft size={20} />
        </span>
      )}
      <p className="pager-label">
        <span>{links.label}</span>
        {!links.isCurrent ? (
          <Link className="pager-today" href={links.today}>
            Back to today
          </Link>
        ) : null}
      </p>
      <Link className="icon-btn" href={links.next} aria-label="Next week">
        <ChevronRight size={20} aria-hidden />
      </Link>
    </nav>
  );
}
