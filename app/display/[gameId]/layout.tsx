import type { ReactNode } from "react";

/** Keeps TV browsers from flashing white if global CSS is slow or blocked. */
export default function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundColor: "#09090b", color: "#fafafa", minHeight: "100vh" }}
    >
      {children}
    </div>
  );
}
