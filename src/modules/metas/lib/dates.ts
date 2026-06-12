/** Retorna o início do dia em UTC (00:00:00.000Z) */
export function startOfDayUTC(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 0, 0, 0, 0));
}

/** Retorna o fim do dia em UTC (23:59:59.999Z) */
export function endOfDayUTC(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 23, 59, 59, 999));
}

/**
 * Obtém a competência semanal no formato ISO "YYYY-WNN" (ex: "2026-W25").
 * Usa exclusivamente UTC para evitar bugs de fuso horário.
 */
export function obterCompetenciaISO(data: Date): string {
  const utc = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  const target = new Date(utc);
  const diaSemana = target.getUTCDay() || 7; // segunda=1 .. domingo=7
  // Quinta-feira da mesma semana
  target.setUTCDate(target.getUTCDate() + 4 - diaSemana);
  const ano = target.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const diff = target.getTime() - inicioAno.getTime();
  const semana = Math.ceil((diff / 86400000 + inicioAno.getUTCDay() + 1) / 7);
  return `${ano}-W${String(semana).padStart(2, "0")}`;
}

/**
 * Calcula dias restantes inteiros até dataFim (contando hoje como dia 1).
 * Retorna 0 se a data já passou.
 */
export function calcularDiasRestantes(dataFim: Date, hoje?: Date): number {
  const agora = hoje ? startOfDayUTC(hoje) : startOfDayUTC(new Date());
  const fim = endOfDayUTC(dataFim);
  const diff = fim.getTime() - agora.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Calcula o número da semana do mês (1-4) para uma data.
 * Semana 1 = dias 1-7, Semana 2 = dias 8-14, etc.
 */
export function obterSemanaDoMes(data: Date): number {
  const dia = data.getUTCDate();
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

/**
 * Retorna o mês de referência no formato "YYYY-MM" para uma data.
 */
export function obterMesReferencia(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

/**
 * Calcula a data de início (segunda-feira) e fim (domingo) para
 * uma dada semana do mês em um mês de referência.
 *
 * Exemplo: semana 1 de "2026-06" → { inicio: 2026-06-01, fim: 2026-06-07 }
 */
export function calcularDatasSemana(semana: number, mesReferencia: string): { data_inicio: Date; data_fim: Date } {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)); // último dia do mês

  const inicioSemana = new Date(Date.UTC(ano, mes - 1, 1 + (semana - 1) * 7));
  // Ajusta para não ultrapassar o último dia do mês
  if (inicioSemana > ultimoDia) {
    inicioSemana.setUTCDate(ultimoDia.getUTCDate());
  }

  // A última semana vai até o fim do mês
  const fimDia = semana === 4 ? ultimoDia.getUTCDate() : Math.min(semana * 7, ultimoDia.getUTCDate());
  const fimSemana = new Date(Date.UTC(ano, mes - 1, fimDia));

  return { data_inicio: startOfDayUTC(inicioSemana), data_fim: endOfDayUTC(fimSemana) };
}
