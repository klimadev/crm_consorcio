import { NextRequest, NextResponse } from "next/server";
import { processarAgendamentosFollowUpWhatsapp } from "@/lib/whatsapp-automations";

function autorizado(request: NextRequest) {
  const token = request.headers.get("x-internal-token")?.trim();
  const esperado = process.env.INTERNAL_AUTOMATION_TOKEN?.trim();

  if (!esperado) {
    return false;
  }

  return token === esperado;
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Nao autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limite?: number;
  };

  const resultado = await processarAgendamentosFollowUpWhatsapp({
    limite: typeof body.limite === "number" ? body.limite : 50,
  });

  return NextResponse.json({ ok: true, ...resultado });
}
