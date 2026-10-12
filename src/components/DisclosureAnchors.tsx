"use client";
import { useEffect } from "react";

/** Deep links reveal the requested explanation, including collapsed sections. */
export function DisclosureAnchors() {
  useEffect(() => {
    let frame = 0;
    const reveal = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (!(target instanceof HTMLDetailsElement)) return;
      target.open = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: "instant" });
        target.querySelector("summary")?.focus({ preventScroll: true });
      });
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
