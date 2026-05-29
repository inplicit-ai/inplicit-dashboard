# Dashboard Design Contract (Overhaul Foundation)

**Status:** Authoritative. Implementers copy from this file. Do not deviate without updating it.

This contract is the prescriptive layer on top of `app/design.css` (the token source of truth) and `app/globals.css` (the Tailwind v4 `@theme inline` bridge). The reference aesthetic is `components/ui/agent-plan.tsx` (motion + dashed connectors + status pills) executed with **tokens, never raw colors**.

---

## 0. Hard rules (read first)

1. **Tokens only. Never raw hex, never `gray-*`/`green-*`/`blue-*`/`zinc-*`/`slate-*`/`neutral-*` Tailwind palette utilities, never inline `style={{ color: '#...' }}`.** Every color comes from a design token exposed through the `@theme` bridge in `globals.css` (e.g. `bg-surface`, `text-fg-muted`, `border-line`) or a `.badge--*` / `.card--*` design.css class. The only exception already in the codebase is the brand-orange decorative dot in RAG pills; do not add new ones.
2. **One border per edge.** Never stack a Tailwind `border` on an element that already sits inside a design.css component that draws its own border (e.g. `.card`, `.table`, `.campaign-row`). Double borders are a bug. If you need a divider inside a card, use `.divider` or a single `border-t border-line-subtle`, not a wrapper border + child border.
3. **No hardcoded viewport heights for layout** (`h-[calc(100vh-16rem)]`, `min-h-[600px]`, `h-[calc(100vh-9rem)]`). Use the flex height contract (§6) or the `--chat-height` token (§6.1). The single allowed `100dvh`/`100vh` lives in the shell grid (`app/design.css`), which already owns it.
4. **Motion is client-only.** `framer-motion` may only appear in files with `"use client"`. Never import it into a Server Component. See §11.
5. **Mobile-first.** Any `grid-cols-1` that jumps straight to `md:` must add the `sm:` step. Test at 320 / 480 / 640 / 1024.

---

## 1. Token map

All tokens below are available as Tailwind utilities via the `globals.css` bridge. Light + dark are handled automatically by `[data-theme]`; you never write a dark variant for a color that has a token.

### Surfaces
| Purpose | Token util | CSS var |
|---|---|---|
| App canvas (page bg) | `bg-canvas` | `--color-bg` |
| Card / panel base | `bg-surface` | `--color-surface` |
| Raised row / nested fill (agent bubble) | `bg-surface-2` | `--color-surface-2` |
| Popover / elevated (menus, dialogs) | `bg-popover` (shadcn bridge) | `--color-elevated` |

> There is no `surface-3` Tailwind util; use the `.card`/`.stat` classes which reference it internally, or `bg-secondary` for the shadcn-neutral step.

### Text
| Purpose | Token util | CSS var |
|---|---|---|
| Primary text | `text-fg` | `--color-text-primary` |
| Secondary / body-muted | `text-fg-muted` | `--color-text-secondary` |
| Tertiary / captions / labels | `text-fg-subtle` | `--color-text-tertiary` |
| Faint / placeholders / disabled | `text-fg-faint` | `--color-text-quaternary` |

### Borders (hairlines)
| Purpose | Token util | CSS var |
|---|---|---|
| Default hairline | `border-line` | `--color-border` |
| Whisper hairline (inner dividers) | `border-line-subtle` | `--color-border-subtle` |
| Emphasized / hover / dashed connectors | `border-line-strong` | `--color-border-strong` |

### Brand (accent = warm amber; signal, never decoration)
`text-accent` `bg-accent-soft` `border-accent-muted` `text-accent-strong` — soft = tinted fill, muted = tinted border, strong = darker text-on-soft.

### Semantic
| Tone | Text | Soft fill | Muted border |
|---|---|---|---|
| Pain (problem) | `text-pain` | `bg-pain-soft` | `border-pain-muted` |
| Gap (opportunity void) | `text-gap` | `bg-gap-soft` | `border-gap-muted` |
| Success | `text-success` | `bg-success-soft` | — (use `border-success/22` only if a token border is missing; prefer the `.badge--success` class) |
| Warning | `text-warning` | — (use `.badge--warning`) | — |
| Danger | `text-danger` | `bg-danger-soft` | — (use `.badge--danger`) |

