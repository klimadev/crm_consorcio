/**
 * Utilitário para parse e normalização de delay após trigger.
 * Aceita diversos formatos de delay relativo: "9h", "1m", "30min", "9h após", "1m após", "30minutos após", etc.
 */

export type HorarioParseResult =
  | { ok: true; raw: string; normalized: string; delay_minutos: number }
  | { ok: false; code: HorarioErrorCode; message: string; raw: string };

export type HorarioErrorCode =
  | "HORARIO_VAZIO"
  | "HORARIO_MUITO_LONGO"
  | "HORARIO_FORMATO_INVALIDO"
  | "HORARIO_FORA_INTERVALO"
  | "HORARIO_MINUTO_INVALIDO"
  | "HORARIO_ZERO";

const MAX_HORARIO_LENGTH = 30;

export const MENSAGENS_ERRO: Record<HorarioErrorCode, string> = {
  HORARIO_VAZIO: "Delay é obrigatório.",
  HORARIO_MUITO_LONGO: "Delay deve ter no máximo 30 caracteres.",
  HORARIO_FORMATO_INVALIDO: "Delay inválido. Use formatos como 9h, 1m, 30min, 9h após, 1m após.",
  HORARIO_FORA_INTERVALO: "Valor máximo é 99 horas.",
  HORARIO_MINUTO_INVALIDO: "Minutos inválidos. Use valores entre 0 e 59.",
  HORARIO_ZERO: "Delay deve ser maior que zero.",
};

/**
 * Parse de delay textual para minutos.
 * 
 * Formatos aceitos (após trigger):
 * - "9h" ou "9h após" -> 540 minutos
 * - "1m" ou "1m após" -> 1 minuto
 * - "30min" ou "30minutos após" -> 30 minutos
 * - "2h30" ou "2h30m" ou "2:30" -> 150 minutos
 * - "9" -> 540 minutos (associa como horas por padrão)
 */
export function parseHorarioTexto(input: string): HorarioParseResult {
  const raw = input;
  
  if (!raw || raw.trim().length === 0) {
    return { ok: false, code: "HORARIO_VAZIO", message: MENSAGENS_ERRO.HORARIO_VAZIO, raw };
  }

  const trimmed = raw.trim().toLowerCase();

  if (trimmed.length > MAX_HORARIO_LENGTH) {
    return { ok: false, code: "HORARIO_MUITO_LONGO", message: MENSAGENS_ERRO.HORARIO_MUITO_LONGO, raw };
  }

  // Remove "após" ou "depois" do final
  const texto = trimmed.replace(/\s*(após|depois|after)\s*$/, '').trim();
  
  if (!texto) {
    return { ok: false, code: "HORARIO_FORMATO_INVALIDO", message: MENSAGENS_ERRO.HORARIO_FORMATO_INVALIDO, raw };
  }

  let delay_minutos = 0;

  // Pattern: "9h" ou "9h após" (horas)
  const matchHoras = texto.match(/^(\d{1,2})\s*h$/);
  if (matchHoras) {
    const horas = parseInt(matchHoras[1], 10);
    if (horas > 99) {
      return { ok: false, code: "HORARIO_FORA_INTERVALO", message: MENSAGENS_ERRO.HORARIO_FORA_INTERVALO, raw };
    }
    delay_minutos = horas * 60;
    const normalized = horas === 1 ? "1 hora" : `${horas} horas`;
    return { ok: true, raw, normalized, delay_minutos };
  }

  // Pattern: "1m" ou "1min" ou "1minuto" (minutos)
  const matchMinutos = texto.match(/^(\d{1,2})\s*(m|min|minutos?)$/);
  if (matchMinutos) {
    const minutos = parseInt(matchMinutos[1], 10);
    if (minutos > 59) {
      return { ok: false, code: "HORARIO_MINUTO_INVALIDO", message: MENSAGENS_ERRO.HORARIO_MINUTO_INVALIDO, raw };
    }
    delay_minutos = minutos;
    const normalized = minutos === 1 ? "1 minuto" : `${minutos} minutos`;
    return { ok: true, raw, normalized, delay_minutos };
  }

  // Pattern: "2h30" ou "2h30m" (horas + minutos)
  const matchHorasMinutos = texto.match(/^(\d{1,2})\s*h\s*(\d{1,2})\s*(m|min)?$/);
  if (matchHorasMinutos) {
    const horas = parseInt(matchHorasMinutos[1], 10);
    const minutos = parseInt(matchHorasMinutos[2], 10);
    if (horas > 99) {
      return { ok: false, code: "HORARIO_FORA_INTERVALO", message: MENSAGENS_ERRO.HORARIO_FORA_INTERVALO, raw };
    }
    if (minutos > 59) {
      return { ok: false, code: "HORARIO_MINUTO_INVALIDO", message: MENSAGENS_ERRO.HORARIO_MINUTO_INVALIDO, raw };
    }
    delay_minutos = (horas * 60) + minutos;
    const normalized = horas === 0 ? `${minutos} min` : minutos === 0 ? `${horas}h` : `${horas}h ${minutos}min`;
    return { ok: true, raw, normalized, delay_minutos };
  }

  // Pattern: "2:30" (horas:minutos com separador)
  const matchDoisPontos = texto.match(/^(\d{1,2}):(\d{1,2})$/);
  if (matchDoisPontos) {
    const horas = parseInt(matchDoisPontos[1], 10);
    const minutos = parseInt(matchDoisPontos[2], 10);
    if (horas > 99) {
      return { ok: false, code: "HORARIO_FORA_INTERVALO", message: MENSAGENS_ERRO.HORARIO_FORA_INTERVALO, raw };
    }
    if (minutos > 59) {
      return { ok: false, code: "HORARIO_MINUTO_INVALIDO", message: MENSAGENS_ERRO.HORARIO_MINUTO_INVALIDO, raw };
    }
    delay_minutos = (horas * 60) + minutos;
    const normalized = horas === 0 ? `${minutos} min` : minutos === 0 ? `${horas}h` : `${horas}h ${minutos}min`;
    return { ok: true, raw, normalized, delay_minutos };
  }

  // Pattern: apenas número "9" - assume horas por padrão
  const matchNumeroSo = texto.match(/^(\d{1,2})$/);
  if (matchNumeroSo) {
    const valor = parseInt(matchNumeroSo[1], 10);
    if (valor === 0) {
      return { ok: false, code: "HORARIO_ZERO", message: MENSAGENS_ERRO.HORARIO_ZERO, raw };
    }
    if (valor > 99) {
      return { ok: false, code: "HORARIO_FORA_INTERVALO", message: MENSAGENS_ERRO.HORARIO_FORA_INTERVALO, raw };
    }
    delay_minutos = valor * 60;
    const normalized = valor === 1 ? "1 hora" : `${valor} horas`;
    return { ok: true, raw, normalized, delay_minutos };
  }

  return { ok: false, code: "HORARIO_FORMATO_INVALIDO", message: MENSAGENS_ERRO.HORARIO_FORMATO_INVALIDO, raw };
}

export function isHorarioValido(input: string): boolean {
  const result = parseHorarioTexto(input);
  return result.ok;
}

export function getHorarioErrorMessage(input: string): string | null {
  const result = parseHorarioTexto(input);
  if (result.ok) return null;
  return result.message;
}

export function normalizarHorario(input: string): string | null {
  const result = parseHorarioTexto(input);
  return result.ok ? result.normalized : null;
}

export function getDelayMinutos(input: string): number | null {
  const result = parseHorarioTexto(input);
  return result.ok ? result.delay_minutos : null;
}
