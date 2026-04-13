import { createClient } from "@/lib/supabase/server";
import { UserActions } from "@/components/admin/UserActions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string | null;
  display_name: string;
  city: string;
  state: string;
  signup_at: string;
  banned_at: string | null;
  banned_reason: string | null;
  role: string;
  games_hosted: number;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_user_stats")
    .select("*")
    .order("signup_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-md border border-red-900/70 bg-red-950/35 p-4 text-sm text-red-200">
        Could not load users: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Directory, signup date, games hosted, and moderation. Banned users
          cannot host sessions or draws.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card/30">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-card text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">City / State</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Games</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-card/50">
                <td className="px-3 py-2 font-medium text-foreground">
                  {r.display_name || "—"}
                </td>
                <td className="px-3 py-2 text-muted">{r.email || "—"}</td>
                <td className="px-3 py-2 text-muted">
                  {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-muted">
                  {new Date(r.signup_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 tabular-nums text-foreground/90">
                  {r.games_hosted}
                </td>
                <td className="px-3 py-2 text-muted">{r.role}</td>
                <td className="px-3 py-2">
                  {r.banned_at ? (
                    <span className="rounded bg-red-950/60 px-2 py-0.5 text-xs text-red-200">
                      Banned
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400/90">Active</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <UserActions userId={r.id} banned={!!r.banned_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
