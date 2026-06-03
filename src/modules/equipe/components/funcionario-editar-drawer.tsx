"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  User,
  Mail,
  Briefcase,
  MapPin,
  Shield,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  UserMinus,
  History,
  Key,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { alterarSenhaFuncionario } from "@/lib/api/equipe";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./shared/status-badge";
import type { Funcionario, UseEquipeModuleReturn, DadosEdicao } from "../types";

type FuncionarioEditarDrawerProps = {
  vm: UseEquipeModuleReturn;
  funcionario: Funcionario | null;
  aberto: boolean;
  onFechar: () => void;
};

type CampoLabelProps = {
  icon: React.ElementType;
  children: React.ReactNode;
  tooltip: string;
};

function CampoLabel({ icon: Icon, children, tooltip }: CampoLabelProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-foreground-disabled" />
      {children}
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-foreground-disabled transition-colors hover:text-foreground-muted"
        title={tooltip}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </span>
    </label>
  );
}

function ColaboradorAvatar({ nome, tamanho = "lg" }: { nome: string; tamanho?: "sm" | "lg" }) {
  const iniciais = nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cores = [
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
    "bg-lime-500",
    "bg-indigo-500",
    "bg-cyan-500",
  ];

  const indiceCor = nome.charCodeAt(0) % cores.length;
  const tamanhoClasses = tamanho === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-sm";

  return (
    <div
      className={`${tamanhoClasses} flex items-center justify-center rounded-full font-bold text-white shadow-lg ${cores[indiceCor]}`}
    >
      {iniciais}
    </div>
  );
}

