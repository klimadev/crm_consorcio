import { useCallback, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Lead, Props, Estagio } from "../types";
import { obterMensagemErroKanban, MENSAGENS_FALLBACK_KANBAN } from "../utils/erro";
import { validarNovoLead } from "../utils/validacoes";
import { useToast } from "@/components/ui/toast";
import {
  criarLeadKanban,
  excluirLeadKanban,
  redistribuirLeadsEmAtendimentoKanban,
  sincronizarWhatsappKanban,
} from "@/lib/api/kanban";

type UseKanbanOperacoesParams = {
  perfil: Props["perfil"];
  idUsuario: string;
  telefoneNovoLead: string;
  valorNovoLead: string;
  cargoNovoLead: { id_funcionario: string } | null;
  setLeads: Dispatch<SetStateAction<Lead[]>>;
  setLeadSelecionado: (lead: Lead | null) => void;
  setDialogNovoLeadAberto: (aberto: boolean) => void;
  setCargoNovoLead: (cargo: { id_funcionario: string } | null) => void;
  setEstagioNovoLead: (estagio: string) => void;
  setTelefoneNovoLead: (telefone: string) => void;
  setValorNovoLead: (valor: string) => void;
  bootstrap: () => Promise<void>;
  setErroDetalhesLead: (erro: string | null) => void;
  aoSincronizarWhatsapp?: (timestamp: Date) => void;
};

type ResultadoSincronizacaoWhatsapp =
  | { ok: false; erro: string }
  | {
      ok: true;
      criados: number;
      instanciasIgnoradas: Array<{ id: string; nome: string; motivo: string }>;
    };

