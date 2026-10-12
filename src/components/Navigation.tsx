"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { observatoryModules } from "@/lib/observatory";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !navigation.current?.contains(event.target)
      )
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  const links = [
    { href: "/", label: "Início", active: pathname === "/" },
    ...observatoryModules.map((module) => ({
      href: module.href,
      label: module.navigationLabel,
      active:
        pathname === module.href.slice(0, -1) ||
        pathname.startsWith(module.href),
    })),
    {
      href: "/indicadores/",
      label: "Indicadores",
      active:
        pathname === "/indicadores" || pathname.startsWith("/indicadores/"),
    },
    {
      href: "/metodologia/",
      label: "Fontes e método",
      active: pathname.startsWith("/metodologia"),
    },
  ];
  return (
    <div
      ref={navigation}
      className={`navigation ${open ? "is-open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <button
        ref={menuButton}
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="navegacao-principal"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}
        {open ? "Fechar" : "Menu"}
      </button>
      <nav
        id="navegacao-principal"
        aria-label="Navegação principal"
        className="main-nav"
      >
        {links.map(({ href, label, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