> When a semantic background **and** border are both needed, prefer the prebuilt design.css classes (`.badge--pain`, `.badge--success`, `.card--pain`, etc.) so light/dark border alphas are already tuned. Do not hand-roll `bg-warning/15`.

### Radii
| Util | Value | Use |
|---|---|---|
| `rounded-sm` | 6px | tiny chips, inline tags |
| `rounded-ui` | 10px | inputs, buttons, small controls |
| `rounded-card` | 16px | cards, panels, message bubbles, banners-as-cards |
| `rounded-full` | pill | badges, pills, avatars-as-circle |

### Spacing (4-pt rhythm)
Use the design.css `--space-*` ramp via Tailwind numeric utilities (Tailwind v4 multiplier `--spacing: 0.25rem`, so `gap-4` = 1rem = `--space-4`). **Stick to even multiples on the 4-pt grid: `1, 2, 3, 4, 5, 6, 8, 10, 12`.** Avoid `gap-[7px]`, `p-[13px]`, etc. Card padding is `p-8` (compact `p-6`); list gaps `gap-3`; tight clusters `gap-2`.

---

## 2. Card pattern

Prefer the design.css `.card` class for full panels — it already applies surface + hairline + radius + (dark-only) shadow + hover transition:

```tsx
<div className="card">…</div>
<div className="card card--compact">…</div>      {/* p-6 */}
<div className="card card--flush">…</div>        {/* p-0, clips children — use for tables */}
<div className="card card--pain|--opportunity|--gap">…</div>  {/* tinted semantic panels */}
```

If you must compose with Tailwind utilities instead (e.g. inside a shadcn `Card`), the canonical equivalent is:

```tsx
<div className="rounded-card border border-line bg-surface p-8">
```

**Never** add `shadow-sm`/`shadow-md`/`shadow-lg` in light mode — light depth is border + surface-step only. Dark-mode card elevation is automatic: use the new `.card-elevated` helper (§9) if a panel needs the dark shadow without the rest of `.card`.

**Kill double borders:** a `.card` wrapping a `.table` must use `.card--flush` (no padding, `overflow-hidden`) and the table draws the only inner hairlines. Do not put `border` on both.

---

## 3. Status pill pattern (from agent-plan)

Canonical status → tone mapping. Use the `<StatusBadge>` primitive (`components/ui/status-badge.tsx`, §10) so the mapping lives in ONE place. The visual recipe each status resolves to:

| Status (agent-plan + domain) | Class | Icon (lucide) |
|---|---|---|
| `completed` / `COMPLETED` / `VERIFIED` | `badge badge--success` | `CheckCircle2` |
| `in-progress` / `IN_PROGRESS` / `RUNNING` | `badge badge--opportunity` | `CircleDotDashed` |
| `need-help` / `PENDING_REVIEW` | `badge badge--warning` | `CircleAlert` |
| `failed` / `FAILED` / `CONTRADICTED` / `ERROR` | `badge badge--danger` | `CircleX` |
| `pending` / `QUEUED` / default | `badge badge--knowledge` | `Circle` |

Soft-fill + muted-border + colored text is the recipe (already encoded in the `.badge--*` classes). **agent-plan's old `bg-green-100 text-green-700` etc. is deprecated** — see §12 for the exact mapping applied.

Icon colors map the same way using tokens: `text-success`, `text-accent`, `text-warning`, `text-danger`, `text-fg-subtle`.

---

## 4. List / tree dashed-connector pattern

Vertical hierarchy connector (agent-plan subtasks). Use `border-line-strong` (token) instead of `border-muted-foreground/30`:

```tsx
{/* vertical spine, aligned to the parent icon center (~20px) */}
<div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-line-strong" />
{/* nested rows indent with pl-6 */}
<li className="group flex flex-col py-0.5 pl-6">…</li>
```

Horizontal connector (stepper line) uses the same dashed treatment at 1–2px. A reusable `<DashedConnector orientation="vertical|horizontal" tone="default|strong">` lives at `components/ui/dashed-connector.tsx` (§10) — prefer it for new code; the inline form above is acceptable inside agent-plan to preserve its exact layout.

