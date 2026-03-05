import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarRecursoNoPdv, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaCriarLead, mensagemErroValidacao } from "@/lib/validacoes";
import { garantirEstagiosFixosEmpresa } from "@/lib/estagios-fixos";
import { badRequest, forbidden } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";


export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  await garantirEstagiosFixosEmpresa(auth.sessao.id_empresa);

  const whereLeads = await whereLeadsPorPerfil(auth.sessao);

  const [estagios, leads, funcionarios] = await Promise.all([
    prisma.estagioFunil.findMany({
      where: { id_empresa: auth.sessao.id_empresa },
      orderBy: { ordem: "asc" },
    }),
    prisma.lead.findMany({
      where: whereLeads,
      orderBy: { atualizado_em: "desc" },
    }),
    // Filter employees by PDV for GERENTE
    prisma.funcionario.findMany({
      where: auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
        ? { id_empresa: auth.sessao.id_empresa, ativo: true, id_pdv: auth.sessao.id_pdv }
        : { id_empresa: auth.sessao.id_empresa, ativo: true },
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
    return badRequest(mensagemErroValidacao(validacao.error));
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
    return badRequest("Estagio ou funcionario invalido.");
  }

  if (!podeGerenciarRecursoNoPdv(auth.sessao, funcionario.id_pdv)) {
    return forbidden("Sem permissao para atribuir lead a este colaborador.");
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        id_empresa: auth.sessao.id_empresa,
        id_estagio: dadosValidados.id_estagio,
        id_funcionario: dadosValidados.id_funcionario,
        nome: dadosValidados.nome,
        telefone: dadosValidados.telefone,
        valor_consorcio: dadosValidados.valor_consorcio,
        origem: "MANUAL",
      },
    });

    return NextResponse.json({ lead });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao criar lead.", "Erro ao criar lead:");
  }
}
