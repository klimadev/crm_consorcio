import { NextRequest, NextResponse } from "next/server";
import { obterSessaoNaRequest } from "@/lib/autenticacao";
import { SessaoToken } from "@/lib/tipos";

export async function exigeSessao(request: NextRequest): Promise<
  | { sessao: SessaoToken; erro: null }
  | { sessao: null; erro: NextResponse<{ erro: string }> }
> {
  const sessao = await obterSessaoNaRequest(request);
  if (!sessao) {
    return {
      sessao: null,
      erro: NextResponse.json({ erro: "Não autenticado." }, { status: 401 }),
    };
  }

  return { sessao, erro: null };
}

export function wherePendenciasPorPerfil(sessao: SessaoToken) {
  if (sessao.perfil === "COLABORADOR") {
    // Colaborador vê apenas pendências dos seus próprios leads
    return {
      id_empresa: sessao.id_empresa,
      lead: {
        id_funcionario: sessao.id_usuario,
      },
    };
  }

  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    // Gerente vê pendências dos funcionários dos seus PDVs
    return {
      id_empresa: sessao.id_empresa,
      lead: {
        funcionario: {
          id_pdv: sessao.id_pdv,
        },
      },
    };
  }

  // EMPRESA vê todas
  return { id_empresa: sessao.id_empresa };
}
