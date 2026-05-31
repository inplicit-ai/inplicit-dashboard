import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { ApiError, makeApi, type ProvisionOrgInput } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, makeDurationOptions } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/ui/section-heading";

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
      {/* ── Left rail: intent + a calm info card ───────────────────────────── */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
          <Link href="/staff/orgs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Organisationen
          </Link>
        </Button>

        <div>
          <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
            Organisation anlegen
          </h1>
          <p className="mt-2 text-[length:var(--text-body-lg)] text-fg-muted">
            Ein Kunde, ein Account.
          </p>
        </div>

        <Card className="gap-4 p-5">
          <ol className="flex flex-col gap-3">
            <li className="flex items-center gap-2.5 text-[length:var(--text-meta)] text-fg">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Unternehmen
            </li>
            <li className="flex items-center gap-2.5 text-[length:var(--text-meta)] text-fg-muted">
              <Circle className="h-4 w-4 text-fg-subtle" />
              Customer-Account
            </li>
          </ol>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line-subtle pt-4 text-[length:var(--text-caption)]">
            <InfoRow label="Users / Org" value="1" />
            <InfoRow label="Login" value="Magic-Link" />
            <InfoRow label="Voice" value="438" />
          </dl>
        </Card>
      </aside>

      {/* ── Right track: the working form ──────────────────────────────────── */}
      <div className="min-w-0 max-w-[680px]">
        {sp.error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-3 text-[length:var(--text-meta)] text-danger"
          >
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="leading-snug">{sp.error}</p>
          </div>
        )}

        <Card className="p-8">
          <form action={createOrg} className="flex flex-col gap-5">
            <div>
              <SectionHeading title="Unternehmen" className="mb-1" />
              <p className="text-[length:var(--text-caption)] text-fg-muted">
                Daten zum Kunden. Sind später bearbeitbar.
              </p>
            </div>

          <Field id="name" label="Name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="Acme GmbH"
              defaultValue={sticky.name}
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
              mono
              pattern="[a-z0-9\-]+"
              placeholder="acme-gmbh"
              defaultValue={sticky.slug}
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
              className="min-h-[150px]"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="industry" label="Branche">
              <Input
                id="industry"
                name="industry"
                placeholder="Logistik-SaaS"
                defaultValue={sticky.industry}
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
            <SectionHeading title="Customer-Account" className="mb-1" />
            <p className="text-[length:var(--text-caption)] text-fg-muted">
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
              />
            </Field>
            <Field id="owner_name" label="Owner-Name" required>
              <Input
                id="owner_name"
                name="owner_name"
                required
                placeholder="Max Mustermann"
                defaultValue={sticky.owner_name}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-ui border border-line bg-surface p-4 text-[length:var(--text-body-sm)] text-fg transition-colors hover:border-line-strong hover:bg-surface-2">
            <input
              type="checkbox"
              name="issue_magic_link"
              defaultChecked
              className="mt-0.5 size-4 cursor-pointer rounded-sm border-line accent-accent"
            />
            <span className="space-y-0.5">
              <span className="block font-medium">Magic-Link sofort ausgeben</span>
              <span className="block text-[length:var(--text-caption)] text-fg-muted">
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}

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
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>
      {hint && (
        <p className="text-[length:var(--text-caption)] leading-relaxed text-fg-subtle">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[length:var(--text-mono)] text-fg">
      {children}
    </code>
  );
}

function parseIntOr(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
