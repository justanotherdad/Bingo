export default function LoginLoading() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <div className="h-8 w-48 animate-pulse rounded bg-card" />
      <div className="h-4 w-full max-w-sm animate-pulse rounded bg-card/60" />
      <p className="text-sm text-muted">Loading sign-in…</p>
    </main>
  );
}
