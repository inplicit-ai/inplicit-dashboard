import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FolderPlus } from "lucide-react";
import {
  makeApi,
  ApiError,
  type Vault,
  type VaultItem,
} from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { VaultHub } from "@/components/vaults/VaultHub";

interface SearchParams {
  vault?: string;
  flash?: string;
  flashType?: "ok" | "err";
}

// WHY-119 F1 — the search-first Context-Vault hub. ONE surface: a semantic
// search box, a friendly drag-drop upload zone, collection filter chips
// (Allgemein/Unternehmen · Rollen · Integrationen[coming-soon] · Uploads) and
// per-kind item cards with index-status pills. Read = ORG_MEMBER; writes =
// ORG_OWNER (enforced server-side). The /twin and /integrations routes stay as
// deep links.
export default async function VaultHubPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { me } = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("vaultHub");
  const tv = await getTranslations("vaults");
  const api = makeApi(await requestCookie());
  const canWrite = me.role === "ORG_OWNER";

  let vaults: Vault[] = [];
  let error: unknown = null;
  try {
    vaults = await api.vaults.list();
  } catch (e) {
    error = e;
  }

  const orgVaults = vaults.filter((v) => (v.scope ?? "ORG") === "ORG");
  const activeId = sp.vault ?? orgVaults[0]?.id ?? null;

  let items: VaultItem[] = [];
  if (activeId) {
    try {
      items = await api.vaults.listItems(activeId);
    } catch {
      items = [];
    }
  }

  let roleCount = 0;
  try {
    const graph = await api.twin.graph();
    roleCount = graph.nodes.length;
  } catch {
    roleCount = 0;
  }

  async function createVault(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect(
        `/vaults?flashType=err&flash=${encodeURIComponent("Name required")}`,
      );
    }
    const description = String(formData.get("description") ?? "").trim();
    const api = makeApi(await requestCookie());
    try {
      const v = await api.vaults.create({
        name,
        description: description || undefined,
      });
      revalidatePath("/vaults");
      redirect(`/vaults?vault=${v.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}
      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {orgVaults.length === 0 ? (
        canWrite ? (
          <Card className="mx-auto max-w-lg gap-4 p-8">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
                <FolderPlus className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-[length:var(--text-title)] font-semibold text-fg">
                {tv("newVault")}
              </h3>
              <p className="mt-1 max-w-[42ch] text-[length:var(--text-body-sm)] text-fg-subtle">
                {tv("empty")}
              </p>
            </div>
            <form action={createVault} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vault-name">{tv("newVault")}</Label>
                <Input
                  id="vault-name"
                  name="name"
                  placeholder={tv("namePlaceholder")}
                  required
                />
              </div>
              <Input name="description" placeholder={tv("descPlaceholder")} />
              <Button type="submit" className="w-full">
                {tv("createVault")}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-2">
            <EmptyState icon={FolderPlus} title={tv("title")} hint={tv("empty")} />
          </Card>
        )
      ) : (
        <VaultHub
          vaults={orgVaults}
          initialVaultId={activeId}
          initialItems={items}
          roleCount={roleCount}
          integrationsHref="/integrations"
        />
      )}
    </>
  );
}

/** Map known English backend errors to German. */
function translateFlash(msg: string): string {
  const map: Record<string, string> = {
    "content must be a valid URL for URL items":
      "Der Inhalt muss eine gültige URL sein (z. B. https://example.com).",
    "Name required": "Name ist erforderlich.",
    "Content required": "Inhalt ist erforderlich.",
    "Vault deleted": "Tresor wurde gelöscht.",
  };
  return map[msg] ?? msg;
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  return (
    <div
      role="status"
      className={
        "mb-6 flex items-start gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)] " +
        (type === "ok"
          ? "border-success/20 bg-success-soft text-fg"
          : "border-danger/22 bg-danger-soft text-danger")
      }
    >
      <p className="leading-snug">{translateFlash(message)}</p>
    </div>
  );
}
