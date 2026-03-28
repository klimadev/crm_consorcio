export type Perfil = "EMPRESA" | "GERENTE" | "COLABORADOR";
export type CargoFuncionario = "GERENTE" | "COLABORADOR" | "ADMINISTRADOR";
export type TipoEstagioFunil = "ABERTO" | "GANHO" | "PERDIDO";
export type TipoMeta = "GLOBAL" | "PDV" | "INDIVIDUAL";
export type TipoMetaValor = "VALOR" | "VOLUME";
export type PeriodoMeta = "MENSAIS" | "TRIMESTRAL" | "ANUAL" | "SEMANAL" | "PERSONALIZADO";
export type OrigemResultadoMeta = "PAGAMENTOS" | "ESTAGIO_GANHO";
export type CadenciaMeta = "SEMANAL_MES" | "MENSAL" | "TRIMESTRAL" | "ANUAL" | "PERSONALIZADO";
export type RecorrenciaMeta = "PONTUAL" | "RECORRENTE";
export type PeriodoTemplateMeta = "SEMANA" | "MES" | "TRIMESTRE" | "ANO" | "PERSONALIZADO";

export type SessaoToken = {
  id_usuario: string;
  id_empresa: string;
  perfil: Perfil;
  id_pdv: string | null;
};
