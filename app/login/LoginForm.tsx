"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function formatAuthError(message: string | undefined): string {
  const m = message?.trim() ?? "";
  if (
    m === "" ||
    m === "Load failed" ||
    m === "Failed to fetch" ||
    m === "NetworkError when attempting to fetch resource."
  ) {
    return (
      "Could not reach Supabase (network error). On production, confirm Vercel has " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, redeploy, and " +
      "check the Supabase project is not paused. Try another network or disable VPN/ad blockers."
    );
  }
  return m;
}

function hasPublicSupabaseEnv(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

export function LoginForm({
  nextPath,
  initialMode = "signin",
}: {
  nextPath: string;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("global_settings")
          .select("value")
          .eq("key", "signup_enabled")
          .maybeSingle();
        if (cancelled) return;
        const v = data?.value;
        setSignupEnabled(data == null ? true : v === true || v === "true");
      } catch {
        if (!cancelled) setSignupEnabled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function getSuccessPath() {
    return nextPath.startsWith("/") && nextPath !== "/" ? nextPath : "/host";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!hasPublicSupabaseEnv()) {
      setError(
        "Supabase URL or anon key is missing in this build. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (or .env locally), then redeploy."
      );
      return;
    }

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
        setError(formatAuthError(signError.message));
        return;
      }
      router.push(getSuccessPath());
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
      setError(formatAuthError(signError.message));
      return;
    }

    if (data.session) {
      router.push(getSuccessPath());
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
      {!hasPublicSupabaseEnv() ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          Configuration error: public Supabase environment variables are missing.
          Add them in Vercel → Settings → Environment Variables, then redeploy.
        </p>
      ) : null}

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
