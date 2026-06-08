"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TwinRole, Employee } from "@/lib/api";

type RoleRow = {
  role: TwinRole;
  personCount: number;
  departments: string[];
};

export function VaultRolesTab({
  roles,
  employees,
  emptyLabel,
}: {
  roles: TwinRole[];
  employees: Employee[];
  emptyLabel: string;
}) {
  const [searchRole, setSearchRole] = useState("");
  const [filterDept, setFilterDept] = useState("");

  // Aggregate: for each role, count employees + collect departments
  const rows: RoleRow[] = useMemo(() => {
    return roles.map((role) => {
      const members = employees.filter((e) => e.role_id === role.id);
      const depts = Array.from(
        new Set(
          members
            .map((e) => e.department ?? e.role_department)
            .filter(Boolean) as string[],
        ),
      );
      return { role, personCount: members.length, departments: depts };
    });
  }, [roles, employees]);

  // All unique departments across all roles
  const allDepartments = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.departments.forEach((d) => s.add(d)));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchRole =
        !searchRole ||
        r.role.name.toLowerCase().includes(searchRole.toLowerCase());
      const matchDept =
        !filterDept ||
        r.departments.includes(filterDept);
      return matchRole && matchDept;
    });
  }, [rows, searchRole, filterDept]);

  if (roles.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState icon={Users} title={emptyLabel} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Rolle suchen…"
          value={searchRole}
          onChange={(e) => setSearchRole(e.target.value)}
          className="h-8 min-w-[160px] flex-1 rounded-ui border border-line bg-surface px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
        />
        {allDepartments.length > 0 && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-8 rounded-ui border border-line bg-surface px-2.5 text-[13px] text-fg outline-none focus:border-line-strong"
          >
            <option value="">Alle Abteilungen</option>
            {allDepartments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Roles list */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Keine Rollen gefunden.</p>
      ) : (
        <Card variant="ledger" className="overflow-hidden">
          <ul className="divide-y divide-line-subtle">
            {filtered.map(({ role, personCount, departments }) => (
              <li key={role.id} className="flex items-center gap-4 px-6 py-3.5">
                {/* Initials avatar */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold uppercase text-fg-muted">
                  {role.name.slice(0, 2)}
                </span>

                {/* Role name */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{role.name}</p>
                  {role.description && (
                    <p className="truncate text-[11px] text-fg-subtle">{role.description}</p>
                  )}
                </div>

                {/* Department */}
                <div className="hidden w-40 shrink-0 sm:block">
                  {departments.length > 0 ? (
                    <p className="truncate text-[12px] text-fg-muted">
                      {departments.join(", ")}
                    </p>
                  ) : (
                    <p className="text-[12px] text-fg-faint">—</p>
                  )}
                </div>

                {/* Person count */}
                <div className="flex w-20 shrink-0 items-center gap-1.5">
                  <Users size={12} className="text-fg-faint" aria-hidden />
                  <span className="text-[12px] tabular-nums text-fg-muted">
                    {personCount === 0
                      ? "—"
                      : personCount === 1
                        ? "1 Person"
                        : `${personCount} Personen`}
                  </span>
                </div>

                {/* Kontext bearbeiten */}
                <a
                  href={`/vaults/roles/${role.id}`}
                  className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  Kontext bearbeiten
                  <ChevronRight size={13} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