---

## 5. Form + Select pattern

### Inputs
Native form controls use the design.css `.input` / `.textarea` / `.select` classes (full token styling, focus ring via `--shadow-focus`) OR the shadcn `Input` primitive. **Pick one per surface; do not mix.** Field scaffolding:

```tsx
<label className="field">
  <span className="field__label">Duration</span>
  <Select … />
</label>
```

**Input size convention (standardize):**
| Size | Height | Use |
|---|---|---|
| `sm` | `h-9` (36px) | dense tables, inline edit, toolbars |
| `md` (default) | `h-10` (40px) | standard forms — matches `.btn` height |
| `lg` | `h-11` (44px) | mobile primary inputs, hero search |

Map these to the `Select`/control `size` prop (§ below). The old ad-hoc `h-9`/`h-11` pairing is replaced by named sizes.

### Select / dropdown (`components/ui/select.tsx`)
A **dependency-free styled native `<select>`** wrapper. Token-driven, three variants, three sizes, custom chevron, focus ring. Import:

```tsx
import { Select } from "@/components/ui/select";
```

**Duration dropdown (5-min intervals 5..60):**
```tsx
import { Select, DURATION_OPTIONS } from "@/components/ui/select";

<Select
  aria-label="Interview duration"
  value={String(durationMin)}
  onValueChange={(v) => setDurationMin(Number(v))}
  options={DURATION_OPTIONS}   /* [{value:"5",label:"5 min"} … {value:"60",label:"60 min"}] */
  size="md"
/>
```

**Language dropdown (EN/DE/FR):**
```tsx
import { Select, LANGUAGE_OPTIONS } from "@/components/ui/select";

<Select
  aria-label="Interview language"
  value={lang}
  onValueChange={setLang}
  options={LANGUAGE_OPTIONS}   /* [{value:"en",label:"English"},{value:"de",label:"Deutsch"},{value:"fr",label:"Français"}] */
  size="md"
  variant="default"
/>
```

Full API in §8.

> **Range sliders are forbidden for discrete choices** (duration). Always a `Select`.

---

## 6. Chat-container pattern (canonical, no vh heights)

Every chat surface (CampaignChat, KnowledgeChat, SplitAuthor setup, InterviewRoom chat mode) follows the **flex height contract**. The page/route provides height; the chat fills it.

```tsx
{/* Page-level wrapper provides the height envelope (see §6.1) */}
<div className="flex h-[var(--chat-height)] flex-col">      {/* OR flex-1 min-h-0 if inside a flex column */}
  {/* optional header (scope chip, tabs) — fixed height, does not scroll */}
  <header className="shrink-0 border-b border-line px-4 py-3">…</header>

  {/* the SINGLE scroll region */}
  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
    {messages.map(…)}
    <div ref={endRef} />
  </div>

  {/* pinned composer — never scrolls away */}
  <div className="shrink-0 border-t border-line bg-canvas px-4 py-3">
    <Composer />
  </div>
</div>
```

Rules:
- The flex column gets the height (`h-[var(--chat-height)]` at the top level, or `flex-1 min-h-0` when nested).
- **`min-h-0` is mandatory** on the scrolling child, or `flex-1` collapses/overflows.
- Exactly **one** `overflow-y-auto` per pane. A two-pane layout (thread list + conversation) gives each pane its own `min-h-0 overflow-y-auto`; the parent is `flex` with `min-h-0`.
- Message bubbles: user = `bg-accent-soft text-fg`, agent = `bg-surface-2 text-fg`, both `rounded-card px-4 py-3 max-w-[min(78%,620px)]`. (The 78%/620px clamp is the agreed value.)
- **Forbidden:** `h-[calc(100vh-16rem)]`, `min-h-[28rem]` as a layout crutch, `h-[calc(100vh-9rem)]`.

