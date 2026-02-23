import { NextRequest, NextResponse } from "next/server";
import { obterSessaoNaRequest } from "@/lib/autenticacao";
import { SessaoToken } from "@/lib/tipos";
import { prisma } from "@/lib/prisma";

export async function exigirSessao(request: NextRequest): Promise<
  | { sessao: SessaoToken; erro: null }
  | { sessao: null; erro: NextResponse<{ erro: string }> }
> {
  const sessao = await obterSessaoNaRequest(request);
  if (!sessao) {
    return {
      sessao: null,
      erro: NextResponse.json({ erro: "Nao autenticado." }, { status: 401 }),
    };
  }

  return { sessao, erro: null };
}

export function podeGerenciarEmpresa(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA";
}

export function podeVerEquipe(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}

export function podeEditarEquipe(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}

export function podeInativarComReatribuicao(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}

export function podeExecutarAcoesEmLote(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA";
}

export function podeVerAuditoriaEquipe(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}

export function respostaSemPermissao() {
  return NextResponse.json({ erro: "Sem permissao." }, { status: 403 });
}

export async function whereLeadsPorPerfil(sessao: SessaoToken) {
  // COLABORADOR: only sees leads where they are the responsible
  if (sessao.perfil === "COLABORADOR") {
    return {
      id_empresa: sessao.id_empresa,
      id_funcionario: sessao.id_usuario,
    };
  }

  // GERENTE: sees leads from their PDV only
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    const funcionariosDoPdv = await prisma.funcionario.findMany({
      where: { id_pdv: sessao.id_pdv },
      select: { id: true },
    });
    const idsFuncionarios = funcionariosDoPdv.map((f) => f.id);

    return {
      id_empresa: sessao.id_empresa,
      id_funcionario: { in: idsFuncionarios },
    };
  }

  // EMPRESA: sees all company leads
  return { id_empresa: sessao.id_empresa };
}
