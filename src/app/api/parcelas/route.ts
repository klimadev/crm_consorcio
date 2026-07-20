import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaGerarParcelas } from "@/lib/validacoes";
import { badRequest, conflict, notFound } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { inicioDoDia } from "@/lib/financeiro/parcelas";

type TabParcelas = "proximos" | "atrasados" | "recebidos";

function gerarDatasVencimento(dataInicial: Date, quantidade: number): Date[] {
  const datas: Date[] = [];
  const diaOriginal = dataInicial.getDate();

  for (let i = 0; i < quantidade; i += 1) {
    const data = new Date(dataInicial);
    data.setDate(1);
    data.setMonth(data.getMonth() + i);

    const ultimoDiaDoMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
    data.setDate(Math.min(diaOriginal, ultimoDiaDoMes));
    datas.push(data);
  }

  return datas;
}

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { searchParams } = new URL(request.url);
  const idLead = searchParams.get("id_lead")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || undefined;
  const tab = (searchParams.get("tab")?.trim() as TabParcelas | null) ?? null;
  const limit = Number(searchParams.get("limit") ?? "50");
  const hoje = inicioDoDia();

  const whereBase = {
    id_empresa: auth.sessao.id_empresa,
    ...(idLead ? { id_lead: idLead } : {}),
  };

  if (tab && auth.sessao.perfil !== "EMPRESA") {
    return respostaSemPermissao();
  }

  if (idLead) {
    const whereLeadPermitido = await whereLeadsPorPerfil(auth.sessao);
    const leadPermitido = await prisma.lead.findFirst({
      where: { id: idLead, ...whereLeadPermitido },
      select: { id: true },
    });

    if (!leadPermitido) {
      return notFound("Lead nao encontrado.");
    }
  }

  let parcelas = await prisma.parcela.findMany({
    where:
      tab === "proximos"
        ? { ...whereBase, status: "PENDENTE", data_pagamento: null, data_vencimento: { gte: hoje } }
        : tab === "atrasados"
          ? { ...whereBase, status: "PENDENTE", data_pagamento: null, data_vencimento: { lt: hoje } }
          : tab === "recebidos"
            ? { ...whereBase, status: "PAGO" }
            : status
              ? { ...whereBase, status }
              : whereBase,
    include: {
      lead: {
        select: { id: true, nome: true, telefone: true, valor_consorcio: true },
      },
    },
    orderBy:
      tab === "recebidos"
        ? [{ data_pagamento: "desc" }, { data_vencimento: "desc" }]
        : [{ data_vencimento: "asc" }],
    take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 50,
  });

  parcelas = parcelas.map((parcela) => {
    if (parcela.status === "PAGO") return parcela;
    const vencimento = inicioDoDia(parcela.data_vencimento);
    if (vencimento < hoje && !parcela.data_pagamento) {
      return { ...parcela, status: "ATRASADO" };
    }
    return parcela;
  });

  return NextResponse.json({ parcelas });
}

export async function DELETE(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { searchParams } = new URL(request.url);
  const idLead = searchParams.get("id_lead")?.trim() || null;

  if (!idLead) {
    return badRequest("ID do lead e obrigatorio.");
  }

  // Verificar se o lead existe e se tem permissão
  const lead = await prisma.lead.findFirst({
    where: { id: idLead, ...(await whereLeadsPorPerfil(auth.sessao)) },
    select: { id: true },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  // Apenas EMPRESA e GERENTE podem excluir
  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const forcar = searchParams.get("forcar") === "true";

  if (forcar) {
    const resultado = await prisma.parcela.deleteMany({
      where: { id_lead: idLead },
    });

    return NextResponse.json({ ok: true, excluidas: resultado.count, preservadas_pagas: 0 });
  }

  const parcelasPagas = await prisma.parcela.count({
    where: {
      id_lead: idLead,
      OR: [{ status: "PAGO" }, { data_pagamento: { not: null } }],
    },
  });

  const resultado = await prisma.parcela.deleteMany({
    where:
      parcelasPagas > 0
        ? { id_lead: idLead, status: { not: "PAGO" }, data_pagamento: null }
        : { id_lead: idLead },
  });

  return NextResponse.json({ ok: true, excluidas: resultado.count, preservadas_pagas: parcelasPagas });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaGerarParcelas, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const dados = validacao.data;
  const primeiroVencimento = new Date(dados.data_primeiro_vencimento);

  const lead = await prisma.lead.findFirst({
    where: { id: dados.id_lead, ...(await whereLeadsPorPerfil(auth.sessao)) },
    select: { id: true },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const [parcelasExistentes, parcelasPendentes, maiorNumeroParcela] = await Promise.all([
    prisma.parcela.count({
      where: { id_empresa: auth.sessao.id_empresa, id_lead: dados.id_lead },
    }),
    prisma.parcela.count({
      where: { id_empresa: auth.sessao.id_empresa, id_lead: dados.id_lead, data_pagamento: null },
    }),
    prisma.parcela.aggregate({
      where: { id_empresa: auth.sessao.id_empresa, id_lead: dados.id_lead },
      _max: { numero_parcela: true },
    }),
  ]);

  if (parcelasPendentes > 0) {
    return conflict("Este lead ja possui parcelas pendentes cadastradas. Edite ou remova as pendentes antes de gerar um novo plano.");
  }

  const quantidadeTotalPlano = parcelasExistentes + dados.quantidade_parcelas;
  const proximoNumeroParcela = (maiorNumeroParcela._max.numero_parcela ?? 0) + 1;
  const datas = gerarDatasVencimento(primeiroVencimento, dados.quantidade_parcelas);
  const parcelasParaCriar = datas.map((dataVencimento, indice) => ({
    id_empresa: auth.sessao.id_empresa,
    id_lead: dados.id_lead,
    numero_parcela: proximoNumeroParcela + indice,
    quantidade_total: quantidadeTotalPlano,
    valor: dados.valor_parcela,
    data_vencimento: dataVencimento,
    status: "PENDENTE",
  }));

  await prisma.$transaction(async (tx) => {
    if (parcelasExistentes > 0) {
      await tx.parcela.updateMany({
        where: { id_empresa: auth.sessao.id_empresa, id_lead: dados.id_lead },
        data: { quantidade_total: quantidadeTotalPlano },
      });
    }

    await tx.parcela.createMany({ data: parcelasParaCriar });
  });

  return NextResponse.json({ ok: true, parcelas_criadas: parcelasParaCriar.length }, { status: 201 });
}
