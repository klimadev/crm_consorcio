import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  podeExecutarAcoesEmLote,
  podeGerenciarEmpresa,
  podeVerEquipe,
  respostaSemPermissao,
} from "@/lib/permissoes";
import {
  mensagemErroValidacao,
  normalizarBuscaFuncionarios,
  schemaAcaoLoteFuncionarios,
  schemaListarFuncionarios,
} from "@/lib/validacoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const params = request.nextUrl.searchParams;
  const validacaoQuery = schemaListarFuncionarios.safeParse({
    busca: params.get("busca") ?? undefined,
    status: (params.get("status") ?? "TODOS").toUpperCase(),
    cargo: (params.get("cargo") ?? "TODOS").toUpperCase(),
    id_pdv: params.get("id_pdv") ?? undefined,
    ordenar_por: params.get("ordenar_por") ?? undefined,
    direcao: params.get("direcao") ?? undefined,
    pagina: params.get("pagina") ?? undefined,
    por_pagina: params.get("por_pagina") ?? undefined,
  });

  if (!validacaoQuery.success) {
    return NextResponse.json({ erro: "Parametros de busca invalidos." }, { status: 400 });
  }

  const filtros = validacaoQuery.data;
  const busca = normalizarBuscaFuncionarios(filtros.busca);

  const whereBase = {
    id_empresa: auth.sessao.id_empresa,
    ...(filtros.cargo !== "TODOS" ? { cargo: filtros.cargo } : {}),
    ...(filtros.id_pdv ? { id_pdv: filtros.id_pdv } : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca } },
            { email: { contains: busca } },
            { cargo: { contains: busca } },
            { pdv: { nome: { contains: busca } } },
          ],
        }
      : {}),
  };

  const where = {
    ...whereBase,
    ...(filtros.status !== "TODOS" ? { ativo: filtros.status === "ATIVO" } : {}),
  };

  const orderByMap = {
    nome: { nome: filtros.direcao },
    email: { email: filtros.direcao },
    cargo: { cargo: filtros.direcao },
    criado_em: { criado_em: filtros.direcao },
  } as const;

  const orderBy = orderByMap[filtros.ordenar_por];
  const skip = (filtros.pagina - 1) * filtros.por_pagina;

  const [total, funcionarios, ativos, inativos, gerentes, colaboradores] = await Promise.all([
    prisma.funcionario.count({ where }),
    prisma.funcionario.findMany({
      where,
      orderBy,
      skip,
      take: filtros.por_pagina,
      include: {
        pdv: { select: { id: true, nome: true } },
      },
    }),
    prisma.funcionario.count({ where: { ...whereBase, ativo: true } }),
    prisma.funcionario.count({ where: { ...whereBase, ativo: false } }),
    prisma.funcionario.count({ where: { ...whereBase, cargo: "GERENTE" } }),
    prisma.funcionario.count({ where: { ...whereBase, cargo: "COLABORADOR" } }),
  ]);

  return NextResponse.json({
    funcionarios,
    paginacao: {
      pagina: filtros.pagina,
      por_pagina: filtros.por_pagina,
      total,
      total_paginas: Math.max(1, Math.ceil(total / filtros.por_pagina)),
    },
    kpis: {
      total: ativos + inativos,
      ativos,
      inativos,
      gerentes,
      colaboradores,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
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

export async function PATCH(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeExecutarAcoesEmLote(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = await request.json();
  const validacao = schemaAcaoLoteFuncionarios.safeParse(body);

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const payload = validacao.data;
  const ids = [...new Set(payload.ids)];

  if (payload.acao === "ALTERAR_CARGO" && !payload.cargo) {
    return NextResponse.json({ erro: "Cargo obrigatorio para esta acao." }, { status: 400 });
  }

  if (payload.acao === "ALTERAR_PDV" && !payload.id_pdv) {
    return NextResponse.json({ erro: "PDV obrigatorio para esta acao." }, { status: 400 });
  }

  if (payload.acao === "INATIVAR" && !payload.id_funcionario_destino) {
    return NextResponse.json({ erro: "Destino obrigatorio para inativacao em lote." }, { status: 400 });
  }

  if (payload.id_pdv) {
    const pdvExiste = await prisma.pdv.findFirst({
      where: { id: payload.id_pdv, id_empresa: auth.sessao.id_empresa },
      select: { id: true },
    });

    if (!pdvExiste) {
      return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
    }
  }

  const destinoInativacao = payload.id_funcionario_destino
    ? await prisma.funcionario.findFirst({
        where: {
          id: payload.id_funcionario_destino,
          id_empresa: auth.sessao.id_empresa,
          ativo: true,
        },
        select: { id: true, nome: true },
      })
    : null;

  if (payload.acao === "INATIVAR" && !destinoInativacao) {
    return NextResponse.json({ erro: "Destino invalido para reatribuicao." }, { status: 400 });
  }

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      id: { in: ids },
    },
    select: {
      id: true,
      nome: true,
      cargo: true,
      id_pdv: true,
      ativo: true,
    },
  });

  const funcionarioPorId = new Map(funcionarios.map((item) => [item.id, item]));
  const resultado = {
    processados: ids.length,
    atualizados: 0,
    falhas: [] as Array<{ id: string; motivo: string }>,
  };

  for (const id of ids) {
    const atual = funcionarioPorId.get(id);

    if (!atual) {
      resultado.falhas.push({ id, motivo: "Funcionario nao encontrado." });
      continue;
    }

    if (payload.acao === "INATIVAR" && payload.id_funcionario_destino === id) {
      resultado.falhas.push({ id, motivo: "Destino deve ser diferente do colaborador de origem." });
      continue;
    }

    try {
      if (payload.acao === "ATIVAR") {
        await prisma.funcionario.update({
          where: { id: atual.id },
          data: { ativo: true, inativado_em: null },
        });

        await prisma.auditoriaEquipe.create({
          data: {
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: atual.id,
            acao: "ATIVAR_FUNCIONARIO",
            valor_anterior: atual.ativo ? "ATIVO" : "INATIVO",
            valor_novo: "ATIVO",
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          },
        });

        resultado.atualizados += 1;
        continue;
      }

      if (payload.acao === "ALTERAR_CARGO" && payload.cargo) {
        await prisma.funcionario.update({
          where: { id: atual.id },
          data: { cargo: payload.cargo },
        });

        await prisma.auditoriaEquipe.create({
          data: {
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: atual.id,
            acao: "ATUALIZAR_CARGO_FUNCIONARIO",
            campo: "cargo",
            valor_anterior: atual.cargo,
            valor_novo: payload.cargo,
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          },
        });

        resultado.atualizados += 1;
        continue;
      }

      if (payload.acao === "ALTERAR_PDV" && payload.id_pdv) {
        await prisma.funcionario.update({
          where: { id: atual.id },
          data: { id_pdv: payload.id_pdv },
        });

        await prisma.auditoriaEquipe.create({
          data: {
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: atual.id,
            acao: "ATUALIZAR_PDV_FUNCIONARIO",
            campo: "id_pdv",
            valor_anterior: atual.id_pdv,
            valor_novo: payload.id_pdv,
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          },
        });

        resultado.atualizados += 1;
        continue;
      }

      if (payload.acao === "INATIVAR" && payload.id_funcionario_destino && destinoInativacao) {
        const quantidadeLeads = await prisma.lead.count({
          where: { id_empresa: auth.sessao.id_empresa, id_funcionario: atual.id },
        });

        await prisma.$transaction(async (tx) => {
          await tx.lead.updateMany({
            where: { id_empresa: auth.sessao.id_empresa, id_funcionario: atual.id },
            data: { id_funcionario: payload.id_funcionario_destino },
          });

          await tx.funcionario.update({
            where: { id: atual.id },
            data: { ativo: false, inativado_em: new Date() },
          });

          await tx.reatribuicaoFuncionario.create({
            data: {
              id_empresa: auth.sessao.id_empresa,
              id_funcionario_origem: atual.id,
              id_funcionario_destino: destinoInativacao.id,
              quantidade_leads: quantidadeLeads,
              observacao: payload.observacao,
              criado_por_tipo: auth.sessao.perfil,
              criado_por_id: auth.sessao.id_usuario,
            },
          });

          await tx.auditoriaEquipe.createMany({
            data: [
              {
                id_empresa: auth.sessao.id_empresa,
                id_funcionario_alvo: atual.id,
                acao: "INATIVAR_FUNCIONARIO",
                valor_anterior: atual.ativo ? "ATIVO" : "INATIVO",
                valor_novo: "INATIVO",
                observacao: payload.observacao,
                autor_tipo: auth.sessao.perfil,
                autor_id: auth.sessao.id_usuario,
              },
              {
                id_empresa: auth.sessao.id_empresa,
                id_funcionario_alvo: atual.id,
                acao: "REATRIBUIR_LEADS_FUNCIONARIO",
                valor_anterior: atual.nome,
                valor_novo: destinoInativacao.nome,
                observacao: `Leads reatribuidos: ${quantidadeLeads}`,
                autor_tipo: auth.sessao.perfil,
                autor_id: auth.sessao.id_usuario,
              },
            ],
          });
        });

        resultado.atualizados += 1;
        continue;
      }

      resultado.falhas.push({ id, motivo: "Acao nao suportada para o item." });
    } catch {
      resultado.falhas.push({ id, motivo: "Erro ao processar colaborador." });
    }
  }

  return NextResponse.json({
    ok: resultado.falhas.length === 0,
    ...resultado,
  });
}
