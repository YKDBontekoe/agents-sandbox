"use client";

import { useEffect } from "react";

/**
 * Warm up the initial game state API to reduce perceived load time.
 * Route prefetching is avoided to prevent Safari navigation crashes.
 */
export default function PrefetchResources() {
  useEffect(() => {
    fetch("/api/state").catch(() => {
      /* ignore warmup errors */
    });
  }, []);

  return null;
}
