"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { WORK_RESTORE_KEY, worksReturnUrl } from "@/lib/work-navigation";

export function BackToWorks() {
  const [href, setHref] = useState("/obras/");
  useEffect(() => {
    setHref(worksReturnUrl(window.location.search));
  }, []);
  return (
    <Link
      href={href}
      replace
      scroll={false}
      onClick={() => {
        try {
          sessionStorage.setItem(WORK_RESTORE_KEY, href);
        } catch {
          /* Optional scroll restoration. */
        }
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" /> Voltar aos resultados
    </Link>
  );
}
