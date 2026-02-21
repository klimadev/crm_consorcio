"use client";

import { DragDropContext, Draggable, DropResult, Droppable } from "@hello-pangea/dnd";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
  formataMoeda,
  normalizaTelefoneParaWhatsapp,
} from "@/lib/utils";

type Estagio = { id: string; nome: string; ordem: number; tipo: string };
type Lead = {
  id: string;
  id_estagio: string;
  id_funcionario: string;
  nome: string;
  telefone: string;
  valor_consorcio: number;
  observacoes: string | null;
  motivo_perda: string | null;
};
type Funcionario = { id: string; nome: string };

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export function ModuloKanban({ perfil, idUsuario }: Props) {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [dialogNovoLeadAberto, setDialogNovoLeadAberto] = useState(false);

  const [movimentoPendente, setMovimentoPendente] = useState<{
    id_lead: string;
    id_estagio: string;
  } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState("");

  const [cargoNovoLead, setCargoNovoLead] = useState<{ id_funcionario: string } | null>(null);
  const [estagioNovoLead, setEstagioNovoLead] = useState("");
  const [telefoneNovoLead, setTelefoneNovoLead] = useState("");
  const [valorNovoLead, setValorNovoLead] = useState("");
  const [erroNovoLead, setErroNovoLead] = useState<string | null>(null);
  const [erroDetalhesLead, setErroDetalhesLead] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      const resposta = await fetch("/api/leads");
      if (!resposta.ok || !ativo) return;
      const json = await resposta.json();
      setEstagios(json.estagios ?? []);
      setLeads(json.leads ?? []);
      setFuncionarios(json.funcionarios ?? []);
    };

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  const leadsPorEstagio = useMemo(() => {
    const mapa: Record<string, Lead[]> = {};
    for (const estagio of estagios) {
      mapa[estagio.id] = [];
    }
    for (const lead of leads) {
      if (mapa[lead.id_estagio]) {
        mapa[lead.id_estagio].push(lead);
      }
    }
    return mapa;
  }, [estagios, leads]);

  async function moverLead(idLead: string, idEstagio: string, motivo?: string) {
    const leadAnterior = leads.find((item) => item.id === idLead);
    if (!leadAnterior) return false;

    setLeads((atual) =>
      atual.map((item) =>
        item.id === idLead
          ? {
              ...item,
              id_estagio: idEstagio,
              motivo_perda: motivo?.trim() ? motivo.trim() : null,
            }
          : item,
      ),
    );

    const resposta = await fetch(`/api/leads/${idLead}/mover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: idEstagio, motivo_perda: motivo }),
    });

    if (!resposta.ok) {
      setLeads((atual) =>
        atual.map((item) => (item.id === idLead ? leadAnterior : item)),
      );
      return false;
    }

    const json = (await resposta.json()) as { lead?: Lead };
    if (json.lead) {
      const leadAtualizado = json.lead;
      setLeads((atual) => atual.map((item) => (item.id === idLead ? leadAtualizado : item)));
    }

    return true;
  }

  async function aoDragEnd(resultado: DropResult) {
    if (!resultado.destination) return;

    const idLead = resultado.draggableId;
    const idEstagioDestino = resultado.destination.droppableId;

    const lead = leads.find((item) => item.id === idLead);
    if (!lead || lead.id_estagio === idEstagioDestino) return;

    const estagioDestino = estagios.find((item) => item.id === idEstagioDestino);
    if (!estagioDestino) return;

    if (estagioDestino.tipo === "PERDIDO") {
      setMovimentoPendente({ id_lead: idLead, id_estagio: idEstagioDestino });
      return;
    }

    await moverLead(idLead, idEstagioDestino);
  }

  async function confirmarPerda(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!movimentoPendente || !motivoPerda.trim()) return;
    const sucesso = await moverLead(
      movimentoPendente.id_lead,
      movimentoPendente.id_estagio,
      motivoPerda.trim(),
    );
    if (!sucesso) return;
    setMovimentoPendente(null);
    setMotivoPerda("");
  }

  async function criarLead(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroNovoLead(null);
    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nome") ?? "").trim();
    const id_estagio = String(dados.get("id_estagio") ?? "");

    const id_funcionario =
      perfil === "COLABORADOR"
        ? idUsuario
        : cargoNovoLead?.id_funcionario ?? String(dados.get("id_funcionario") ?? "");

    const telefone = telefoneNovoLead;
    const valor_consorcio = converteMoedaBrParaNumero(valorNovoLead);

    const idTemporario = `temp-${Date.now()}`;
    const leadTemporario: Lead = {
      id: idTemporario,
      id_estagio,
      id_funcionario,
      nome,
      telefone,
      valor_consorcio,
      observacoes: null,
      motivo_perda: null,
    };

    setLeads((atual) => [leadTemporario, ...atual]);

    const resposta = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        telefone,
        valor_consorcio,
        id_estagio,
        id_funcionario,
      }),
    });

    if (!resposta.ok) {
      const json = await resposta.json();
      setErroNovoLead(json.erro ?? "Erro ao criar lead.");
      setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
      return;
    }

    const json = (await resposta.json()) as { lead?: Lead };

    if (json.lead) {
      const leadCriado = json.lead;
      setLeads((atual) =>
        atual.map((item) => (item.id === idTemporario ? leadCriado : item)),
      );
    } else {
      setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
    }

    evento.currentTarget.reset();
    setEstagioNovoLead("");
    setCargoNovoLead(null);
    setTelefoneNovoLead("");
    setValorNovoLead("");
    setDialogNovoLeadAberto(false);
  }

  async function salvarDetalhesLead() {
    if (!leadSelecionado) return;
    setErroDetalhesLead(null);

    const resposta = await fetch(`/api/leads/${leadSelecionado.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observacoes: leadSelecionado.observacoes,
        telefone: leadSelecionado.telefone,
        valor_consorcio: Number(leadSelecionado.valor_consorcio),
      }),
    });

    if (!resposta.ok) {
      const json = await resposta.json();
      setErroDetalhesLead(json.erro ?? "Erro ao salvar lead.");
      return;
    }

    const json = (await resposta.json()) as { lead?: Lead };
    if (json.lead) {
      const leadAtualizado = json.lead;
      setLeads((atual) => atual.map((item) => (item.id === leadAtualizado.id ? leadAtualizado : item)));
      setLeadSelecionado(leadAtualizado);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kanban</h1>
          <p className="text-sm text-sky-500">Funil de vendas com arrastar e soltar.</p>
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
            <Button>Novo Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar lead</DialogTitle>
            </DialogHeader>

            <form className="space-y-3" onSubmit={criarLead}>
              <Input name="nome" placeholder="Nome" required />
              <Input
                name="telefone"
                placeholder="Telefone"
                value={telefoneNovoLead}
                onChange={(e) => setTelefoneNovoLead(aplicaMascaraTelefoneBr(e.target.value))}
                required
              />
              <Input
                name="valor_consorcio"
                placeholder="Valor"
                inputMode="numeric"
                value={valorNovoLead}
                onChange={(e) => setValorNovoLead(aplicaMascaraMoedaBr(e.target.value))}
                required
              />

              <input type="hidden" name="id_estagio" value={estagioNovoLead} />

              <Select value={estagioNovoLead} onValueChange={setEstagioNovoLead}>
                <SelectTrigger>
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
                  <SelectTrigger>
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

              {erroNovoLead ? <p className="text-sm text-red-600">{erroNovoLead}</p> : null}

              <Button className="w-full">Salvar lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={aoDragEnd}>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {estagios.map((estagio) => (
            <Droppable key={estagio.id} droppableId={estagio.id}>
              {(provided) => (
                <div
                  className="rounded-lg border border-sky-200 bg-white p-3"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <p className="mb-3 text-sm font-semibold">
                    {estagio.nome} ({leadsPorEstagio[estagio.id]?.length ?? 0})
                  </p>

                  <div className="space-y-2">
                    {(leadsPorEstagio[estagio.id] ?? []).map((lead, index) => (
                      <Draggable
                        key={lead.id}
                        draggableId={lead.id}
                        index={index}
                        isDragDisabled={lead.id.startsWith("temp-")}
                      >
                        {(draggableProvided) => (
                          <OptimisticSync active={lead.id.startsWith("temp-")} className="cursor-wait">
                            <Card
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer"}
                              onClick={() => {
                                if (lead.id.startsWith("temp-")) return;
                                setLeadSelecionado(lead);
                              }}
                            >
                              <CardContent className="p-3">
                                <p className="text-sm font-medium">{lead.nome}</p>
                                <p className="text-xs text-sky-500">{lead.telefone}</p>
                                <p className="mt-1 text-sm">{formataMoeda(lead.valor_consorcio)}</p>
                              </CardContent>
                            </Card>
                          </OptimisticSync>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Dialog open={Boolean(movimentoPendente)} onOpenChange={(aberto) => !aberto && setMovimentoPendente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de perda</DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={confirmarPerda}>
            <Textarea value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} required />
            <Button className="w-full">Confirmar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Drawer open={Boolean(leadSelecionado)} onOpenChange={(aberto) => !aberto && setLeadSelecionado(null)}>
        <DrawerContent className="mx-auto w-full max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{leadSelecionado?.nome}</DrawerTitle>
            <DrawerDescription>Detalhes do lead e observacoes.</DrawerDescription>
          </DrawerHeader>

          {leadSelecionado ? (
            <div className="space-y-3 p-2 pb-6">
              <Input
                value={leadSelecionado.telefone}
                onChange={(e) =>
                  setLeadSelecionado({
                    ...leadSelecionado,
                    telefone: aplicaMascaraTelefoneBr(e.target.value),
                  })
                }
              />
              <Input
                inputMode="numeric"
                value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
                onChange={(e) =>
                  setLeadSelecionado({
                    ...leadSelecionado,
                    valor_consorcio: converteMoedaBrParaNumero(e.target.value),
                  })
                }
              />
              <Textarea
                placeholder="Observacoes"
                value={leadSelecionado.observacoes ?? ""}
                onChange={(e) =>
                  setLeadSelecionado({
                    ...leadSelecionado,
                    observacoes: e.target.value,
                  })
                }
              />

              {leadSelecionado.motivo_perda ? (
                <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  Motivo da perda: {leadSelecionado.motivo_perda}
                </p>
              ) : null}

              {erroDetalhesLead ? <p className="text-sm text-red-600">{erroDetalhesLead}</p> : null}

              <div className="flex gap-2">
                <Button onClick={salvarDetalhesLead}>Salvar</Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${normalizaTelefoneParaWhatsapp(leadSelecionado.telefone)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chamar no WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
