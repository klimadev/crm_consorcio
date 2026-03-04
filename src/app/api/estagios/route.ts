import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { garantirEstagiosFixosEmpresa } from "@/lib/estagios-fixos";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  await garantirEstagiosFixosEmpresa(auth.sessao.id_empresa);

  const estagios = await prisma.estagioFunil.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json({ estagios });
}
