import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, PageHeader } from "@/components/PageChrome";
import { cn } from "@/lib/utils";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

/**
 * "Neuer Audit" — conceptually the trigger to start a new round of interviews
 * for the *existing* organization. The org's `company_context`, `name`, and
 * defaults are inherited; the form only collects audit-specific knobs:
 *
 *  - optional goals (what we want to learn from this round)
 *  - optional duration override
 *  - optional participants CSV
 *
 * Backend defaults the audit name to `Audit KW{ISO_WEEK}-{YEAR}` so the
 * minimal flow is: open page → click "Audit anlegen" → done.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  async function createCampaign(formData: FormData) {
    "use server";
    const cookie = (await cookies()).toString();

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/campaigns/upload`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: formData,
        cache: "no-store",
      });
    } catch (e) {
      console.error("[create-campaign] backend unreachable:", (e as Error).message);
      redirect(
        "/campaigns/new?error=" +
          encodeURIComponent(`Backend nicht erreichbar (${API_BASE}).`),
      );
    }

    if (!res.ok) {
      const text = await res.text();
      let errMsg = text;
      try {
        const j = JSON.parse(text);
        errMsg = j.error ?? text;
      } catch {}
      redirect(
        "/campaigns/new?error=" + encodeURIComponent(`Fehler ${res.status}: ${errMsg}`),
      );
    }

    const result = (await res.json()) as { campaign?: { id: string } };
    redirect(`/campaigns/${result.campaign?.id ?? ""}`);
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <Button asChild variant="link" size="sm" className="mb-4 px-0 text-fg-muted">
        <Link href="/campaigns">
          <ArrowLeft className="h-3.5 w-3.5" />
          Audits
        </Link>
      </Button>

      <PageHeader
        title="Neuer Audit"
        meta="Ein Audit triggert eine neue Runde anonymer Interviews für deine Organisation. Unternehmenskontext und Standardeinstellungen werden aus den Org-Settings übernommen."
      />

      {sp.error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-ui border border-pain/30 bg-pain-soft px-3.5 py-2.5 text-sm text-pain"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-snug">{sp.error}</p>
        </div>
      )}

      <form action={createCampaign} className="flex flex-col gap-4">
        <FormCard
          eyebrow="Kontext"
          title="Lernziele"
          optional
          subtitle="Was wollen wir mit diesem Audit lernen? Lass es leer für ein breites, offenes Audit."
        >
          <Textarea
            name="goals"
            rows={4}
            placeholder="z. B. Wie wirkt sich das neue CRM auf die Sales-Workflows aus?"
            className="min-h-[120px] text-base md:text-sm"
          />
        </FormCard>

        <FormCard
          eyebrow="Format"
          title="Interview-Dauer"
          subtitle="Voreinstellung: Standard deiner Organisation."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="length" label="Dauer (Min)">
              <Input
                id="length"
                name="interview_length_min"
                type="number"
                min={10}
                max={60}
                placeholder="25"
                className="h-11 text-base md:text-sm"
              />
            </Field>
            <Field id="lang" label="Sprache">
              <NativeSelect id="lang" name="language" defaultValue="">
                <option value="">Standard der Org</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </NativeSelect>
            </Field>
          </div>
        </FormCard>

        <FormCard
          eyebrow="Teilnehmer"
          title="CSV-Import"
          optional
          subtitle={
            <>
              Spalten:{" "}
              <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
                email
              </code>{" "}
              (Pflicht),{" "}
              <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
                name, department, role
              </code>
              . Du kannst Teilnehmer auch später einzeln hinzufügen.
            </>
          }
        >
          <Input
            name="participants"
            type="file"
            accept=".csv"
            className="h-auto cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-fg hover:file:bg-line"
          />
        </FormCard>

        <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row sm:gap-2">
          <Button asChild variant="outline">
            <Link href="/campaigns">Abbrechen</Link>
          </Button>
          <Button type="submit" size="lg">
            Audit anlegen
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function FormCard({
  eyebrow,
  title,
  optional,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  optional?: boolean;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 rounded-card border-line bg-surface p-6">
      <div className="space-y-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="flex items-baseline gap-2 text-lg font-semibold tracking-tight text-fg">
          {title}
          {optional && (
            <span className="text-xs font-medium text-fg-subtle">optional</span>
          )}
        </h2>
        <p className="max-w-[56ch] text-sm text-fg-muted">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-fg-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "flex h-11 w-full appearance-none rounded-ui border border-line bg-canvas px-3 py-2 pr-8 text-base text-fg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%221.75%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[position:right_0.625rem_center] bg-[size:1rem] bg-no-repeat",
        className,
      )}
    />
  );
}
