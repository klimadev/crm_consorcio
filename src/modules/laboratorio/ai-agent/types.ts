import { z } from "zod";

export const SentimentoEnum = z.enum(["CALOR", "MORNO", "FRIO", "INDEFINIDO"]);
export type Sentimento = z.infer<typeof SentimentoEnum>;

export const PrioridadeEnum = z.enum(["URGENTE", "ALTA", "MEDIA", "FRIA"]);
export type Prioridade = z.infer<typeof PrioridadeEnum>;

export const AcaoRecomendadaEnum = z.enum([
  "ENVIAR_FOLLOW_UP",
  "AGENDAR_LIGACAO",
  "SEM_ACAO",
  "TRANSFERIR",
]);
export type AcaoRecomendada = z.infer<typeof AcaoRecomendadaEnum>;

export const LeadAnalysisSchema = z.object({
  leadName: z.string().describe("Nome do lead extraído da conversa"),
  phoneNumber: z.string().describe("Número de telefone do lead"),
  remoteJid: z.string().optional().describe("remoteJid da Evolution API"),
  messageCount: z.number().int().describe("Quantidade de mensagens trocadas neste chat"),
  sentiment: SentimentoEnum.describe("Sentimento geral da conversa: CALOR (positivo/interessado), MORNO (neutro), FRIO (negativo/desinteressado), INDEFINIDO"),
  interesse: z.string().describe("Descrição textual do nível de interesse demonstrado"),
  painPoints: z.array(z.string()).describe("Dores/desafios mencionados pelo lead"),
  buyingSignals: z.array(z.string()).describe("Sinais de compra observados na conversa"),
  objecoes: z.array(z.string()).describe("Objeções levantadas pelo lead"),
  perfil: z.string().describe("Perfil do lead (ex: investidor, primeira carta, profissional liberal)"),
  prioridade: PrioridadeEnum.describe("Prioridade de follow-up"),
  recommendedAction: AcaoRecomendadaEnum.describe("Ação recomendada para este lead"),
  followUpMessage: z
    .string()
    .nullable()
    .describe(
      "Mensagem de follow-up PERSONALIZADA baseada em FATOS da conversa. DEVE referenciar algo específico que o lead disse. Ex: 'Você mencionou que o valor das parcelas estava alto e consegui uma simulação com prazos maiores que pode ajudar.' NÃO pode ser genérica. Pode ser null se o lead estiver frio.",
    ),
  rationale: z.string().describe("Explicação do porquê esta mensagem foi escolhida e quais fatos da conversa a embasam"),
  valorCarta: z.number().positive().describe("Valor estimado da carta de consórcio do lead (em reais) baseado na conversa"),
});

export type LeadAnalysis = z.infer<typeof LeadAnalysisSchema>;

export const BatchWarningSchema = z.object({
  batch: z.number().int(),
  erro: z.string(),
});

export type BatchWarning = z.infer<typeof BatchWarningSchema>;

export const AnalysisResultSchema = z.object({
  analysis: z.array(LeadAnalysisSchema).describe("Análise de cada lead identificado nas conversas (exceto frios)"),
  summary: z.object({
    totalLeads: z.number().int(),
    urgentes: z.number().int(),
    quentes: z.number().int(),
    frios: z.number().int(),
    potencialFaturamento: z.number().describe("Soma total dos valores de carta de todos os leads"),
    totalConversas: z.number().int().describe("Total de conversas processadas"),
    totalBatches: z.number().int().describe("Total de lotes em que a requisição foi dividida"),
    batchesProcessados: z.number().int().describe("Lotes processados com sucesso"),
    batchesComErro: z.number().int().describe("Lotes que falharam na validação"),
  }),
  warnings: z.array(BatchWarningSchema).optional().describe("Avisos de lotes que falharam"),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const AnalyzeRequestSchema = z.object({
  instanceIds: z.array(z.string()).min(1, "Selecione pelo menos uma instância."),
  chatLimit: z.number().int().min(1).max(1000).default(500),
  messagesPerChat: z.number().int().min(1).max(100).default(30),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AiConfigSchema = z.object({
  base_url: z.string().url("URL base inválida.").default("https://api.openai.com/v1"),
  api_key: z.string().min(1, "API Key obrigatória.").optional(),
  model: z.string().min(1, "Modelo obrigatório.").default("gpt-4o"),
  enabled: z.boolean().default(false),
});

export type AiConfig = z.infer<typeof AiConfigSchema>;

export const SendFollowUpSchema = z.object({
  instanceName: z.string().min(1),
  telefone: z.string().min(1),
  mensagem: z.string().min(1, "Mensagem não pode estar vazia."),
  leadName: z.string().optional(),
});

export type SendFollowUpRequest = z.infer<typeof SendFollowUpSchema>;

export const PRIORIDADE_ORDER: Record<Prioridade, number> = {
  URGENTE: 0,
  ALTA: 1,
  MEDIA: 2,
  FRIA: 3,
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  URGENTE: "🔥 Urgente",
  ALTA: "🔼 Alta",
  MEDIA: "⏳ Média",
  FRIA: "❄️ Fria",
};

export const PRIORIDADE_EMOJI: Record<Prioridade, string> = {
  URGENTE: "🔥",
  ALTA: "⚡",
  MEDIA: "⏳",
  FRIA: "❄️",
};

export const SENTIMENTO_CORES: Record<Sentimento, string> = {
  CALOR: "#22c55e",
  MORNO: "#eab308",
  FRIO: "#3b82f6",
  INDEFINIDO: "#6b7280",
};

export const SENTIMENTO_LABEL: Record<Sentimento, string> = {
  CALOR: "🔥 Calor",
  MORNO: "⏳ Morno",
  FRIO: "❄️ Frio",
  INDEFINIDO: "❓ Indefinido",
};

export const SENTIMENTO_EMOJI: Record<Sentimento, string> = {
  CALOR: "🔥",
  MORNO: "⏳",
  FRIO: "❄️",
  INDEFINIDO: "❓",
};
