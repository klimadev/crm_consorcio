import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";
import { criarContextoPreviewWhatsapp, renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = (await request.json().catch(() => ({}))) as {
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
    return NextResponse.json({ erro: "Mensagem obrigatoria." }, { status: 400 });
  }

  const preview = renderizarTemplateWhatsapp(
    mensagem,
    criarContextoPreviewWhatsapp(body.contexto),
  );

  return NextResponse.json({ preview });
}
