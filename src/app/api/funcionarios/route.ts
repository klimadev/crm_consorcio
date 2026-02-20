import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe } from "@/lib/permissoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeVerEquipe(auth.sessao)) {
    return NextResponse.json({ erro: "Sem permissao." }, { status: 403 });
  }

  const funcionarios = await prisma.funcionario.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: { criado_em: "desc" },
    include: {
      pdv: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json({ funcionarios });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeVerEquipe(auth.sessao)) {
    return NextResponse.json({ erro: "Sem permissao." }, { status: 403 });
  }

  const body = (await request.json()) as {
    nome?: string;
    email?: string;
    senha?: string;
    cargo?: string;
    id_pdv?: string;
  };

  const nome = body.nome?.trim();
  const email = body.email?.trim().toLowerCase();
  const senha = body.senha;
  const cargo = body.cargo;
  const id_pdv = body.id_pdv;

  if (!nome || !email || !senha || !cargo || !id_pdv) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }

  if (!["COLABORADOR", "GERENTE"].includes(cargo)) {
    return NextResponse.json({ erro: "Cargo invalido." }, { status: 400 });
  }

  const pdv = await prisma.pdv.findFirst({
    where: { id: id_pdv, id_empresa: auth.sessao.id_empresa },
  });

  if (!pdv) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const funcionario = await prisma.funcionario.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      id_pdv,
      nome,
      email,
      senha_hash,
      cargo,
    },
  });

  return NextResponse.json({ funcionario });
}
