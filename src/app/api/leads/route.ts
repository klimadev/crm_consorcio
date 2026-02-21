import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaCriarLead, mensagemErroValidacao } from "@/lib/validacoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const whereLeads = whereLeadsPorPerfil(auth.sessao);

  const [estagios, leads, funcionarios] = await Promise.all([
    prisma.estagioFunil.findMany({
      where: { id_empresa: auth.sessao.id_empresa },
      orderBy: { ordem: "asc" },
    }),
    prisma.lead.findMany({
      where: whereLeads,
      orderBy: { atualizado_em: "desc" },
    }),
    prisma.funcionario.findMany({
      where: { id_empresa: auth.sessao.id_empresa, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return NextResponse.json({ estagios, leads, funcionarios });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = (await request.json()) as {
    nome?: string;
    telefone?: string;
    valor_consorcio?: number;
    id_estagio?: string;
    id_funcionario?: string;
  };

  const nome = body.nome?.trim();
  const telefone = body.telefone?.trim();
  const valor_consorcio = Number(body.valor_consorcio ?? 0);
  const id_estagio = body.id_estagio;

  const id_funcionario =
    auth.sessao.perfil === "COLABORADOR" ? auth.sessao.id_usuario : body.id_funcionario;

  const validacao = esquemaCriarLead.safeParse({
    nome,
    telefone,
    valor_consorcio,
    id_estagio,
    id_funcionario,
  });

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dadosValidados = validacao.data;

  const [estagio, funcionario] = await Promise.all([
    prisma.estagioFunil.findFirst({
      where: { id: dadosValidados.id_estagio, id_empresa: auth.sessao.id_empresa },
    }),
    prisma.funcionario.findFirst({
      where: { id: dadosValidados.id_funcionario, id_empresa: auth.sessao.id_empresa, ativo: true },
    }),
  ]);

  if (!estagio || !funcionario) {
    return NextResponse.json({ erro: "Estagio ou funcionario invalido." }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      id_estagio: dadosValidados.id_estagio,
      id_funcionario: dadosValidados.id_funcionario,
      nome: dadosValidados.nome,
      telefone: dadosValidados.telefone,
      valor_consorcio: dadosValidados.valor_consorcio,
    },
  });

  return NextResponse.json({ lead });
}
