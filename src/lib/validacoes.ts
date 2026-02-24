import { z } from "zod";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";

export const esquemaLogin = z.object({
  email: z.string().trim().email("E-mail invalido."),
  senha: z.string().min(1, "Senha obrigatoria."),
});

export const esquemaCadastroEmpresa = z.object({
  nome: z.string().trim().min(2, "Nome da empresa deve ter ao menos 2 caracteres."),
  email: z.string().trim().email("E-mail invalido."),
  senha: z.string().min(6, "Senha precisa ter ao menos 6 caracteres."),
});

export const esquemaCriarLead = z.object({
  nome: z.string().trim().min(2, "Nome do lead deve ter ao menos 2 caracteres."),
  telefone: z
    .string()
    .trim()
    .refine((valor) => valor.replace(/\D/g, "").length >= 10, "Telefone invalido."),
  valor_consorcio: z.number().positive("Valor do consorcio deve ser maior que zero."),
  id_estagio: z.string().trim().min(1, "Estagio obrigatorio."),
  id_funcionario: z.string().trim().min(1, "Funcionario obrigatorio."),
});

export const esquemaMoverLead = z.object({
  id_estagio: z.preprocess(
    (valor) => (typeof valor === "string" ? valor : ""),
    z.string().trim().min(1, "Destino obrigatorio."),
  ),
  motivo_perda: z.string().trim().optional(),
});

export const EVENTOS_AUTOMACAO_WHATSAPP = ["LEAD_STAGE_CHANGED", "LEAD_FOLLOW_UP"] as const;
export const TIPOS_DESTINO_AUTOMACAO_WHATSAPP = ["FIXO", "LEAD_TELEFONE"] as const;

const esquemaEtapaFollowUp = z.object({
  ordem: z.coerce.number().int().min(1, "Ordem da etapa invalida.").max(50, "Maximo de 50 etapas."),
  delay_minutos: z
    .coerce
    .number()
    .int()
    .min(1, "Delay deve ser de no minimo 1 minuto.")
    .max(60 * 24 * 30, "Delay maximo de 30 dias por etapa."),
  mensagem_template: z
    .string()
    .trim()
    .min(5, "Mensagem da etapa muito curta.")
    .max(1000, "Mensagem da etapa muito longa."),
});

export const esquemaCriarAutomacaoWhatsapp = z.object({
  id_whatsapp_instancia: z.string().trim().min(1, "Instancia obrigatoria."),
  evento: z.enum(EVENTOS_AUTOMACAO_WHATSAPP, { message: "Evento invalido." }),
  id_estagio_destino: z.string().trim().optional(),
  tipo_destino: z.enum(TIPOS_DESTINO_AUTOMACAO_WHATSAPP).default("FIXO"),
  telefone_destino: z.string().trim().optional(),
  mensagem: z.string().trim().optional(),
  etapas: z.array(esquemaEtapaFollowUp).max(50, "Maximo de 50 etapas.").optional(),
  ativo: z.boolean().optional(),
}).superRefine((dados, ctx) => {
  if (dados.tipo_destino === "FIXO") {
    const telefone = dados.telefone_destino ?? "";
    const normalizado = normalizarTelefoneParaWhatsapp(telefone);
    if (!normalizado.valido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefone_destino"],
        message: "Telefone destino invalido para WhatsApp (use DDI+DDD+numero).",
      });
    }
  }

  if (dados.evento === "LEAD_STAGE_CHANGED") {
    const mensagem = dados.mensagem?.trim() ?? "";
    if (mensagem.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mensagem"],
        message: "Mensagem muito curta.",
      });
    }
  }

  if (dados.evento === "LEAD_FOLLOW_UP") {
    if (!dados.etapas?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["etapas"],
        message: "Defina ao menos 1 etapa de follow-up.",
      });
      return;
    }

    const ordens = new Set<number>();
    for (const etapa of dados.etapas) {
      if (ordens.has(etapa.ordem)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["etapas"],
          message: "As ordens das etapas nao podem repetir.",
        });
        break;
      }
      ordens.add(etapa.ordem);
    }
  }
});

