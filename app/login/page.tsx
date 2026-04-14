import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = sp.next && sp.next.startsWith("/") ? sp.next : "/host";
  const initialMode = sp.mode === "signup" ? "signup" : "signin";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Sign in or create an account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Use your Bingo Host email and password. New hosts can register below
          when sign-up is enabled.
        </p>
      </div>
      <LoginForm nextPath={nextPath} initialMode={initialMode} />
      <p className="text-sm text-muted">
        <Link href="/" className="transition hover:text-foreground">
          ← Back home
        </Link>
      </p>
    </main>
  );
}
