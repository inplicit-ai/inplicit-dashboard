import { Launchpad } from "@/components/setup/Launchpad";

/**
 * Campaign creation — prompt launchpad (O-3, doc 03 §1.1). The user types a
 * free-form learning goal; we create a setup-agent draft and move to the
 * chat ⟷ catalog split author screen.
 *
 * Suggestions are now fixed research-goal theme cards rendered by the
 * Launchpad itself (WHY-104) — no org-grounded fetch is needed here.
 *
 * WHY-117 (Vault D): when reached from the roles view via "Kampagne mit diesen
 * Rollen", the selected roles arrive as `?roles=<ids>&roleNames=<names>`. We
 * parse them server-side (anonymous — ids/names only, never PII) and hand them
 * to the Launchpad, which seeds them onto the draft audience.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ roles?: string; roleNames?: string }>;
}) {
  const sp = await searchParams;
  const ids = parseList(sp.roles, ",");
  const names = parseList(sp.roleNames, "␟");
  const prefilledRoles =
    ids.length > 0
      ? { ids, names: names.length === ids.length ? names : ids }
      : null;

  return <Launchpad prefilledRoles={prefilledRoles} />;
}

/** Split a delimited query value into a trimmed, non-empty list. */
function parseList(value: string | undefined, sep: string): string[] {
  if (!value) return [];
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
