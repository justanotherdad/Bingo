import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { HostNavMenu } from "@/components/host/HostNavMenu";

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

  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card/30 px-6 py-4 backdrop-blur-sm">
        <span className="font-semibold text-foreground">Host</span>
        <HostNavMenu isAdmin={isAdmin} />
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
