"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Network } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * An anonymous, role-only view item. STRICTLY no participant PII — only the
 * role id + display name + whether the role's twin has validated data.
 */
export interface SelectableRole {
  id: string;
  name: string;
  hasValidated: boolean;
}

/**
 * WHY-117 (Vault D) — multi-selectable roles list with a "Kampagne mit diesen
 * Rollen" CTA. Picking roles and confirming routes to the create flow with the
 * selected role ids/names carried in the query string; the launchpad seeds them
 * onto the draft's audience (set_audience tool). Only role ids/names ever
 * leave this surface — never participant email/name (GDPR / anonymity).
 */
export function RoleMultiSelect({ roles }: { roles: SelectableRole[] }) {
  const t = useTranslations("twin");
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const selectedRoles = useMemo(
    () => roles.filter((r) => selected.has(r.id)),
    [roles, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startCampaign() {
    if (selectedRoles.length === 0) return;
    const params = new URLSearchParams();
    params.set("roles", selectedRoles.map((r) => r.id).join(","));
    // Role *names* are non-PII labels (e.g. "Vertrieb") — safe to carry so the
    // launchpad can show + seed them without an extra round-trip.
    params.set("roleNames", selectedRoles.map((r) => r.name).join("␟"));
    router.push(`/campaigns/new?${params.toString()}`);
  }

  if (roles.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState icon={Network} title={t("empty")} />
      </Card>
    );
  }

  const count = selected.size;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[length:var(--text-meta)] text-fg-subtle">
        {t("rolesSelectHint")}
      </p>

      <Card variant="ledger" className="overflow-hidden">
        <ul className="divide-y divide-line-subtle">
          {roles.map((role) => {
            const isOn = selected.has(role.id);
            return (
              <li key={role.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors",
                    isOn ? "bg-surface-2" : "hover:bg-surface-2",
                  )}
                >
                  <Checkbox
                    checked={isOn}
                    onCheckedChange={() => toggle(role.id)}
                    aria-label={role.name}
                  />
                  <span className="min-w-0 flex-1 truncate text-[length:var(--text-body-sm)] font-medium text-fg">
                    {role.name}
                  </span>
                  {role.hasValidated && (
                    <Badge variant="secondary" className="shrink-0">
                      {t("rolesValidated")}
                    </Badge>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Selection bar — sticky-feel CTA row. The amber accent is reserved for
          the single agentic action (start campaign), used sparingly. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[length:var(--text-meta)] tabular-nums text-fg-muted">
            {t("rolesSelected", { count })}
          </span>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[length:var(--text-meta)] text-fg-subtle underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              {t("rolesClearSelection")}
            </button>
          )}
        </div>
        <Button
          variant="accent"
          onClick={startCampaign}
          disabled={count === 0}
          className="gap-2"
        >
          {t("rolesCreateCampaign")}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
