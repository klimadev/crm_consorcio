import { prisma } from "@/lib/prisma";
import { enviarMensagemTexto } from "@/lib/evolution-api";

const EVENTO_LEAD_ESTAGIO_ALTERADO = "LEAD_STAGE_CHANGED";

type ExecutarAutomacoesLeadStageChangedParams = {
  idEmpresa: string;
  lead: {
    id: string;
    nome: string;
    telefone: string;
  };
  estagioAnterior: {
    id: string;
    nome: string;
  };
  estagioNovo: {
    id: string;
    nome: string;
  };
};

function preencherTemplate(
  template: string,
  payload: ExecutarAutomacoesLeadStageChangedParams,
) {
  return template
    .replaceAll("{{lead_nome}}", payload.lead.nome)
    .replaceAll("{{lead_telefone}}", payload.lead.telefone)
    .replaceAll("{{lead_id}}", payload.lead.id)
    .replaceAll("{{estagio_anterior}}", payload.estagioAnterior.nome)
    .replaceAll("{{estagio_novo}}", payload.estagioNovo.nome);
}

export async function executarAutomacoesLeadStageChanged(
  payload: ExecutarAutomacoesLeadStageChangedParams,
) {
  const automacoes = await prisma.whatsappAutomacao.findMany({
    where: {
      id_empresa: payload.idEmpresa,
      evento: EVENTO_LEAD_ESTAGIO_ALTERADO,
      ativo: true,
      OR: [{ id_estagio_destino: null }, { id_estagio_destino: payload.estagioNovo.id }],
    },
  });

  if (!automacoes.length) {
    return;
  }

  const idsInstancias = Array.from(new Set(automacoes.map((item) => item.id_whatsapp_instancia)));
  const instancias = await prisma.whatsappInstancia.findMany({
    where: {
      id_empresa: payload.idEmpresa,
      id: { in: idsInstancias },
    },
  });

  const instanciaPorId = new Map(instancias.map((instancia) => [instancia.id, instancia]));

  const envios = automacoes.map(async (automacao) => {
    const instancia = instanciaPorId.get(automacao.id_whatsapp_instancia);
    if (!instancia) {
      return;
    }

    const mensagem = preencherTemplate(automacao.mensagem, payload);
    await enviarMensagemTexto({
      instanceName: instancia.instance_name,
      telefone: automacao.telefone_destino,
      mensagem,
    });
  });

  await Promise.allSettled(envios);
}
