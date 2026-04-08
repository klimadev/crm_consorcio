import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaAtualizarLead } from "@/lib/validacoes";
import { badRequest, forbidden, notFound } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";


type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const whereLeads = await whereLeadsPorPerfil(auth.sessao);

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      ...whereLeads,
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      origem: true,
      anuncio_titulo: true,
      anuncio_descricao: true,
      observacoes: true,
      valor_consorcio: true,
      estagio: { select: { id: true, nome: true } },
      funcionario: {
        select: {
          id: true,
          nome: true,
          id_pdv: true,
          pdv: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      parcelas: {
        select: { id: true, numero_parcela: true, valor: true, data_vencimento: true, status: true },
        orderBy: { numero_parcela: "asc" },
      },
    },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  // Buscar TODOS os gestores do PDV (funcionarios com cargo GERENTE)
  let gestores: Array<{ nome: string }> = [];
  if (lead.funcionario.id_pdv) {
    gestores = await prisma.funcionario.findMany({
      where: {
        id_pdv: lead.funcionario.id_pdv,
        cargo: "GERENTE",
        ativo: true,
      },
      select: { nome: true },
      orderBy: { nome: "asc" },
    });
  }

  return NextResponse.json({
    ...lead,
    id_pdv: lead.funcionario.id_pdv,
    pdv: lead.funcionario.pdv,
    gestores,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(esquemaAtualizarLead, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const dadosValidados = validacao.data;
  const whereLeads = await whereLeadsPorPerfil(auth.sessao);

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      ...whereLeads,
    },
    include: {
      funcionario: {
        select: {
          id_pdv: true,
          pdv: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode editar leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  let idFuncionarioDestino = dadosValidados.id_funcionario;

  if (auth.sessao.perfil === "COLABORADOR") {
    idFuncionarioDestino = auth.sessao.id_usuario;
  }

  if (idFuncionarioDestino && idFuncionarioDestino !== lead.id_funcionario) {
    const funcionarioDestino = await prisma.funcionario.findFirst({
      where: {
        id: idFuncionarioDestino,
        id_empresa: auth.sessao.id_empresa,
        ativo: true,
      },
      select: { id: true, id_pdv: true },
    });

    if (!funcionarioDestino) {
      return badRequest("Funcionario invalido.");
    }

    if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv && funcionarioDestino.id_pdv !== auth.sessao.id_pdv) {
      return forbidden("Voce só pode transferir para funcionarios do seu PDV.");
    }
  }

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: dadosValidados.observacoes,
      telefone: dadosValidados.telefone,
      valor_consorcio: dadosValidados.valor_consorcio,
      motivo_perda: dadosValidados.motivo_perda,
      documento_aprovacao_url: dadosValidados.documento_aprovacao_url,
      id_funcionario: idFuncionarioDestino,
    },
    include: {
      funcionario: {
        select: {
          id_pdv: true,
          pdv: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    lead: {
      ...atualizado,
      id_pdv: atualizado.funcionario.id_pdv,
      pdv: atualizado.funcionario.pdv,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const whereLeads = await whereLeadsPorPerfil(auth.sessao);

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      ...whereLeads,
    },
    include: { funcionario: { select: { id_pdv: true } } },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return forbidden("Voce só pode excluir leads do seu PDV.");
    }
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return NextResponse.json({ sucesso: true });
}
