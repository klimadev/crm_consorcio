import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";

/**
 * Endpoint leve de sincronização para polling de versão.
 * Retorna apenas a versão do kanban (timestamp do lead mais atualizado).
 * O cliente faz polling frequente (a cada 3s) deste endpoint.
 * Se a versão mudou, aí então faz o fetch completo do board.
 */
export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  // Query mínima: só o timestamp do lead mais recente visível para o usuário
  const ultimoLead = await prisma.lead.findFirst({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {
              funcionario: {
                id_pdv: auth.sessao.id_pdv,
              },
            }
          : {}),
    },
    orderBy: { atualizado_em: "desc" },
    select: { atualizado_em: true },
  });

  return NextResponse.json({
    versao: ultimoLead?.atualizado_em ?? null,
  });
}
