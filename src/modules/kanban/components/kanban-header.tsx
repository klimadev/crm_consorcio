import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
} from "@/lib/utils";
import type { Estagio, Funcionario } from "../types";

type KanbanHeaderProps = {
  dialogNovoLeadAberto: boolean;
  setDialogNovoLeadAberto: (aberto: boolean) => void;
  criarLead: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  estagios: Estagio[];
  funcionarios: Funcionario[];
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  telefoneNovoLead: string;
  setTelefoneNovoLead: (telefone: string) => void;
  valorNovoLead: string;
  setValorNovoLead: (valor: string) => void;
  erroNovoLead: string | null;
  setErroNovoLead: (erro: string | null) => void;
  estagioAberto: string;
  estagioNovoLead: string;
  setEstagioNovoLead: (estagio: string) => void;
  cargoNovoLead: { id_funcionario: string } | null;
  setCargoNovoLead: (cargo: { id_funcionario: string } | null) => void;
};

export function KanbanHeader({
  dialogNovoLeadAberto,
  setDialogNovoLeadAberto,
  criarLead,
  estagios,
  funcionarios,
  perfil,
  telefoneNovoLead,
  setTelefoneNovoLead,
  valorNovoLead,
  setValorNovoLead,
  erroNovoLead,
  setErroNovoLead,
  estagioAberto,
  estagioNovoLead,
  setEstagioNovoLead,
  cargoNovoLead,
  setCargoNovoLead,
}: KanbanHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0.0,0,04)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Kanban</h1>
          <p className="text-sm text-slate-500">Funil de vendas com arrastar e soltar.</p>
        </div>
      </div>

      <Dialog
        open={dialogNovoLeadAberto}
        onOpenChange={(aberto) => {
          setDialogNovoLeadAberto(aberto);
          if (!aberto) {
            setErroNovoLead(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo lead
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar lead</DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={criarLead}>
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              name="nome"
              placeholder="Nome"
              required
            />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              name="telefone"
              placeholder="Telefone"
              value={telefoneNovoLead}
              onChange={(e) => setTelefoneNovoLead(aplicaMascaraTelefoneBr(e.target.value))}
              required
            />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              name="valor_consorcio"
              placeholder="Valor"
              inputMode="numeric"
              value={valorNovoLead}
              onChange={(e) => setValorNovoLead(aplicaMascaraMoedaBr(e.target.value))}
              required
            />

            <input type="hidden" name="id_estagio" value={estagioNovoLead || estagioAberto} />

            <Select value={estagioNovoLead || estagioAberto} onValueChange={setEstagioNovoLead}>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                <SelectValue placeholder="Estagio" />
              </SelectTrigger>
              <SelectContent>
                {estagios.map((estagio) => (
                  <SelectItem key={estagio.id} value={estagio.id}>
                    {estagio.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {perfil !== "COLABORADOR" ? (
              <Select
                onValueChange={(valor) => setCargoNovoLead({ id_funcionario: valor })}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                  <SelectValue placeholder="Funcionario" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((funcionario) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {erroNovoLead ? <p className="text-sm font-medium text-red-600">{erroNovoLead}</p> : null}

            <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">
              Criar lead
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
