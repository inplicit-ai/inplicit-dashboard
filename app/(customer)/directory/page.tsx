import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import { AddPersonDialog } from "@/components/directory/AddPersonDialog";
import { EditPersonDialog } from "@/components/directory/EditPersonDialog";
import { DeleteConfirmButton } from "@/components/directory/DeleteConfirmButton";
import { CreateTeamDialog } from "@/components/directory/CreateTeamDialog";
import {
  makeApi,
  type Employee,
  type TwinRole,
  ApiError,
} from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
const DEPT_LIST_ID = "directory-dept-options";

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

  async function editEmployee(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const department = String(formData.get("department") ?? "").trim();
    const role_name = String(formData.get("role") ?? "").trim();
    if (!id || !email || !email.includes("@")) {
      redirect(
        `${PATH}?flashType=err&flash=` +
          encodeURIComponent("Ungültige Eingabe."),
      );
    }
    const api = makeApi(await requestCookie());
    try {
      await api.employees.update(id, {
        email,
        name: name || undefined,
        department: department || undefined,
        // Empty role clears it (backend treats "" as "remove role"). name/dept
        // can't be cleared via update — backend keeps the old value on empty.
        // ponytail: clear-name/dept needs 3-state Option plumbing; add when asked.
        role_name,
      });
      revalidatePath(PATH);
      redirect(
        `${PATH}?flashType=ok&flash=` +
          encodeURIComponent(`${name || email} aktualisiert.`),
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
  const deptNames = Array.from(
    new Set(employees.map((e) => e.department).filter((d): d is string => !!d))
  ).sort();

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
        <span className="text-fg">{e.role_name || "—"}</span>
      ),
    },
    {
      key: "action",
      header: "",
      numeric: true,
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <EditPersonDialog
            employee={e}
            action={editEmployee}
            roleListId={ROLE_LIST_ID}
            deptListId={DEPT_LIST_ID}
          />
          <DeleteConfirmButton
            action={removeEmployee}
            employeeId={e.id}
            employeeName={e.name ?? e.email}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Belegschaft"
        subtitle="Die Personen, die interviewt werden. Jede Person bekommt eine Rolle — der Kontext für maßgeschneiderte Interviews liegt auf der Rolle (anonym, für alle mit dieser Rolle wiederverwendbar)."
        actions={
          <div className="flex items-center gap-2">
            <CreateTeamDialog employees={employees} />
            <AddPersonDialog
              action={addEmployee}
              roleListId={ROLE_LIST_ID}
              deptListId={DEPT_LIST_ID}
            />
          </div>
        }
      />

      {/* Native autocomplete sources for the role/dept inputs in both dialogs. */}
      <datalist id={ROLE_LIST_ID}>
        {roleNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id={DEPT_LIST_ID}>
        {deptNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Personen", value: employees.length },
          { label: "Mit Rolle", value: withRole },
          { label: "Ohne Rolle", value: withoutRole },
        ]}
      />


      {listError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-ui border border-pain-muted bg-pain-soft px-3.5 py-2.5 text-sm text-pain">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      )}

      {/* Identical layout whether populated or empty — the empty state is a hint
          row INSIDE the table body, never a separate empty screen. */}
      {!listError && (
        <>
          <SectionHeading title="Personen" count={employees.length || undefined} />
          <Card variant="ledger" className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              {employees.length === 0 ? (
                <div className="px-6 py-10">
                  <EmptyState
                    icon={Users}
                    title="Noch niemand im Verzeichnis"
                    hint="Füge die Personen hinzu, die interviewt werden sollen, und weise ihnen eine Rolle zu."
                  />
                </div>
              ) : (
                <DataTable
                  className="min-w-[680px]"
                  columns={columns}
                  rows={employees}
                  rowKey={(e) => e.id}
                />
              )}
            </div>
          </Card>

          {employees.length > 0 && <DeptGroups employees={employees} />}
        </>
      )}
    </>
  );
}

/**
 * Read-only Abteilungs-Gruppen-Ansicht — zeigt Personen nach Abteilung
 * gruppiert (nur wenn mindestens eine Abteilung vergeben ist).
 */
function DeptGroups({ employees }: { employees: Employee[] }) {
  const byDept = employees.reduce<Record<string, Employee[]>>((acc, e) => {
    const key = e.department ?? "__none__";
    acc[key] ??= [];
    acc[key].push(e);
    return acc;
  }, {});

  const deptKeys = Object.keys(byDept).filter((k) => k !== "__none__").sort();
  if (deptKeys.length === 0) return null;

  return (
    <div className="mt-8">
      <SectionHeading title="Abteilungen" count={deptKeys.length} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deptKeys.map((dept) => {
          const members = byDept[dept]!;
          return (
            <Card key={dept} className="flex flex-col gap-2 p-4">
              <p className="text-[13px] font-semibold text-fg">{dept}</p>
              <p className="text-[11px] text-fg-subtle">{members.length} Person{members.length !== 1 ? "en" : ""}</p>
              <ul className="space-y-1">
                {members.slice(0, 5).map((e) => (
                  <li key={e.id} className="truncate text-[12px] text-fg-muted">
                    {e.name || e.email}
                  </li>
                ))}
                {members.length > 5 && (
                  <li className="text-[11px] text-fg-faint">+ {members.length - 5} weitere</li>
                )}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
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
