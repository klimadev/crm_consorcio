import { NextRequest, NextResponse } from "next/server";
import { sincronizarLeadsWhatsapp } from "@/lib/leads-sync-whatsapp";
import { exigirSessao } from "@/lib/permissoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const resultado = await sincronizarLeadsWhatsapp({
    tipo: "sessao",
    sessao: auth.sessao,
  });

  return NextResponse.json(resultado);
}
