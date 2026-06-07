"use client";

import { useRegisterVaultFolder } from "@/lib/shell/crumb-context";

/**
 * Registers the active vault folder label in the breadcrumb context so the
 * topbar trail reads "Kontext-Tresor > Rollen" etc. instead of just
 * "Kontext-Tresor". Must be mounted inside the page render so it unmounts
 * when the user navigates away.
 */
export function VaultFolderBreadcrumb({ label }: { label: string }) {
  useRegisterVaultFolder(label);
  return null;
}
