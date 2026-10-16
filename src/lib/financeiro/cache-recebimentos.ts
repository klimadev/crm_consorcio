// Cache em memória do painel de recebimentos, por processo Node (produção roda
// um único processo via systemd, então o cache é consistente).
//
// Corretude antes de velocidade: TODA mutação de parcela invalida
// explicitamente a cache da empresa; o TTL curto é a rede de segurança — se
// alguma mutação futura esquecer de invalidar, o dado staleness dura no máximo
// TTL_MS (mesma janela que o stale-while-revalidate do cliente já impõe).
//
// Sem leak: teto de MAX_ENTRADAS entradas (~15 MB no pior caso real) com
// remoção FIFO da mais antiga, e entradas expiradas são removidas na leitura.

import type { RecebimentosResposta } from "@/lib/api/recebimentos";

const TTL_MS = 60_000;
const MAX_ENTRADAS = 96;
type Entrada = { expiraEm: number; payload: RecebimentosResposta };

// em dev cada rota compila como entry próprio e pode carregar sua cópia deste
// módulo — sem a âncora global, a invalidação disparada pela rota de mutação
// não atingiria o Map lido pela rota de leitura.
const armazenamento = globalThis as typeof globalThis & {
  __cacheRecebimentos?: Map<string, Entrada>;
};
const entradas = (armazenamento.__cacheRecebimentos ??= new Map<string, Entrada>());

export function lerCacheRecebimentos(chave: string): RecebimentosResposta | null {
  const entrada = entradas.get(chave);
  if (!entrada) return null;

  if (Date.now() > entrada.expiraEm) {
    entradas.delete(chave);
    return null;
  }
  return entrada.payload;
}

export function gravarCacheRecebimentos(chave: string, payload: RecebimentosResposta): void {
  // Reinserir move a chave para o fim do Map (ordem de inserção = LRU-like).
  entradas.delete(chave);
  entradas.set(chave, { expiraEm: Date.now() + TTL_MS, payload });

  while (entradas.size > MAX_ENTRADAS) {
    const maisAntiga = entradas.keys().next().value;
    if (maisAntiga === undefined) break;
    entradas.delete(maisAntiga);
  }
}

// Chamada por toda rota que muta parcelas: pagamentos, undo, cancelamentos,
// encerramentos, criação e exclusão de plano.
export function invalidarCacheRecebimentos(idEmpresa: string): void {
  const prefixo = `recebimentos:${idEmpresa}:`;
  for (const chave of entradas.keys()) {
    if (chave.startsWith(prefixo)) entradas.delete(chave);
  }
}
