import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { parseJson } from "@/lib/api/route-validation";
import { ok, badRequest, notFound } from "@/lib/api/http";

export async function POST(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const { jobId } = parseResult.data as { jobId?: string };

    if (!jobId) {
      return badRequest("ID do job é obrigatório");
    }

    const job = await prisma.whatsappAutomacaoAgendamento.findFirst({
      where: {
        id: jobId,
        id_empresa: sessao.id_empresa,
      },
    });

    if (!job) {
      return notFound("Job não encontrado");
    }

    if (job.status !== "FALHA") {
      return badRequest("Apenas jobs com falha podem ser retentados");
    }

    const atualizado = await prisma.whatsappAutomacaoAgendamento.update({
      where: { id: jobId },
      data: {
        status: "PENDENTE",
        agendado_para: new Date(),
      },
    });

    return ok({ sucesso: true, job: atualizado });
  });
}
