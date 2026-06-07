"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHog analytics provider (WHY-100).
 *
 * Strictly gated on NEXT_PUBLIC_POSTHOG_KEY: when the env var is absent this is
 * a no-op — no client is initialised, no requests are made, no key is ever
 * hardcoded. The host is pinned to the EU endpoint for DSGVO compliance (all
 * infrastructure must stay EU-only, see CLAUDE.md GDPR constraints).
 */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // SPA: capture pageviews/leaves on App Router navigations.
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  // No key → render children untouched, never mount the provider.
  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
