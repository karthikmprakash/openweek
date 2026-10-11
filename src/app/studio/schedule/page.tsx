import type { Metadata } from "next";
import { ExternalLink, Plus } from "lucide-react";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { Field, Notice, PageHeader } from "@/components/ui";
import { WeekBoard, WeekPager, type BoardItem } from "@/components/week-board";
import { getDb } from "@/lib/db";
import { listClassTypes, MAX_REPEAT_WEEKS } from "@/lib/schedule";
import { sessionSummaries } from "@/lib/sessions";
import { toLocalInput } from "@/lib/time";
import { sevenDays, weekLinks } from "@/lib/week";
import { addSessionAction, publishClassAction } from "@/server/actions";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; notice?: string; new?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff) return null;
  const query = await searchParams;
  const db = getDb();
  const now = new Date();
  const span = sevenDays(query.week, now, staff.timezone);
  const end = new Date(span.days[6].getTime() + 24 * 60 * 60 * 1000);
  const items: BoardItem[] = sessionSummaries(db, staff.studioId, span.start.toISOString(), end.toISOString()).map((session) => ({
    id: session.id,
    className: session.class_name,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    durationMin: session.duration_min,
    instructor: session.instructor_name,
    priceCents: session.drop_in_price_cents,
    capacity: session.capacity,
    left: Math.max(0, session.capacity - session.booked),
    waiting: session.waiting,
  }));
  const types = listClassTypes(db, staff.studioId);
  const pager = weekLinks("/studio/schedule", span.days, staff.timezone, now);
  const minStart = toLocalInput(now, staff.timezone);
  const memberPath = `/s/${staff.slug}`;
  const repeatHint = `Up to ${MAX_REPEAT_WEEKS}. Use 1 for a one-off class.`;

  return (
    <div className="stack">
      <PageHeader
        title="Schedule"
        description={
          <>
            Members book at <a href={memberPath} target="_blank" rel="noreferrer">{memberPath}</a>
          </>
        }
        actions={
          <>
            <CopyButton text={memberPath} label="Copy member link" />
            <a className="btn btn-secondary btn-sm" href={memberPath} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden />
              View as member
            </a>
          </>
        }
      />
      <Notice message={query.notice} />

      <div className="create-actions">
        <details className="create-panel" open={types.length === 0 || query.new === "1"}>
          <summary className="btn btn-primary btn-sm">
            <Plus size={16} aria-hidden />
            Publish class
          </summary>
          <ActionForm action={publishClassAction} className="card grid-form create-panel-body">
            <Field label="Class name" name="name" required minLength={2} maxLength={80} placeholder="e.g. Dawn reformer" />
            <label className="field">
              <span>Description</span>
              <textarea name="description" rows={2} maxLength={400} placeholder="What members should know. Shown on the booking page." />
            </label>
            <div className="grid-3">
              <Field label="Length (minutes)" name="minutes" type="number" min={10} max={240} step={5} defaultValue={50} required />
              <Field label="Spots" name="spots" type="number" min={1} max={40} defaultValue={8} required />
              <Field label="Drop-in price" name="price" inputMode="decimal" prefix="$" placeholder="0.00" hint="Empty means free to reserve." />
            </div>
            <div className="grid-2">
              <Field label="First session" name="startsAt" type="datetime-local" min={minStart} required />
              <Field label="Repeat weekly for" name="repeatWeeks" type="number" min={1} max={MAX_REPEAT_WEEKS} defaultValue={1} suffix="weeks" hint={repeatHint} required />
            </div>
            <Field label="Instructor" name="instructor" defaultValue={staff.name} autoComplete="off" />
            <div>
              <SubmitButton pendingLabel="Publishing…">Publish class</SubmitButton>
            </div>
          </ActionForm>
        </details>

        {types.length > 0 ? (
          <details className="create-panel">
            <summary className="btn btn-secondary btn-sm">
              <Plus size={16} aria-hidden />
              Add sessions
            </summary>
            <ActionForm action={addSessionAction} className="card grid-form create-panel-body">
              <label className="field">
                <span>Class</span>
                <select name="classTypeId" required>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} · {type.duration_min} min · {type.default_capacity} spots
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid-2">
                <Field label="Starts" name="startsAt" id="add-startsAt" type="datetime-local" min={minStart} required />
                <Field label="Repeat weekly for" name="repeatWeeks" id="add-repeat" type="number" min={1} max={MAX_REPEAT_WEEKS} defaultValue={1} suffix="weeks" hint={repeatHint} required />
              </div>
              <Field label="Instructor" name="instructor" id="add-instructor" defaultValue={staff.name} autoComplete="off" />
              <div>
                <SubmitButton className="btn btn-secondary" pendingLabel="Adding…">
                  Add sessions
                </SubmitButton>
              </div>
            </ActionForm>
          </details>
        ) : null}
      </div>

      <WeekPager links={pager} allowPast />
      <WeekBoard days={span.days} items={items} timeZone={staff.timezone} now={now} mode={{ kind: "staff" }} />
    </div>
  );
}
