import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { requireStaff } from "@/lib/auth";

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { me } = await requireStaff();

  return (
    <ShellLayout mode="staff" me={me} orgLabel="Inplicit Staff" hasAudits>
      {children}
    </ShellLayout>
  );
}
