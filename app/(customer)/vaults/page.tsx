import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Vault as VaultIcon } from "lucide-react";
import { makeApi, type Vault, type VaultItem, ApiError } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";
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

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        meta={t("count", { count: vaults.length })}
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && (
        <div
          className={cn(
            "mb-6 rounded-card border px-4 py-3 text-sm",
            sp.flashType === "err"
              ? "border-pain-muted bg-pain-soft text-pain"
              : "border-success/30 bg-success-soft text-success",
          )}
        >
          {sp.flash}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Vault list + create */}
        <div className="space-y-4">
          {canWrite && (
            <div className="card card--compact">
              <form action={createVault} className="space-y-3">
                <label className="field">
                  <span className="field__label">{t("newVault")}</span>
                  <Input
                    name="name"
                    placeholder={t("namePlaceholder")}
                    required
                  />
                </label>
                <Input name="description" placeholder={t("descPlaceholder")} />
                <Button type="submit" className="w-full">
                  {t("createVault")}
                </Button>
              </form>
            </div>
          )}

          {vaults.length === 0 ? (
            <div className="card card--compact border-dashed text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-fg-muted">
                  <VaultIcon className="h-5 w-5" />
                </span>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {t("empty")}
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {vaults.map((v) => (
                <li key={v.id}>
                  <a
                    href={`/vaults?vault=${v.id}`}
                    aria-current={v.id === activeId ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-ui border-l-2 px-3 py-2.5 transition-colors",
                      v.id === activeId
                        ? "border-accent bg-surface-2"
                        : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <span className="text-sm font-medium text-fg">{v.name}</span>
                    {v.description && (
                      <span className="truncate text-xs text-fg-muted">
                        {v.description}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Vault detail */}
        <div>
          {activeId ? (
            <div className="card card--flush flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-6 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {vaults.find((v) => v.id === activeId)?.scope ?? "ORG"}
                  </Badge>
                  <span className="text-sm font-medium text-fg">
                    {t("entriesCount", { count: items.length })}
                  </span>
                </div>
                {canWrite && (
                  <form action={deleteVault}>
                    <input type="hidden" name="id" value={activeId} />
                    <button
                      type="submit"
                      className="text-xs text-fg-subtle transition-colors hover:text-pain"
                    >
                      {t("delete")}
                    </button>
                  </form>
                )}
              </div>

              <ul className="divide-y divide-line-subtle">
                {items.length === 0 ? (
                  <li className="px-6 py-6 text-sm text-fg-muted">
                    {t("noEntries")}
                  </li>
                ) : (
                  items.map((it) => (
                    <li key={it.id} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {it.kind}
                        </Badge>
                        {it.title && (
                          <span className="text-sm font-medium text-fg">
                            {it.title}
                          </span>
                        )}
                      </div>
                      {it.content && (
                        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
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
            </div>
          ) : (
            <div className="card border-dashed text-center">
              <p className="text-sm text-fg-muted">{t("selectPrompt")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
