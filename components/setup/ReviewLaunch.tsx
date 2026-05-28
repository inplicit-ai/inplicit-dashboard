"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/PageChrome";
import { api, type CampaignDraft } from "@/lib/api";
import { validateForLaunch } from "@/lib/setup/draftReducer";
import { TopicGraph } from "./TopicGraph";

/**
 * Review + launch pad (doc 03 §8). 3-row grid: essentials, audience & delivery,
 * launch pad with a validation checklist and the near-black primary launch CTA
 * (accent is never a button bg — design tokens).
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
  const reasons = validateForLaunch(draft);

  function launch() {
    setLaunching(true);
    api.setup
      .launchDraft(draftId)
      .then((res) => router.push(`/campaigns/${res.campaign_id}`))
      .catch(() => setLaunching(false));
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <div className="space-y-1">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-2xl font-medium tracking-tight text-fg">
          {t("title")}
        </h1>
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
          </Field>
          <Field label={tc("successCriteria")}>
            {draft.successCriteria?.mode === "deductive"
              ? tc("deductive")
              : tc("inductive")}
          </Field>
        </dl>
        {(draft.goals?.length ?? 0) > 0 && (
          <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-fg">
            {draft.goals!.map((g) => (
              <li key={g.id}>• {g.text}</li>
            ))}
          </ul>
        )}
      </Card>

      {/* Row 2 — audience & delivery */}
      <Card className="gap-4 rounded-card border-line bg-elevated p-5 shadow-none">
        <h2 className="text-sm font-semibold text-fg">{t("delivery")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-fg-subtle">
              {tc("topics")}
            </p>
            <TopicGraph data={draft.topics} />
          </div>
          <div className="space-y-2">
            <Field label={tc("audience")}>
              {draft.audience?.segments?.length
                ? draft.audience.segments.join(", ")
                : "—"}
            </Field>
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
            <Gate ok={!reasons.includes("no_goals")} label={t("noGoals")} okLabel={t("ok")} />
            <Gate
              ok={!reasons.includes("no_success_criteria")}
              label={t("noSuccessCriteria")}
              okLabel={t("ok")}
            />
          </ul>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
            <a href={`/campaigns/new/${draftId}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </a>
          </Button>
          <Button
            onClick={launch}
            disabled={reasons.length > 0 || launching}
            size="lg"
          >
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
