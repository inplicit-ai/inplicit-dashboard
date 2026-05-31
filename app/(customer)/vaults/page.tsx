import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, FolderOpen, TriangleAlert } from "lucide-react";
import { makeApi, type Vault, type VaultItem, ApiError } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { cn } from "@/lib/utils";

interface SearchParams {
  vault?: string;
  flash?: string;
  flashType?: "ok" | "err";
}

// O-8: Context Vaults (doc 06 §6). Reusable org context that seeds the setup
// agent. Read = ORG_MEMBER; writes = ORG_OWNER (enforced server-side).
export default async function VaultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { me } = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("vaults");
  const api = makeApi(await requestCookie());
  const canWrite = me.role === "ORG_OWNER";

  let vaults: Vault[] = [];
  let error: unknown = null;
  try {
    vaults = await api.vaults.list();
  } catch (e) {
    error = e;
  }

  const activeId = sp.vault ?? vaults[0]?.id ?? null;
  let items: VaultItem[] = [];
  if (activeId) {
    try {
      items = await api.vaults.listItems(activeId);
    } catch {
      items = [];
    }
  }

  async function createVault(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect(`/vaults?flashType=err&flash=${encodeURIComponent("Name required")}`);
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

  async function addItem(formData: FormData) {
    "use server";
    const vaultId = String(formData.get("vault_id") ?? "");
    const kind = String(formData.get("kind") ?? "TEXT") as VaultItem["kind"];
    const content = String(formData.get("content") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!vaultId || !content) {
      redirect(`/vaults?vault=${vaultId}&flashType=err&flash=${encodeURIComponent("Content required")}`);
    }
    const api = makeApi(await requestCookie());
    try {
      await api.vaults.addItem(vaultId, {
        kind,
        content,
        title: title || undefined,
      });
      revalidatePath("/vaults");
      redirect(`/vaults?vault=${vaultId}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?vault=${vaultId}&flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  async function deleteVault(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.vaults.remove(id);
      revalidatePath("/vaults");
      redirect("/vaults?flashType=ok&flash=" + encodeURIComponent("Vault deleted"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  const activeVault = vaults.find((v) => v.id === activeId) ?? null;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("count", { count: vaults.length })} />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ── Vault list + create ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {canWrite && (
            <Card className="gap-3 p-5">
              <form action={createVault} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vault-name">{t("newVault")}</Label>
                  <Input
                    id="vault-name"
                    name="name"
                    placeholder={t("namePlaceholder")}
                    required
                  />
                </div>
                <Input name="description" placeholder={t("descPlaceholder")} />
                <Button type="submit" className="w-full">
                  {t("createVault")}
                </Button>
              </form>
            </Card>
          )}

          {vaults.length === 0 ? (
            <Card className="p-2">
              <EmptyState icon={FolderOpen} title={t("title")} hint={t("empty")} />
            </Card>
          ) : (
            <nav className="flex flex-col gap-2">
              {vaults.map((v) => {
                const isActive = v.id === activeId;
                return (
                  <a
                    key={v.id}
                    href={`/vaults?vault=${v.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "block rounded-card border px-4 py-3 transition-all",
                      isActive
                        ? "border-line-strong bg-surface shadow-card"
                        : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-card-hover",
                    )}
                  >
                    <span
                      className={cn(
                        "block truncate text-[length:var(--text-body-sm)] text-fg",
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {v.name}
                    </span>
                    {v.description && (
                      <span className="mt-0.5 block truncate text-[length:var(--text-caption)] text-fg-muted">
                        {v.description}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        {/* ── Vault detail ────────────────────────────────────────────────── */}
        <div>
          {activeId && activeVault ? (
            <Card variant="ledger" className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-6 py-4">
                <div className="flex items-center gap-2">
                  <DataChip tone="neutral">{activeVault.scope ?? "ORG"}</DataChip>
                  <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                    {t("entriesCount", { count: items.length })}
                  </span>
                </div>
                {canWrite && (
                  <form action={deleteVault}>
                    <input type="hidden" name="id" value={activeId} />
                    <button
                      type="submit"
                      className="text-[length:var(--text-meta)] text-fg-subtle transition-colors hover:text-danger"
                    >
                      {t("delete")}
                    </button>
                  </form>
                )}
              </div>

              <ul className="divide-y divide-line-subtle">
                {items.length === 0 ? (
                  <li className="px-6 py-6 text-[length:var(--text-body-sm)] text-fg-muted">
                    {t("noEntries")}
                  </li>
                ) : (
                  items.map((it) => (
                    <li key={it.id} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DataChip tone="neutral" mono>
                          {it.kind}
                        </DataChip>
                        {it.title && (
                          <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                            {it.title}
                          </span>
                        )}
                      </div>
                      {it.content && (
                        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
                          {it.content}
                        </p>
                      )}
                    </li>
                  ))
                )}
              </ul>

              {canWrite && (
                <form
                  action={addItem}
                  className="space-y-2 border-t border-line-subtle px-6 py-4"
                >
                  <input type="hidden" name="vault_id" value={activeId} />
                  <div className="flex gap-2">
                    <div className="w-32 shrink-0">
                      <Select
                        name="kind"
                        defaultValue="TEXT"
                        size="sm"
                        aria-label={t("kindText")}
                      >
                        <option value="TEXT">{t("kindText")}</option>
                        <option value="URL">{t("kindUrl")}</option>
                      </Select>
                    </div>
                    <Input
                      name="title"
                      placeholder={t("titlePlaceholder")}
                      className="flex-1"
                    />
                  </div>
                  <Textarea
                    name="content"
                    placeholder={t("contentPlaceholder")}
                    rows={3}
                    required
                  />
                  <Button type="submit" className="self-start">
                    {t("addEntry")}
                  </Button>
                </form>
              )}
            </Card>
          ) : (
            <Card className="p-2">
              <EmptyState
                icon={FolderOpen}
                title={t("title")}
                hint={t("selectPrompt")}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)]",
        type === "ok"
          ? "border-success/20 bg-success-soft text-fg"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          type === "ok" ? "text-success" : "text-danger",
        )}
      />
      <p className="leading-snug">{message}</p>
    </div>
  );
}
