import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { ok } from "@/lib/api/http";
import { garantirEstagiosFixosEmpresa } from "@/lib/estagios-fixos";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    await garantirEstagiosFixosEmpresa(sessao.id_empresa);

    const estagios = await prisma.estagioFunil.findMany({
      where: { id_empresa: sessao.id_empresa },
      orderBy: { ordem: "asc" },
    });

    return ok({ estagios });
  });
}
