"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { clientApi } from "@/lib/client-api";
import { OrgAvatar } from "@/components/OrgAvatar";
import { cn } from "@/lib/utils";

/** Mirrors the backend allowlist — it sniffs magic bytes, this is just UX. */
const ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

interface OrgLogoUploadProps {
  orgName: string;
  currentLogoUrl?: string | null;
  /**
   * Staff console: target a specific org via the /api/staff routes.
   * Omitted → the caller's own org (ORG_OWNER self-service).
   */
  staffOrgId?: string;
}

/**
 * Avatar + upload/remove controls for the org logo (WHY-126).
 *
 * The file transits the server (multipart `file`, like vault upload-direct);
 * the backend stores it in S3 and rewrites `logo_url`, so a single
 * `router.refresh()` updates the sidebar and every other consumer. Used in
 * the customer SettingsDialog and the staff org edit form.
 */
export function OrgLogoUpload({
  orgName,
  currentLogoUrl,
  staffOrgId,
}: OrgLogoUploadProps) {
  const t = useTranslations("orgLogo");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs leak GPU/heap memory until revoked; release the previous one
  // whenever the preview changes and on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const displayUrl = preview ?? currentLogoUrl;

  async function handleFile(file: File) {
    if (!ACCEPTED_MIMES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("errorSize"));
      return;
    }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setError(null);
    try {
      await (staffOrgId
        ? clientApi.staffOrgs.uploadLogo(staffOrgId, file)
        : clientApi.orgs.uploadLogo(file));
      // Keep the optimistic preview up while the server components re-render
      // with the new `logo_url` — no flash back to the old logo.
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await (staffOrgId
        ? clientApi.staffOrgs.removeLogo(staffOrgId)
        : clientApi.orgs.removeLogo());
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("upload")}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "group relative shrink-0 rounded-ui",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            busy && "cursor-wait",
          )}
        >
          <OrgAvatar name={orgName} logoUrl={displayUrl} size={56} />
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-ui bg-black/40 transition-opacity",
              busy
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin text-white" />
            ) : (
              <Camera size={18} className="text-white" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="text-[13px] font-medium text-fg underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy ? t("uploading") : t("upload")}
          </button>
          <p className="text-[11px] text-fg-subtle">{t("hint")}</p>
          {displayUrl && !busy && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="flex items-center gap-1 text-[11px] text-fg-subtle transition-colors hover:text-danger"
            >
              <X size={10} aria-hidden />
              {t("remove")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
