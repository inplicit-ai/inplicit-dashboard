import { ComponentChildren } from "preact";
import { asset } from "$fresh/runtime.ts";

type Tab =
  | "overview"
  | "participants"
  | "interviews"
  | "insights"
  | "hypotheses"
  | "map";

interface LayoutProps {
  title: string;
  children: ComponentChildren;
  campaignId?: string;
  activeTab?: Tab;
  /** Force theme. Defaults to "light" — matches the marketing site. */
  theme?: "light" | "dark";
}

export function Layout({
  title,
  children,
  campaignId,
  activeTab,
  theme = "light",
}: LayoutProps) {
  return (
    <html lang="de" data-theme={theme}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Inplicit</title>

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href={asset("/logo_icon.svg")} />

        {/* Font preconnect + load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />

        {/* App stylesheet */}
        <link rel="stylesheet" href={asset("/design.css")} />

        {/* FOUC guard — applies the design tokens before the external CSS finishes loading */}
        <style>{`
          html { background: #ffffff; color: #0a0a0a; font-family: 'Inter', system-ui, sans-serif; }
          body { opacity: 0; transition: opacity 0.15s ease-out; }
          body.is-ready { opacity: 1; }
        `}</style>
      </head>
      <body class="shell">
        <AppHeader />
        {campaignId && activeTab && (
          <CampaignTabs campaignId={campaignId} active={activeTab} />
        )}
        <main class="app-main">{children}</main>
        {/* Reveal once stylesheet has been parsed */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "requestAnimationFrame(() => document.body.classList.add('is-ready'));",
          }}
        />
      </body>
    </html>
  );
}

function AppHeader() {
  return (
    <header class="app-header">
      <div class="app-header__inner">
        <a href="/admin/campaigns" class="wordmark" aria-label="Inplicit">
          <img
            src={asset("/logo.svg")}
            alt="Inplicit"
            class="wordmark__logo"
          />
        </a>
        <nav class="app-header__nav">
          <a href="/admin/campaigns">Kampagnen</a>
          <span class="sep">·</span>
          <a href="/admin/login">Abmelden</a>
        </nav>
      </div>
    </header>
  );
}

function CampaignTabs({ campaignId, active }: { campaignId: string; active: Tab }) {
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "overview", label: "Übersicht", href: `/admin/campaigns/${campaignId}` },
    { id: "participants", label: "Teilnehmer", href: `/admin/campaigns/${campaignId}/participants` },
    { id: "interviews", label: "Interviews", href: `/admin/campaigns/${campaignId}/interviews` },
    { id: "insights", label: "Insights", href: `/admin/campaigns/${campaignId}/insights` },
    { id: "hypotheses", label: "Cross-Validation", href: `/admin/campaigns/${campaignId}/hypotheses` },
    { id: "map", label: "Knowledge Map", href: `/admin/campaigns/${campaignId}/map` },
  ];

  return (
    <div class="app-tabs">
      <nav class="app-tabs__inner">
        {tabs.map((t) => (
          <a key={t.id} href={t.href} class={active === t.id ? "is-active" : ""}>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ── Composable primitives ───────────────────────────────────────────────────

export function Eyebrow({ children }: { children: ComponentChildren }) {
  return <span class="eyebrow">{children}</span>;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Second clause of a two-tone headline. */
  muted?: string;
  meta?: ComponentChildren;
  actions?: ComponentChildren;
}

export function PageHeader({ eyebrow, title, muted, meta, actions }: PageHeaderProps) {
  return (
    <header class="page-header">
      <div class="page-header__main">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 class="headline">
          {title}
          {muted && (
            <>
              {" "}
              <span class="headline__muted">{muted}</span>
            </>
          )}
        </h1>
        {meta && <p class="page-header__meta">{meta}</p>}
      </div>
      {actions && <div class="page-header__actions">{actions}</div>}
    </header>
  );
}

// ── Status badge — campaign / interview status ──────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
  IN_PROGRESS: "Läuft",
  ABANDONED: "Abgebrochen",
  FAILED: "Fehler",
  PROCESSING: "Wird ausgewertet",
  PENDING: "Offen",
  VERIFIED: "Verifiziert",
  LACKING: "Unzureichend",
  CONTRADICTED: "Widerlegt",
  UNTESTABLE: "Nicht testbar",
  COMPLETE: "Abgeschlossen",
  EXTRACTING: "Extraktion",
  CLUSTERING: "Clustering",
  FALSIFYING: "Validierung",
};

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: "badge--success",
  COMPLETED: "badge--knowledge",
  COMPLETE: "badge--knowledge",
  IN_PROGRESS: "badge--opportunity",
  PROCESSING: "badge--gap",
  EXTRACTING: "badge--gap",
  CLUSTERING: "badge--gap",
  FALSIFYING: "badge--gap",
  ABANDONED: "badge--warning",
  FAILED: "badge--danger",
  VERIFIED: "badge--success",
  CONTRADICTED: "badge--danger",
  LACKING: "badge--warning",
  PENDING: "badge--knowledge",
  DRAFT: "badge--knowledge",
  UNTESTABLE: "badge--knowledge",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "";
  const label = STATUS_LABEL[status] ?? status;
  return <span class={`badge ${variant}`}>{label}</span>;
}

// ── Insight semantic-type badge — innovation-mining categories ──────────────

export type SemanticType =
  | "pain_point"
  | "opportunity"
  | "process_gap"
  | "knowledge"
  | "pain"
  | "behavior"
  | "fact";

interface SemanticMeta {
  label: string;
  klass: string;
  short: string;
}

export const SEMANTIC_META: Record<string, SemanticMeta> = {
  pain_point: { label: "Schmerzpunkt", short: "Pain", klass: "badge--pain" },
  opportunity: { label: "Chance", short: "Opportunity", klass: "badge--opportunity" },
  process_gap: { label: "Prozesslücke", short: "Gap", klass: "badge--gap" },
  knowledge: { label: "Wissen", short: "Knowledge", klass: "badge--knowledge" },
  pain: { label: "Schmerzpunkt", short: "Pain", klass: "badge--pain" },
  behavior: { label: "Prozesslücke", short: "Gap", klass: "badge--gap" },
  fact: { label: "Wissen", short: "Knowledge", klass: "badge--knowledge" },
};

export const SEMANTIC_ORDER: SemanticType[] = [
  "pain_point",
  "opportunity",
  "process_gap",
  "knowledge",
];

export function SemanticBadge({ type }: { type: string }) {
  const meta = SEMANTIC_META[type] ?? { label: type, klass: "", short: type };
  return <span class={`badge ${meta.klass}`}>{meta.label}</span>;
}
