export type Estagio = {
  id: string;
  nome: string;
  ordem: number;
  tipo: string;
};

export type UseConfigsReturn = {
  estagios: Estagio[];
  erro: string | null;
  atualizarEstagio: (id: string, nome: string, ordem: number) => Promise<void>;
};
