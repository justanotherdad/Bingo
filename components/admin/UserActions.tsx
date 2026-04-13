"use client";

import { useState, useTransition } from "react";
import { kickUser, unbanUser } from "@/app/admin/actions";

export function UserActions({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onKick() {
    const ok = window.confirm(
      "Suspend this user? They will not be able to host games until reinstated."
    );
    if (!ok) return;
    const reason = window.prompt("Reason (optional):") ?? "";
    setError(null);
    startTransition(async () => {
      try {
        await kickUser(userId, reason);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to suspend");
      }
    });
  }

  function onUnban() {
    const ok = window.confirm("Reinstate this user?");
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await unbanUser(userId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reinstate");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {banned ? (
        <button
          type="button"
          disabled={pending}
          onClick={onUnban}
          className="rounded border border-emerald-800/80 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-50"
        >
          Reinstate
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onKick}
          className="rounded border border-red-900/80 px-2 py-1 text-xs text-red-200 hover:bg-red-950/40 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {error ? <span className="max-w-[12rem] text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
