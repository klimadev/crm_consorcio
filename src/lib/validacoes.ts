import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type RecordType<K extends string | number | symbol, V> = { [P in K]: V };

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

export const LABELS_PENDENCIA: RecordType<TipoPendencia, string> = {
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

export function mensagemErroValidacao(erro: z.ZodError) {
  return erro.issues[0]?.message ?? "Dados invalidos.";
}
