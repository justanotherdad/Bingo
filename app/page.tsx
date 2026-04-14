import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/admin";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user ? await isCurrentUserAdmin() : false;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Bingo Host
      </h1>
      <p className="text-muted">
        Sign in to run games from your phone and open the TV display link. Admin
        tools are for operators only.
      </p>
      {!user ? (
        <div className="flex flex-wrap gap-4">
          <Link
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-md border border-border bg-card/40 px-4 py-2 text-sm text-muted transition hover:border-muted hover:text-foreground"
            href="/login?mode=signup"
          >
            Sign up
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <Link
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90"
            href="/host"
          >
            Host
          </Link>
          {isAdmin ? (
            <Link
              className="rounded-md border border-border bg-card/40 px-4 py-2 text-sm text-muted transition hover:border-muted hover:text-foreground"
              href="/admin"
            >
              Admin
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}
