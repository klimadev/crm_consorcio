import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarTokenSessao, definirCookieSessao } from "@/lib/autenticacao";

type CorpoCadastroEmpresa = {
  nome?: string;
  email?: string;
  senha?: string;
};

const estagiosPadrao = [
  { nome: "Novo Lead", tipo: "ABERTO", ordem: 1 },
  { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
  { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
  { nome: "Fechado", tipo: "GANHO", ordem: 4 },
  { nome: "Perdido", tipo: "PERDIDO", ordem: 5 },
] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as CorpoCadastroEmpresa;
  const nome = body.nome?.trim();
  const email = body.email?.trim().toLowerCase();
  const senha = body.senha;

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha nome, e-mail e senha." }, { status: 400 });
  }

  if (senha.length < 6) {
    return NextResponse.json({ erro: "Senha precisa ter ao menos 6 caracteres." }, { status: 400 });
  }

  const jaExiste = await prisma.empresa.findUnique({ where: { email } });
  if (jaExiste) {
    return NextResponse.json({ erro: "Ja existe uma empresa com esse e-mail." }, { status: 409 });
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const empresa = await prisma.$transaction(async (tx: {
    empresa: typeof prisma.empresa;
    estagioFunil: typeof prisma.estagioFunil;
  }) => {
    const novaEmpresa = await tx.empresa.create({
      data: {
        nome,
        email,
        senha_hash,
      },
    });

    await tx.estagioFunil.createMany({
      data: estagiosPadrao.map((estagio) => ({
        id_empresa: novaEmpresa.id,
        nome: estagio.nome,
        tipo: estagio.tipo,
        ordem: estagio.ordem,
      })),
    });

    return novaEmpresa;
  });

  const token = await criarTokenSessao({
    id_usuario: empresa.id,
    id_empresa: empresa.id,
    perfil: "EMPRESA",
    id_pdv: null,
  });

  const resposta = NextResponse.json({ ok: true });
  definirCookieSessao(resposta, token);
  return resposta;
}
