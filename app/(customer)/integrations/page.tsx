import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Plug, TriangleAlert } from "lucide-react";
import { makeApi, type IntegrationView, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat-band";
import { CardGrid } from "@/components/ui/card-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

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

  const installedCount = connectors.filter((c) => c.installed).length;
  const connectedCount = connectors.filter(
    (c) => c.installed && c.status === "CONNECTED",
  ).length;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {connectors.length > 0 && (
        <div className="mb-8">
          <StatBand
            cells={[
              { label: t("title"), value: connectors.length },
              { label: t("connected"), value: connectedCount },
              { label: "Installiert", value: installedCount },
            ]}
          />
        </div>
      )}

      {!error && connectors.length === 0 ? (
        <EmptyState icon={Plug} title={t("title")} hint={t("subtitle")} />
      ) : (
        <CardGrid>
          {connectors.map((c) => (
            <Card key={c.key} className="gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold tracking-[-0.01em] text-fg">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-[length:var(--text-caption)] text-fg-subtle">
                    {c.category}
                  </p>
                </div>
                {c.installed && (
                  <StatusBadge
                    status={c.status === "CONNECTED" ? "ACTIVE" : "PAUSED"}
                    label={c.status === "CONNECTED" ? t("connected") : t("disabled")}
                    withIcon
                  />
                )}
              </div>

              <p className="text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
                {c.description}
              </p>

              {c.installed ? (
                <form action={disconnect} className="mt-auto pt-1">
                  <input type="hidden" name="id" value={c.install_id} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("disconnect")}
                  </Button>
                </form>
              ) : (
                <form action={install} className="mt-auto flex flex-col gap-2 pt-1">
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
                    mono
                    placeholder={t("configPlaceholder")}
                  />
                  <Button type="submit" size="sm" className="self-start">
                    {t("connect")}
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </CardGrid>
      )}

      <p className="mt-6 text-[length:var(--text-caption)] text-fg-subtle">
        {t("ssoNote")}
      </p>
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
