import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { presetLabel, type BallPreset } from "@/lib/bingo";
import { HostStartForm } from "@/components/host/HostStartForm";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: game } = await supabase
    .from("games")
    .select("id, ball_preset, display_token, started_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof process.env.VERCEL_URL === "string"
      ? `https://${process.env.VERCEL_URL}`
      : "");

  const displayUrl =
    game && origin
      ? `${origin}/display/${game.id}?t=${game.display_token}`
      : game
        ? `/display/${game.id}?t=${game.display_token}`
        : null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Host</h1>
        <p className="mt-1 text-sm text-muted">
          Start a game, open Control on your phone, and open the display link on
          the TV (fullscreen). Optional: set{" "}
          <code className="rounded bg-card px-1 text-foreground/90">
            NEXT_PUBLIC_APP_URL
          </code>{" "}
          in production so links are absolute.
        </p>
      </div>

      {game ? (
        <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
          <h2 className="text-sm font-medium text-foreground">Active game</h2>
          <p className="text-sm text-muted">
            Preset:{" "}
            <span className="text-foreground">
              {presetLabel(game.ball_preset as BallPreset)}
            </span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90"
              href="/host/control"
            >
              Open controller
            </Link>
            {displayUrl ? (
              <a
                className="inline-flex justify-center rounded-md border border-border bg-card/40 px-4 py-2 text-sm text-foreground transition hover:border-muted"
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open display (TV)
              </a>
            ) : null}
          </div>
          {displayUrl ? (
            <label className="block text-xs text-muted">
              Display link (copy to TV browser)
              <input
                readOnly
                className="mt-1 w-full rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground"
                value={displayUrl}
              />
            </label>
          ) : null}
        </section>
      ) : (
        <HostStartForm />
      )}
    </div>
  );
}