// Tipos de pendência AUTOMÁTICA - detectadas pelo sistema
export const TIPOS_PENDENCIA = [
  "SEM_RESPOSTA",                  // Lead sem resposta há X dias
  "CARTA_CREDITO_PENDENTE",        // Aguardando aprovação da empresa
  "DOCUMENTOS_PENDENTES",         // Precisa de documentos do cliente
  "QUEDA_RESERVA",                 // Reserva expirada
  "ALTO_VALOR",                    // Valor alto que precisa aprovação
  "DOCUMENTO_APROVACAO_PENDENTE", // Documento de aprovação não anexado
  "ESTAGIO_PARADO",                // Lead parado em um estágio há muito tempo
] as const;

export type TipoPendencia = (typeof TIPOS_PENDENCIA)[number];

export const LABELS_PENDENCIA: Record<TipoPendencia, string> = {
  SEM_RESPOSTA: "Sem Resposta",
  CARTA_CREDITO_PENDENTE: "Carta de Crédito Pendente",
  DOCUMENTOS_PENDENTES: "Documentos Pendentes",
  QUEDA_RESERVA: "Queda de Reserva",
  ALTO_VALOR: "Alto Valor - Aprovação Necessária",
  DOCUMENTO_APROVACAO_PENDENTE: "Documento de Aprovação (PDF/Link) Pendente",
  ESTAGIO_PARADO: "Lead Parado no Estágio",
};

// Dias sem resposta para considerar como pendência
export const DIAS_SEM_RESPOSTA_PENDENCIA = 7;

// Dias sem mudança de estágio para considerar como pendência (exceto GANHO/PERDIDO)
export const DIAS_ESTAGIO_PARADO = 14;

// Valor mínimo para considerar como alto valor (R$ 500.000)
export const VALOR_MINIMO_ALTO_VALOR = 500000;

export const esquemaAtualizarPendencia = z.object({
  documento_url: z.string().url().optional().nullable(),
  resolvida: z.boolean().optional(),
});

export const CARGOS_EQUIPE = ["COLABORADOR", "GERENTE"] as const;

export const schemaAtualizarFuncionario = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres."),
  email: z.string().trim().email("E-mail invalido."),
  cargo: z.enum(CARGOS_EQUIPE, { message: "Cargo invalido." }),
  id_pdv: z.string().trim().min(1, "PDV obrigatorio."),
});

export const schemaInativarFuncionario = z.object({
  id_funcionario_destino: z.string().trim().min(1, "Destino obrigatorio."),
  observacao: z.string().trim().max(500, "Observacao muito longa.").optional(),
});

export const schemaListarFuncionarios = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(["TODOS", "ATIVO", "INATIVO"]).default("TODOS"),
  cargo: z.enum(["TODOS", ...CARGOS_EQUIPE]).default("TODOS"),
  id_pdv: z.string().trim().optional(),
  ordenar_por: z.enum(["nome", "email", "cargo", "criado_em"]).default("nome"),
  direcao: z.enum(["asc", "desc"]).default("asc"),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).default(20),
});

export const schemaAcaoLoteFuncionarios = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um colaborador."),
  acao: z.enum(["ATIVAR", "INATIVAR", "ALTERAR_CARGO", "ALTERAR_PDV"]),
  cargo: z.enum(CARGOS_EQUIPE).optional(),
  id_pdv: z.string().trim().optional(),
  id_funcionario_destino: z.string().trim().optional(),
  observacao: z.string().trim().max(500, "Observacao muito longa.").optional(),
});

export type AcaoLoteFuncionarios = z.infer<typeof schemaAcaoLoteFuncionarios>;

export function normalizarBuscaFuncionarios(valor?: string) {
  return valor?.trim().toLowerCase() ?? "";
}

export function mensagemErroValidacao(erro: z.ZodError) {
  return erro.issues[0]?.message ?? "Dados invalidos.";
}
