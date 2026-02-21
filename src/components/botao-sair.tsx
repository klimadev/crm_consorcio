"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    router.push("/login");

    try {
      await fetch("/api/autenticacao/logout", { method: "POST" });
    } catch {
      setSaindo(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={sair} disabled={saindo}>
      {saindo ? "Saindo..." : "Sair"}
    </Button>
  );
}
