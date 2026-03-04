"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Funcionario, UseEquipeModuleReturn, DadosEdicao } from "../types";

type FuncionarioEditarDrawerProps = {
  vm: UseEquipeModuleReturn;
 funcionario: Funcionario | null;
  aberto: boolean;
  onFechar: () => void;
};

export function FuncionarioEditarDrawer({ vm, funcionario, aberto, onFechar }: FuncionarioEditarDrawerProps) {
  const [dados, setDados] = useState<DadosEdicao | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aberto && funcionario) {
      const sincronizacao = setTimeout(() => {
        setDados({
          nome: funcionario.nome,
          email: funcionario.email,
          cargo: funcionario.cargo,
          id_pdv: funcionario.pdv?.id ?? "",
        });
        setErros({});
      }, 0);

      return () => clearTimeout(sincronizacao);
    }
  }, [aberto, funcionario]);

  const aoMudar = (campo: keyof DadosEdicao, valor: string) => {
    if (!dados) return;
    const novosDados = { ...dados, [campo]: valor };
    setDados(novosDados);
    setErros({});
  };

  const handleSalvar = async () => {
    if (!dados || !funcionario) return;

    const novosErros: Record<string, string> = {};
    if (!dados.nome.trim() || dados.nome.trim().length < 2) {
      novosErros.nome = "Nome deve ter ao menos 2 caracteres.";
    }
    if (!dados.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
      novosErros.email = "E-mail inválido.";
    }
    if (!dados.id_pdv.trim()) {
      novosErros.id_pdv = "PDV obrigatório.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    const ok = await vm.salvarEdicaoAtual(dados);
    if (ok) {
      onFechar();
    }
  };

  const salvando = vm.statusSalvamento.id === funcionario?.id && vm.statusSalvamento.estado === "saving";

  return (
    <Drawer open={aberto} onClose={onFechar}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>Editar colaborador</DrawerTitle>
          <DrawerDescription>
            Altere os dados do colaborador {funcionario?.nome}.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input
              value={dados?.nome ?? ""}
              onChange={(e) => aoMudar("nome", e.target.value)}
              placeholder="Nome completo"
              className={erros.nome ? "border-rose-300" : ""}
            />
            {erros.nome && <p className="text-xs text-rose-600">{erros.nome}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <Input
              type="email"
              value={dados?.email ?? ""}
              onChange={(e) => aoMudar("email", e.target.value)}
              placeholder="email@exemplo.com"
              className={erros.email ? "border-rose-300" : ""}
            />
            {erros.email && <p className="text-xs text-rose-600">{erros.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Cargo</label>
            <Select value={dados?.cargo ?? ""} onValueChange={(valor) => aoMudar("cargo", valor)}>
              <SelectTrigger className={erros.cargo ? "border-rose-300" : ""}>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                <SelectItem value="GERENTE">Gerente</SelectItem>
                <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {erros.cargo && <p className="text-xs text-rose-600">{erros.cargo}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">PDV</label>
            <Select value={dados?.id_pdv ?? ""} onValueChange={(valor) => aoMudar("id_pdv", valor)}>
              <SelectTrigger className={erros.id_pdv ? "border-rose-300" : ""}>
                <SelectValue placeholder="Selecione o PDV" />
              </SelectTrigger>
              <SelectContent>
                {vm.pdvs.map((pdv) => (
                  <SelectItem key={pdv.id} value={pdv.id}>
                    {pdv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erros.id_pdv && <p className="text-xs text-rose-600">{erros.id_pdv}</p>}
          </div>

          {vm.statusSalvamento.id === funcionario?.id && vm.statusSalvamento.estado === "error" && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {vm.statusSalvamento.mensagem}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button className="w-full" onClick={handleSalvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
