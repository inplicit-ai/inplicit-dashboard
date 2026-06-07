"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import { StatBand, type StatBandCell } from "@/components/ui/stat-band";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 as CheckIcon, Building2 } from "lucide-react";
import { DataChip } from "@/components/ui/data-chip";
import { type CampaignDraft, type Vault } from "@/lib/api";
import { clientApi } from "@/lib/client-api";
import { validateForLaunch } from "@/lib/setup/draftReducer";

/**
 * Review + launch (doc 03 §8) — a crisp white-modernist confirmation screen.
 *
 *   1. PageHeader     — the calm review title + muted subtitle (no §, no eyebrow)
 *   2. StatBand       — type · duration · language · mode as one clean readout
 *   3. Section cards  — goals as a soft EvidenceTree, audience & delivery facts
 *   4. Launch card    — the blocking validation as a calm gate list + the
 *                       near-black launch CTA (amber is never a button fill)
 *
 * Launch is a two-step bridge to the existing terminal write path:
 *   a) `launchDraft` materializes the draft → a DRAFT campaign row.
 *   b) `campaigns.launch` sends invites + flips the campaign to ACTIVE.
 * Then we route into the campaign dashboard with a success flash.
 */
export function ReviewLaunch({
  draftId,
  draft,
  vaults = [],
}: {
  draftId: string;
  draft: CampaignDraft;
  vaults?: Vault[];
}) {
  const t = useTranslations("setup.review");
  const tc = useTranslations("setup.catalog");
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasons = validateForLaunch(draft);
  const blocked = reasons.length > 0;

  const peopleCount = Array.isArray(draft.people) ? draft.people.length : 0;
  const goals = draft.goals ?? [];

  async function launch() {
    if (blocked) return;
    setError(null);
    setLaunching(true);
    try {
      const materialized = await clientApi.setup.launchDraft(draftId);
      const campaignId = materialized.campaign_id;

      try {
        await clientApi.campaigns.launch(campaignId);
      } catch {
        router.push(
          `/campaigns/${campaignId}?flashType=error&flash=${encodeURIComponent(
            t("flashInviteFailed"),
          )}`,
        );
        return;
      }

      router.push(
        `/campaigns/${campaignId}?flashType=success&flash=${encodeURIComponent(
          t("flashLaunched"),
        )}`,
      );
    } catch {
      setError(t("launchFailed"));
      setLaunching(false);
    }
  }

  const reveal = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.3,
            delay,
            ease: [0.2, 0.65, 0.3, 0.9] as const,
          },
        };

  // Essentials as one clean readout band.
  const specCells: StatBandCell[] = [
    {
      label: tc("interviewType"),
      value: draft.interviewType === "chat" ? tc("chatType") : tc("voice"),
    },
    {
      label: tc("duration"),
      value: `${draft.durationMin ?? 25} ${tc("minutes")}`,
    },
    {
      label: tc("language"),
      value: `${(draft.language?.default ?? "de").toUpperCase()}${
        draft.language?.allowSwitch ? " ⇄" : ""
      }`,
    },
    {
      label: tc("successCriteria"),
      value:
        draft.successCriteria?.mode === "deductive"
          ? tc("deductive").split(" ")[0]
          : tc("inductive").split(" ")[0],
    },
  ];

  const goalNodes: EvidenceNode[] = goals.map((g, i) => ({
    id: g.id,
    kind: "insight",
    status: "done",
    label: <span className="text-fg">{g.text}</span>,
    meta: (
      <span className="ml-auto shrink-0 tabular-nums text-fg-subtle">
        {String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div {...reveal(0)}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          className="mb-0"
        />
      </motion.div>

      {/* ── Essentials readout band ──────────────────────────────────────── */}
      <motion.section {...reveal(0.04)} className="flex flex-col gap-4">
        <SectionHeading title={t("essentials")} className="mb-0" />
        <StatBand cells={specCells} />
      </motion.section>

      {/* Context vault cards — abgehakt wenn verknüpft */}
      {draft.contextVaultId && (() => {
        const vault = vaults.find((v) => v.id === draft.contextVaultId);
        return (
          <motion.section {...reveal(0.08)} className="flex flex-col gap-4">
            <SectionHeading title="Kontext" className="mb-0" />
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 rounded-card border border-success/30 bg-success-soft px-4 py-3">
                <CheckIcon size={16} className="shrink-0 text-success" aria-hidden />
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="shrink-0 text-fg-muted" aria-hidden />
                  <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                    {vault?.name ?? "Kontext verknüpft"}
                  </span>
                </span>
              </div>
            </div>
          </motion.section>
        );
      })()}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left — goals + delivery, same height as launch card */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Goals */}
          {goals.length > 0 ? (
            <motion.section {...reveal(0.1)} className="flex flex-col gap-4">
              <SectionHeading
                title={tc("goals")}
                count={goals.length}
                className="mb-0"
              />
              <Card>
                <CardContent>
                  <EvidenceTree nodes={goalNodes} defaultExpandedDepth={0} />
                </CardContent>
              </Card>
            </motion.section>
          ) : null}

          {/* Zielgruppe — Themen entfernt, nur Zielgruppe + Teilnehmer + Hintergrund */}
          <motion.section {...reveal(0.14)} className="flex flex-col gap-4">
            <SectionHeading title={t("delivery")} className="mb-0" />
            <Card>
              <CardContent>
                <dl className="flex flex-col divide-y divide-line-subtle">
                  <SpecRow label={tc("audience")}>
                    {draft.audience?.segments?.length
                      ? draft.audience.segments.join(", ")
                      : "—"}
                  </SpecRow>
                  <SpecRow label={t("peopleLabel")}>
                    <span className="tabular-nums">
                      {t("peopleCount", { count: peopleCount })}
                    </span>
                  </SpecRow>
                  {draft.background?.notes?.trim() ? (
                    <SpecRow label={tc("background")}>
                      <span className="line-clamp-3 text-fg-muted">
                        {draft.background.notes}
                      </span>
                    </SpecRow>
                  ) : null}
                </dl>
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* Right — launch card, stretches to match left column height */}
        <motion.aside
          {...reveal(0.16)}
          className="lg:self-stretch"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-[length:var(--text-title)] tracking-[-0.015em]">
                {t("launchpad")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                  {t("checklist")}
                </p>
                <ul className="flex flex-col gap-2.5">
                  <Gate
                    ok={!reasons.includes("no_goals")}
                    label={t("gates.no_goals")}
                    okLabel={t("gatesOk.no_goals")}
                  />
                  <Gate
                    ok={!reasons.includes("no_success_criteria")}
                    label={t("gates.no_success_criteria")}
                    okLabel={t("gatesOk.no_success_criteria")}
                  />
                  <Gate
                    ok={!reasons.includes("bad_duration")}
                    label={t("gates.bad_duration")}
                    okLabel={t("gatesOk.bad_duration")}
                  />
                  <Gate
                    ok={!reasons.includes("no_interview_type")}
                    label={t("gates.no_interview_type")}
                    okLabel={t("gatesOk.no_interview_type")}
                  />
                </ul>
                {peopleCount === 0 ? (
                  <p className="mt-1 flex items-start gap-2 rounded-md border border-line bg-warning-soft px-3 py-2 text-[13px] leading-snug text-fg-muted">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span>{t("advisoryNoPeople")}</span>
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="text-[length:var(--text-body)] text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-line-subtle pt-4">
                <Button
                  onClick={launch}
                  disabled={blocked || launching}
                  size="lg"
                  className="w-full"
                >
                  {launching ? t("launching") : t("launch")}
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full text-fg-muted"
                >
                  <a href={`/campaigns/new/${draftId}`}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("back")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.aside>
      </div>
    </div>
  );
}

/* ─── A hairline-separated spec label:value pair ─────────────────────────── */
function SpecRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 first:pt-0">
      <dt className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {label}
      </dt>
      <dd className="text-[length:var(--text-body)] text-fg">{children}</dd>
    </div>
  );
}

/* ─── A launch gate as a calm status row ─────────────────────────────────── */
function Gate({
  ok,
  label,
  okLabel,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <StatusDisc state={ok ? "done" : "error"} size="sm" />
      <span className={ok ? "text-[13px] text-fg-muted" : "text-[13px] text-fg"}>
        {ok ? okLabel : label}
      </span>
    </li>
  );
}

export { DataChip };
