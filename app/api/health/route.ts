import { NextResponse } from "next/server";

/**
 * Public diagnostics: confirms NEXT_PUBLIC_* are present on this deployment
 * (they are inlined at build time). Visit /api/health after changing Vercel env — redeploy required.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let host: string | null = null;
  try {
    if (url) host = new URL(url).hostname;
  } catch {
    host = null;
  }

  const body = {
    ok: true as const,
    supabaseUrlConfigured: typeof url === "string" && url.startsWith("https://"),
    supabaseAnonKeyConfigured:
      typeof key === "string" && key.length > 20,
    supabaseHost: host,
    hint:
      !url || !key
        ? "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local in the project root, then restart `npm run dev`."
        : undefined,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
