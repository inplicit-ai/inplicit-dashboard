"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Select — token-driven, dependency-free styled native <select>.
 *
 * A native <select> is used on purpose: zero new deps, full keyboard + mobile
 * native picker support, and accessible by default. We only restyle the closed
 * control (the option menu is rendered by the OS, which we cannot/should not
 * theme). Styling pulls exclusively from design.css tokens via the globals.css
 * @theme bridge — no raw colors.
 *
 * See docs/plans/overhaul/design-contract.md §5 / §8.
 * ────────────────────────────────────────────────────────────────────────── */

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const selectVariants = cva(
  // base: layout + token surface/text/radius + focus ring + custom chevron room
  "w-full appearance-none rounded-ui pr-9 font-medium text-fg outline-none transition-[color,background,border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border border-line bg-surface hover:border-line-strong hover:bg-surface-2 focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)]",
        ghost:
          "border border-transparent bg-transparent hover:bg-surface-2 focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)]",
        outline:
          "border border-line-strong bg-canvas hover:border-line-strong focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)]",
      },
      size: {
        sm: "h-9 pl-3 text-[15px]",
        md: "h-10 pl-4 text-base",
        lg: "h-11 pl-4 text-base",
      },
      invalid: {
        true: "border-danger focus-visible:border-danger focus-visible:shadow-none",
        false: "",
      },
    },
    defaultVariants: { variant: "default", size: "md", invalid: false },
  },
);

export interface SelectProps
  extends Omit<
      React.ComponentPropsWithoutRef<"select">,
      "size" | "onChange" | "children"
    >,
    Omit<VariantProps<typeof selectVariants>, "invalid"> {
  /** Option list (preferred). Mutually compatible with `children`. */
  options?: SelectOption[];
  /** Or pass <option> children directly. */
  children?: React.ReactNode;
  /** Convenience change handler returning the raw value. */
  onValueChange?: (value: string) => void;
  /** Native change handler is still forwarded if provided. */
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  invalid?: boolean;
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      children,
      onValueChange,
      onChange,
      variant,
      size,
      invalid = false,
      className,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(e);
        onValueChange?.(e.target.value);
      },
      [onChange, onValueChange],
    );

    return (
      <div className="relative inline-flex w-full items-center">
        <select
          ref={ref}
          onChange={handleChange}
          aria-invalid={ariaInvalid ?? (invalid || undefined)}
          className={cn(selectVariants({ variant, size, invalid }), className)}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 size-4 text-fg-subtle"
        />
      </div>
    );
  },
);
Select.displayName = "Select";

/* ─── Shared option presets ──────────────────────────────────────────────── */

/** Build duration options on the 5-minute grid (inclusive). */
export function makeDurationOptions(
  min = 5,
  max = 60,
  step = 5,
): SelectOption[] {
  const out: SelectOption[] = [];
  for (let m = min; m <= max; m += step) {
    out.push({ value: String(m), label: `${m} min` });
  }
  return out;
}

/** 5, 10, 15 … 60 minutes. */
export const DURATION_OPTIONS: SelectOption[] = makeDurationOptions();

/** Interview languages (EN / DE / FR). */
export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

export { Select, selectVariants };
