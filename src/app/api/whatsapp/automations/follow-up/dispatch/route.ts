import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";
import { processarAgendamentosFollowUpWhatsapp } from "@/lib/whatsapp-automations";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = (await request.json().catch(() => ({}))) as {
    limite?: number;
  };

  const limiteBruto = typeof body.limite === "number" ? body.limite : 50;
  const limite = Math.max(1, Math.min(200, Math.trunc(limiteBruto)));

  const resultado = await processarAgendamentosFollowUpWhatsapp({
    limite,
    idEmpresa: auth.sessao.id_empresa,
    origem: "manual-crm",
  });

  return NextResponse.json({ ok: true, ...resultado });
}
