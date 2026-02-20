import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarTokenSessao, definirCookieSessao } from "@/lib/autenticacao";
import { Perfil } from "@/lib/tipos";

type CorpoLogin = {
  email?: string;
  senha?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CorpoLogin;
  const email = body.email?.trim().toLowerCase();
  const senha = body.senha;

  if (!email || !senha) {
    return NextResponse.json({ erro: "E-mail e senha sao obrigatorios." }, { status: 400 });
  }

  const empresa = await prisma.empresa.findUnique({ where: { email } });

  if (empresa) {
    const senhaCorreta = await bcrypt.compare(senha, empresa.senha_hash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: "Credenciais invalidas." }, { status: 401 });
    }

    const token = await criarTokenSessao({
      id_usuario: empresa.id,
      id_empresa: empresa.id,
      perfil: "EMPRESA",
      id_pdv: null,
    });

    const resposta = NextResponse.json({ ok: true, perfil: "EMPRESA" satisfies Perfil });
    definirCookieSessao(resposta, token);
    return resposta;
  }

  const funcionario = await prisma.funcionario.findUnique({ where: { email } });

  if (!funcionario || !funcionario.ativo) {
    return NextResponse.json({ erro: "Credenciais invalidas." }, { status: 401 });
  }

  const senhaCorreta = await bcrypt.compare(senha, funcionario.senha_hash);
  if (!senhaCorreta) {
    return NextResponse.json({ erro: "Credenciais invalidas." }, { status: 401 });
  }

  const token = await criarTokenSessao({
    id_usuario: funcionario.id,
    id_empresa: funcionario.id_empresa,
    perfil: funcionario.cargo as Perfil,
    id_pdv: funcionario.id_pdv,
  });

  const resposta = NextResponse.json({ ok: true, perfil: funcionario.cargo as Perfil });
  definirCookieSessao(resposta, token);
  return resposta;
}
