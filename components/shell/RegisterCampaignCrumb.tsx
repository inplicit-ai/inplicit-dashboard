"use client";

import { useRegisterCampaignName } from "@/lib/shell/crumb-context";

/**
 * Registers the campaign's display name with the breadcrumb context for as
 * long as a campaign-detail route is mounted (WHY-105). Rendered once by the
 * campaign `[id]` layout so every tab resolves the dynamic id segment to the
 * real name instead of the generic "Kampagne" fallback. Renders nothing.
 */
export function RegisterCampaignCrumb({ name }: { name: string | undefined }) {
  useRegisterCampaignName(name);
  return null;
}
