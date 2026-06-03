import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";
import { esquemaCriarPdv } from "@/lib/validacoes";
import { badRequest, forbidden } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody } from "@/lib/api/route-validation";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  // GERENTE só vê seu próprio PDV
  const idPdvGerente = auth.sessao.perfil === "GERENTE" ? auth.sessao.id_pdv : null;
  if (auth.sessao.perfil === "GERENTE" && !idPdvGerente) {
    return NextResponse.json({ pdvs: [] });
  }

  const pdvs = await prisma.pdv.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ...(idPdvGerente ? { id: idPdvGerente } : {}),
    },
    select: {
      id: true,
      nome: true,
      id_whatsapp_instancia: true,
      whatsapp_instancia: {
        select: {
          id: true,
          nome: true,
          status: true,
        },
      },
      funcionarios: {
        where: {
          id_empresa: auth.sessao.id_empresa,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true,
        },
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({ pdvs });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return forbidden("Somente EMPRESA pode alterar PDVs.");
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(esquemaCriarPdv, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const { nome, id_whatsapp_instancia } = validacao.data;

  if (id_whatsapp_instancia) {
    const instancia = await prisma.whatsappInstancia.findFirst({
      where: {
        id: id_whatsapp_instancia,
        id_empresa: auth.sessao.id_empresa,
      },
      select: { id: true },
    });

    if (!instancia) {
      return badRequest("Instancia WhatsApp invalida para a empresa.");
    }
  }

  try {
    const pdv = await prisma.pdv.create({
      data: {
        nome,
        id_empresa: auth.sessao.id_empresa,
        id_whatsapp_instancia: id_whatsapp_instancia ?? null,
      },
    });

    return NextResponse.json({ pdv });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao criar PDV.", "Erro ao criar PDV:");
  }
}
