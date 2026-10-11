"use client";

import { useEffect } from "react";
import { rememberGuestFromToken } from "@/server/actions";

/** Opening a confirmation link on a new device remembers that email for the week. */
export function RememberGuest({ token }: { token: string }) {
  useEffect(() => {
    void rememberGuestFromToken(token);
  }, [token]);
  return null;
}
