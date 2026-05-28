"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X, ArrowLeft, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/PageChrome";
import { api, type CampaignDraft } from "@/lib/api";
import { validateForLaunch } from "@/lib/setup/draftReducer";
import { TopicGraph } from "./TopicGraph";

/**
 * Review + launch pad (doc 03 §8). A condensed 3-row grid:
 *   1. Essentials      — interview type, duration, language, success mode, goals
 *   2. Audience & delivery — topic graph, audience, background, people (advisory)
 *   3. Launch pad      — blocking validation checklist + near-black launch CTA
 *
 * Launch is a two-step bridge to the existing terminal write path:
 *   a) `launchDraft` materializes the draft → a DRAFT campaign row (snapshots
 *      the expanded config, marks the draft LAUNCHED).
 *   b) `campaigns.launch` sends invites + flips the campaign to ACTIVE.
 * Then we route into the campaign dashboard with a success flash. Accent is
 * never a button background (design tokens); the launch CTA is the near-black
 * primary button.
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
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasons = validateForLaunch(draft);
  const blocked = reasons.length > 0;

  const peopleCount = Array.isArray(draft.people) ? draft.people.length : 0;

  async function launch() {
    if (blocked) return;
    setError(null);
    setLaunching(true);
    try {
      // Step 1 — materialize the draft into a DRAFT campaign row.
      const materialized = await api.setup.launchDraft(draftId);
      const campaignId = materialized.campaign_id;

      // Step 2 — send invites + flip to ACTIVE via the existing terminal path.
      // With no people imported yet (O-5) this is a no-op that just goes ACTIVE.
      try {
        await api.campaigns.launch(campaignId);
      } catch {
        // Materialization succeeded; invite send is recoverable from the
        // campaign dashboard, so route there with a warning flash rather than
        // stranding the user on the review screen.
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

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <div className="space-y-1">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-2xl font-medium tracking-tight text-fg">
          {t("title")}
        </h1>
        <p className="text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      {/* Row 1 — essentials */}
      <Card className="gap-4 rounded-card border-line bg-elevated p-5 shadow-none">
        <h2 className="text-sm font-semibold text-fg">{t("essentials")}</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label={tc("interviewType")}>
            {draft.interviewType === "chat" ? tc("chatType") : tc("voice")}
          </Field>
          <Field label={tc("duration")}>
            {draft.durationMin ?? 25} {tc("minutes")}
          </Field>
          <Field label={tc("language")}>
            {(draft.language?.default ?? "de").toUpperCase()}
            {draft.language?.allowSwitch ? " · ⇄" : ""}
          </Field>
          <Field label={tc("successCriteria")}>
            {draft.successCriteria?.mode === "deductive"
              ? tc("deductive")
              : tc("inductive")}
          </Field>
        </dl>
        {(draft.goals?.length ?? 0) > 0 ? (
          <div className="border-t border-line pt-3">
            <p className="mb-1 text-xs font-medium text-fg-subtle">
              {tc("goals")}
            </p>
            <ul className="flex flex-col gap-1 text-sm text-fg">
              {draft.goals!.map((g) => (
                <li key={g.id}>• {g.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Row 2 — audience & delivery */}
      <Card className="gap-4 rounded-card border-line bg-elevated p-5 shadow-none">
        <h2 className="text-sm font-semibold text-fg">{t("delivery")}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-fg-subtle">
              {tc("topics")}
            </p>
            {draft.topics?.nodes?.length ? (
              <TopicGraph data={draft.topics} />
            ) : (
              <p className="text-sm text-fg-muted">{tc("topicsEmpty")}</p>
            )}
          </div>
          <div className="space-y-3">
            <Field label={tc("audience")}>
              {draft.audience?.segments?.length
                ? draft.audience.segments.join(", ")
                : "—"}
            </Field>
            <Field label={t("peopleLabel")}>
              {t("peopleCount", { count: peopleCount })}
            </Field>
            {draft.background?.notes?.trim() ? (
              <Field label={tc("background")}>
                <span className="line-clamp-3 text-fg-muted">
                  {draft.background.notes}
                </span>
              </Field>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Row 3 — launch pad */}
      <Card className="gap-4 rounded-card border-line bg-surface p-5 shadow-none">
        <h2 className="text-sm font-semibold text-fg">{t("launchpad")}</h2>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            {t("checklist")}
          </p>
          <ul className="space-y-1.5 text-sm">
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
          {/* Advisory (non-blocking) — people/schedule are O-5. */}
          {peopleCount === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
              <AlertTriangle className="h-3.5 w-3.5 text-accent" />
              {t("advisoryNoPeople")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-pain" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
            <a href={`/campaigns/new/${draftId}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </a>
          </Button>
          <Button onClick={launch} disabled={blocked || launching} size="lg">
            {launching ? t("launching") : t("launch")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

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
    <li className="flex items-center gap-2">
      {ok ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <X className="h-4 w-4 text-pain" />
      )}
      <span className={ok ? "text-fg-muted" : "text-fg"}>
        {ok ? okLabel : label}
      </span>
    </li>
  );
}
