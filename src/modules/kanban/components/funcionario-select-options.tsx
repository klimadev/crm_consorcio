import { Fragment } from "react";
import {
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
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
    return (
      <SelectGroup>
        <SelectLabel className="pl-2 text-xs text-foreground-muted">{vazio}</SelectLabel>
      </SelectGroup>
    );
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
      <SelectGroup>
        <SelectLabel className="pl-8 text-[11px] uppercase tracking-[0.12em] text-foreground-disabled">
          {grupo.nome}
        </SelectLabel>
        {grupo.funcionarios.map((funcionario) => {
          const cargo = obterCargo(funcionario);
          const selecionado = funcionarioAtualId === funcionario.id;
          const textoOpcao = `${funcionario.nome} · ${cargo} · ${grupo.nome}${selecionado ? " · atual" : ""}`;

          return (
            <SelectItem
              key={funcionario.id}
              value={funcionario.id}
              textValue={textoOpcao}
              className="py-2.5 text-sm"
            >
              {textoOpcao}
            </SelectItem>
          );
        })}
      </SelectGroup>
    </Fragment>
  ));
}
