import { Fragment } from "react";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import {
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Funcionario, Pdv } from "../types";

const LABEL_CARGO: Record<NonNullable<Funcionario["cargo"]>, string> = {
  ADMINISTRADOR: "Admin",
  COLABORADOR: "Colaborador",
  GERENTE: "Gerente",
};

function obterNomePdv(funcionario: Funcionario, pdvs: Pdv[] = []) {
  return funcionario.pdv?.nome ?? pdvs.find((pdv) => pdv.id === funcionario.id_pdv)?.nome ?? "Sem PDV";
}

function obterCargo(funcionario: Funcionario) {
  return funcionario.cargo ? LABEL_CARGO[funcionario.cargo] : "Equipe";
}

export function obterResumoFuncionario(funcionario?: Funcionario, pdvs: Pdv[] = []) {
  if (!funcionario) return "Selecione um colaborador";
  return `${obterCargo(funcionario)} · ${obterNomePdv(funcionario, pdvs)}`;
}

type FuncionarioSelectOptionsProps = {
  funcionarios: Funcionario[];
  pdvs?: Pdv[];
  funcionarioAtualId?: string | null;
  vazio?: string;
};

export function FuncionarioSelectOptions({
  funcionarios,
  pdvs = [],
  funcionarioAtualId,
  vazio = "Nenhum colaborador ativo encontrado",
}: FuncionarioSelectOptionsProps) {
  if (funcionarios.length === 0) {
    return <SelectLabel className="pl-2 text-xs text-foreground-muted">{vazio}</SelectLabel>;
  }

  const grupos = new Map<string, { nome: string; funcionarios: Funcionario[] }>();

  for (const funcionario of funcionarios) {
    const chave = funcionario.id_pdv ?? "sem_pdv";
    const nome = obterNomePdv(funcionario, pdvs);
    const grupo = grupos.get(chave) ?? { nome, funcionarios: [] };
    grupo.funcionarios.push(funcionario);
    grupos.set(chave, grupo);
  }

  return Array.from(grupos.entries()).map(([chave, grupo], grupoIndex) => (
    <Fragment key={chave}>
      {grupoIndex > 0 ? <SelectSeparator /> : null}
      <SelectLabel className="pl-8 text-[11px] uppercase tracking-[0.12em] text-foreground-disabled">
        {grupo.nome}
      </SelectLabel>
      {grupo.funcionarios.map((funcionario) => {
        const cargo = obterCargo(funcionario);
        const selecionado = funcionarioAtualId === funcionario.id;

        return (
          <SelectItem
            key={funcionario.id}
            value={funcionario.id}
            textValue={`${funcionario.nome} ${cargo} ${grupo.nome}`}
            className="items-start py-2.5"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-foreground">{funcionario.nome}</span>
                {selecionado ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-success">
                    atual
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-muted">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                    funcionario.cargo === "GERENTE"
                      ? "border-info/25 bg-info/10 text-info"
                      : "border-border/70 bg-muted/70",
                  )}
                >
                  {funcionario.cargo === "GERENTE" ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <UserRound className="h-3 w-3" />
                  )}
                  {cargo}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/70 px-1.5 py-0.5">
                  <Building2 className="h-3 w-3" />
                  {grupo.nome}
                </span>
              </span>
            </span>
          </SelectItem>
        );
      })}
    </Fragment>
  ));
}
