"use client";

import { useMemo, useState } from "react";
import { ChevronRight, MessageSquare, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TwinRole, Employee, OrgInterviewRow } from "@/lib/api";

type RoleRow = {
  role: TwinRole;
  personCount: number;
  departments: string[];
  campaignCount: number;
  interviewCount: number;
};

export function VaultRolesTab({
  roles,
  employees,
  orgInterviews,
  emptyLabel,
}: {
  roles: TwinRole[];
  employees: Employee[];
  orgInterviews: OrgInterviewRow[];
  emptyLabel: string;
}) {
  const [searchRole, setSearchRole] = useState("");
  // multi-select: Set of selected department names
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());

  // Aggregate: for each role, count employees + collect departments + campaigns
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

      // Match interviews via department overlap
      // orgInterviews.department is a free-text dept from the interview participant
      const matchingInterviews = depts.length > 0
        ? orgInterviews.filter(
            (iv) => iv.department && depts.some(
              (d) => iv.department!.toLowerCase() === d.toLowerCase(),
            ),
          )
        : [];

      const campaignIds = new Set(matchingInterviews.map((iv) => iv.campaign_id));

      return {
        role,
        personCount: members.length,
        departments: depts,
        campaignCount: campaignIds.size,
        interviewCount: matchingInterviews.length,
      };
    });
  }, [roles, employees, orgInterviews]);

  // All unique departments — capped at 30 chars to exclude full company names
  // (the department field is free-text and sometimes contains the org name)
  const allDepartments = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) =>
      r.departments.forEach((d) => {
        if (d.length <= 30) s.add(d);
      }),
    );
    return Array.from(s).sort();
  }, [rows]);

  function toggleDept(dept: string) {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchRole =
        !searchRole ||
        r.role.name.toLowerCase().includes(searchRole.toLowerCase());
      const matchDept =
        selectedDepts.size === 0 ||
        r.departments.some((d) => selectedDepts.has(d));
      return matchRole && matchDept;
    });
  }, [rows, searchRole, selectedDepts]);

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
      <div className="flex flex-wrap items-start gap-2">
        <input
          type="search"
          placeholder="Rolle suchen…"
          value={searchRole}
          onChange={(e) => setSearchRole(e.target.value)}
          className="h-8 min-w-[160px] flex-1 rounded-ui border border-line bg-surface px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
        />
        {/* Multi-select department chips */}
        {allDepartments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {allDepartments.map((dept) => {
              const active = selectedDepts.has(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-ui px-2.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "bg-fg text-canvas"
                      : "border border-line text-fg-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  {dept}
                  {active && <X size={11} aria-hidden />}
                </button>
              );
            })}
            {selectedDepts.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDepts(new Set())}
                className="text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Roles list */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Keine Rollen gefunden.</p>
      ) : (
        <Card variant="ledger" className="overflow-hidden">
          <ul className="divide-y divide-line-subtle">
            {filtered.map(({ role, personCount, departments, campaignCount, interviewCount }) => (
              <li key={role.id} className="flex items-center gap-4 px-6 py-3.5">
                {/* Initials avatar */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold uppercase text-fg-muted">
                  {role.name.slice(0, 2)}
                </span>

                {/* Department (moved left, right after initials) */}
                <div className="hidden w-36 shrink-0 sm:block">
                  {departments.length > 0 ? (
                    <p className="truncate text-[12px] text-fg-muted">
                      {departments.join(", ")}
                    </p>
                  ) : (
                    <p className="text-[12px] text-fg-faint">—</p>
                  )}
                </div>

                {/* Role name */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{role.name}</p>
                  {role.description && (
                    <p className="truncate text-[11px] text-fg-subtle">{role.description}</p>
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

                {/* Campaigns / interviews */}
                <div className="hidden w-28 shrink-0 items-center gap-1.5 sm:flex">
                  <MessageSquare size={12} className="text-fg-faint" aria-hidden />
                  <span className="text-[12px] tabular-nums text-fg-muted">
                    {interviewCount === 0
                      ? "—"
                      : `${interviewCount} Interview${interviewCount !== 1 ? "s" : ""}${campaignCount > 1 ? `, ${campaignCount} Kampagnen` : ""}`}
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
