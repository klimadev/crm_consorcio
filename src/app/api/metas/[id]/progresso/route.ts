import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { calcularProgressoMeta, metaInclude, podeVisualizarMeta, prismaMetas, type MetaComRelacionamentos } from "@/lib/metas";
import { notFound } from "@/lib/api/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const meta = (await prismaMetas.meta.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    include: metaInclude,
  })) as MetaComRelacionamentos | null;

  if (!meta) {
    return notFound("Meta nao encontrada.");
  }

  if (!podeVisualizarMeta(auth.sessao, meta)) {
    return respostaSemPermissao();
  }

  const progresso = await calcularProgressoMeta(meta);
  return NextResponse.json(progresso);
}
