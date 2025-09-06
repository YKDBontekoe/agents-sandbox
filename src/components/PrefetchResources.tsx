"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Preloads critical routes and APIs to reduce perceived load time.
 */
export default function PrefetchResources() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/play");
    fetch("/api/state").catch(() => {
      /* ignore warmup errors */
    });
  }, [router]);

  return null;
}
