import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/host");
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card/30 px-6 py-4 backdrop-blur-sm">
        <span className="font-semibold text-foreground">Host</span>
        <nav className="flex gap-4 text-sm">
          <Link className="text-muted transition hover:text-foreground" href="/host">
            Overview
          </Link>
          <Link className="text-muted transition hover:text-foreground" href="/host/control">
            Control
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
