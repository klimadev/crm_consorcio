import { NextRequest } from "next/server";
import { withPerfis } from "@/lib/api/route-guards";
import { parseJson } from "@/lib/api/route-validation";
import { ok } from "@/lib/api/http";
import { processarAgendamentosFollowUpWhatsapp } from "@/lib/whatsapp-automations";

export async function POST(request: NextRequest) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const body = parseResult.data as { limite?: number };

    const limiteBruto = typeof body.limite === "number" ? body.limite : 50;
    const limite = Math.max(1, Math.min(200, Math.trunc(limiteBruto)));

    const resultado = await processarAgendamentosFollowUpWhatsapp({
      limite,
      idEmpresa: sessao.id_empresa,
      origem: "manual-crm",
    });

    return ok({ ok: true, ...resultado });
  });
}
