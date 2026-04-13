"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({
  nextPath,
  signupEnabled,
}: {
  nextPath: string;
  signupEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "signup") {
      if (!signupEnabled) {
        setError("New sign-ups are currently disabled.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setPending(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setPending(false);
      if (signError) {
        setError(signError.message);
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
      return;
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: origin ? `${origin}/login` : undefined,
        data: {
          full_name: displayName.trim() || "",
        },
      },
    });
    setPending(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.session) {
      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
      return;
    }

    setInfo(
      "Account created. Check your email for a confirmation link if your project requires email verification. You can sign in here once that’s done."
    );
  }

  const signingIn = mode === "signin";

  return (
    <div className="flex flex-col gap-4">
      {signupEnabled ? (
        <div className="flex gap-2 rounded-lg border border-border bg-card/40 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              signingIn
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              !signingIn
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>
      ) : (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
          New registrations are turned off. Sign in with an existing account.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!signingIn ? (
          <label className="block text-sm text-muted">
            Display name{" "}
            <span className="font-normal opacity-70">(optional)</span>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
              placeholder="e.g. DJ Bingo Night"
            />
          </label>
        ) : null}

        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          />
        </label>
        <label className="block text-sm text-muted">
          Password
          <input
            type="password"
            autoComplete={signingIn ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          />
        </label>
        {!signingIn ? (
          <label className="block text-sm text-muted">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
            />
          </label>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-400/90">{info}</p> : null}

        <button
          type="submit"
          disabled={pending || (!signupEnabled && !signingIn)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? signingIn
              ? "Signing in…"
              : "Creating account…"
            : signingIn
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
