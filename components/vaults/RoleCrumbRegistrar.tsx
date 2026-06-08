"use client";

import { useRegisterRoleName } from "@/lib/shell/crumb-context";

/** Registers the role name into the breadcrumb trail for as long as mounted. */
export function RoleCrumbRegistrar({ name }: { name: string }) {
  useRegisterRoleName(name);
  return null;
}
