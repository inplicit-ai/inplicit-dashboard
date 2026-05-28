import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { makeApi } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { me } = await requireOrgOwner();

  // Org-wide surfaces (Interviews, Knowledge Chat, Digital Twin) gray out
  // until at least one campaign exists — they're aggregations across the org's
  // campaigns. A failure here must not block the shell from rendering.
  let hasAudits = false;
  try {
    const cookie = await requestCookie();
    const list = await makeApi(cookie).campaigns.list();
    hasAudits = list.length > 0;
  } catch {
    hasAudits = false;
  }

  return (
    <ShellLayout
      mode="customer"
      me={me}
      orgLabel={me.org?.name}
      orgLogoUrl={me.org?.logo_url}
      hasAudits={hasAudits}
    >
      {children}
    </ShellLayout>
  );
}
