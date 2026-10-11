"use client";

import { GUEST_STORAGE_KEY } from "@/components/guest-fields";
import { forgetGuestAction } from "@/server/actions";

export function ForgetGuest({ label = "Not you? Forget this device" }: { label?: string }) {
  return (
    <button
      type="button"
      className="link-btn"
      onClick={async () => {
        try {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {
          /* private mode */
        }
        await forgetGuestAction();
      }}
    >
      {label}
    </button>
  );
}
