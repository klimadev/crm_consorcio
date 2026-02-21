"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEntrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");

    const resposta = await fetch("/api/autenticacao/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      setErro(json.erro ?? "Falha no login");
      setCarregando(false);
      return;
    }

    router.push("/resumo");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Entrar no CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Use seu e-mail e senha da empresa ou funcionario.</p>

        <form className="mt-6 space-y-4" onSubmit={aoEntrar}>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <Input name="senha" type="password" required />
          </div>

          {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

          <Button className="w-full" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Sem conta? <a className="font-medium underline" href="/cadastro">Cadastre sua empresa</a>
        </p>
      </section>
    </main>
  );
}
