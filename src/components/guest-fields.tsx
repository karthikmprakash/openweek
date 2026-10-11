"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui";

export const GUEST_STORAGE_KEY = "openweek:guest";

function readSaved(): { name?: string; email?: string } | null {
  try {
    return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeSaved(value: { name?: string; email?: string } | null) {
  try {
    if (value) localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    return;
  }
}

/** Name and email, remembered on this device so a repeat booking is two taps. */
export function GuestFields({ defaultName = "", defaultEmail = "" }: { defaultName?: string; defaultEmail?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [remembered, setRemembered] = useState(false);

  useEffect(() => {
    const root = wrap.current;
    const form = root?.closest("form");
    if (!root || !form) return;
    const name = root.querySelector<HTMLInputElement>('input[name="guestName"]');
    const email = root.querySelector<HTMLInputElement>('input[name="email"]');
    const saved = readSaved();
    if (saved?.name && name && !name.value) name.value = saved.name;
    if (saved?.email && email && !email.value) email.value = saved.email;
    // localStorage is only readable after mount; keep first paint identical on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate remembered guest after mount
    if (saved?.name || saved?.email) setRemembered(true);
    const save = () => writeSaved({ name: name?.value.trim(), email: email?.value.trim() });
    form.addEventListener("submit", save);
    return () => form.removeEventListener("submit", save);
  }, []);

  return (
    <div className="grid-form" ref={wrap}>
      <Field label="Name" name="guestName" required autoComplete="name" minLength={2} defaultValue={defaultName} />
      <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={defaultEmail} hint="Your confirmation and reminders go here." />
      {remembered ? (
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            writeSaved(null);
            wrap.current?.querySelectorAll("input").forEach((input) => (input.value = ""));
            setRemembered(false);
          }}
        >
          Not you? Clear these details
        </button>
      ) : null}
    </div>
  );
}
