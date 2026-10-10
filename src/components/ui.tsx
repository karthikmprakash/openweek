import type { InputHTMLAttributes } from "react";
import Link from "next/link";

export function Flash({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="banner" role="alert">
      {message}
    </p>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
      {hint ? <span className="help">{hint}</span> : null}
    </label>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--accent)" />
        <rect x="8" y="7" width="16" height="18" rx="2" fill="var(--bg)" />
        <rect x="14" y="15" width="4" height="6" rx="1" fill="var(--accent)" />
      </svg>
      StudioFlat
    </Link>
  );
}
