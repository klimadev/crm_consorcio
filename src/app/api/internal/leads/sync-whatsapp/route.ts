import { NextRequest, NextResponse } from "next/server";
import { sincronizarLeadsWhatsapp } from "@/lib/leads-sync-whatsapp";

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

  const body = (await request.json().catch(() => ({}))) as { idEmpresa?: string };

  const resultado = await sincronizarLeadsWhatsapp({
    tipo: "interno",
    ...(typeof body.idEmpresa === "string" && body.idEmpresa.trim()
      ? { idEmpresa: body.idEmpresa.trim() }
      : {}),
  });

  return NextResponse.json(resultado);
}
