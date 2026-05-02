import { ComponentChildren } from "preact";
import { asset } from "$fresh/runtime.ts";
import type { Me } from "../lib/api.ts";
import { Sidebar } from "./Sidebar.tsx";

type Tab =
  | "overview"
  | "participants"
  | "interviews"
  | "insights"
  | "hypotheses"
  | "map";

type Mode = "customer" | "staff";

interface LayoutProps {
  title: string;
  children: ComponentChildren;
  campaignId?: string;
  activeTab?: Tab;
  /** "staff" swaps the navigation + shows the staff banner. */
  mode?: Mode;
  /** Currently authenticated user. Drives the avatar + account menu. */
  me?: Me;
  /** Optional org label shown in the sidebar's top row. Defaults to a
   *  mode-appropriate fallback. Customer routes can pass the active org's
   *  name once we wire `/api/orgs/me` (Phase 8). */
  orgLabel?: string;
  /** Force theme. Defaults to "light" — matches the marketing site. */
  theme?: "light" | "dark";
}

export function Layout({
  title,
  children,
  campaignId,
  activeTab,
  mode = "customer",
  me,
  orgLabel,
  theme = "light",
}: LayoutProps) {
  return (
    <html lang="de" data-theme={theme}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Inplicit</title>

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

        {/* Tailwind utilities — processed by $fresh/plugins/tailwind.ts */}
        <link rel="stylesheet" href={asset("/styles.css")} />
        {/* Design system: tokens + composed classes (.btn, .card, …) */}
        <link rel="stylesheet" href={asset("/design.css")} />

        {/* FOUC guard — applies the design tokens before the external CSS finishes loading */}
        <style>{`
          html { background: #ffffff; color: #0a0a0a; font-family: 'Inter', system-ui, sans-serif; }
          body { opacity: 0; transition: opacity 0.15s ease-out; }
          body.is-ready { opacity: 1; }
        `}</style>
      </head>
      <body class="shell shell--with-sidebar">
        <Sidebar
          mode={mode}
          me={me}
          orgLabel={orgLabel ?? me?.org?.name}
        />
        {campaignId && activeTab && (
          <CampaignTabs campaignId={campaignId} active={activeTab} />
        )}
        <main class="app-main">{children}</main>

        {/* Active-state helper: stamps `.is-active` on whichever sidebar item
            matches the current path. Saves us from threading `pathname`
            through every defineRoute. Runs once at DOMContentLoaded. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                requestAnimationFrame(function () {
                  document.body.classList.add('is-ready');
                  var path = location.pathname;
                  var links = document.querySelectorAll('.sidebar__item[data-href]');
                  // Score each link by prefix length so the longest match wins.
                  var best = null, bestLen = 0;
                  links.forEach(function (el) {
                    var href = el.getAttribute('data-href') || '';
                    if (path === href || path.indexOf(href + '/') === 0) {
                      if (href.length > bestLen) { best = el; bestLen = href.length; }
                    }
                  });
                  if (best) best.classList.add('is-active');
                });
              })();
            `,
          }}
        />
      </body>
    </html>
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
  PENDING: "In Validierung",
  SEED: "Frisch extrahiert",
  EVOLVING: "Im Wandel",
  VERIFIED: "Verifiziert",
  REJECTED: "Verworfen",
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
  REJECTED: "badge--danger",
  EVOLVING: "badge--warning",
  PENDING: "badge--opportunity",
  SEED: "badge--knowledge",
  DRAFT: "badge--knowledge",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "";
  const label = STATUS_LABEL[status] ?? status;
  return <span class={`badge ${variant}`}>{label}</span>;
}

