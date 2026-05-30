"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const USUARIOS_TESTE = process.env.NODE_ENV === "development" ? [
  { label: "Empresa", email: "empresa.demo@crmconsorcio.com", senha: "123456" },
  { label: "Gerente", email: "gerente.demo@crmconsorcio.com", senha: "123456" },
  { label: "Colaborador A", email: "a@demo.com", senha: "123456" },
  { label: "Colaborador B", email: "b@demo.com", senha: "123456" },
] : [];

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

  async function loginRapido(email: string, senha: string) {
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await fetch("/api/autenticacao/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (!resposta.ok) {
        const json = await resposta.json().catch(() => ({}));
        setErro((json as { erro?: string }).erro ?? "Falha ao fazer login.");
        setCarregando(false);
        return;
      }

      router.push("/resumo");
    } catch {
      setErro("Erro de conexao.");
      setCarregando(false);
    }
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

        {USUARIOS_TESTE.length > 0 ? (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Login rápido (teste)</p>
            <div className="grid grid-cols-2 gap-2">
              {USUARIOS_TESTE.map((u) => (
                <Button
                  key={u.label}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl text-xs"
                  onClick={() => loginRapido(u.email, u.senha)}
                  disabled={carregando}
                >
                  {u.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-foreground-muted">
          Sem conta? <a className="font-medium underline" href="/cadastro">Cadastre sua empresa</a>
        </p>
      </section>
    </main>
  );
}
