import { cn } from "@/lib/utils";

interface OrgAvatarProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

/**
 * An uploaded logo's `logo_url` is the backend's own serving route
 * (`/api/orgs/:id/logo?v=…`). The browser can't reach the backend origin
 * directly — rewrite to the same-origin `/dapi` proxy, which attaches the
 * session cookie. Pasted third-party URLs pass through untouched.
 */
function resolveLogoSrc(logoUrl: string): string {
  return logoUrl.startsWith("/api/") ? `/dapi${logoUrl.slice(4)}` : logoUrl;
}

/**
 * Square avatar for an organization. Renders the uploaded `logo_url` when
 * present, falls back to the first initial of `name`. Used in the sidebar
 * and the staff org-detail edit form so both stay in sync.
 */
export function OrgAvatar({
  name,
  logoUrl,
  size = 32,
  className,
}: OrgAvatarProps) {
  const initial = (name?.trim()?.[0] ?? "·").toUpperCase();
  const dim = { width: size, height: size };

  if (logoUrl) {
    // Plain <img> on purpose: hosted on third-party CDNs we don't control,
    // so next/image's loader/whitelist would just get in the way for v1.
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-ui border border-line bg-canvas",
          className,
        )}
        style={dim}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveLogoSrc(logoUrl)}
          alt={name ? `${name} Logo` : "Organisation Logo"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-[13px] font-semibold text-fg-muted",
        className,
      )}
      style={dim}
    >
      {initial}
    </span>
  );
}
