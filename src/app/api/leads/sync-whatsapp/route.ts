import { NextRequest, NextResponse } from "next/server";
import { sincronizarLeadsWhatsapp } from "@/lib/leads-sync-whatsapp";
import { exigirSessao } from "@/lib/permissoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  // Extrair parâmetro de filtro de origem (anuncio | all)
  const { searchParams } = new URL(request.url);
  const origemFiltro = searchParams.get("origem") as "anuncio" | "all" | null;

  const resultado = await sincronizarLeadsWhatsapp({
    tipo: "sessao",
    sessao: auth.sessao,
  }, origemFiltro);

  // Incluir timestamp da sincronização
  return NextResponse.json({
    ...resultado,
    timestamp_sync: new Date().toISOString(),
  });
}
