"use client";
import { useState } from "react";
import { FigmaAsset } from "./FigmaAsset";

export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Link copiado");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setMessage("Copie o endereço da página para compartilhar.");
    }
  }
  return (
    <div className="share-control">
      <button onClick={share} className="button button-secondary">
        <FigmaAsset file="2865d.svg" />
        Compartilhar
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
