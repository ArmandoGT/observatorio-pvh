"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { observatoryModules } from "@/lib/observatory";

export function Navigation() {
  const pathname = usePathname();
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
      href: "/metodologia/",
      label: "Sobre",
      active: pathname.startsWith("/metodologia"),
    },
    {
      href: "/termos/",
      label: "Termos",
      active: pathname === "/termos" || pathname.startsWith("/termos/"),
    },
  ];
  return (
    <nav aria-label="Navegação principal" className="main-nav">
      {links.map(({ href, label, active }) => (
        <Link key={href} href={href} aria-current={active ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
