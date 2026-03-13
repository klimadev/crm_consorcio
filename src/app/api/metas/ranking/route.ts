import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { calcularRankingMetas } from "@/lib/metas";
import { validateQuery } from "@/lib/api/route-validation";
import { schemaRankingMetas } from "@/lib/validacoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const validacao = validateQuery(schemaRankingMetas, {
    periodo: request.nextUrl.searchParams.get("periodo") ?? undefined,
    id_pdv: request.nextUrl.searchParams.get("id_pdv") ?? undefined,
  });

  if (!validacao.ok) {
    return validacao.response;
  }

  const filtros = validacao.data;
  let idPdvAlvo = filtros.id_pdv;

  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv) {
      return respostaSemPermissao();
    }

    if (idPdvAlvo && idPdvAlvo !== auth.sessao.id_pdv) {
      return respostaSemPermissao();
    }

    idPdvAlvo = auth.sessao.id_pdv;
  }

  if (auth.sessao.perfil === "COLABORADOR") {
    if (!auth.sessao.id_pdv) {
      return NextResponse.json({ ranking: [], media_equipe: 0, total_participantes: 0 });
    }

    idPdvAlvo = auth.sessao.id_pdv;
  }

  const resultado = await calcularRankingMetas({
    id_empresa: auth.sessao.id_empresa,
    id_pdv: idPdvAlvo,
    periodo: filtros.periodo,
  });

  return NextResponse.json(resultado);
}
