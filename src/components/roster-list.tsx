import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import type { RosterRow } from "@/lib/sessions";
import { staffCheckInAction } from "@/server/actions";

export function RosterList({ rows, canCheckIn }: { rows: RosterRow[]; canCheckIn: boolean }) {
  if (rows.length === 0) return <p className="muted">No one is booked yet.</p>;
  return (
    <ul className="roster">
      {rows.map((row) => (
        <li key={row.id} className="roster-row" data-done={row.attendance_id ? true : undefined}>
          <div className="roster-who">
            {row.member_id ? (
              <Link className="roster-name" href={`/studio/members/${row.member_id}`}>
                {row.guest_name}
              </Link>
            ) : (
              <span className="roster-name">{row.guest_name}</span>
            )}
            <span className="roster-meta">
              {row.status === "offer_pending" ? "Waitlist offer sent" : row.product_name ? `Pass: ${row.product_name}` : "Drop-in"}
            </span>
          </div>
          <div className="roster-actions">
            <CopyButton text={`/b/${row.manage_token}`} label="Copy confirmation" />
            {row.attendance_id ? (
              <span className="pill pill-ok">
                <CircleCheck size={14} aria-hidden />
                Checked in · {row.method === "self" ? "self" : "staff"}
              </span>
            ) : row.status === "no_show" ? (
              <span className="pill pill-warn">No-show</span>
            ) : row.status === "offer_pending" ? (
              <span className="pill">Pending</span>
            ) : canCheckIn ? (
              <ActionForm action={staffCheckInAction}>
                <input type="hidden" name="bookingId" value={row.id} />
                <SubmitButton className="btn btn-primary btn-sm" aria-label={`Check in ${row.guest_name}`} pendingLabel="Checking in…">
                  Check in
                </SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
