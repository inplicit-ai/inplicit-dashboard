"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useVaultUpload,
  addVaultItem,
  type UploadPhase,
  type UploadTask,
} from "@/lib/vaults/upload";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultDropzone — the friendly drag-drop upload surface + quick add controls.
 *
 * Strong empty state (big dropzone + primary CTA), per-file progress driven by
 * the upload state machine (uploading → extrahieren → indexieren → bereit), and
 * inline "URL einfügen" / "Text hinzufügen" quick-add forms.
 * ────────────────────────────────────────────────────────────────────────── */

type QuickMode = "none" | "url" | "text";

export function VaultDropzone({
  vaultId,
  onChanged,
}: {
  vaultId: string | null;
  onChanged: () => void;
}) {
  const t = useTranslations("vaultHub");
  const { tasks, uploadMany, dismiss } = useVaultUpload(vaultId, onChanged);
  const [dragging, setDragging] = useState(false);
  const [quick, setQuick] = useState<QuickMode>("none");
  const inputRef = useRef<HTMLInputElement>(null);

  const disabled = !vaultId;

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length) uploadMany(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line bg-surface-2 hover:border-line-strong hover:bg-surface-2",
        )}
        aria-label={t("dropTitle")}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted shadow-card">
          <Upload className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-[length:var(--text-body)] font-semibold text-fg">
          {dragging ? t("dropActive") : t("dropTitle")}
        </span>
        <span className="max-w-[40ch] text-[length:var(--text-body-sm)] text-fg-subtle">
          {t("dropHint")}
        </span>
        <span className="mt-1 inline-flex">
          <Button asChild size="sm" variant="default" tabIndex={-1}>
            <span>{t("dropCta")}</span>
          </Button>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadMany(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Quick-add row */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setQuick(quick === "url" ? "none" : "url")}
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {t("addUrl")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setQuick(quick === "text" ? "none" : "text")}
        >
          <FileText className="h-4 w-4" aria-hidden />
          {t("addText")}
        </Button>
      </div>

      {quick !== "none" && vaultId && (
        <QuickAddForm
          vaultId={vaultId}
          mode={quick}
          onClose={() => setQuick("none")}
          onAdded={() => {
            setQuick("none");
            onChanged();
          }}
        />
      )}

      {/* Active upload tasks */}
      {tasks.length > 0 && (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <UploadRow key={task.id} task={task} onDismiss={dismiss} />
          ))}
        </ul>
      )}
    </div>
  );
}

const PHASE_PROGRESS: Record<UploadPhase, number> = {
  uploading: 0.25,
  extracting: 0.55,
  indexing: 0.8,
  ready: 1,
  error: 1,
};

function UploadRow({
  task,
  onDismiss,
}: {
  task: UploadTask;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("vaultHub");
  const phaseLabel: Record<UploadPhase, string> = {
    uploading: t("stateUploading"),
    extracting: t("stateExtracting"),
    indexing: t("stateIndexing"),
    ready: t("stateReady"),
    error: t("stateError"),
  };
  const pct = Math.round(PHASE_PROGRESS[task.phase] * 100);
  const done = task.phase === "ready";
  const failed = task.phase === "error";

  return (
    <Card className="gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-fg-muted">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          ) : failed ? (
            <TriangleAlert className="h-4 w-4 text-danger" aria-hidden />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[length:var(--text-body-sm)] font-medium text-fg">
          {task.filename}
        </span>
        <span
          className={cn(
            "shrink-0 text-[length:var(--text-caption)] tabular-nums",
            failed ? "text-danger" : "text-fg-subtle",
          )}
        >
          {failed && task.error ? task.error : phaseLabel[task.phase]}
        </span>
        {(done || failed) && (
          <button
            type="button"
            onClick={() => onDismiss(task.id)}
            className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
            aria-label="dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {!failed && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              done ? "bg-success" : "bg-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Card>
  );
}

function QuickAddForm({
  vaultId,
  mode,
  onClose,
  onAdded,
}: {
  vaultId: string;
  mode: "url" | "text";
  onClose: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("vaultHub");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = content.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await addVaultItem(vaultId, {
        kind: mode === "url" ? "URL" : "TEXT",
        title: title.trim() || undefined,
        content: value,
      });
      setTitle("");
      setContent("");
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-2.5 p-4">
      {mode === "text" && (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("textTitlePlaceholder")}
        />
      )}
      {mode === "url" ? (
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("urlPlaceholder")}
          type="url"
        />
      ) : (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("textPlaceholder")}
          rows={3}
        />
      )}
      {error && (
        <p className="text-[length:var(--text-caption)] text-danger">{error}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void submit()} disabled={busy}>
          {t("add")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
          {t("cancel")}
        </Button>
      </div>
    </Card>
  );
}
