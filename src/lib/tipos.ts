export type Perfil = "EMPRESA" | "GERENTE" | "COLABORADOR";
export type CargoFuncionario = "GERENTE" | "COLABORADOR" | "ADMINISTRADOR";
export type TipoEstagioFunil = "ABERTO" | "GANHO" | "PERDIDO";
export type TipoMeta = "GLOBAL" | "PDV" | "INDIVIDUAL";
export type TipoMetaValor = "VALOR" | "VOLUME";
export type PeriodoMeta = "MENSAIS" | "TRIMESTRAL" | "ANUAL";

export type SessaoToken = {
  id_usuario: string;
  id_empresa: string;
  perfil: Perfil;
  id_pdv: string | null;
};
