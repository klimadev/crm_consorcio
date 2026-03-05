import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import type { SessaoToken } from "@/lib/tipos";

type HandlerComSessao = (ctx: { sessao: SessaoToken }) => Promise<NextResponse>;

export async function withSessao(request: NextRequest, handler: HandlerComSessao): Promise<NextResponse> {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  return handler({ sessao: auth.sessao });
}

export async function withPerfis(
  request: NextRequest,
  perfis: SessaoToken["perfil"][],
  handler: HandlerComSessao,
): Promise<NextResponse> {
  return withSessao(request, async ({ sessao }) => {
    if (!perfis.includes(sessao.perfil)) {
      return respostaSemPermissao();
    }
    return handler({ sessao });
  });
}
