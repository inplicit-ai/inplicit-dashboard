"use client";

import { Select, type SelectOption } from "@/components/ui/select";
import type { Lang } from "./copy";
import { LANG_NATIVE, SUPPORTED_LANGS } from "./copy";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  label: string;
  disabled?: boolean;
}

// Options are built from the supported-language set (gated to what the current
// STT+TTS pair supports — currently de/en/fr/es) rather than the shared
// LANGUAGE_OPTIONS preset, which only covers en/de/fr.
const LANG_OPTIONS: SelectOption[] = SUPPORTED_LANGS.map((lang) => ({
  value: lang,
  label: LANG_NATIVE[lang],
}));

/**
 * Pre-call language select (doc 04 §6). Native-name dropdown gated to the
 * languages the current STT+TTS pair supports. The participant sets this
 * before Start; it rebuilds STT/TTS/prompt server-side.
 */
export function LanguagePicker({ value, onChange, label, disabled }: Props) {
  return (
    <label className="field">
      <span className="label-eyebrow">{label}</span>
      <Select
        aria-label={label}
        value={value}
        onValueChange={(v) => onChange(v as Lang)}
        options={LANG_OPTIONS}
        disabled={disabled}
        size="md"
      />
    </label>
  );
}
