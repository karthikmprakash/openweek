"use client";

import { useEffect, useRef, useState } from "react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Suggests the web address from the studio name and picks the browser's time zone. */
export function SignupEnhancer() {
  const anchor = useRef<HTMLParagraphElement>(null);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const name = form.querySelector<HTMLInputElement>('input[name="studioName"]');
    const address = form.querySelector<HTMLInputElement>('input[name="slug"]');
    const zone = form.querySelector<HTMLSelectElement>('select[name="timezone"]');
    if (!name || !address) return;

    const aliases: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata" };
    const detected = aliases[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && detected && Array.from(zone.options).some((option) => option.value === detected)) zone.value = detected;

    let edited = address.value !== "" && address.value !== slugify(name.value);
    const onName = () => {
      if (edited) return;
      address.value = slugify(name.value);
      setSlug(address.value);
    };
    const onAddress = () => {
      const clean = address.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
      if (clean !== address.value) address.value = clean;
      edited = clean !== "" && clean !== slugify(name.value);
      setSlug(clean);
    };
    name.addEventListener("input", onName);
    address.addEventListener("input", onAddress);
    return () => {
      name.removeEventListener("input", onName);
      address.removeEventListener("input", onAddress);
    };
  }, []);

  return (
    <p ref={anchor} className="help slug-preview" id="slug-preview" aria-live="polite">
      {slug ? `Members will book at /s/${slug}` : "Members will book at /s/your-studio"}
    </p>
  );
}
