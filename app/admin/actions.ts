"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function kickUser(userId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  if (user.id === userId) throw new Error("You cannot suspend your own account");

  const { error } = await supabase
    .from("profiles")
    .update({
      banned_at: new Date().toISOString(),
      banned_reason: reason.trim() || "Suspended by admin",
    })
    .eq("id", userId);

  if (error) throw error;
  revalidatePath("/admin");
}

export async function unbanUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({
      banned_at: null,
      banned_reason: null,
    })
    .eq("id", userId);

  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateGlobalSetting(key: string, value: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("global_settings")
    .update({
      value: value as Record<string, unknown>,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", key);

  if (error) throw error;
  revalidatePath("/admin/settings");
}
