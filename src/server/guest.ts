import { cookies } from "next/headers";
import { cache } from "react";

export const GUEST_COOKIE = "sf_guest_email";

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function valid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const guestEmail = cache(async (): Promise<string | null> => {
  const jar = await cookies();
  const value = normalize(jar.get(GUEST_COOKIE)?.value ?? "");
  return valid(value) ? value : null;
});

export async function writeGuestEmail(email: string) {
  const value = normalize(email);
  if (!valid(value)) return;
  const jar = await cookies();
  jar.set(GUEST_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearGuestEmail() {
  const jar = await cookies();
  jar.delete(GUEST_COOKIE);
}
