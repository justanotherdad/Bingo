import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { HostNavMenu } from "@/components/host/HostNavMenu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isCurrentUserAdmin();
  if (!ok) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card/30 px-6 py-4 backdrop-blur-sm">
        <span className="font-semibold text-foreground">Admin</span>
        <HostNavMenu isAdmin />
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
