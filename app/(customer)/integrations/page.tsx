import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { makeApi, type IntegrationView, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DataChip } from "@/components/ui/data-chip";
import { StatusDisc } from "@/components/ui/status-disc";

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
      <Folio index="§" label={t("title")} count={connectors.length} />
      <p className="mt-2 max-w-[60ch] body-sm text-fg-muted">{t("subtitle")}</p>

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

      {connectors.length > 0 && (
        <div className="mt-6">
          <InstrumentBand
            cells={[
              { label: t("title"), value: connectors.length },
              { label: t("connected"), value: connectedCount },
              { label: "Installiert", value: installedCount },
            ]}
          />
        </div>
      )}

      <Ledger framed className="mt-8">
        {connectors.map((c) => (
          <LedgerRow
            key={c.key}
            status={c.installed && c.status === "CONNECTED" ? "done" : "idle"}
            index={c.category}
            title={c.name}
            expandable
            metric={
              c.installed ? (
                <DataChip tone={c.status === "CONNECTED" ? "success" : "neutral"}>
                  {c.status === "CONNECTED" ? t("connected") : t("disabled")}
                </DataChip>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3 py-1">
              <p className="card--reading leading-relaxed text-fg-muted">
                {c.description}
              </p>
              {c.installed ? (
                <form action={disconnect}>
                  <input type="hidden" name="id" value={c.install_id} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("disconnect")}
                  </Button>
                </form>
              ) : (
                <form action={install} className="flex flex-col gap-2">
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
                    className="font-mono font-mono tabular-nums"
                  />
                  <Button type="submit" size="sm" className="self-start">
                    {t("connect")}
                  </Button>
                </form>
              )}
            </div>
          </LedgerRow>
        ))}
      </Ledger>

      <p className="mt-6 text-caption text-fg-subtle">{t("ssoNote")}</p>
    </>
  );
}
