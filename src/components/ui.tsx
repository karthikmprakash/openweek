import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

export function Flash({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="banner" role="alert">
      {message}
    </p>
  );
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="ok" role="status">
      {message}
    </p>
  );
}

export function Field({
  label,
  hint,
  prefix,
  suffix,
  className,
  ...props
}: { label: string; hint?: string; prefix?: string; suffix?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  const hintId = hint && id ? `${id}-hint` : undefined;
  const input = (
    <input
      id={id}
      {...props}
      aria-describedby={hintId}
      spellCheck={props.type === "email" ? false : props.spellCheck}
    />
  );
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      {prefix || suffix ? (
        <span className="affix">
          {prefix ? <span className="affix-text" aria-hidden="true">{prefix}</span> : null}
          {input}
          {suffix ? <span className="affix-text" aria-hidden="true">{suffix}</span> : null}
        </span>
      ) : (
        input
      )}
      {hint ? (
        <p className="help" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  kicker,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  kicker?: string;
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {kicker ? <p className="feature-kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="muted page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function Brand({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link className={`brand${light ? " brand-light" : ""}`} href={href}>
      <span className="brand-mark-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="var(--accent)" />
          <rect x="8" y="7" width="16" height="18" rx="2" fill="#e8f1ed" />
          <rect x="14" y="15" width="4" height="6" rx="1" fill="var(--accent)" />
        </svg>
      </span>
      Openweek
    </Link>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children ? <p className="muted">{children}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
