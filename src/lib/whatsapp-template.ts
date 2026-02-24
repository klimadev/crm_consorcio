export const VARIAVEIS_TEMPLATE_WHATSAPP = [
  "lead_nome",
  "lead_telefone",
  "lead_id",
  "estagio_anterior",
  "estagio_novo",
] as const;

export type ChaveVariavelWhatsapp = (typeof VARIAVEIS_TEMPLATE_WHATSAPP)[number];

export type ContextoTemplateWhatsapp = Partial<Record<ChaveVariavelWhatsapp, string>>;

const REGEX_VARIAVEL = /{{\s*([a-z_]+)\s*}}/gi;

export function renderizarTemplateWhatsapp(template: string, contexto: ContextoTemplateWhatsapp) {
  return template.replace(REGEX_VARIAVEL, (match, chaveBruta) => {
    const chave = chaveBruta as ChaveVariavelWhatsapp;
    if (!VARIAVEIS_TEMPLATE_WHATSAPP.includes(chave)) {
      return match;
    }

    const valor = contexto[chave];
    return typeof valor === "string" && valor.length > 0 ? valor : "";
  });
}

export function criarContextoPreviewWhatsapp(partial?: ContextoTemplateWhatsapp): ContextoTemplateWhatsapp {
  return {
    lead_nome: "Joao da Silva",
    lead_telefone: "+55 11 99999-9999",
    lead_id: "lead_123",
    estagio_anterior: "Novo",
    estagio_novo: "FollowUp",
    ...partial,
  };
}
