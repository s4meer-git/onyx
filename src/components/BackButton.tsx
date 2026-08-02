"use client";

import { useRouter } from "next/navigation";
import { canGoBack } from "@/lib/nav-history";

/**
 * Returns to wherever you actually came from — the dashboard, the schedule, a
 * day page or the live session — instead of a fixed destination.
 *
 * `fallback` covers the case where there is no history to pop: a deep link, a
 * shared URL, or the PWA reopening straight onto this screen.
 */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (canGoBack()) router.back();
        else router.push(fallback);
      }}
      className="pressable -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/6 text-lg"
    >
      ←
    </button>
  );
}