### 6.1 `--chat-height` token
`app/design.css` now defines:
```css
--chat-height: calc(100dvh - var(--header-h) - var(--tabs-h));
```
Use `h-[var(--chat-height)]` on a chat surface that lives **under the topbar + campaign tabs** (campaign chat). For surfaces with only the topbar (knowledge chat at `/chat`), use `--chat-height-bare: calc(100dvh - var(--header-h))`. For surfaces inside a flex column you control, prefer `flex-1 min-h-0` over the token. Pages must NOT compute `100vh - <rem>` themselves.

Mobile: SplitAuthor stacks (`flex-col`) and the chat pane caps at `max-h-[50vh]` below `md`, full height at `md:` and up.

---

## 7. Full-width opt-in mechanism — `.app-work--wide` / `surface-bleed`

**Problem:** `.app-work > * { max-width: var(--container-max); margin-inline: auto }` caps EVERY direct child of the work area to 1280px centered. Great for reading surfaces, wrong for dashboards/tables/maps/chat that want the full available width.

**Mechanism (minimal, backwards-compatible — default behavior unchanged):**

Add the modifier class **`app-work--wide`** to the `.app-work` element for a route that should run full-bleed, OR wrap a single child in **`.surface-bleed`** to opt that one child out while siblings stay narrow.

```html
<!-- whole route is wide (dashboards, tables, map, chat) -->
<div class="app-work app-work--wide"> … </div>

<!-- mixed page: narrow prose + one full-width block -->
<div class="app-work">
  <section> … narrow reading content … </section>
  <div class="surface-bleed"> … full-width table / map … </div>
</div>
```

`.app-work--wide > *` raises the cap to `none` (children may still self-constrain with their own `max-w-*`). `.surface-bleed` sets `max-width: none; margin-inline: 0; width: 100%` on that single child, overriding the `> *` rule.

**Surface width policy:**
| Surface | Width |
|---|---|
| Create / setup flow (SplitAuthor) | **wide** |
| Org dashboard, campaign dashboard, insights, hypotheses | **wide** |
| Knowledge map (D3) | **wide** (already may use `sidebar=hidden` for true full-bleed) |
| Chat (campaign + knowledge) | **wide** |
| Participants / interviews tables | **wide** |
| Settings, single-record detail prose, login, empty/error states | **narrow** (default — leave as-is) |

> The pre-existing escape hatch (route `sidebar` policy `hidden` → no rail, `.app-main` `max-width: none`) is for **true full-bleed canvases** (orb, D3 map). `.app-work--wide` is the lighter opt-in for everything else that just wants the gutter width without losing the sidebar. Both are documented inline in `design.css`.

---

## 8. `Select` API

```ts
type SelectOption = { value: string; label: string; disabled?: boolean };

interface SelectProps
  extends Omit<React.ComponentPropsWithoutRef<"select">, "size" | "onChange"> {
  options: SelectOption[];          // option list (preferred) …
  children?: React.ReactNode;       // … or pass <option> children directly
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;   // convenience; native onChange also forwarded
  variant?: "default" | "ghost" | "outline"; // default = surface+hairline, ghost = transparent, outline = stronger border
  size?: "sm" | "md" | "lg";                  // h-9 / h-10 / h-11
  invalid?: boolean;                          // aria-invalid styling
  className?: string;
}

// Re-exported helpers:
export const DURATION_OPTIONS: SelectOption[]; // 5..60 step 5, label "N min"
export const LANGUAGE_OPTIONS: SelectOption[]; // en/de/fr
export function makeDurationOptions(min = 5, max = 60, step = 5): SelectOption[];
```

Styling: `border-line`, `bg-surface`, `text-fg`, `rounded-ui`, focus ring via `focus-visible:shadow-[var(--shadow-focus)] focus-visible:border-accent`, custom chevron (lucide `ChevronDown`) positioned absolutely, `appearance-none`. Honors `disabled`.

---

## 9. Breadcrumb + Stepper (create flow)

