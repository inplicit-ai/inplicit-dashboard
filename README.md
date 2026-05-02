# Inplicit Dashboard (Next.js 16)

Drop-in replacement for `inplicit-dashboard/` (Deno Fresh). Same UI, same backend API contract — runs on Node.js + Vercel.

## Stack

- **Next.js 16.2** (App Router, React 19.2, Turbopack)
- **Tailwind CSS 4** (theme tokens via `@theme inline` in `app/globals.css`)
- **Zod 4** + **react-hook-form 7** (form validation, where used)
- **TanStack Query 5** (client cache, optional)
- **D3 7** + **OGL** (KnowledgeMap, AgentOrb)

## Local development

```bash
pnpm install
cp .env.example .env.local        # set API_URL=http://localhost:8080
pnpm dev                          # → http://localhost:3000
```

The Rust backend must be running at `API_URL` (default `http://localhost:8080`).

## Production build

```bash
pnpm build                        # type-check + bundle
pnpm start                        # serve .next/ on :3000
```

## Deploy to Vercel

1. **Link the project**

   ```bash
   pnpm dlx vercel link
   ```

2. **Set env vars** (Project → Settings → Environment Variables):

   | Key | Value |
   |---|---|
   | `API_URL` | `https://inplicit-backend.fly.dev` |

3. **First deploy**

   ```bash
   pnpm dlx vercel --prod
   ```

4. **Backend CORS** — add the Vercel domain to `CORS_ALLOWED_ORIGINS` on Fly.io:

   ```bash
   flyctl secrets set CORS_ALLOWED_ORIGINS=https://<vercel-domain>,https://app.inplicit.ai -a inplicit-backend
   ```

Region is pinned to `fra1` (Frankfurt) via `vercel.json` for GDPR alignment with the Fly backend in `fra`.

## What's different vs. the Fresh version

- **No Islands**: anything client-side is `"use client"`. RSC is the default.
- **Server Actions**: forms (login, campaign launch, org CRUD) use Server Actions instead of Fresh `Handlers.POST`.
- **`cookies()` is async** (`next/headers`).
- **Active sidebar tab**: `usePathname()` instead of the old inline-script highlight.
- **D3 / OGL**: npm imports, no `<script src="...">` injection.
