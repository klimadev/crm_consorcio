import { NextRequest, NextResponse } from "next/server";
import { obterSessaoNaRequest } from "@/lib/autenticacao";
import { SessaoToken } from "@/lib/tipos";

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

export function whereLeadsPorPerfil(sessao: SessaoToken) {
  if (sessao.perfil === "COLABORADOR") {
    return {
      id_empresa: sessao.id_empresa,
      id_funcionario: sessao.id_usuario,
    };
  }

  return { id_empresa: sessao.id_empresa };
}
