"use client";

import { useState } from "react";
import { Field } from "@/components/ui";

type Member = { id: string; name: string; email: string };

export function MemberGrantFields({ members }: { members: Member[] }) {
  const [picked, setPicked] = useState("");
  const selected = members.find((member) => member.id === picked);

  return (
    <div className="grid-form">
      {members.length > 0 ? (
        <label className="field" htmlFor="memberPick">
          <span>Who is this for?</span>
          <select
            id="memberPick"
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
          >
            <option value="">Someone new</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.email}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selected ? (
        <>
          <input type="hidden" name="guestName" value={selected.name} />
          <input type="hidden" name="email" value={selected.email} />
          <p className="help">
            Giving this pass to {selected.name} ({selected.email}).
          </p>
        </>
      ) : (
        <>
          <Field label="Member name" name="guestName" required autoComplete="off" />
          <Field
            label="Member email"
            name="email"
            type="email"
            required
            autoComplete="off"
            hint="New members are added. Existing members keep their history."
          />
        </>
      )}
    </div>
  );
}
