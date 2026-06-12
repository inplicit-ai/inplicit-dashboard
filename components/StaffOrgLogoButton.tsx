"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { OrgAvatar } from "@/components/OrgAvatar";
import { cn } from "@/lib/utils";

interface StaffOrgLogoButtonProps {
  orgId: string;
  orgName: string;
  currentLogoUrl?: string | null;
  size?: number;
}

export function StaffOrgLogoButton({
  orgId,
  orgName,
  currentLogoUrl,
  size = 44,
}: StaffOrgLogoButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentLogoUrl;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setBusy(true);
    setError(null);

    try {
      const urlRes = await fetch(`/dapi/staff/orgs/${orgId}/logo-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type, byteSize: file.size }),
      });
      if (!urlRes.ok) {
        const body = (await urlRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${urlRes.status}`);
      }
      const { uploadUrl, logoUrl } = (await urlRes.json()) as { uploadUrl: string; logoUrl: string };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload fehlgeschlagen (${putRes.status})`);

      const patchRes = await fetch(`/dapi/staff/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: logoUrl }),
      });
      if (!patchRes.ok) {
        const body = (await patchRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${patchRes.status}`);
      }

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

  return (
    <div className="relative shrink-0 self-start">
      <OrgAvatar name={orgName} logoUrl={displayUrl} size={size} />

      <button
        type="button"
        aria-label="Logo hochladen"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-canvas shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          busy && "cursor-wait opacity-70",
        )}
      >
        {busy ? (
          <Loader2 size={10} className="animate-spin text-fg-muted" />
        ) : (
          <Plus size={10} className="text-fg-muted" strokeWidth={2.5} />
        )}
      </button>

      {error && (
        <p className="absolute left-0 top-full mt-1 w-48 text-[11px] text-danger" role="alert">
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