export function FuncionarioEditarDrawer({ vm, funcionario, aberto, onFechar }: FuncionarioEditarDrawerProps) {
  const { addToast } = useToast();
  const [dados, setDados] = useState<DadosEdicao | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mostrarMenuAcoes, setMostrarMenuAcoes] = useState(false);

  const [dialogSenhaAberto, setDialogSenhaAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [redefinindoSenha, setRedefinindoSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

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
    setDados({ ...dados, [campo]: valor });
    setErros({});
  };

  const handleSalvar = async () => {
    if (!dados || !funcionario) return;

    const novosErros: Record<string, string> = {};
    if (!dados.nome.trim() || dados.nome.trim().length < 2) {
      novosErros.nome = "Nome deve ter ao menos 2 caracteres.";
    }
    if (dados.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
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

  const handleInativar = () => {
    if (funcionario) {
      vm.abrirModalInativacao(funcionario);
      setMostrarMenuAcoes(false);
    }
  };

  const handleAbrirDialogSenha = () => {
    setNovaSenha("");
    setConfirmarSenha("");
    setErroSenha("");
    setMostrarSenha(false);
    setDialogSenhaAberto(true);
    setMostrarMenuAcoes(false);
  };

  const handleRedefinirSenha = async () => {
    if (!funcionario) return;

    setErroSenha("");

    if (novaSenha.length < 6) {
      setErroSenha("Senha precisa ter ao menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha("Senhas não conferem.");
      return;
    }

    setRedefinindoSenha(true);

    try {
      const resultado = await alterarSenhaFuncionario(funcionario.id, novaSenha);

      if (!resultado.ok) {
        setErroSenha(resultado.erro);
        return;
      }

      addToast({
        type: "success",
        title: "Senha redefinida",
        description: `A senha de ${funcionario.nome} foi alterada com sucesso.`,
        duration: 4000,
      });

      setDialogSenhaAberto(false);
    } catch {
      setErroSenha("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setRedefinindoSenha(false);
    }
  };

  const handleVerHistorico = () => {
    setMostrarMenuAcoes(false);
  };

  const salvando = vm.statusSalvamento.id === funcionario?.id && vm.statusSalvamento.estado === "saving";

  const getCargoLabel = (cargo: string) => {
    const labels: Record<string, string> = {
      COLABORADOR: "Colaborador",
      GERENTE: "Gerente",
      ADMINISTRADOR: "Administrador",
    };
    return labels[cargo] || cargo;
  };

  return (
    <Sheet open={aberto} onOpenChange={(proximoAberto) => { if (!proximoAberto) onFechar(); }}>
      <SheetContent side="right" className="flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="border-b border-border/60 pb-6">
          <div className="flex items-start gap-4">
            <ColaboradorAvatar nome={funcionario?.nome || ""} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="mb-2 text-xl font-bold text-foreground">
                Editar Colaborador
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge ativo={funcionario?.ativo ?? false} />
                <Badge variant="secondary" className="font-medium">
                  <Shield className="mr-1.5 h-3 w-3" />
                  {getCargoLabel(funcionario?.cargo || "")}
                </Badge>
              </div>
            </div>
          </div>
          <SheetDescription className="mt-3 text-sm leading-relaxed text-foreground-muted">
            Atualize as informações do colaborador. Campos marcados com * são obrigatórios.
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <Tabs defaultValue="dados" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/80 p-1">
              <TabsTrigger value="dados" className="gap-1.5 rounded-lg text-sm font-medium">
                <User className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="trabalho" className="gap-1.5 rounded-lg text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                Trabalho
              </TabsTrigger>
              <TabsTrigger value="acesso" className="gap-1.5 rounded-lg text-sm font-medium">
                <Key className="h-4 w-4" />
                Acesso
              </TabsTrigger>
            </TabsList>

            {/* Tab: Dados Pessoais */}
            <TabsContent value="dados" className="mt-6 space-y-5">
              <div className="space-y-2">
                <CampoLabel icon={User} tooltip="Nome completo conforme documento de identidade">
                  Nome completo *
                </CampoLabel>
                <Input
                  value={dados?.nome ?? ""}
                  onChange={(e) => aoMudar("nome", e.target.value)}
                  placeholder="Ex: Maria da Silva Santos"
                  className={cn(
                    "h-12 rounded-xl border-border bg-background text-foreground placeholder:text-foreground-disabled text-base font-medium",
                    "focus:border-ring focus:ring-4 focus:ring-ring/10",
                    erros.nome && "border-destructive/30 bg-destructive/5",
                  )}
                />
                {erros.nome && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {erros.nome}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <CampoLabel icon={Mail} tooltip="E-mail corporativo usado para login e notificações do sistema">
                  E-mail corporativo *
                </CampoLabel>
                <Input
                  type="email"
                  value={dados?.email ?? ""}
                  onChange={(e) => aoMudar("email", e.target.value)}
                  placeholder="Ex: maria.silva@consorcio.com.br"
                  className={cn(
                    "h-12 rounded-xl border-border bg-background text-foreground placeholder:text-foreground-disabled text-base font-medium",
                    "focus:border-ring focus:ring-4 focus:ring-ring/10",
                    erros.email && "border-destructive/30 bg-destructive/5",
                  )}
                />
                {erros.email && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {erros.email}
                  </p>
                )}
                <p className="flex items-center gap-1 text-xs text-foreground-disabled">
                  <HelpCircle className="h-3 w-3" />
                  Usado para login e envio de notificações importantes
                </p>
              </div>
            </TabsContent>

            {/* Tab: Trabalho */}
            <TabsContent value="trabalho" className="mt-6 space-y-5">
              <div className="space-y-2">
                <CampoLabel icon={Shield} tooltip="Nível de acesso e permissões do colaborador no sistema">
                  Cargo / Função *
                </CampoLabel>
                <Select value={dados?.cargo ?? ""} onValueChange={(valor) => aoMudar("cargo", valor)}>
                  <SelectTrigger className={cn(
                    "h-12 rounded-xl border-border bg-background text-base font-medium",
                    "focus:border-ring focus:ring-4 focus:ring-ring/10",
                    erros.cargo && "border-destructive/30 bg-destructive/5",
                  )}>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COLABORADOR">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        Colaborador
                      </div>
                    </SelectItem>
                    <SelectItem value="GERENTE">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-warning" />
                        Gerente
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMINISTRADOR">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-info" />
                        Administrador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {erros.cargo && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {erros.cargo}
                  </p>
                )}
                <p className="flex items-center gap-1 text-xs text-foreground-disabled">
                  <HelpCircle className="h-3 w-3" />
                  Define o nível de acesso e permissões no sistema
                </p>
              </div>

              <div className="space-y-2">
                <CampoLabel icon={MapPin} tooltip="PDV (Ponto de Venda) onde o colaborador irá trabalhar">
                  PDV / Local de trabalho *
                </CampoLabel>
                <Select value={dados?.id_pdv ?? ""} onValueChange={(valor) => aoMudar("id_pdv", valor)}>
                  <SelectTrigger className={cn(
                    "h-12 rounded-xl border-border bg-background text-base font-medium",
                    "focus:border-ring focus:ring-4 focus:ring-ring/10",
                    erros.id_pdv && "border-destructive/30 bg-destructive/5",
                  )}>
                    <SelectValue placeholder="Selecione o PDV" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.pdvs.map((pdv) => (
                      <SelectItem key={pdv.id} value={pdv.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-foreground-disabled" />
                          {pdv.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erros.id_pdv && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {erros.id_pdv}
                  </p>
                )}
                <p className="flex items-center gap-1 text-xs text-foreground-disabled">
                  <HelpCircle className="h-3 w-3" />
                  Ponto de venda onde o colaborador irá operar
                </p>
              </div>
            </TabsContent>

            {/* Tab: Acesso */}
            <TabsContent value="acesso" className="mt-6 space-y-5">
              <div className="rounded-2xl border border-border bg-muted/50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <Key className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Configurações de Acesso</h4>
                    <p className="text-sm text-foreground-muted">Gerencie senhas e permissões</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start gap-3 rounded-xl border-border hover:bg-muted"
                    onClick={handleAbrirDialogSenha}
                  >
                    <Key className="h-4 w-4 text-foreground-muted" />
                    <span className="flex-1 text-left">Redefinir senha</span>
                    <span className="text-xs text-foreground-disabled">Definir nova senha manualmente</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start gap-3 rounded-xl border-border hover:bg-muted"
                    onClick={handleVerHistorico}
                  >
                    <History className="h-4 w-4 text-foreground-muted" />
                    <span className="flex-1 text-left">Ver histórico de alterações</span>
                  </Button>
                </div>
              </div>

              {/* Zona de Perigo */}
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h4 className="text-sm font-semibold text-destructive">Zona de Perigo</h4>
                </div>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-start gap-2 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                  onClick={handleInativar}
                >
                  <UserMinus className="h-4 w-4" />
                  <span className="flex-1 text-left">Inativar colaborador</span>
                </Button>
                <p className="mt-2 text-xs text-destructive/60">
                  O colaborador não conseguirá mais acessar o sistema
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Erro geral de salvamento */}
          {vm.statusSalvamento.id === funcionario?.id && vm.statusSalvamento.estado === "error" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao salvar</p>
                <p className="text-sm text-destructive/80">{vm.statusSalvamento.mensagem}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <SheetFooter className="mt-8 flex-row gap-3 border-t border-border/60 pt-4">
            <div className="relative flex-1">
              <Button
                variant="outline"
                className="h-12 w-full gap-2 rounded-xl border-border font-medium text-foreground-muted hover:bg-muted"
                onClick={() => setMostrarMenuAcoes(!mostrarMenuAcoes)}
                disabled={salvando}
              >
                <MoreHorizontal className="h-4 w-4" />
                Mais ações
              </Button>

              {mostrarMenuAcoes && (
                <div className="absolute bottom-full left-0 right-0 z-10 mb-2 rounded-xl border border-border bg-background-elevated py-2 shadow-lg">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                    onClick={handleVerHistorico}
                  >
                    <History className="h-4 w-4 text-foreground-muted" />
                    Ver histórico
                  </button>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                    onClick={handleAbrirDialogSenha}
                  >
                    <Key className="h-4 w-4 text-foreground-muted" />
                    Redefinir senha
                  </button>
                  <hr className="my-2 border-border" />
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                    onClick={handleInativar}
                  >
                    <UserMinus className="h-4 w-4" />
                    Inativar colaborador
                  </button>
                </div>
              )}
            </div>

            <Button
              className="h-12 min-w-[140px] gap-2 rounded-xl bg-success font-semibold text-success-foreground hover:bg-success/90"
              onClick={handleSalvar}
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>

      {/* Dialog de redefinição de senha */}
      <Dialog open={dialogSenhaAberto} onOpenChange={setDialogSenhaAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-success" />
              Redefinir senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{funcionario?.nome}</strong>.
              A senha deve ter ao menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => { setNovaSenha(e.target.value); setErroSenha(""); }}
                  placeholder="Senha mínima de 6 caracteres"
                  className="h-11 rounded-xl pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-disabled hover:text-foreground-muted"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Confirmar senha
              </label>
              <Input
                type={mostrarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => { setConfirmarSenha(e.target.value); setErroSenha(""); }}
                placeholder="Repita a senha"
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>

            {erroSenha && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {erroSenha}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setDialogSenhaAberto(false)}
              disabled={redefinindoSenha}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 min-w-[120px] gap-2 rounded-xl bg-success font-semibold text-success-foreground hover:bg-success/90"
              onClick={handleRedefinirSenha}
              disabled={redefinindoSenha || !novaSenha || !confirmarSenha}
            >
              {redefinindoSenha ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Redefinir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
