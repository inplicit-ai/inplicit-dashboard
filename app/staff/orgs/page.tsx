import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { makeApi, type Organization } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ErrorState";
import { OrgAvatar } from "@/components/OrgAvatar";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

export default async function StaffOrgsPage() {
  const api = makeApi(await requestCookie());
  let orgs: Organization[] = [];
  let error: unknown = null;
  try {
    orgs = await api.staff.orgs.list();
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader
        eyebrow="Inplicit Staff"
        title="Organisationen"
        muted={`${orgs.length} aktiv`}
        actions={
          <Button asChild size="sm">
            <Link href="/staff/orgs/new">
              <Plus className="h-4 w-4" />
              Neue Organisation
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {!error && orgs.length === 0 && (
        <Card className="rounded-card border-dashed bg-surface/40 p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch keine Kunden-Organisation.
              </p>
              <p className="max-w-[48ch] text-sm text-fg-muted">
                Lege die erste an. Pro Org genau ein Customer-User, das
                Inplicit-Team behält Cross-Org-Zugriff.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/staff/orgs/new">
                <Plus className="h-4 w-4" />
                Erste Organisation anlegen
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {orgs.length > 0 && (
        <div className="space-y-2.5">
          {orgs.map((o) => (
            <Link
              key={o.id}
              href={`/staff/orgs/${o.id}`}
              className="group flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex min-w-0 items-center gap-4">
                <OrgAvatar name={o.name} logoUrl={o.logo_url} size={40} />
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-base font-medium text-fg">
                    {o.name}
                  </p>
                  <p className="text-xs text-fg-muted">
                    <span className="font-mono">{o.slug}</span>
                    {o.industry && <> · {o.industry}</>}{" "}
                    · {o.default_locale.toUpperCase()}{" "}
                    · {o.default_interview_length_min} Min
                    {o.created_at && (
                      <>
                        {" "}
                        · seit{" "}
                        {new Date(o.created_at).toLocaleDateString("de-DE")}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={o.status} />
                <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