- **Breadcrumb:** keep using the shell topbar breadcrumb. Pass a `CrumbContext` with the resolved campaign name from the page so labels read “Campaigns › <Name> › Configure” instead of a raw id. (Implementer for the setup flow owns wiring; this contract only fixes the matcher + classes.)
- **Stepper:** reuse the existing **`.shell-stepper`** CSS (design.css). It already encodes the spec: 20px markers, `border-line-strong` default, filled near-black when `data-state="complete"`, accent + `accent-soft` when `data-state="current"`, dashed/solid connector line. A thin React wrapper `components/ui/stepper.tsx` (§10) renders it from a `steps` array with `variant="default"|"compact"`.
- **Flow matcher fix** (owned here in shared `flows.ts`? No — `flows.ts` is a feature file; the setup implementer fixes the route string `/campaigns/new/[draftId]`). This contract documents the requirement so the stepper highlights `configure`.

---

## 10. New shared primitives (available to all implementers)

| File | Export | Purpose |
|---|---|---|
| `components/ui/select.tsx` | `Select`, `DURATION_OPTIONS`, `LANGUAGE_OPTIONS`, `makeDurationOptions`, types | token-driven native select (§5, §8) |
| `components/ui/status-badge.tsx` | `StatusBadge`, `statusTone(status)` | single source of status→tone (§3) |
| `components/ui/dashed-connector.tsx` | `DashedConnector` | reusable dashed spine (§4) |
| `components/ui/stepper.tsx` | `Stepper` | React wrapper over `.shell-stepper` (§9) |
| `components/ui/chat-shell.tsx` | `ChatShell`, `ChatScroll`, `ChatComposerBar` | optional structural helpers for §6 (use or hand-roll the same classes) |

All are backwards-compatible additions; nothing existing is changed by their presence.

---

## 11. Motion guidelines

- `framer-motion` **only** in `"use client"` files. Server Components must contain zero motion imports.
- Standard easing: `[0.2, 0.65, 0.3, 0.9]` (Apple-like) for layout/opacity/height transitions.
- Spring: `type: "spring", stiffness: 500, damping: 25–30`.
- Status-badge bounce: `[0.34, 1.56, 0.64, 1]`, ~0.35s.
- **Always honor `prefers-reduced-motion`**: gate spring/translate behind the same `prefersReducedMotion` check agent-plan uses; collapse to a 0.2s tween or no motion. CSS-driven motion must have a `@media (prefers-reduced-motion: reduce)` reset (the codebase already does this for `.section-fade`, `.shell__rail`, `.tour-*`).
- Use design.css easing tokens for pure-CSS transitions: `var(--ease-smooth)` (UI), `var(--ease-spring)` (entrances), `var(--ease-out)` (exits). Interactive transitions target ~150ms; entrances ~250–300ms.

---

## 12. agent-plan.tsx fix applied (reference)

- **`h-4.5 w-4.5` is VALID in Tailwind v4** (dynamic spacing: `calc(var(--spacing) * 4.5)` = 18px). No change required for compilation. (Documented so nobody "fixes" it.)
- Raw status colors mapped to tokens **without changing the look** (light-mode parity, dark-mode now themes correctly):
  - icons: `text-green-500 → text-success`, `text-blue-500 → text-accent`, `text-yellow-500 → text-warning`, `text-red-500 → text-danger`, `text-muted-foreground` kept.
  - pills: `bg-green-100 text-green-700 → bg-success-soft text-success`; `bg-blue-100 text-blue-700 → bg-accent-soft text-accent`; `bg-yellow-100 text-yellow-700 → bg-warning/10 text-warning`; `bg-red-100 text-red-700 → bg-danger-soft text-danger`; default `bg-muted text-muted-foreground` kept.
  - dashed connector: `border-muted-foreground/30 → border-line-strong`.
- Motion (spring easing, `AnimatePresence`, `LayoutGroup`, stagger) is **canonical and unchanged**.

---

## 13. RSC vs client boundary

- Default to **Server Components** for pages/layouts and static presentational chunks.
- A component must be `"use client"` if it: uses `useState`/`useEffect`/refs, imports `framer-motion`, attaches event handlers, reads `window`/`matchMedia`, or uses the new shared primitives that are interactive (`Select`, `Stepper` with handlers, anything animated).
- `StatusBadge`, `DashedConnector` are presentational and can be server-safe (no `"use client"`) **as long as they don't import motion**. The versions shipped here are server-safe.
- Keep data fetching in Server Components / route handlers; pass plain serializable props into client leaves. Never fetch in a client component that a server parent could fetch for.
