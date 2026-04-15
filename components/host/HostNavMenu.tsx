"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = { href: string; label: string; section?: "host" | "admin" };

const HOST_LINKS: NavItem[] = [
  { href: "/host", label: "Overview", section: "host" },
  { href: "/host/control", label: "Control", section: "host" },
];

const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "Users", section: "admin" },
  { href: "/admin/settings", label: "Global options", section: "admin" },
];

const HOME_LINK: NavItem = { href: "/", label: "Home" };

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/host") return pathname === "/host";
  if (href === "/host/control") return pathname === "/host/control";
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/settings") return pathname === "/admin/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HostNavMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const list: NavItem[] = [...HOST_LINKS];
    if (isAdmin) list.push(...ADMIN_LINKS);
    list.push(HOME_LINK);
    return list;
  }, [isAdmin]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative ml-auto flex items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/50 text-lg text-foreground transition hover:bg-card/80"
      >
        ☰
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            className="absolute right-0 top-full z-50 mt-2 min-w-[14rem] rounded-lg border border-border bg-background py-1 shadow-xl"
            role="menu"
          >
            {items.map((item, i) => {
              const showDividerBeforeAdmin =
                isAdmin && item.section === "admin" && items[i - 1]?.section === "host";
              const showDividerBeforeHome = item.href === "/" && i > 0;

              return (
                <div key={item.href}>
                  {showDividerBeforeAdmin || showDividerBeforeHome ? (
                    <div className="my-1 border-t border-border" role="separator" />
                  ) : null}
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={`block px-4 py-2.5 text-sm transition ${
                      isLinkActive(item.href, pathname)
                        ? "bg-accent/15 font-medium text-accent-foreground"
                        : "text-muted hover:bg-card/60 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </>
      ) : null}
    </div>
  );
}
