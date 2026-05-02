import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { requireOrgOwner } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { me } = await requireOrgOwner();

  return (
    <div className="shell shell--with-sidebar">
      <Sidebar mode="customer" me={me} orgLabel={me.org?.name} />
      <main className="app-main">{children}</main>
    </div>
  );
}
