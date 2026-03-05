import { NextRequest } from "next/server";
import { withPerfis } from "@/lib/api/route-guards";
import { parseJson } from "@/lib/api/route-validation";
import { ok, badRequest } from "@/lib/api/http";
import { criarContextoPreviewWhatsapp, renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";

export async function POST(request: NextRequest) {
  return withPerfis(request, ["EMPRESA"], async () => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const body = parseResult.data as {
      mensagem?: string;
      contexto?: {
        lead_nome?: string;
        lead_telefone?: string;
        lead_id?: string;
        estagio_anterior?: string;
        estagio_novo?: string;
      };
    };

    const mensagem = body.mensagem?.trim() ?? "";
    if (!mensagem) {
      return badRequest("Mensagem obrigatoria.");
    }

    const preview = renderizarTemplateWhatsapp(
      mensagem,
      criarContextoPreviewWhatsapp(body.contexto),
    );

    return ok({ preview });
  });
}
