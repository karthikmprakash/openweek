import { isDomainError } from "./errors";

export type FormState = {
  error?: string;
  notice?: string;
  values?: Record<string, string>;
} | null;

const NEVER_ECHO = new Set(["password", "idempotencyKey"]);

/** Failed submissions return what was typed so the form can be refilled instead of wiped. */
export function failure(error: unknown, formData?: FormData): FormState {
  const message = isDomainError(error) ? error.message : error instanceof Error ? error.message : "Something went wrong.";
  const values: Record<string, string> = {};
  formData?.forEach((value, key) => {
    if (typeof value !== "string" || key.startsWith("$ACTION") || NEVER_ECHO.has(key)) return;
    values[key] = value;
  });
  return { error: friendly(message), values };
}

function friendly(message: string): string {
  if (message.includes("CHECK constraint failed") || message.includes("NOT NULL constraint failed")) {
    return "One of the values isn't allowed. Check the form and try again.";
  }
  return message;
}
