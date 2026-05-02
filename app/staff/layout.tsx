import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { requireStaff } from "@/lib/auth";

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { me } = await requireStaff();

  return (
    <div className="shell shell--with-sidebar">
      <Sidebar mode="staff" me={me} orgLabel="Inplicit Staff" />
      <main className="app-main">{children}</main>
    </div>
  );
}
