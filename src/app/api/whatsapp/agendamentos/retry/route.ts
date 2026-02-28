import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = await request.json();
  const { jobId } = body;

  if (!jobId) {
    return NextResponse.json({ erro: "ID do job é obrigatório" }, { status: 400 });
  }

  const job = await prisma.whatsappAutomacaoAgendamento.findFirst({
    where: {
      id: jobId,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!job) {
    return NextResponse.json({ erro: "Job não encontrado" }, { status: 404 });
  }

  if (job.status !== "FALHA") {
    return NextResponse.json({ erro: "Apenas jobs com falha podem ser retentados" }, { status: 400 });
  }

  const atualizado = await prisma.whatsappAutomacaoAgendamento.update({
    where: { id: jobId },
    data: {
      status: "PENDENTE",
      agendado_para: new Date(),
    },
  });

  return NextResponse.json({ sucesso: true, job: atualizado });
}
