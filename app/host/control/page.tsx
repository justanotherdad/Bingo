import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { letterForNumber, presetLabel, type BallPreset } from "@/lib/bingo";
import { HostControlPanel } from "@/components/host/HostControlPanel";
import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function HostControlPage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: game } = await supabase
    .from("games")
    .select("id, ball_preset, display_token")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const displayUrl =
    game && origin
      ? `${origin}/display/${game.id}?t=${game.display_token}`
      : game
        ? `/display/${game.id}?t=${game.display_token}`
        : null;

  if (!game) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Controller</h1>
        <p className="text-sm text-muted">No active game. Start one from Host.</p>
        <Link
          href="/host"
          className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Back to Host
        </Link>
      </div>
    );
  }

  const preset = game.ball_preset as BallPreset;

  const { data: lastDrawRow } = await supabase
    .from("draws")
    .select("number, draw_order")
    .eq("game_id", game.id)
    .order("draw_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialLastDraw = lastDrawRow
    ? {
        number: lastDrawRow.number,
        letter: letterForNumber(preset, lastDrawRow.number),
        order: lastDrawRow.draw_order,
      }
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Controller</h1>
        <p className="mt-1 text-sm text-muted">
          {presetLabel(preset)} · Draw numbers for the room; the TV page shows
          animations and sound.
        </p>
      </div>

      {displayUrl ? (
        <p className="text-xs text-muted">
          Display:{" "}
          <a
            href={displayUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-accent underline-offset-2 hover:underline"
          >
            {displayUrl}
          </a>
        </p>
      ) : null}

      <HostControlPanel
        key={game.id}
        initialPreset={preset}
        initialLastDraw={initialLastDraw}
      />
    </div>
  );
}
