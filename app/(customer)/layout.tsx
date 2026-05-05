import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { makeApi } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { me } = await requireOrgOwner();

  // The sidebar grays out org-wide sections (Interviews, Participants,
  // Knowledge Map, Cross-Validation, Insights) until at least one audit
  // exists — they're aggregations across the org's audits, not audit-scoped,
  // but they need *some* data before they're meaningful. A failure here
  // shouldn't block the layout from rendering.
  let hasAudits = false;
  try {
    const cookie = await requestCookie();
    const list = await makeApi(cookie).campaigns.list();
    hasAudits = list.length > 0;
  } catch {
    hasAudits = false;
  }

  return (
    <div className="shell shell--with-sidebar">
      <Sidebar
        mode="customer"
        me={me}
        orgLabel={me.org?.name}
        orgLogoUrl={me.org?.logo_url}
        hasAudits={hasAudits}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}
