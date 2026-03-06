export const MENSAGENS_KANBAN = {
  sucesso: {
    acaoConcluida: "Acao concluida com sucesso.",
    leadExcluido: "Lead excluido com sucesso.",
  },
  erro: {
    generico: "Nao foi possivel concluir a operacao. Tente novamente.",
    excluirLead: "Nao foi possivel excluir o lead. Tente novamente.",
    urlDocumentoInvalida: "Informe uma URL valida ou envie um arquivo PDF.",
    aprovarLead: "Erro ao aprovar lead.",
  },
  loading: {
    carregando: "Carregando...",
    salvando: "Salvando...",
    excluindo: "Excluindo...",
    processando: "Processando...",
  },
  confirmacao: {
    excluirLeadTitulo: "Excluir lead",
    excluirLeadDescricao: "Tem certeza que deseja excluir {nomeLead}? Esta acao nao pode ser desfeita.",
    cancelar: "Cancelar",
    excluir: "Excluir",
    descartarAlteracoes: "Voce tem alteracoes nao salvas. Deseja descartar as alteracoes?",
  },
  atalhos: {
    fechar: "Fechar",
    confirmar: "Confirmar",
  },
  placeholders: {
    nomeLead: "este lead",
    busca: "Buscar lead",
    urlDocumento: "https://exemplo.com/documento.pdf",
  },
} as const;

export function interpolarMensagemKanban(template: string, valores: Record<string, string | number | null | undefined>) {
  return template.replace(/\{(.*?)\}/g, (_, chave: string) => {
    const valor = valores[chave.trim()];
    return valor == null ? "" : String(valor);
  });
}
