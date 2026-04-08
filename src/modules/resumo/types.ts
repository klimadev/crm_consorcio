import type { ResumoResposta, ResumoKpi } from "@/lib/api/resumo";
import type { Perfil } from "@/lib/tipos";

export type UseResumoModuleProps = {
  perfil: Perfil;
  idUsuario: string;
  idPdv: string | null;
};

export type UseResumoModuleReturn = {
  carregando: boolean;
  erro: string | null;
  dados: ResumoResposta | null;
  kpis: ResumoKpi[];
  recarregar: () => Promise<void>;
  perfil: Perfil;
};
