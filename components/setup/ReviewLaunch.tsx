"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2 as CheckIcon, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataChip } from "@/components/ui/data-chip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type CampaignDraft, type Vault, type SetupToolCall } from "@/lib/api";
import { clientApi } from "@/lib/client-api";
import { applyPatch, validateForLaunch } from "@/lib/setup/draftReducer";
import { Catalog } from "./Catalog";

/** Anchor id for the People section, so the launch hint can scroll to it. */
const PEOPLE_ANCHOR = "review-people";

/**
 * Review + launch (doc 03 §8) — the Prüfen step.
 *
 * The whole catalog that the user configured is shown here as the full, EDITABLE
 * surface ({@link Catalog}): every field stays writable, persisting through the
 * exact same path the author screen uses (optimistic `applyPatch` + a
 * revision-tracked `PATCH /setup-drafts`, with conflict re-fetch). Alongside it
 * sits a sticky launch panel — the validation gates + the terminal launch CTA.
 *
 * Layout: editable catalog as the main column, a sticky launch aside on the
 * right (validation gates → "Kampagne starten"). Participants are part of the
 * catalog (People section); when none are added the launch panel surfaces a
 * gentle hint that scrolls the participant editor into view.
 */
export function ReviewLaunch({
  draftId,
  draft: initialDraft,
  initialRevision,
  orgName,
  vaults = [],
}: {
  draftId: string;
  draft: CampaignDraft;
  initialRevision?: number;
  orgName?: string;
  vaults?: Vault[];
}) {
  const t = useTranslations("setup.review");
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState<CampaignDraft>(initialDraft);
  const revRef = useRef<number>(initialRevision ?? 0);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

  // User-originated catalog edit: optimistic local apply + revision-tracked
  // persist. Mirrors SplitAuthor.onPatch exactly — only the revision is updated
  // from the response (never the full draft, which would race fast typing); a
  // conflict/failure re-fetches authoritative state.
  const onPatch = useCallback(
    (call: SetupToolCall) => {
      setDraft((d) => applyPatch(d, call));
      clientApi.setup
        .patchDraft(draftId, { patch: call, base_rev: revRef.current })
        .then((res) => {
          revRef.current = res.revision;
        })
        .catch(() => {
          clientApi.setup
            .getSession(draftId)
            .then((s) => {
              revRef.current = s.revision;
              setDraft(s.config);
            })
            .catch(() => {});
        });
    },
    [draftId],
  );

  const reasons = validateForLaunch(draft);
  const peopleCount = draft.people?.length ?? 0;
  // People are required to launch (can't send invites without recipients).
  const blocked = reasons.length > 0 || peopleCount === 0;

  async function launch() {
    if (blocked) return;
    setError(null);
    setLaunching(true);
    try {
      const materialized = await clientApi.setup.launchDraft(draftId);
      const campaignId = materialized.campaign_id;
      // Save campaign name if provided before launching
      if (campaignName.trim()) {
        await clientApi.campaigns.update(campaignId, { name: campaignName.trim() }).catch(() => {});
      }
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

  function scrollToPeople() {
    const el = document.getElementById(PEOPLE_ANCHOR);
    el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const reveal = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay, ease: [0.2, 0.65, 0.3, 0.9] as const },
        };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div {...reveal(0)}>
        <PageHeader title={t("title")} subtitle={t("subtitle")} className="mb-0" />
      </motion.div>

      {/* ── Catalog (editable) + sticky launch aside ─────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main — the full editable catalog (same surface as the author step) */}
        <motion.div {...reveal(0.05)} className="min-w-0">
          <Catalog
            draft={draft}
            onPatch={onPatch}
            orgName={orgName}
            vaults={vaults}
            peopleAnchorId={PEOPLE_ANCHOR}
          />
        </motion.div>

        {/* Aside — sticky launch panel (gates + CTA) */}
        <motion.aside {...reveal(0.1)} className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--text-title)] tracking-[-0.015em]">
                {t("launchpad")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Campaign name — optional, falls back to "Kampagne N" in overview */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="campaign-name"
                  className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle"
                >
                  Kampagnenname{" "}
                  <span className="font-normal text-fg-faint">(optional)</span>
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  placeholder="z. B. Onboarding Q3 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                />
              </div>

              {/* Empty-participants hint — gentle, links to the People editor */}
              {peopleCount === 0 && (
                <button
                  type="button"
                  onClick={scrollToPeople}
                  className="flex items-start gap-2.5 rounded-card border border-warning/40 bg-warning/5 px-3 py-2.5 text-left transition-colors hover:border-warning/60"
                >
                  <Users size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                  <span className="text-[length:var(--text-body-sm)] text-fg">
                    {t("advisoryNoPeople")}
                  </span>
                </button>
              )}

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
                  {/* Blocking: launch requires recipients */}
                  <Gate
                    ok={peopleCount > 0}
                    label={t("gatePeople")}
                    okLabel={t("gatePeopleOk", { count: peopleCount })}
                    blocking
                    onClick={peopleCount === 0 ? scrollToPeople : undefined}
                  />
                </ul>
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
                <Button asChild variant="ghost" size="sm" className="w-full text-fg-muted">
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

/* ─── Launch gate ─────────────────────────────────────────────────────────── */
function Gate({
  ok,
  label,
  okLabel,
  blocking = true,
  onClick,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
  /** false = advisory only; doesn't block launch, icon is ⚠ not ✗ when unmet */
  blocking?: boolean;
  /** Optional click affordance for an unmet gate (e.g. scroll to its editor). */
  onClick?: () => void;
}) {
  const content = (
    <>
      {ok ? (
        <CheckIcon size={14} className="shrink-0 text-success" aria-hidden />
      ) : blocking ? (
        <AlertCircle size={14} className="shrink-0 text-danger" aria-hidden />
      ) : (
        <AlertCircle size={14} className="shrink-0 text-warning" aria-hidden />
      )}
      <span className={ok ? "text-[13px] text-fg-muted" : "text-[13px] text-fg"}>
        {ok ? okLabel : label}
      </span>
    </>
  );

  if (!ok && onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-2.5 text-left underline-offset-2 hover:underline"
        >
          {content}
        </button>
      </li>
    );
  }

  return <li className="flex items-center gap-2.5">{content}</li>;
}

export { DataChip };
