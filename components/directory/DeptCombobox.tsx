"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled department combobox — shows existing departments as selectable
 * options with a checkmark on the selected item. Free-text entry is
 * still allowed (for new departments not yet in the list).
 */
export function DeptCombobox({
  name,
  options,
  placeholder,
  defaultValue = "",
}: {
  name: string;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(value.toLowerCase()),
  );

  const showDropdown = open && options.length > 0;

  function select(dept: string) {
    setValue(dept);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input carries the value for the form */}
      <input type="hidden" name={name} value={value} />

      <input
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          "h-10 w-full rounded-ui border border-line bg-surface px-3.5 text-sm text-fg",
          "placeholder:text-fg-subtle outline-none transition-colors duration-150",
          "hover:border-line-strong hover:bg-surface-2",
          "focus:border-accent focus:shadow-[var(--shadow-focus)]",
        )}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-ui border border-line bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-fg-subtle">
              Keine passende Abteilung
            </p>
          ) : (
            <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
              {filtered.map((dept) => {
                const selected = value === dept;
                return (
                  <li key={dept} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault(); // prevent blur before click
                        select(dept);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "text-fg"
                          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      {/* Checkmark column — always takes space so text aligns */}
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {selected && (
                          <Check className="h-3.5 w-3.5 text-fg" strokeWidth={2.5} />
                        )}
                      </span>
                      <span className={cn(!selected && "opacity-60")}>
                        {dept}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
