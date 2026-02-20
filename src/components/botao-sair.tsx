"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/autenticacao/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={sair}>
      Sair
    </Button>
  );
}
