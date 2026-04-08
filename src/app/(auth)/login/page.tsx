"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const inputEmailId = "login-email";
  const inputSenhaId = "login-senha";
  const erroId = "login-erro";

  async function aoEntrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");

    let resposta;
    let json = {};

    try {
      resposta = await fetch("/api/autenticacao/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      json = await resposta.json().catch(() => ({}));
    } catch {
      setErro("Erro de conexao. Verifique sua internet e tente novamente.");
      setCarregando(false);
      return;
    }

    if (!resposta.ok) {
      const erroApi = (json as { erro?: string }).erro;
      const mensagem = erroApi 
        ?? (resposta.status === 401 ? "E-mail ou senha incorretos."
        : resposta.status === 0 ? "Servidor indisponivel. Tente mais tarde."
        : "Falha ao fazer login. Tente novamente.");
      setErro(mensagem);
      setCarregando(false);
      return;
    }

    setCarregando(false);
    router.push("/resumo");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-background-surface p-6 shadow-md shadow-black/20">
        <h1 className="text-2xl font-semibold">Entrar no MC CRM</h1>
        <p className="mt-1 text-sm text-foreground-muted">Use seu e-mail e senha da empresa ou funcionario.</p>

        <form className="mt-6 space-y-4" onSubmit={aoEntrar}>
          <div>
            <label htmlFor={inputEmailId} className="mb-1 block text-sm font-medium">E-mail</label>
            <Input id={inputEmailId} name="email" type="email" required aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined} />
          </div>
          <div>
            <label htmlFor={inputSenhaId} className="mb-1 block text-sm font-medium">Senha</label>
            <Input id={inputSenhaId} name="senha" type="password" required aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined} />
          </div>

          {erro ? <p id={erroId} role="alert" className="text-sm text-destructive">{erro}</p> : null}

          <Button className="w-full" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-foreground-muted">
          Sem conta? <a className="font-medium underline" href="/cadastro">Cadastre sua empresa</a>
        </p>
      </section>
    </main>
  );
}
