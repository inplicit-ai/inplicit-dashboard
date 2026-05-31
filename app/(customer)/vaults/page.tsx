import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { makeApi, type Vault, type VaultItem, ApiError } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { DataChip } from "@/components/ui/data-chip";
import { StatusDisc } from "@/components/ui/status-disc";
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
      <Folio index="§" label={t("title")} count={vaults.length} />

      {error && (
        <div className="mt-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && (
        <div
          role="status"
          className="mt-6 grid grid-cols-[20px_1fr] items-start gap-x-2.5 rounded-ui border border-line-subtle bg-surface-2 px-3.5 py-2.5 text-meta text-fg"
        >
          <span className="flex justify-center pt-0.5">
            <StatusDisc state={sp.flashType === "err" ? "error" : "done"} size="sm" />
          </span>
          <p className="leading-snug">{sp.flash}</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
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
            <div className="overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
              <div className="flex flex-col gap-3 px-5 py-8">
                <span className="flex items-center gap-2.5">
                  <StatusDisc state="idle" />
                  <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                    {t("eyebrow")}
                  </span>
                </span>
                <p className="body-sm leading-relaxed text-fg-muted">
                  {t("empty")}
                </p>
              </div>
            </div>
          ) : (
            <ul className="ledger" style={{ ["--spine-w" as string]: "20px" }}>
              {vaults.map((v) => (
                <li
                  key={v.id}
                  className="border-b border-line-subtle last:border-b-0"
                >
                  <a
                    href={`/vaults?vault=${v.id}`}
                    aria-current={v.id === activeId ? "true" : undefined}
                    className={cn(
                      "grid grid-cols-[20px_1fr] items-start gap-x-2.5 px-2 py-2.5 transition-colors",
                      v.id === activeId
                        ? "bg-surface-2"
                        : "hover:bg-surface-2",
                    )}
                  >
                    <span className="flex justify-center pt-1">
                      <StatusDisc
                        state={v.id === activeId ? "live" : "idle"}
                        size="sm"
                      />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-body-sm text-fg",
                          v.id === activeId ? "font-semibold" : "font-medium",
                        )}
                      >
                        {v.name}
                      </span>
                      {v.description && (
                        <span className="mt-0.5 block truncate text-caption text-fg-muted">
                          {v.description}
                        </span>
                      )}
                    </span>
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
                  <DataChip tone="neutral">
                    {vaults.find((v) => v.id === activeId)?.scope ?? "ORG"}
                  </DataChip>
                  <span className="body-sm font-medium text-fg">
                    {t("entriesCount", { count: items.length })}
                  </span>
                </div>
                {canWrite && (
                  <form action={deleteVault}>
                    <input type="hidden" name="id" value={activeId} />
                    <button
                      type="submit"
                      className="text-meta text-fg-subtle transition-colors hover:text-pain"
                    >
                      {t("delete")}
                    </button>
                  </form>
                )}
              </div>

              <ul className="divide-y divide-line-subtle">
                {items.length === 0 ? (
                  <li className="px-6 py-6 body-sm text-fg-muted">
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
                          <span className="body-sm font-medium text-fg">
                            {it.title}
                          </span>
                        )}
                      </div>
                      {it.content && (
                        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap body-sm leading-relaxed text-fg-muted">
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
            <div className="overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
              <div className="flex flex-col gap-3 px-8 py-12">
                <span className="flex items-center gap-2.5">
                  <StatusDisc state="idle" />
                  <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                    {t("eyebrow")}
                  </span>
                </span>
                <p className="body-lg text-fg-muted">{t("selectPrompt")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
