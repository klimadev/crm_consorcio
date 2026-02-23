"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  apenasIcone?: boolean;
  className?: string;
};

export function BotaoSair({ apenasIcone = false, className }: Props) {
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
    <Button
      variant={apenasIcone ? "ghost" : "outline"}
      size={apenasIcone ? "icon" : "sm"}
      onClick={sair}
      disabled={saindo}
      className={cn(className)}
      aria-label="Sair"
      title="Sair"
    >
      {apenasIcone ? <LogOut className="h-4 w-4" /> : null}
      {apenasIcone ? null : saindo ? "Saindo..." : "Sair"}
    </Button>
  );
}
