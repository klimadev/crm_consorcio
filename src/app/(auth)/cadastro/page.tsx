"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function PaginaCadastroEmpresa() {
  const router = useRouter();
  const { addToast } = useToast();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const inputNomeId = "cadastro-nome";
  const inputEmailId = "cadastro-email";
  const inputSenhaId = "cadastro-senha";
  const erroId = "cadastro-erro";

  async function aoCadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nome") ?? "");
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");

    let resposta;
    let json = {};

    try {
      resposta = await fetch("/api/autenticacao/cadastro-empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
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
        ?? (resposta.status === 409 ? "Este e-mail ja esta cadastrado."
        : resposta.status === 0 ? "Servidor indisponivel. Tente mais tarde."
        : "Falha ao criar conta. Tente novamente.");
      setErro(mensagem);
      setCarregando(false);
      return;
    }

setErro(null);
    setCarregando(false);
    addToast({ type: "success", title: "Conta criada com sucesso!" });
    router.push("/resumo");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-background-surface p-6 shadow-md shadow-black/20">
        <h1 className="text-2xl font-semibold">Criar conta da empresa</h1>
        <p className="mt-1 text-sm text-foreground-muted">Ao cadastrar, o funil inicial sera criado automaticamente.</p>

        <form className="mt-6 space-y-4" onSubmit={aoCadastrar}>
          <div>
            <label htmlFor={inputNomeId} className="mb-1 block text-sm font-medium">Nome da empresa</label>
            <Input id={inputNomeId} name="nome" required aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined} />
          </div>
          <div>
            <label htmlFor={inputEmailId} className="mb-1 block text-sm font-medium">E-mail</label>
            <Input id={inputEmailId} name="email" type="email" required aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined} />
          </div>
          <div>
            <label htmlFor={inputSenhaId} className="mb-1 block text-sm font-medium">Senha</label>
            <Input id={inputSenhaId} name="senha" type="password" minLength={6} required aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined} />
          </div>

          {erro ? <p id={erroId} role="alert" className="text-sm text-destructive">{erro}</p> : null}

          <Button className="w-full" disabled={carregando}>
            {carregando ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-foreground-muted">
          Ja possui conta? <a className="font-medium underline" href="/login">Fazer login</a>
        </p>
      </section>
    </main>
  );
}
