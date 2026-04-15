"use client";

export default function DisplayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      style={{
        backgroundColor: "#09090b",
        color: "#fecaca",
        minHeight: "100vh",
      }}
    >
      <p className="text-lg font-medium">Display couldn’t load</p>
      <p className="max-w-md text-sm opacity-90">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
