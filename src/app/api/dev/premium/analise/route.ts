import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { analisarLeads } from "@/lib/analise-inteligente/engine";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const resultado = await analisarLeads(auth.sessao.id_empresa);

  return NextResponse.json(resultado);
}
