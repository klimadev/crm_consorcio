export type OrigemLead = "MANUAL" | "SINCRONIZACAO_WHATSAPP" | "ANUNCIO_CTWA";

export type ConversaResumo = {
  leadId: string;
  leadNome: string;
  leadTelefone: string;
  leadOrigem: OrigemLead;
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
  origem: OrigemLead;
  anuncio_titulo: string | null;
  anuncio_descricao: string | null;
  observacoes: string | null;
  valor_consorcio: number;
  estagio: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string } | null;
  id_pdv: string | null;
  pdv: { id: string; nome: string } | null;
  gestores: Array<{ nome: string }> | null;
  parcelas: Array<{
    id: string;
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    status: string;
  }>;
};
