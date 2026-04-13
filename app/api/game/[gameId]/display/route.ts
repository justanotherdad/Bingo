import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type DrawRow = {
  id: string;
  number: number;
  draw_order: number;
  created_at: string;
};

/**
 * Public read for TV displays. Requires correct `t` (display_token) query param.
 * Uses service role only on the server — never expose the service key to the client.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t")?.trim();
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id, ball_preset, status, display_token")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (game.display_token !== token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: draws, error: dErr } = await supabase
    .from("draws")
    .select("id, number, draw_order, created_at")
    .eq("game_id", gameId)
    .order("draw_order", { ascending: true });

  if (dErr) {
    return NextResponse.json({ error: "draws_failed" }, { status: 500 });
  }

  const list = (draws ?? []) as DrawRow[];
  const latest = list.length ? list[list.length - 1] : null;

  return NextResponse.json({
    ball_preset: game.ball_preset,
    status: game.status,
    draws: list,
    latest,
  });
}
