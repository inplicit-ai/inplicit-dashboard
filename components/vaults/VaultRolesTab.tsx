"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { TwinRole, Employee, OrgInterviewRow } from "@/lib/api";

type RoleRow = {
  role: TwinRole;
  personCount: number;
  departments: string[];
  campaignCount: number;
  interviewCount: number;
};

/** Multi-select dropdown for department filtering — sits above the dept column. */
function DeptDropdown({
  allDepartments,
  selectedDepts,
  onToggle,
  onClear,
}: {
  allDepartments: string[];
  selectedDepts: Set<string>;
  onToggle: (d: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label =
    selectedDepts.size === 0
      ? "Abteilung"
      : selectedDepts.size === 1
        ? Array.from(selectedDepts)[0]!
        : `${selectedDepts.size} Abteilungen`;

  if (allDepartments.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-ui border px-2.5 text-[12px] font-medium transition-colors",
          selectedDepts.size > 0
            ? "border-fg bg-fg text-canvas"
            : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
        )}
      >
        {label}
        {selectedDepts.size > 0 ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClear(); }}}
            className="ml-0.5 cursor-pointer rounded hover:opacity-70"
            aria-label="Filter zurücksetzen"
          >
            <X size={11} aria-hidden />
          </span>
        ) : (
          <ChevronDown size={12} aria-hidden />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-ui border border-line bg-surface shadow-card">
          {allDepartments.map((dept) => {
            const checked = selectedDepts.has(dept);
            return (
              <label
                key={dept}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(dept)}
                  className="h-3.5 w-3.5 accent-fg"
                />
                <span className="text-[12px] text-fg">{dept}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());

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

      const matchingInterviews =
        depts.length > 0
          ? orgInterviews.filter(
              (iv) =>
                iv.department &&
                depts.some(
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
    <div className="space-y-0">
      {/* Column-aligned filter row — each control sits above its column */}
      <div className="mb-1 flex items-center gap-4 px-6">
        {/* Role search spans full left width (initials + role name) */}
        <div className="min-w-0 flex-1">
          <input
            type="search"
            placeholder="Rolle suchen…"
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="h-8 w-full rounded-ui border border-line bg-surface px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
          />
        </div>

        {/* Dept dropdown above department column */}
        <div className="hidden w-36 shrink-0 sm:block">
          <DeptDropdown
            allDepartments={allDepartments}
            selectedDepts={selectedDepts}
            onToggle={toggleDept}
            onClear={() => setSelectedDepts(new Set())}
          />
        </div>

        {/* Spacers matching person count + interview + action widths */}
        <div className="w-20 shrink-0" />
        <div className="hidden w-28 shrink-0 sm:block" />
        <div className="w-[120px] shrink-0" />
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 text-[13px] text-fg-muted">Keine Rollen gefunden.</p>
      ) : (
        <Card variant="ledger" className="overflow-hidden">
          <ul className="divide-y divide-line-subtle">
            {filtered.map(
              ({ role, personCount, departments, campaignCount, interviewCount }) => (
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

                  {/* Department — aligned with dropdown */}
                  <div className="hidden w-36 shrink-0 sm:block">
                    {departments.length > 0 ? (
                      <p className="truncate text-[12px] text-fg-muted">{departments.join(", ")}</p>
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

                  {/* Interviews / campaigns */}
                  <div className="hidden w-28 shrink-0 items-center gap-1.5 sm:flex">
                    <MessageSquare size={12} className="text-fg-faint" aria-hidden />
                    <span className="text-[12px] tabular-nums text-fg-muted">
                      {interviewCount === 0
                        ? "—"
                        : `${interviewCount} Interview${interviewCount !== 1 ? "s" : ""}${campaignCount > 1 ? `, ${campaignCount} Kampagnen` : ""}`}
                    </span>
                  </div>

                  <a
                    href={`/vaults/roles/${role.id}`}
                    className="flex w-[120px] shrink-0 items-center justify-end gap-1 text-[12px] font-medium text-fg-muted transition-colors hover:text-fg"
                  >
                    Kontext bearbeiten
                    <ChevronRight size={13} aria-hidden />
                  </a>
                </li>
              ),
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
