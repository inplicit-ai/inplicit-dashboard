"use client";

/**
 * Client-side bridge for dynamic breadcrumb labels (WHY-105).
 *
 * The app shell — and with it the `Topbar`/breadcrumb — is rendered by the
 * `(customer)` layout, which sits *above* the `[id]` route segment. That
 * server boundary means the shell cannot read the campaign id (let alone its
 * name) by itself, so a campaign id would otherwise fall back to the generic
 * "Kampagne" crumb.
 *
 * This context closes that gap: a campaign-detail page (which already fetches
 * the campaign) registers the resolved name; the `Topbar` reads it and feeds
 * it into `buildBreadcrumb` so the dynamic segment renders the real name.
 *
 * Registration is immutable — the provider holds a single `CrumbContext`
 * value object and replaces it wholesale on update (never mutates in place).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CrumbContext } from "@/lib/shell/breadcrumb-map";

interface CrumbStore {
  /** Current resolved dynamic labels, consumed by the Topbar. */
  ctx: CrumbContext;
  /** Replace the campaign name (or clear it with `undefined`). */
  setCampaignName: (name: string | undefined) => void;
}

const CrumbStoreContext = createContext<CrumbStore | null>(null);

export function CrumbContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ctx, setCtx] = useState<CrumbContext>({});

  const setCampaignName = useCallback((name: string | undefined) => {
    // Immutable update: build a fresh context object every time.
    setCtx((prev) =>
      prev.campaignName === name ? prev : { ...prev, campaignName: name },
    );
  }, []);

  const store = useMemo<CrumbStore>(
    () => ({ ctx, setCampaignName }),
    [ctx, setCampaignName],
  );

  return (
    <CrumbStoreContext.Provider value={store}>
      {children}
    </CrumbStoreContext.Provider>
  );
}

/** Read the live dynamic crumb labels (used by the Topbar). */
export function useCrumbContext(): CrumbContext {
  return useContext(CrumbStoreContext)?.ctx ?? {};
}

/**
 * Register the campaign name for the breadcrumb for as long as the calling
 * component is mounted, clearing it on unmount so a stale name never bleeds
 * into another campaign's trail. No-ops gracefully outside a provider.
 */
export function useRegisterCampaignName(name: string | undefined): void {
  const store = useContext(CrumbStoreContext);
  const setCampaignName = store?.setCampaignName;

  useEffect(() => {
    if (!setCampaignName) return;
    setCampaignName(name);
    return () => setCampaignName(undefined);
  }, [setCampaignName, name]);
}
