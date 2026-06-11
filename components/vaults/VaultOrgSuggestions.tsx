import { FileText, GitBranch, LayoutGrid, TrendingUp, Users } from "lucide-react";
import type { VaultItem } from "@/lib/api";

const SUGGESTIONS: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  keywords: string[];
}[] = [
  {
    icon: <Users size={13} aria-hidden />,
    label: "Organigramm",
    hint: "Struktur & Hierarchie",
    keywords: ["organigramm", "struktur", "hierarchie"],
  },
  {
    icon: <TrendingUp size={13} aria-hidden />,
    label: "Finanzberichte",
    hint: "Umsatz, Budget, Prognosen",
    keywords: ["finanz", "budget", "umsatz", "prognose"],
  },
  {
    icon: <GitBranch size={13} aria-hidden />,
    label: "Prozesse & Flowcharts",
    hint: "Abläufe & Workflows",
    keywords: ["prozess", "workflow", "ablauf", "flowchart"],
  },
  {
    icon: <LayoutGrid size={13} aria-hidden />,
    label: "Produktstrategie",
    hint: "Vision, Roadmap, OKRs",
    keywords: ["strategie", "roadmap", "okr", "vision"],
  },
  {
    icon: <FileText size={13} aria-hidden />,
    label: "Unternehmensrichtlinien",
    hint: "Policies, Handbücher",
    keywords: ["richtlinie", "policy", "handbuch", "compliance"],
  },
];

/**
 * Greyed-out suggestion items for an org vault card.
 * Each suggestion disappears once an existing item title matches its keywords.
 */
export function VaultOrgSuggestions({
  existingItems,
  vaultId,
}: {
  existingItems: VaultItem[];
  vaultId: string;
}) {
  const existingText = existingItems
    .map((it) => (it.title ?? "").toLowerCase())
    .join(" ");

  const visible = SUGGESTIONS.filter(
    (s) => !s.keywords.some((kw) => existingText.includes(kw)),
  ).slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-fg-faint">
        Vorschläge
      </p>
      <ul className="space-y-0.5">
        {visible.map((s) => (
          <li key={s.label}>
            <a
              href={`/vaults?folder=org&vault=${vaultId}`}
              className="flex items-center gap-2.5 rounded-ui px-2 py-1.5 text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg-muted"
            >
              <span className="shrink-0">{s.icon}</span>
              <span className="text-[12px]">{s.label}</span>
              <span className="ml-auto text-[11px] text-fg-faint/70">{s.hint}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
