"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaCadastroEmpresa() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoCadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nome") ?? "");
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");

    const resposta = await fetch("/api/autenticacao/cadastro-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      setErro(json.erro ?? "Falha no cadastro");
      setCarregando(false);
      return;
    }

    router.push("/resumo");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-sky-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Criar conta da empresa</h1>
        <p className="mt-1 text-sm text-sky-500">Ao cadastrar, o funil inicial sera criado automaticamente.</p>

        <form className="mt-6 space-y-4" onSubmit={aoCadastrar}>
          <div>
            <label className="mb-1 block text-sm font-medium">Nome da empresa</label>
            <Input name="nome" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <Input name="senha" type="password" minLength={6} required />
          </div>

          {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

          <Button className="w-full" disabled={carregando}>
            {carregando ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-sky-600">
          Ja possui conta? <a className="font-medium underline" href="/login">Fazer login</a>
        </p>
      </section>
    </main>
  );
}
