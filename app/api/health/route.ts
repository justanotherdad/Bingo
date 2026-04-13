import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostics for env + (optional) server-side reachability to Supabase Auth.
 *
 * - GET /api/health — env flags only
 * - GET /api/health?probe=1 — also fetches Supabase from **this server** (Vercel).
 *   If probe succeeds but the browser still fails, suspect Safari/ad-block/VPN/client network.
 */
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let host: string | null = null;
  try {
    if (url) host = new URL(url).hostname;
  } catch {
    host = null;
  }

  const probeRequested = new URL(request.url).searchParams.get("probe") === "1";

  let probeFromServer:
    | {
        attempted: true;
        ok: boolean;
        status: number | null;
        error: string | null;
      }
    | { attempted: false };

  if (probeRequested && url && key && host?.endsWith(".supabase.co")) {
    const authHealth = `${url.replace(/\/$/, "")}/auth/v1/health`;
    try {
      const r = await fetch(authHealth, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      probeFromServer = {
        attempted: true,
        ok: r.ok,
        status: r.status,
        error: null,
      };
    } catch (e) {
      probeFromServer = {
        attempted: true,
        ok: false,
        status: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  } else if (probeRequested) {
    probeFromServer = {
      attempted: true,
      ok: false,
      status: null,
      error:
        "Missing or invalid NEXT_PUBLIC_SUPABASE_URL / anon key; cannot probe.",
    };
  } else {
    probeFromServer = { attempted: false };
  }

  const body = {
    ok: true as const,
    supabaseUrlConfigured: typeof url === "string" && url.startsWith("https://"),
    supabaseAnonKeyConfigured:
      typeof key === "string" && key.length > 20,
    supabaseHost: host,
    urlLooksLikeSupabase:
      typeof url === "string" &&
      url.startsWith("https://") &&
      host?.endsWith(".supabase.co") === true,
    probeFromServer,
    hint:
      !url || !key
        ? "Add NEXT_PUBLIC_SUPABASE_URL (full https://….supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY, redeploy."
        : undefined,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
