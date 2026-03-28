export type ConversaResumo = {
  leadId: string;
  leadNome: string;
  leadTelefone: string;
  estagioNome: string | null;
  ultimaMensagem: {
    conteudo: string;
    fromMe: boolean;
    timestamp: number;
  } | null;
  naoLidas: number;
};

export type ConversasResponse = {
  conversas: ConversaResumo[];
  cursor: string | null;
  temMais: boolean;
};

export type ConversasStreamSnapshot = ConversasResponse;

export type LeadDadosChat = {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  valor_consorcio: number;
  estagio: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string } | null;
  parcelas: Array<{
    id: string;
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    status: string;
  }>;
};
