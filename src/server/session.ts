import { cookies } from "next/headers";
import { staffFromToken, type StaffContext } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function currentStaff(): Promise<StaffContext | null> {
  const jar = await cookies();
  const token = jar.get("sf_session")?.value;
  if (!token) return null;
  return staffFromToken(getDb(), token, new Date());
}

export async function writeSession(token: string) {
  const jar = await cookies();
  jar.set("sf_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get("sf_session")?.value;
  if (token) {
    const { revokeSession } = await import("@/lib/auth");
    revokeSession(getDb(), token);
  }
  jar.delete("sf_session");
}
