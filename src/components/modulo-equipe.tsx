"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Pdv = { id: string; nome: string };
type Funcionario = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  pdv: { id: string; nome: string };
};

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
};

export function ModuloEquipe({ perfil }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState("COLABORADOR");
  const [pdvSelecionado, setPdvSelecionado] = useState("");
  const [dialogNovoFuncionarioAberto, setDialogNovoFuncionarioAberto] = useState(false);

  // Auto-save states
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<{ nome: string; email: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      const [resFuncionarios, resPdvs] = await Promise.all([
        fetch("/api/funcionarios"),
        fetch("/api/pdvs"),
      ]);

      if (!ativo) return;

      if (resFuncionarios.ok) {
        const json = await resFuncionarios.json();
        setFuncionarios(json.funcionarios ?? []);
      }

      if (resPdvs.ok) {
        const json = await resPdvs.json();
        setPdvs(json.pdvs ?? []);
      }
    };

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  // Função de auto-save para funcionário
  const salvarFuncionario = useCallback(async (id: string, dados: { nome: string; email: string }) => {
    setSalvando(true);
    setSalvo(false);
    setErro(null);

    try {
      const resposta = await fetch(`/api/funcionarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        const json = await resposta.json();
        setErro(json.erro ?? "Erro ao salvar.");
        setSalvando(false);
        return;
      }

      // Atualizar lista local
      setFuncionarios((atual) =>
        atual.map((item) =>
          item.id === id ? { ...item, nome: dados.nome, email: dados.email } : item
        )
      );

      setSalvando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch {
      setErro("Erro ao salvar.");
      setSalvando(false);
    }
  }, []);

  // Iniciar edição de funcionário
  function iniciarEdicao(funcionario: Funcionario) {
    setEditandoId(funcionario.id);
    setDadosEdicao({ nome: funcionario.nome, email: funcionario.email });
  }

  // Cancelar edição
  function cancelarEdicao() {
    setEditandoId(null);
    setDadosEdicao(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }

  // Mudar dados de edição - com debounce
  function aoMudarDado(campo: "nome" | "email", valor: string) {
    if (!dadosEdicao || !editandoId) return;

    const novosDados = { ...dadosEdicao, [campo]: valor };
    setDadosEdicao(novosDados);

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-save após 1 segundo
    timeoutRef.current = setTimeout(() => {
      salvarFuncionario(editandoId, novosDados);
    }, 1000);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function adicionarFuncionario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = new FormData(evento.currentTarget);

    const resposta = await fetch("/api/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: dados.get("nome"),
        email: dados.get("email"),
        senha: dados.get("senha"),
        cargo: dados.get("cargo"),
        id_pdv: dados.get("id_pdv"),
      }),
    });

    if (!resposta.ok) {
      const json = await resposta.json();
      setErro(json.erro ?? "Erro ao cadastrar funcionario");
      return;
    }

    const json = (await resposta.json()) as {
      funcionario?: {
        id: string;
        nome: string;
        email: string;
        cargo: string;
        ativo: boolean;
        id_pdv: string;
      };
    };

    if (json.funcionario) {
      const funcionarioCriado = json.funcionario;
      const pdv = pdvs.find((item) => item.id === funcionarioCriado.id_pdv);
      setFuncionarios((atual) => [
        {
          id: funcionarioCriado.id,
          nome: funcionarioCriado.nome,
          email: funcionarioCriado.email,
          cargo: funcionarioCriado.cargo,
          ativo: funcionarioCriado.ativo,
          pdv: { id: pdv?.id ?? funcionarioCriado.id_pdv, nome: pdv?.nome ?? "" },
        },
        ...atual,
      ]);
    }

    evento.currentTarget.reset();
    setCargoSelecionado("COLABORADOR");
    setPdvSelecionado("");
    setDialogNovoFuncionarioAberto(false);
  }

  async function inativarFuncionario(id: string) {
    const funcionarioAnterior = funcionarios.find((item) => item.id === id);
    if (!funcionarioAnterior) return;

    setFuncionarios((atual) =>
      atual.map((item) => (item.id === id ? { ...item, ativo: false } : item)),
    );

    const resposta = await fetch(`/api/funcionarios/${id}/inativar`, { method: "PATCH" });

    if (!resposta.ok) {
      setFuncionarios((atual) =>
        atual.map((item) => (item.id === id ? funcionarioAnterior : item)),
      );
    }
  }

  if (perfil === "COLABORADOR") {
    return <p className="text-sm text-sky-600">Sem permissao para acessar equipe.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-sky-500">
            {salvando && <span className="text-amber-600">Salvando...</span>}
            {salvo && !salvando && <span className="text-green-600">Salvo ✓</span>}
            {!salvando && !salvo && "Gestao de funcionarios da empresa."}
          </p>
        </div>

        <Dialog
          open={dialogNovoFuncionarioAberto}
          onOpenChange={(aberto) => {
            setDialogNovoFuncionarioAberto(aberto);
            if (!aberto) {
              setErro(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>+ Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar funcionario</DialogTitle>
            </DialogHeader>

            <form className="space-y-3" onSubmit={adicionarFuncionario}>
              <Input name="nome" placeholder="Nome" required />
              <Input name="email" type="email" placeholder="E-mail" required />
              <Input name="senha" type="password" placeholder="Senha" required />

              <input type="hidden" name="cargo" value={cargoSelecionado} />
              <input type="hidden" name="id_pdv" value={pdvSelecionado} />

              <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                  <SelectItem value="GERENTE">GERENTE</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pdvSelecionado} onValueChange={setPdvSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="PDV" />
                </SelectTrigger>
                <SelectContent>
                  {pdvs.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>
                      {pdv.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

              <Button className="w-full" type="submit">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>PDV</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funcionarios.map((funcionario) => (
            <TableRow key={funcionario.id}>
              {/* Nome editável inline */}
              <TableCell>
                {editandoId === funcionario.id && dadosEdicao ? (
                  <Input
                    value={dadosEdicao.nome}
                    onChange={(e) => aoMudarDado("nome", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-sky-600"
                    onClick={() => iniciarEdicao(funcionario)}
                    title="Clique para editar"
                  >
                    {funcionario.nome}
                  </span>
                )}
              </TableCell>
              
              {/* Email editável inline */}
              <TableCell>
                {editandoId === funcionario.id && dadosEdicao ? (
                  <Input
                    value={dadosEdicao.email}
                    onChange={(e) => aoMudarDado("email", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-sky-600"
                    onClick={() => iniciarEdicao(funcionario)}
                    title="Clique para editar"
                  >
                    {funcionario.email}
                  </span>
                )}
              </TableCell>
              
              <TableCell>{funcionario.cargo}</TableCell>
              <TableCell>{funcionario.pdv?.nome}</TableCell>
              <TableCell>
                <span className={funcionario.ativo ? "text-green-600" : "text-red-500"}>
                  {funcionario.ativo ? "Ativo" : "Inativo"}
                </span>
              </TableCell>
              <TableCell>
                {editandoId === funcionario.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={cancelarEdicao}>
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => {
                        inativarFuncionario(funcionario.id);
                        cancelarEdicao();
                      }}
                    >
                      Inativar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => iniciarEdicao(funcionario)}>
                      Editar
                    </Button>
                    {funcionario.ativo && (
                      <Button size="sm" variant="destructive" onClick={() => inativarFuncionario(funcionario.id)}>
                        Inativar
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
