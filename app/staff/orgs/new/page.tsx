import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, makeApi, type ProvisionOrgInput } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, makeDurationOptions } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Folio } from "@/components/ui/folio";
import { StatusDisc } from "@/components/ui/status-disc";
import { SpecBlock } from "@/components/ui/spec-block";

export default async function NewOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sticky?: string }>;
}) {
  const sp = await searchParams;
  const sticky: Partial<ProvisionOrgInput> = sp.sticky
    ? JSON.parse(decodeURIComponent(sp.sticky))
    : {};

  // Org-level locale supports DE/EN only (not the FR interview option).
  const LOCALE_OPTIONS = [
    { value: "de", label: "Deutsch" },
    { value: "en", label: "English" },
  ];
  // Interview duration on the 5-min grid, 10–60 min.
  const DURATION_OPTIONS = makeDurationOptions(10, 60, 5);

  async function createOrg(formData: FormData) {
    "use server";
    const get = (k: string) => String(formData.get(k) ?? "").trim();

    const body: ProvisionOrgInput = {
      name: get("name"),
      slug: get("slug"),
      company_context: get("company_context"),
      industry: get("industry") || undefined,
      default_locale: get("default_locale") || "de",
      default_voice_id: parseIntOr(get("default_voice_id"), 438),
      default_interview_length_min: parseIntOr(
        get("default_interview_length_min"),
        25,
      ),
      owner_email: get("owner_email"),
      owner_name: get("owner_name"),
      issue_magic_link: formData.get("issue_magic_link") === "on",
    };

    if (
      !body.name ||
      !body.slug ||
      !body.company_context ||
      !body.owner_email ||
      !body.owner_name
    ) {
      const stickyParam = encodeURIComponent(JSON.stringify(body));
      redirect(
        `/staff/orgs/new?error=${encodeURIComponent("Bitte alle Pflichtfelder ausfüllen.")}&sticky=${stickyParam}`,
      );
    }

    const api = makeApi(await requestCookie());
    let redirectTo: string;
    try {
      const result = await api.staff.orgs.create(body);
      const params = new URLSearchParams();
      if (result.magic_link) params.set("magic_link", result.magic_link);
      if (result.email_sent === true) params.set("email_sent", "1");
      if (result.email_error) params.set("email_error", result.email_error);
      const qs = params.toString();
      redirectTo = `/staff/orgs/${result.org.id}${qs ? "?" + qs : ""}`;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      const stickyParam = encodeURIComponent(JSON.stringify(body));
      redirectTo = `/staff/orgs/new?error=${encodeURIComponent(msg)}&sticky=${stickyParam}`;
    }
    redirect(redirectTo);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(220px,260px)_1fr]">
      {/* ── Left rail: the setup-flow checklist + intent ───────────────────── */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
          <Link href="/staff/orgs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Organisationen
          </Link>
        </Button>

        <div>
          <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
            Inplicit Staff
          </span>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg">
            Organisation anlegen
          </h1>
          <p className="mt-2 body-sm text-fg-muted">ein Kunde, ein Account</p>
        </div>

        {/* Spine checklist — the two stages of provisioning. */}
        <ol className="relative ml-1 flex flex-col gap-4 border-l border-dashed border-line-strong pl-4">
          <li className="-ml-[21px] flex items-center gap-2.5">
            <StatusDisc state="live" />
            <span className="text-meta text-fg">Unternehmen</span>
          </li>
          <li className="-ml-[21px] flex items-center gap-2.5">
            <StatusDisc state="idle" />
            <span className="text-meta text-fg-muted">Customer-Account</span>
          </li>
        </ol>

        <SpecBlock
          rows={[
            { label: "Users / Org", value: 1 },
            { label: "Login", value: "Magic-Link" },
            { label: "Voice", value: 438 },
          ]}
        />
      </aside>

      {/* ── Right track: the working form ──────────────────────────────────── */}
      <div className="min-w-0 max-w-[680px]">
        {sp.error && (
          <div
            role="alert"
            className="mb-6 grid grid-cols-[20px_1fr] items-start gap-x-2.5 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-2.5 text-meta text-danger"
          >
            <span className="flex justify-center pt-0.5">
              <StatusDisc state="error" size="sm" />
            </span>
            <p className="leading-snug">{sp.error}</p>
          </div>
        )}

        <Card className="rounded-card border border-line bg-surface p-8">
          <form action={createOrg} className="flex flex-col gap-5">
            <Folio index="§ 01" label="Unternehmen" tone="subtle" />
            <p className="-mt-2 text-caption text-fg-muted">
              Daten zum Kunden. Sind später bearbeitbar.
            </p>

          <Field id="name" label="Name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="Acme GmbH"
              defaultValue={sticky.name}
              className="h-9 text-base md:text-sm"
            />
          </Field>

          <Field
            id="slug"
            label="Slug"
            required
            hint={
              <>
                URL-tauglich, eindeutig, klein-buchstaben + Bindestrich (z. B.{" "}
                <Mono>acme-gmbh</Mono>).
              </>
            }
          >
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9\-]+"
              placeholder="acme-gmbh"
              defaultValue={sticky.slug}
              className="h-9 font-mono text-base md:text-sm"
            />
          </Field>

          <Field
            id="company_context"
            label="Unternehmenskontext"
            required
            hint="2–4 Sätze. Branche, Größe, Produkt, Zielgruppe. Wird in jeden Interview-System-Prompt eingespeist."
          >
            <Textarea
              id="company_context"
              name="company_context"
              required
              rows={6}
              placeholder="Acme GmbH ist ein B2B-SaaS für Logistikfirmen mit Sitz in Berlin..."
              defaultValue={sticky.company_context}
              className="min-h-[150px] text-base md:text-sm"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="industry" label="Branche">
              <Input
                id="industry"
                name="industry"
                placeholder="Logistik-SaaS"
                defaultValue={sticky.industry}
                className="h-9 text-base md:text-sm"
              />
            </Field>
            <Field id="default_locale" label="Standardsprache">
              <Select
                id="default_locale"
                name="default_locale"
                defaultValue={sticky.default_locale ?? "de"}
                options={LOCALE_OPTIONS}
                size="md"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="default_voice_id" label="Standard-Voice-ID">
              <Input
                id="default_voice_id"
                name="default_voice_id"
                type="number"
                min={1}
                defaultValue={String(sticky.default_voice_id ?? 438)}
                className="h-9 font-mono text-base md:text-sm"
              />
            </Field>
            <Field
              id="default_interview_length_min"
              label="Standard-Interviewdauer"
            >
              <Select
                id="default_interview_length_min"
                name="default_interview_length_min"
                defaultValue={String(sticky.default_interview_length_min ?? 25)}
                options={DURATION_OPTIONS}
                size="md"
              />
            </Field>
          </div>

          <div className="mt-2 border-t border-line-subtle pt-5">
            <Folio index="§ 02" label="Customer-Account" tone="subtle" />
            <p className="-mt-2 text-caption text-fg-muted">
              Genau ein User pro Org. Die Person, die das Dashboard sieht.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="owner_email" label="Owner-Email" required>
              <Input
                id="owner_email"
                name="owner_email"
                type="email"
                required
                placeholder="max@acme.de"
                defaultValue={sticky.owner_email}
                className="h-9 text-base md:text-sm"
              />
            </Field>
            <Field id="owner_name" label="Owner-Name" required>
              <Input
                id="owner_name"
                name="owner_name"
                required
                placeholder="Max Mustermann"
                defaultValue={sticky.owner_name}
                className="h-9 text-base md:text-sm"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-ui border border-line bg-canvas p-4 text-body-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2">
            <input
              type="checkbox"
              name="issue_magic_link"
              defaultChecked
              className="mt-0.5 size-4 cursor-pointer rounded-sm border-line accent-accent"
            />
            <span className="space-y-0.5">
              <span className="block font-medium">Magic-Link sofort ausgeben</span>
              <span className="block text-caption text-fg-muted">
                Der Owner bekommt eine Welcome-Email mit dem Login-Link (15 Min
                gültig, single-use).
              </span>
            </span>
          </label>

            <Button type="submit" size="lg" className="w-full">
              Organisation anlegen
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-eyebrow flex items-center gap-1.5">
        {label}
        {required && <span className="text-pain">*</span>}
      </label>
      {hint && <p className="text-caption leading-relaxed text-fg-subtle">{hint}</p>}
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono font-mono tabular-nums tabular-nums text-fg">
      {children}
    </code>
  );
}

function parseIntOr(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
