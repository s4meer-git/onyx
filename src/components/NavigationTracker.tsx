"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { noteNavigation } from "@/lib/nav-history";

/** Counts route changes so BackButton knows whether a real back stack exists. */
export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    noteNavigation();
  }, [pathname]);

  return null;
}
