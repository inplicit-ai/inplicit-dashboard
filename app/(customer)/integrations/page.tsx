import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plug } from "lucide-react";
import { makeApi, type IntegrationView, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";

interface SearchParams {
  flash?: string;
  flashType?: "ok" | "err";
}

// O-8: Integrations registry (doc 06 §7). Outbound, low-risk connectors only.
// ORG_OWNER only. Secrets are exchanged for a secret_ref server-side; the raw
// value is never persisted.
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgOwner();
  const sp = await searchParams;
  const t = await getTranslations("integrations");
  const api = makeApi(await requestCookie());

  let connectors: IntegrationView[] = [];
  let error: unknown = null;
  try {
    connectors = await api.integrations.list();
  } catch (e) {
    error = e;
  }

  async function install(formData: FormData) {
    "use server";
    const provider = String(formData.get("provider") ?? "");
    const secret = String(formData.get("secret") ?? "").trim();
    const configRaw = String(formData.get("config") ?? "").trim();
    let config: Record<string, unknown> = {};
    if (configRaw) {
      try {
        config = JSON.parse(configRaw) as Record<string, unknown>;
      } catch {
        redirect(
          "/integrations?flashType=err&flash=" +
            encodeURIComponent("Config must be valid JSON"),
        );
      }
    }
    const api = makeApi(await requestCookie());
    try {
      await api.integrations.install({
        provider,
        config,
        secret: secret || undefined,
      });
      revalidatePath("/integrations");
      redirect("/integrations?flashType=ok&flash=" + encodeURIComponent("Connected"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect("/integrations?flashType=err&flash=" + encodeURIComponent(msg));
    }
  }

  async function disconnect(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.integrations.remove(id);
      revalidatePath("/integrations");
      redirect("/integrations?flashType=ok&flash=" + encodeURIComponent("Disconnected"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect("/integrations?flashType=err&flash=" + encodeURIComponent(msg));
    }
  }

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} meta={t("subtitle")} />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && (
        <div
          className={
            "mb-6 rounded-card border px-4 py-3 text-sm " +
            (sp.flashType === "err"
              ? "border-pain/30 bg-pain-soft text-pain"
              : "border-success/30 bg-success-soft/40 text-fg")
          }
        >
          {sp.flash}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {connectors.map((c) => (
          <Card key={c.key} className="rounded-card p-5 shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-card border border-line bg-surface text-fg-muted">
                  <Plug className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">{c.name}</p>
                  <p className="text-xs text-fg-muted">{c.category}</p>
                </div>
              </div>
              {c.installed && (
                <Badge
                  variant={c.status === "CONNECTED" ? "default" : "secondary"}
                >
                  {c.status === "CONNECTED" ? t("connected") : t("disabled")}
                </Badge>
              )}
            </div>

            <p className="mt-3 text-sm text-fg-muted">{c.description}</p>

            {c.installed ? (
              <form action={disconnect} className="mt-4">
                <input type="hidden" name="id" value={c.install_id} />
                <Button type="submit" variant="outline" size="sm">
                  {t("disconnect")}
                </Button>
              </form>
            ) : (
              <form action={install} className="mt-4 space-y-2">
                <input type="hidden" name="provider" value={c.key} />
                {c.requires_secret && (
                  <Input
                    name="secret"
                    type="password"
                    placeholder={t("secretPlaceholder")}
                    autoComplete="off"
                  />
                )}
                <Input
                  name="config"
                  placeholder={t("configPlaceholder")}
                  className="font-mono text-xs"
                />
                <Button type="submit" size="sm">
                  {t("connect")}
                </Button>
              </form>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-fg-subtle">{t("ssoNote")}</p>
    </>
  );
}
