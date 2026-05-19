import type { WhatsappInstancia } from "@/modules/whatsapp/types";

export type ExportConfig = {
  chatLimit: number;
  messagesPerChat: number;
};

export type ExportResultado = {
  instanceId: string;
  instanceName: string;
  instanceLabel: string;
  status: "sucesso" | "erro";
  dump: string | null;
  stats: {
    chats: number;
    mensagens: number;
    periodoInicio: string;
    periodoFim: string;
  } | null;
  erro: string | null;
};

export type WhatsappExporterState = {
  instances: WhatsappInstancia[];
  selectedIds: string[];
  config: ExportConfig;
  resultados: ExportResultado[];
  loading: boolean;
};
