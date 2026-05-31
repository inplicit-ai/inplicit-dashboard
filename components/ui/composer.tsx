"use client"

import * as React from "react"
import { ArrowUp, Mic, Plus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * Composer — the claude.ai-style prompt box (for chat / setup / RAG).
 *
 * A single rounded-2xl white box: a multiline auto-sizing textarea on top, a
 * bottom row with a left "+"/attach control and right-aligned controls (an
 * optional mic + the send button). Suggestion chips render BELOW the box.
 * Focus-within arms a strong border + stronger shadow. Soft, inviting, roomy.
 *
 * Controlled OR uncontrolled. Enter submits, Shift+Enter inserts a newline.
 * Restyle only — preserve the caller's submit / data contract.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ComposerSuggestion {
  label: string
  value?: string
}

export interface ComposerProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Show a loading state on the send button. */
  isLoading?: boolean
  /** Max textarea height in px before it scrolls. */
  maxHeight?: number
  /** Left attach control handler. Hidden when omitted. */
  onAttach?: () => void
  /** Mic control handler. Hidden when omitted. */
  onMic?: () => void
  /** Suggestion chips rendered below the box. */
  suggestions?: ComposerSuggestion[]
  onSuggestionSelect?: (suggestion: ComposerSuggestion) => void
  className?: string
}

export function Composer({
  value,
  defaultValue,
  onValueChange,
  onSubmit,
  placeholder = "",
  disabled = false,
  isLoading = false,
  maxHeight = 240,
  onAttach,
  onMic,
  suggestions,
  onSuggestionSelect,
  className,
}: ComposerProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const isControlled = value !== undefined
  const current = isControlled ? value : internal
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  // Auto-size the textarea up to maxHeight.
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [current, maxHeight])

  const canSend = current.trim().length > 0 && !disabled && !isLoading

  const submit = () => {
    if (!canSend) return
    onSubmit?.(current.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "rounded-lg border border-line bg-surface px-4 pt-3 pb-2 shadow-card transition-[border-color,box-shadow] duration-200",
          "focus-within:border-line-strong focus-within:shadow-md"
        )}
      >
        <textarea
          ref={textareaRef}
          value={current}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none border-none bg-transparent text-[length:var(--text-body-lg)] leading-[1.6] text-fg outline-none placeholder:text-fg-subtle disabled:opacity-50"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            {onAttach && (
              <IconButton
                icon={Plus}
                label="Attach"
                onClick={onAttach}
                disabled={disabled}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {onMic && (
              <IconButton
                icon={Mic}
                label="Voice input"
                onClick={onMic}
                disabled={disabled}
              />
            )}
            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              disabled={!canSend}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-cta text-cta-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => onSuggestionSelect?.(s)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[length:var(--text-caption)] text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-2 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}
