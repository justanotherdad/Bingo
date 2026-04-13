import { DisplayClient } from "@/components/display/DisplayClient";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { gameId } = await params;
  const sp = await searchParams;
  const token = sp.t?.trim();

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">Missing display token</p>
        <p className="max-w-md text-sm text-muted">
          Open the full link from the host screen. It must include{" "}
          <code className="rounded bg-card px-1">?t=…</code> after the game id.
        </p>
      </div>
    );
  }

  return (
    <DisplayClient
      gameId={gameId}
      token={token}
    />
  );
}
