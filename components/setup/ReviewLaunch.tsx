"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import { SpecStrip } from "@/components/ui/spec-strip";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { DataChip } from "@/components/ui/data-chip";
import { Eyebrow } from "@/components/PageChrome";
import { type CampaignDraft } from "@/lib/api";
import { clientApi } from "@/lib/client-api";
import { validateForLaunch } from "@/lib/setup/draftReducer";
import { TopicGraph } from "./TopicGraph";

/**
 * Review + launch pad (doc 03 §8) — re-cut as a Braun launch instrument.
 *
 *   1. Masthead         — the review title (sanctioned display register)
 *   2. SpecStrip        — type · duration · language · mode as one ruled band
 *   3. Folio sections   — goals as a status-spine EvidenceTree, delivery facts
 *   4. Launch pad       — the blocking validation as a status-disc register +
 *                         a near-black launch CTA (amber is never a button fill)
 *
 * Launch is a two-step bridge to the existing terminal write path:
 *   a) `launchDraft` materializes the draft → a DRAFT campaign row.
 *   b) `campaigns.launch` sends invites + flips the campaign to ACTIVE.
 * Then we route into the campaign dashboard with a success flash.
 */
export function ReviewLaunch({
  draftId,
  draft,
}: {
  draftId: string;
  draft: CampaignDraft;
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

  // Essentials as one ruled instrument band.
  const specCells = [
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
      <span className="font-mono tabular-nums text-fg-faint">
        G-{String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-8">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <motion.header {...reveal(0)} className="flex flex-col gap-2">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-[length:var(--text-display)] font-semibold leading-tight tracking-[-0.022em] text-fg">
          {t("title")}
        </h1>
        <p className="body-lg max-w-[60ch] text-fg-muted">{t("subtitle")}</p>
      </motion.header>

      {/* ── Essentials instrument band ───────────────────────────────────── */}
      <motion.section {...reveal(0.04)} className="flex flex-col gap-4">
        <Folio index="§ 01" label={t("essentials")} />
        <SpecStrip cells={specCells} className="rounded-card border border-line" />
      </motion.section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left — goals + delivery */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Goals */}
          {goals.length > 0 ? (
            <motion.section {...reveal(0.08)} className="flex flex-col gap-4">
              <Folio index="§ 02" label={tc("goals")} count={goals.length} />
              <EvidenceTree nodes={goalNodes} defaultExpandedDepth={0} />
            </motion.section>
          ) : null}

          {/* Delivery */}
          <motion.section {...reveal(0.12)} className="flex flex-col gap-4">
            <Folio index="§ 03" label={t("delivery")} />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                  {tc("topics")}
                </p>
                {draft.topics?.nodes?.length ? (
                  <TopicGraph data={draft.topics} />
                ) : (
                  <p className="font-mono text-[length:var(--text-eyebrow)] uppercase tracking-[0.06em] text-fg-subtle">
                    {tc("topicsEmpty")}
                  </p>
                )}
              </div>
              <dl className="flex flex-col divide-y divide-line-subtle">
                <SpecRow label={tc("audience")}>
                  {draft.audience?.segments?.length
                    ? draft.audience.segments.join(", ")
                    : "—"}
                </SpecRow>
                <SpecRow label={t("peopleLabel")} mono>
                  {t("peopleCount", { count: peopleCount })}
                </SpecRow>
                {draft.background?.notes?.trim() ? (
                  <SpecRow label={tc("background")}>
                    <span className="line-clamp-3 text-fg-muted">
                      {draft.background.notes}
                    </span>
                  </SpecRow>
                ) : null}
              </dl>
            </div>
          </motion.section>
        </div>

        {/* Right — launch pad (sticky) */}
        <motion.aside
          {...reveal(0.16)}
          className="card card--compact gap-5 lg:sticky lg:top-6 lg:self-start"
        >
          <Folio index="§ 04" label={t("launchpad")} tone="subtle" />

          <div className="flex flex-col gap-3">
            <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
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
              <p className="mt-1 flex items-start gap-2 rounded-ui border border-line bg-warning-soft px-3 py-2 text-[13px] leading-snug text-fg-muted">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span>{t("advisoryNoPeople")}</span>
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-danger" role="alert">
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
        </motion.aside>
      </div>
    </div>
  );
}

/* ─── Section folio — full-bleed hairline + tracked-caps masthead ─────────── */
function Folio({
  index,
  label,
  count,
  tone = "primary",
}: {
  index: string;
  label: string;
  count?: number;
  tone?: "primary" | "subtle";
}) {
  return (
    <div
      className={
        tone === "subtle"
          ? "flex items-baseline justify-between gap-4 border-b border-line-subtle pb-2.5"
          : "flex items-baseline justify-between gap-4 border-b border-line pb-2.5"
      }
    >
      <span className="flex items-baseline gap-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em]">
        <span className="font-mono tabular-nums text-fg-faint">{index}</span>
        <span className="text-fg-muted">{label}</span>
      </span>
      {typeof count === "number" ? (
        <span className="font-mono text-[length:var(--text-eyebrow)] tabular-nums text-fg-subtle">
          n={count}
        </span>
      ) : null}
    </div>
  );
}

/* ─── A hairline-separated spec label:value pair ─────────────────────────── */
function SpecRow({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 first:pt-0">
      <dt className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
        {label}
      </dt>
      <dd className={mono ? "font-mono tabular-nums text-fg" : "text-fg"}>
        {children}
      </dd>
    </div>
  );
}

/* ─── A launch gate as a status-spine row ────────────────────────────────── */
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
