import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { makeApi, type OrgMember, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpecStrip } from "@/components/ui/spec-strip";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

interface SearchParams {
  flash?: string;
  flashType?: "ok" | "err";
  magic_link?: string;
  invited_email?: string;
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgOwner();
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let members: OrgMember[] = [];
  let listError: string | null = null;
  try {
    members = await api.orgMembers.list();
  } catch (e) {
    listError =
      e instanceof ApiError
        ? e.message
        : "Mitgliederliste konnte nicht geladen werden.";
  }

  async function inviteMember(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      redirect(
        "/campaigns/team?flashType=err&flash=" +
          encodeURIComponent("Bitte eine gültige E-Mail-Adresse eingeben."),
      );
    }
    const cookie = await requestCookie();
    const api = makeApi(cookie);
    try {
      const result = await api.orgMembers.invite(email);
      const params = new URLSearchParams({
        flashType: "ok",
        flash: `Einladung an ${email} verschickt.`,
        invited_email: email,
      });
      if (result.magic_link) params.set("magic_link", result.magic_link);
      revalidatePath("/campaigns/team");
      redirect("/campaigns/team?" + params.toString());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/campaigns/team?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  async function removeMember(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const cookie = await requestCookie();
    const api = makeApi(cookie);
    try {
      await api.orgMembers.remove(id);
      revalidatePath("/campaigns/team");
      redirect(
        "/campaigns/team?flashType=ok&flash=" +
          encodeURIComponent("Mitglied entfernt."),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/campaigns/team?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  const activeCount = members.filter((m) => m.accepted_at).length;
  const pendingCount = members.length - activeCount;

  return (
    <>
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Team</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{members.length}</span>
            <span className="masthead__metric-label">
              Mitglied{members.length === 1 ? "" : "er"}
            </span>
          </span>
        </div>
        <p className="masthead__dek">
          Workspace-Mitglieder. Eingeladene Kolleginnen können nur den
          Insights-Search nutzen, ohne Kampagnes zu verwalten.
        </p>
      </header>

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <div className="mb-6 rounded-card border border-success/30 bg-success-soft p-5">
          <p className="text-sm font-semibold text-fg">
            Einladungs-Link
            {sp.invited_email && (
              <span className="ml-2 text-xs font-normal text-fg-muted">
                für {sp.invited_email}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-fg-muted">7 Tage gültig, single-use.</p>
          <div className="mt-3 break-all rounded-ui border border-line bg-canvas p-3 font-mono text-xs">
            <a className="text-accent-strong hover:underline" href={sp.magic_link}>
              {sp.magic_link}
            </a>
          </div>
        </div>
      )}

      <SpecStrip
        cells={[
          { label: "Mitglieder", value: members.length },
          { label: "Aktiv", value: activeCount },
          { label: "Eingeladen", value: pendingCount },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
        {/* Register track */}
        <div className="min-w-0">
          {listError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-ui border border-pain-muted bg-pain-soft px-3.5 py-2.5 text-sm text-pain">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{listError}</p>
            </div>
          )}

          {!listError && members.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-strong bg-surface/40 px-6 py-14">
              <p className="text-center font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
                NOCH KEINE MITGLIEDER — lade Kolleginnen ein, sie nutzen den
                Insights-Search.
              </p>
            </div>
          ) : (
            members.length > 0 && (
              <>
                <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
                  <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                    § MITGLIEDER
                  </span>
                  <span className="font-mono text-xs tabular-nums text-fg-muted">
                    n={members.length}
                  </span>
                </header>
                <div className="w-full overflow-x-auto">
                  <table className="register min-w-[560px]">
                    <thead>
                      <tr>
                        <th className="w-[28px]" aria-label="Status" />
                        <th>E-Mail</th>
                        <th>Status</th>
                        <th>Datum</th>
                        <th className="w-[120px] text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <StatusDisc
                              state={m.accepted_at ? "done" : "pending"}
                              size="sm"
                            />
                          </td>
                          <td className="register__id text-xs text-fg-muted">
                            {m.email}
                          </td>
                          <td>
                            <StatusBadge
                              status={m.accepted_at ? "ACTIVE" : "PENDING"}
                              label={m.accepted_at ? "Aktiv" : "Eingeladen"}
                            />
                          </td>
                          <td className="register__id text-xs text-fg-muted">
                            {m.accepted_at
                              ? new Date(m.accepted_at).toLocaleDateString(
                                  "de-DE",
                                )
                              : `läuft ab ${new Date(m.expires_at).toLocaleDateString("de-DE")}`}
                          </td>
                          <td className="text-right">
                            <form action={removeMember}>
                              <input type="hidden" name="id" value={m.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-fg-muted hover:bg-pain-soft hover:text-pain"
                              >
                                Entfernen
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>

        {/* Invite rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <span className="eyebrow">Mitglied einladen</span>
          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            Das Mitglied erhält einen Einladungs-Link per E-Mail und kann danach
            nur den Insights-Search nutzen.
          </p>
          <form action={inviteMember} className="mt-4 flex flex-col gap-3">
            <Input
              name="email"
              type="email"
              required
              placeholder="kollegin@firma.de"
              className="text-sm"
            />
            <Button type="submit" size="sm" className="w-full">
              <UserPlus className="h-4 w-4" />
              Einladen
            </Button>
          </form>
        </aside>
      </div>
    </>
  );
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain-muted bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}
