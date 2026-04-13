import Link from "next/link";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";

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
        <nav className="flex gap-4 text-sm">
          <Link className="text-muted transition hover:text-foreground" href="/admin">
            Users
          </Link>
          <Link
            className="text-muted transition hover:text-foreground"
            href="/admin/settings"
          >
            Global options
          </Link>
        </nav>
        <Link
          className="ml-auto text-sm text-muted transition hover:text-foreground"
          href="/"
        >
          Home
        </Link>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
