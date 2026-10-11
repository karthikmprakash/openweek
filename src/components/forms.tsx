"use client";

import { useActionState, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function ActionForm({
  action,
  children,
  className,
  id,
  label,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  id?: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form || !state?.values) return;
    for (const [name, value] of Object.entries(state.values)) {
      for (const element of form.querySelectorAll<FieldElement>(`[name="${CSS.escape(name)}"]`)) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
        if (element instanceof HTMLInputElement) {
          if (["password", "file", "hidden", "submit", "button"].includes(element.type)) continue;
          if (element.type === "checkbox" || element.type === "radio") {
            element.checked = element.value === value;
            continue;
          }
        }
        element.value = value;
      }
    }
  }, [state]);

  useEffect(() => {
    if (state?.error) alertRef.current?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className} id={id} aria-label={label}>
      {state?.error ? (
        <p className="banner" role="alert" tabIndex={-1} ref={alertRef}>
          {state.error}
        </p>
      ) : null}
      {state?.notice ? (
        <p className="ok" role="status">
          {state.notice}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
  ...props
}: { pendingLabel?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" className={className} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Two-step confirm for actions that change money, visits, or bookings. */
export function ConfirmSubmit({
  trigger,
  confirmLabel,
  message,
  triggerClassName = "btn btn-secondary",
  pendingLabel,
}: {
  trigger: string;
  confirmLabel: string;
  message: ReactNode;
  triggerClassName?: string;
  pendingLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    triggerRef.current?.focus();
  }, [open]);
  if (!open) {
    return (
      <button ref={triggerRef} type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {trigger}
      </button>
    );
  }
  return (
    <div className="confirm" role="group" aria-label={trigger}>
      <div className="confirm-message">{message}</div>
      <div className="row">
        <SubmitButton className="btn btn-danger" autoFocus pendingLabel={pendingLabel}>
          {confirmLabel}
        </SubmitButton>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            returnFocus.current = true;
            setOpen(false);
          }}
        >
          Keep it
        </button>
      </div>
    </div>
  );
}

export function TypeToConfirm({ expected, label, button }: { expected: string; label: string; button: string }) {
  const [value, setValue] = useState("");
  const matches = value.trim().toLowerCase() === expected.toLowerCase();
  return (
    <>
      <label className="field">
        <span>{label}</span>
        <input
          name="confirm"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={expected}
        />
      </label>
      <div>
        <SubmitButton className="btn btn-danger" disabled={!matches} pendingLabel="Deleting…">
          {button}
        </SubmitButton>
      </div>
    </>
  );
}

export function CopyButton({ text, label = "Copy link", className = "btn btn-secondary btn-sm" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const absolute = text.startsWith("/") ? `${window.location.origin}${text}` : text;
        try {
          await navigator.clipboard.writeText(absolute);
          setCopied(true);
        } catch {
          window.prompt("Copy this link", absolute);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
