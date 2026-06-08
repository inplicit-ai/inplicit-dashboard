import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, UserPlus, Users } from "lucide-react";
import {
  makeApi,
  type Employee,
  type TwinRole,
  ApiError,
} from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

const PATH = "/directory";
const ROLE_LIST_ID = "directory-role-options";

interface SearchParams {
  flash?: string;
  flashType?: "ok" | "err";
}

/**
 * Workforce directory (Belegschaft) — the org-curated list of people who get
 * interviewed. Each person points at a job ROLE; the role carries the tailored,
 * reusable interview context (its ROLE-scoped vault), so tailoring stays
 * anonymous and shared across everyone with that role. This is deliberately
 * separate from `/campaigns/team` (admin collaborators with dashboard access).
 */
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgOwner();
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let employees: Employee[] = [];
  let roles: TwinRole[] = [];
  let listError: string | null = null;
  try {
    [employees, roles] = await Promise.all([
      api.employees.list(),
      api.twin.listRoles(),
    ]);
  } catch (e) {
    listError =
      e instanceof ApiError
        ? e.message
        : "Verzeichnis konnte nicht geladen werden.";
  }

  async function addEmployee(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const department = String(formData.get("department") ?? "").trim();
    const role_name = String(formData.get("role") ?? "").trim();
    if (!email || !email.includes("@")) {
      redirect(
        `${PATH}?flashType=err&flash=` +
          encodeURIComponent("Bitte eine gültige E-Mail-Adresse eingeben."),
      );
    }
    const api = makeApi(await requestCookie());
    try {
      await api.employees.create({
        email,
        name: name || undefined,
        department: department || undefined,
        role_name: role_name || undefined,
      });
      revalidatePath(PATH);
      redirect(
        `${PATH}?flashType=ok&flash=` +
          encodeURIComponent(`${name || email} hinzugefügt.`),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`${PATH}?flashType=err&flash=` + encodeURIComponent(msg));
    }
  }

  async function assignRole(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const role_name = String(formData.get("role") ?? "").trim();
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      // Empty role_name clears the role; email is echoed back unchanged so the
      // backend leaves the rest of the record alone.
      await api.employees.update(id, { email, role_name });
      revalidatePath(PATH);
      redirect(
        `${PATH}?flashType=ok&flash=` +
          encodeURIComponent(
            role_name ? `Rolle „${role_name}" zugewiesen.` : "Rolle entfernt.",
          ),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`${PATH}?flashType=err&flash=` + encodeURIComponent(msg));
    }
  }

  async function removeEmployee(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.employees.remove(id);
      revalidatePath(PATH);
      redirect(
        `${PATH}?flashType=ok&flash=` +
          encodeURIComponent("Person entfernt."),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`${PATH}?flashType=err&flash=` + encodeURIComponent(msg));
    }
  }

  const withRole = employees.filter((e) => e.role_id).length;
  const withoutRole = employees.length - withRole;
  const roleNames = roles.map((r) => r.name);

  const columns: DataTableColumn<Employee>[] = [
    {
      key: "disc",
      header: "",
      headClassName: "w-[28px]",
      cell: (e) => (
        <StatusDisc state={e.role_id ? "done" : "pending"} size="sm" />
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (e) => (
        <span className="text-fg">{e.name || "—"}</span>
      ),
    },
    {
      key: "email",
      header: "E-Mail",
      mono: true,
      cell: (e) => <span className="text-fg-muted">{e.email}</span>,
    },
    {
      key: "department",
      header: "Abteilung",
      cell: (e) => (
        <span className="text-fg-muted">{e.department || "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Rolle",
      cell: (e) => (
        <form action={assignRole} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={e.id} />
          <input type="hidden" name="email" value={e.email} />
          <Input
            name="role"
            list={ROLE_LIST_ID}
            defaultValue={e.role_name ?? ""}
            placeholder="Rolle zuweisen…"
            className="h-8 w-[10rem] text-xs"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-xs text-fg-muted hover:text-fg"
            aria-label="Rolle speichern"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </form>
      ),
    },
    {
      key: "action",
      header: "Aktion",
      numeric: true,
      cell: (e) => (
        <form action={removeEmployee} className="flex justify-end">
          <input type="hidden" name="id" value={e.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-xs text-fg-muted hover:bg-pain-soft hover:text-pain"
          >
            Entfernen
          </Button>
        </form>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Belegschaft"
        subtitle="Die Personen, die interviewt werden. Jede Person bekommt eine Rolle — der Kontext für maßgeschneiderte Interviews liegt auf der Rolle (anonym, für alle mit dieser Rolle wiederverwendbar)."
      />

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Personen", value: employees.length },
          { label: "Mit Rolle", value: withRole },
          { label: "Ohne Rolle", value: withoutRole },
        ]}
      />

      {/* Native autocomplete source for every role input on the page. */}
      <datalist id={ROLE_LIST_ID}>
        {roleNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
        {/* Directory track */}
        <div className="min-w-0">
          {listError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-ui border border-pain-muted bg-pain-soft px-3.5 py-2.5 text-sm text-pain">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{listError}</p>
            </div>
          )}

          {!listError && employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch niemand im Verzeichnis"
              hint="Füge die Personen hinzu, die interviewt werden sollen, und weise ihnen eine Rolle zu."
            />
          ) : (
            employees.length > 0 && (
              <>
                <SectionHeading title="Personen" count={employees.length} />
                <Card variant="ledger" className="overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <DataTable
                      className="min-w-[680px]"
                      columns={columns}
                      rows={employees}
                      rowKey={(e) => e.id}
                    />
                  </div>
                </Card>
              </>
            )
          )}
        </div>

        {/* Add-person rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="gap-4 p-5">
            <div className="space-y-1">
              <h2 className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.015em] text-fg">
                Person hinzufügen
              </h2>
              <p className="text-xs leading-relaxed text-fg-muted">
                E-Mail ist erforderlich. Die Rolle bestimmt den
                Interview-Kontext — eine neue Rolle wird automatisch angelegt.
              </p>
            </div>
            <form action={addEmployee} className="flex flex-col gap-3">
              <Input name="name" placeholder="Name" className="text-sm" />
              <Input
                name="email"
                type="email"
                required
                placeholder="person@firma.de"
                className="text-sm"
              />
              <Input
                name="department"
                placeholder="Abteilung (optional)"
                className="text-sm"
              />
              <Input
                name="role"
                list={ROLE_LIST_ID}
                placeholder="Rolle (optional)"
                className="text-sm"
              />
              <Button type="submit" size="sm" className="w-full">
                <UserPlus className="h-4 w-4" />
                Hinzufügen
              </Button>
            </form>
          </Card>
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
