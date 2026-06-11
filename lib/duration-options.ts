export interface DurationOption {
  value: string;
  label: string;
}

export function makeDurationOptions(
  min = 5,
  max = 60,
  step = 5,
): DurationOption[] {
  const out: DurationOption[] = [];
  for (let m = min; m <= max; m += step) {
    out.push({ value: String(m), label: `${m} min` });
  }
  return out;
}
