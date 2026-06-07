import { getTranslations } from "next-intl/server";
import { makeApi, type TwinRole } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ErrorState";
import {
  RoleMultiSelect,
  type SelectableRole,
} from "@/components/ctsim/RoleMultiSelect";

// WHY-117 (Vault D) — roles view, now multi-selectable. The user picks roles
// and starts a campaign with them as the audience (CTA "Kampagne mit diesen
// Rollen"). STRICTLY anonymous: we project each TwinRole down to id + name +
// has_validated only — never participant PII.
export default async function TwinRolesPage() {
  await requireUser();
  const t = await getTranslations("twin");
  const api = makeApi(await requestCookie());

  let roles: TwinRole[] = [];
  let error: unknown = null;
  try {
    roles = await api.twin.listRoles();
  } catch (e) {
    error = e;
  }

  const selectable: SelectableRole[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    hasValidated: r.has_validated,
  }));

  return (
    <>
      <PageHeader
        title={t("rolesTitle")}
        subtitle={t("rolesMeta")}
        actions={<Badge variant="outline">{t("simulationBadge")}</Badge>}
      />
      {error ? (
        <ErrorState error={error} />
      ) : (
        <RoleMultiSelect roles={selectable} />
      )}
    </>
  );
}
