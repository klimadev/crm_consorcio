export type Perfil = "EMPRESA" | "GERENTE" | "COLABORADOR";
export type CargoFuncionario = "GERENTE" | "COLABORADOR";
export type TipoEstagioFunil = "ABERTO" | "GANHO" | "PERDIDO";

export type SessaoToken = {
  id_usuario: string;
  id_empresa: string;
  perfil: Perfil;
  id_pdv: string | null;
};
