"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { OrgAvatar } from "@/components/OrgAvatar";
import { cn } from "@/lib/utils";

interface OrgLogoUploadButtonProps {
  orgName: string;
  currentLogoUrl?: string | null;
}

/**
 * Clickable org-avatar that opens a file picker to upload a new logo.
 *
 * Upload flow (WHY-126):
 *   1. POST /dapi/orgs/me/logo-upload-url → { uploadUrl, logoUrl }
 *   2. PUT file bytes to the presigned uploadUrl
 *   3. PATCH /dapi/orgs/me with { logo_url }
 *   4. router.refresh() so the sidebar avatar updates immediately
 *
 * Passing an empty string to logo_url clears the logo.
 */
export function OrgLogoUploadButton({
  orgName,
  currentLogoUrl,
}: OrgLogoUploadButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentLogoUrl;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Nur Bilddateien sind erlaubt (PNG, JPG, SVG …).");
      return;
    }
    // Optimistic local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setBusy(true);
    setError(null);

    try {
      // 1 — get presigned upload URL
      const urlRes = await fetch("/dapi/orgs/me/logo-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime: file.type,
          byteSize: file.size,
        }),
      });
      if (!urlRes.ok) {
        const body = (await urlRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${urlRes.status}`);
      }
      const { uploadUrl, logoUrl } = (await urlRes.json()) as {
        uploadUrl: string;
        logoUrl: string;
      };

      // 2 — PUT file to S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`S3 upload fehlgeschlagen (${putRes.status})`);

      // 3 — save to org
      const patchRes = await fetch("/dapi/orgs/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: logoUrl }),
      });
      if (!patchRes.ok) {
        const body = (await patchRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${patchRes.status}`);
      }

      // 4 — refresh so sidebar + all server components pick up the new URL
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearLogo() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/dapi/orgs/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: "" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
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
        {/* Avatar with camera-overlay on hover */}
        <button
          type="button"
          aria-label="Organisations-Logo hochladen"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "group relative shrink-0 rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            busy && "cursor-wait",
          )}
        >
          <OrgAvatar name={orgName} logoUrl={displayUrl} size={56} />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center rounded-ui bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
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
            {busy ? "Wird hochgeladen…" : "Logo hochladen"}
          </button>
          <p className="text-[11px] text-fg-subtle">PNG, JPG oder SVG · max. 2 MB</p>
          {(currentLogoUrl ?? preview) && !busy && (
            <button
              type="button"
              onClick={() => void clearLogo()}
              className="flex items-center gap-1 text-[11px] text-fg-subtle hover:text-danger"
            >
              <X size={10} aria-hidden />
              Entfernen
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
