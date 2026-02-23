export type Pdv = {
  id: string;
  nome: string;
};

export type Estagio = {
  id: string;
  nome: string;
  ordem: number;
  tipo: string;
};

export type UseConfigsReturn = {
  pdvs: Pdv[];
  estagios: Estagio[];
  erro: string | null;
  criarPdv: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  atualizarPdv: (id: string, nome: string) => Promise<void>;
  excluirPdv: (id: string) => Promise<void>;
  atualizarEstagio: (id: string, nome: string, ordem: number) => Promise<void>;
};
