import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Upload } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { listMembers } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { currentStaff } from "@/server/session";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await currentStaff();
  if (!staff) return null;
  const { q = "" } = await searchParams;
  const all = listMembers(getDb(), staff.studioId, new Date());
  const needle = q.trim().toLowerCase();
  const members = needle
    ? all.filter((member) => member.name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle))
    : all;
  const withPasses = all.filter((member) => member.active_passes > 0).length;

  return (
    <div className="stack">
      <PageHeader
        title="Members"
        description={
          all.length === 0
            ? "People show up here when they book or when you give them a pass."
            : `${all.length} member${all.length === 1 ? "" : "s"} · ${withPasses} with an active pass`
        }
        actions={
          <Link className="btn btn-secondary btn-sm" href="/studio/import">
            <Upload size={16} aria-hidden />
            Import from CSV
          </Link>
        }
      />
      {all.length > 0 ? (
        <form className="search" role="search" method="get">
          <Search size={18} aria-hidden />
          <label className="visually-hidden" htmlFor="member-search">
            Search members
          </label>
          <input id="member-search" type="search" name="q" defaultValue={q} placeholder="Search by name or email…" autoComplete="off" spellCheck={false} />
          <button className="btn btn-secondary btn-sm" type="submit">
            Search
          </button>
        </form>
      ) : null}
      {all.length === 0 ? (
        <EmptyState
          title="No members yet"
          action={
            <div className="row">
              <Link className="btn btn-primary btn-sm" href="/studio/offerings">
                Give someone a pass
              </Link>
              <Link className="btn btn-secondary btn-sm" href="/studio/import">
                Import a roster
              </Link>
            </div>
          }
        >
          Bring your roster over from a CSV, or share your member link and let people book.
        </EmptyState>
      ) : members.length === 0 ? (
        <EmptyState title={`No one matches “${q}”`} action={<Link href="/studio/members">Clear search</Link>} />
      ) : (
        <ul className="list-card">
          {members.map((member) => (
            <li key={member.id}>
              <Link className="list-row" href={`/studio/members/${member.id}`}>
                <span className="avatar" aria-hidden="true">
                  {member.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="list-main">
                  <strong>{member.name}</strong>
                  <span className="muted truncate">{member.email}</span>
                </span>
                <span className="list-end">
                  {member.active_passes > 0 ? (
                    <span className="pill pill-ok">
                      {member.active_passes} active pass{member.active_passes === 1 ? "" : "es"}
                    </span>
                  ) : (
                    <span className="pill">No pass</span>
                  )}
                  {member.email_opt_out ? <span className="pill">Reminders off</span> : null}
                  <ChevronRight size={18} aria-hidden className="list-chevron" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