export function useKanbanOperacoes({
  perfil,
  idUsuario,
  telefoneNovoLead,
  valorNovoLead,
  cargoNovoLead,
  setLeads,
  setLeadSelecionado,
  setDialogNovoLeadAberto,
  setCargoNovoLead,
  setEstagioNovoLead,
  setTelefoneNovoLead,
  setValorNovoLead,
  bootstrap,
  setErroDetalhesLead,
  aoSincronizarWhatsapp,
}: UseKanbanOperacoesParams) {
  const { addToast } = useToast();
  const [erroNovoLead, setErroNovoLead] = useState<string | null>(null);
  const [criandoLead, setCriandoLead] = useState(false);
  const [sincronizandoWhatsapp, setSincronizandoWhatsapp] = useState(false);
  const [redistribuindoEmAtendimento, setRedistribuindoEmAtendimento] = useState(false);

  const criarLead = useCallback(
    async (evento: FormEvent<HTMLFormElement>) => {
      evento.preventDefault();

      if (criandoLead) {
        return;
      }

      setErroNovoLead(null);
      const dados = new FormData(evento.currentTarget);
      const idFuncionario =
        perfil === "COLABORADOR"
          ? idUsuario
          : cargoNovoLead?.id_funcionario ?? String(dados.get("id_funcionario") ?? "");

      const validacao = validarNovoLead({
        nome: String(dados.get("nome") ?? ""),
        telefone: telefoneNovoLead,
        valor: valorNovoLead,
        idEstagio: String(dados.get("id_estagio") ?? ""),
        idFuncionario,
        perfil,
      });

      if (!validacao.ok) {
        setErroNovoLead(validacao.erro);
        return;
      }

      const { nome, telefone, valorConsorcio, idEstagio } = validacao.dados;
      const id_funcionario = perfil === "COLABORADOR" ? idUsuario : validacao.dados.idFuncionario;

      const idTemporario = `temp-${Date.now()}`;
      const agoraIso = new Date().toISOString();
      const leadTemporario: Lead = {
        id: idTemporario,
        id_estagio: idEstagio,
        id_funcionario,
        nome,
        telefone,
        valor_consorcio: valorConsorcio,
        observacoes: null,
        motivo_perda: null,
        documento_aprovacao_url: null,
        aprovado_em: null,
        aprovado_por: null,
        criado_em: agoraIso,
        atualizado_em: agoraIso,
      };

      setCriandoLead(true);
      setLeads((atual) => [leadTemporario, ...atual]);

      try {
        const resposta = await criarLeadKanban({
          nome,
          telefone,
          valor_consorcio: valorConsorcio,
          id_estagio: idEstagio,
          id_funcionario,
        });

        if (!resposta.ok) {
          setErroNovoLead(resposta.erro ?? MENSAGENS_FALLBACK_KANBAN.criarLead);
          setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
          return;
        }

        if (resposta.dados.lead) {
          const leadCriado = resposta.dados.lead;
          setLeads((atual) => atual.map((item) => (item.id === idTemporario ? leadCriado : item)));
        } else {
          setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
        }

        addToast({
          type: "success",
          title: "Lead criado",
          description: `${nome} foi adicionado ao Kanban.`,
        });

        evento.currentTarget?.reset();
        setEstagioNovoLead("");
        setCargoNovoLead(null);
        setTelefoneNovoLead("");
        setValorNovoLead("");
        setDialogNovoLeadAberto(false);
      } catch (erro) {
        setErroNovoLead(obterMensagemErroKanban(erro, MENSAGENS_FALLBACK_KANBAN.criarLead));
        setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
      } finally {
        setCriandoLead(false);
      }
    },
    [
      criandoLead,
      perfil,
      idUsuario,
      cargoNovoLead,
      telefoneNovoLead,
      valorNovoLead,
      setLeads,
      setEstagioNovoLead,
      setCargoNovoLead,
      setTelefoneNovoLead,
      setValorNovoLead,
      setDialogNovoLeadAberto,
      addToast,
    ],
  );

  const sincronizarWhatsapp = useCallback(async (params?: string): Promise<ResultadoSincronizacaoWhatsapp> => {
    if (sincronizandoWhatsapp) {
      return { ok: false, erro: "Sincronizacao ja em andamento." };
    }

    setSincronizandoWhatsapp(true);
    try {
      const resposta = await sincronizarWhatsappKanban(params);
      if (!resposta.ok) {
        return { ok: false, erro: resposta.erro ?? MENSAGENS_FALLBACK_KANBAN.sincronizarWhatsapp };
      }

      // Atualizar timestamp da última sincronização
      if (resposta.dados.timestamp_sync && aoSincronizarWhatsapp) {
        aoSincronizarWhatsapp(new Date(resposta.dados.timestamp_sync));
      }

      await bootstrap();
      return {
        ok: true,
        criados: resposta.dados.criados,
        instanciasIgnoradas: resposta.dados.instancias_ignoradas,
      };
    } catch (erro) {
      return { ok: false, erro: obterMensagemErroKanban(erro, MENSAGENS_FALLBACK_KANBAN.sincronizarWhatsapp) };
    } finally {
      setSincronizandoWhatsapp(false);
    }
  }, [bootstrap, sincronizandoWhatsapp, aoSincronizarWhatsapp]);

  const excluirLead = useCallback(
    async (id: string) => {
      try {
        const resposta = await excluirLeadKanban(id);
        if (resposta.ok) {
          setLeads((atual) => atual.filter((item) => item.id !== id));
          setLeadSelecionado(null);
          addToast({
            type: "success",
            title: "Lead excluido",
            description: "O lead foi removido com sucesso.",
          });
          return;
        }

        const mensagemErro = resposta.erro ?? MENSAGENS_FALLBACK_KANBAN.excluirLead;
        setErroDetalhesLead(mensagemErro);
        throw new Error(mensagemErro);
      } catch (erro) {
        const mensagemErro = obterMensagemErroKanban(erro, MENSAGENS_FALLBACK_KANBAN.excluirLead);
        setErroDetalhesLead(mensagemErro);
        throw new Error(mensagemErro);
      }
    },
    [addToast, setLeads, setLeadSelecionado, setErroDetalhesLead],
  );

  const redistribuirLeadsEmAtendimento = useCallback(async (modo?: "indefinidos" | "parados") => {
    if (redistribuindoEmAtendimento) {
      return { ok: false as const, erro: "Redistribuicao ja em andamento." };
    }

    setRedistribuindoEmAtendimento(true);
    try {
      const resposta = await redistribuirLeadsEmAtendimentoKanban({ modo });
      if (!resposta.ok) {
        return { ok: false as const, erro: resposta.erro ?? MENSAGENS_FALLBACK_KANBAN.redistribuirEmAtendimento };
      }

      await bootstrap();

      return {
        ok: true as const,
        ...resposta.dados,
      };
    } catch (erro) {
      return { ok: false as const, erro: obterMensagemErroKanban(erro, MENSAGENS_FALLBACK_KANBAN.redistribuirEmAtendimento) };
    } finally {
      setRedistribuindoEmAtendimento(false);
    }
  }, [bootstrap, redistribuindoEmAtendimento]);

  const excluirTodosIndefinidos = useCallback(
    async (leads: Lead[], estagios: Estagio[]) => {
      const estagioIndefinido = estagios.find((e) => e.nome === "Indefinido");
      if (!estagioIndefinido) return;

      const leadsIndefinidos = leads.filter((l) => l.id_estagio === estagioIndefinido.id);
      if (leadsIndefinidos.length === 0) return;

      const resultados = await Promise.allSettled(
        leadsIndefinidos.map((lead) => excluirLeadKanban(lead.id))
      );

      const erros = resultados.filter((r) => r.status === "rejected" || r.value?.ok === false);
      
      setLeads((atual) => atual.filter((l) => l.id_estagio !== estagioIndefinido.id));
      
      if (erros.length === 0) {
        addToast({
          type: "success",
          title: "Leads apagados",
          description: `${leadsIndefinidos.length} leads indefinidos foram removidos.`,
        });
      } else {
        addToast({
          type: "warning",
          title: "Leads parcialmente removidos",
          description: `${leadsIndefinidos.length - erros.length} removidos, ${erros.length} falharam.`,
        });
      }
    },
    [addToast, setLeads],
  );

  return {
    erroNovoLead,
    setErroNovoLead,
    criandoLead,
    sincronizandoWhatsapp,
    redistribuindoEmAtendimento,
    criarLead,
    sincronizarWhatsapp,
    redistribuirLeadsEmAtendimento,
    excluirLead,
    excluirTodosIndefinidos,
  };
}
