import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = sp.next && sp.next.startsWith("/") ? sp.next : "/";

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
      <LoginForm nextPath={nextPath} />
      <p className="text-sm text-muted">
        <Link href="/" className="transition hover:text-foreground">
          ← Back home
        </Link>
      </p>
    </main>
  );
}
