"use server";

import { revalidatePath } from "next/cache";
import { numberPool, type BallPreset } from "@/lib/bingo";
import type { WinPattern } from "@/lib/bingo/winPattern";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

export async function ensureHostSession() {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("host_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) return { sessionId: existing.id };

  const { data, error } = await supabase
    .from("host_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/host");
  return { sessionId: data.id };
}

export async function createActiveGame(
  preset: BallPreset,
  winPattern: WinPattern = "straight_line"
) {
  const { supabase, user } = await requireUser();

  const { data: active } = await supabase
    .from("games")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (active) {
    throw new Error("You already have an active game. Open Control or end it first.");
  }

  const { sessionId } = await ensureHostSession();

  const { data, error } = await supabase
    .from("games")
    .insert({
      user_id: user.id,
      host_session_id: sessionId,
      ball_preset: preset,
      win_pattern: winPattern,
      status: "active",
    })
    .select("id, display_token, ball_preset")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/host");
  revalidatePath("/host/control");
  return data;
}

export async function drawNextNumber() {
  const { supabase, user } = await requireUser();

  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id, ball_preset, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (gErr || !game) throw new Error("No active game.");
  const preset = game.ball_preset as BallPreset;
  const pool = numberPool(preset);

  const { data: existingDraws, error: dErr } = await supabase
    .from("draws")
    .select("number")
    .eq("game_id", game.id);

  if (dErr) throw new Error(dErr.message);

  const drawn = new Set((existingDraws ?? []).map((r) => r.number));
  const remaining = pool.filter((n) => !drawn.has(n));
  if (remaining.length === 0) {
    throw new Error("All numbers have been drawn.");
  }

  const number = remaining[Math.floor(Math.random() * remaining.length)];
  const draw_order = drawn.size + 1;

  const { error: insErr } = await supabase.from("draws").insert({
    game_id: game.id,
    number,
    draw_order,
  });

  if (insErr) throw new Error(insErr.message);

  revalidatePath("/host");
  revalidatePath("/host/control");
  return { number, draw_order };
}

export async function updateWinPattern(winPattern: WinPattern) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("games")
    .update({ win_pattern: winPattern })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  revalidatePath("/host");
  revalidatePath("/host/control");
}

/**
 * Clear the board for another round **without** ending the game row.
 * Keeps the same `game_id` and `display_token` so TV / cast URLs keep working.
 */
export async function clearBoardAndNewGame(
  preset: BallPreset,
  winPattern: WinPattern = "straight_line"
) {
  const { supabase, user } = await requireUser();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!game) throw new Error("No active game.");

  const { error: delErr } = await supabase
    .from("draws")
    .delete()
    .eq("game_id", game.id);

  if (delErr) throw new Error(delErr.message);

  const { data: updated, error: upErr } = await supabase
    .from("games")
    .update({
      ball_preset: preset,
      win_pattern: winPattern,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", game.id)
    .eq("user_id", user.id)
    .select("id, display_token, ball_preset")
    .single();

  if (upErr) throw new Error(upErr.message);

  revalidatePath("/host");
  revalidatePath("/host/control");
  return updated;
}

export async function endHostSession() {
  const { supabase, user } = await requireUser();
  const endedAt = new Date().toISOString();

  const { error: gameErr } = await supabase
    .from("games")
    .update({ status: "cancelled", ended_at: endedAt })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (gameErr) throw new Error(gameErr.message);

  const { error: sessionErr } = await supabase
    .from("host_sessions")
    .update({ ended_at: endedAt })
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (sessionErr) throw new Error(sessionErr.message);

  revalidatePath("/host");
  revalidatePath("/host/control");
  revalidatePath("/display");
  return { ok: true };
}
