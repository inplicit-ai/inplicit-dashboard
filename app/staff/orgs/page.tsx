import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { makeApi, type Organization } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat-band";
import { CardGrid, EntityCard } from "@/components/ui/card-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

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
      <PageHeader
        title="Organisationen"
        subtitle="Ein Kunde, ein Account. Das Inplicit-Team behält Cross-Org-Zugriff."
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

      {orgs.length > 0 && (
        <div className="mb-8">
          <StatBand
            cells={[
              { label: "Organisationen", value: orgs.length },
              { label: "Aktiv", value: active },
              { label: "Suspendiert", value: suspended },
            ]}
          />
        </div>
      )}

      {!error && orgs.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Noch keine Organisation"
          hint="Lege die erste an. Pro Org genau ein Customer-User, das Inplicit-Team behält Cross-Org-Zugriff."
          action={
            <Button asChild size="sm">
              <Link href="/staff/orgs/new">
                <Plus className="h-4 w-4" />
                Erste Organisation anlegen
              </Link>
            </Button>
          }
        />
      )}

      {orgs.length > 0 && (
        <CardGrid>
          {orgs.map((o) => (
            <EntityCard
              key={o.id}
              href={`/staff/orgs/${o.id}`}
              title={o.name}
              status={<StatusBadge status={o.status} withIcon />}
              meta={
                <span className="font-mono">{o.slug}</span>
              }
              footer={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {o.industry && <span>{o.industry}</span>}
                  <span>{o.default_locale.toUpperCase()}</span>
                  <span className="tabular-nums">
                    {o.default_interview_length_min} min
                  </span>
                </span>
              }
            />
          ))}
        </CardGrid>
      )}
    </>
  );
}
