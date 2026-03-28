import { NextRequest, NextResponse } from "next/server";
import {
  exigirSessao,
  podeGerenciarMetaDoPdv,
  respostaSemPermissao,
} from "@/lib/permissoes";
import { type MetaPayload, validarMeta } from "@/lib/metas";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { schemaValidarTetoMeta } from "@/lib/validacoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(schemaValidarTetoMeta, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const { id_meta_atual, ...restante } = validacao.data;
  const payload = restante as MetaPayload;

  if (payload.tipo !== "PDV" || !payload.id_pdv || !podeGerenciarMetaDoPdv(auth.sessao, payload.id_pdv)) {
    return respostaSemPermissao();
  }

  const resultado = await validarMeta({
    id_empresa: auth.sessao.id_empresa,
    payload,
    id_meta_atual: id_meta_atual || undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, erro: resultado.erro, teto: null });
  }

  return NextResponse.json({ ok: true, teto: resultado.teto ?? null });
}
