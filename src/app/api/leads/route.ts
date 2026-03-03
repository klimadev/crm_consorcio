import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaCriarLead, mensagemErroValidacao } from "@/lib/validacoes";


export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

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
    id_whatsapp_instancia?: string | null;
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
    id_whatsapp_instancia: body.id_whatsapp_instancia ?? null,
  });

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dadosValidados = validacao.data;

  const idWhatsappInstancia = dadosValidados.id_whatsapp_instancia ?? null;
  if (idWhatsappInstancia && auth.sessao.perfil !== "EMPRESA" && auth.sessao.perfil !== "GERENTE") {
    return NextResponse.json({ erro: "Apenas a empresa ou gerente pode definir a instancia do lead." }, { status: 403 });
  }

  const [estagio, funcionario, instancia] = await Promise.all([
    prisma.estagioFunil.findFirst({
      where: { id: dadosValidados.id_estagio, id_empresa: auth.sessao.id_empresa },
    }),
    prisma.funcionario.findFirst({
      where: { id: dadosValidados.id_funcionario, id_empresa: auth.sessao.id_empresa, ativo: true },
    }),
    idWhatsappInstancia
      ? prisma.whatsappInstancia.findFirst({
          where: { id: idWhatsappInstancia, id_empresa: auth.sessao.id_empresa },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!estagio || !funcionario) {
    return NextResponse.json({ erro: "Estagio ou funcionario invalido." }, { status: 400 });
  }

  if (idWhatsappInstancia && !instancia) {
    return NextResponse.json({ erro: "Instancia WhatsApp invalida para a empresa." }, { status: 400 });
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
          id_whatsapp_instancia: idWhatsappInstancia,
        },
      });

    return NextResponse.json({ lead });
  } catch (erro) {
    console.error("Erro ao criar lead:", erro);
    return NextResponse.json({ erro: "Erro ao criar lead." }, { status: 500 });
  }
}
