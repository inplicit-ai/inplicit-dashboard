import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { makeApi, type Organization } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DataChip } from "@/components/ui/data-chip";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { SpecBlock } from "@/components/ui/spec-block";

export default async function StaffOrgsPage() {
  const api = makeApi(await requestCookie());
  let orgs: Organization[] = [];
  let error: unknown = null;
  try {
    orgs = await api.staff.orgs.list();
  } catch (e) {
    error = e;
  }

  const active = orgs.filter((o) => o.status === "ACTIVE").length;
  const suspended = orgs.filter((o) => o.status === "SUSPENDED").length;

  return (
    <>
      <Folio
        index="§"
        label="Organisationen"
        count={orgs.length}
        action={
          <Button asChild size="sm">
            <Link href="/staff/orgs/new">
              <Plus className="h-4 w-4" />
              Neue Organisation
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mt-6">
          <ErrorState error={error} />
        </div>
      )}

      {orgs.length > 0 && (
        <div className="mt-6">
          <InstrumentBand
            cells={[
              { label: "Organisationen", value: orgs.length },
              { label: "Aktiv", value: active },
              { label: "Suspendiert", value: suspended },
            ]}
          />
        </div>
      )}

      {!error && orgs.length === 0 && (
        <div className="mt-6 max-w-[68ch] overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
          <div className="flex flex-col gap-4 px-8 py-12">
            <span className="flex items-center gap-2.5">
              <StatusDisc state="idle" />
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                Keine Organisation auf der Platte
              </span>
            </span>
            <p className="body-lg max-w-[52ch] text-fg-muted">
              Lege die erste an. Pro Org genau ein Customer-User, das
              Inplicit-Team behält Cross-Org-Zugriff.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-1 self-start">
              <Link href="/staff/orgs/new">
                <Plus className="h-4 w-4" />
                Erste Organisation anlegen
              </Link>
            </Button>
          </div>
        </div>
      )}

      {orgs.length > 0 && (
        <Ledger framed className="mt-8">
          {orgs.map((o) => (
            <LedgerRow
              key={o.id}
              status={toStatusState(o.status)}
              index={o.slug}
              title={o.name}
              expandable
              metric={
                <Link
                  href={`/staff/orgs/${o.id}`}
                  aria-label={`${o.name} öffnen`}
                  className="inline-flex h-6 items-center gap-1.5 text-meta text-fg-muted transition-colors hover:text-fg"
                >
                  Öffnen
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <div className="flex flex-col gap-3 py-1">
                <div className="cluster">
                  <DataChip tone="neutral">{o.status}</DataChip>
                  {o.industry && <DataChip tone="neutral">{o.industry}</DataChip>}
                  <DataChip mono>{o.default_locale.toUpperCase()}</DataChip>
                  <DataChip mono>{o.default_interview_length_min} min</DataChip>
                </div>
                <SpecBlock
                  rows={[
                    { label: "Slug", value: o.slug },
                    {
                      label: "Sprache",
                      value: o.default_locale.toUpperCase(),
                    },
                    {
                      label: "Interviewdauer",
                      value: `${o.default_interview_length_min} min`,
                    },
                    ...(o.created_at
                      ? [
                          {
                            label: "Erstellt",
                            value: new Date(o.created_at).toLocaleDateString(
                              "de-DE",
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
                <Link
                  href={`/staff/orgs/${o.id}`}
                  className="inline-flex items-center gap-1.5 self-start text-meta text-accent-strong hover:underline"
                >
                  Organisation verwalten
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </>
  );
}
