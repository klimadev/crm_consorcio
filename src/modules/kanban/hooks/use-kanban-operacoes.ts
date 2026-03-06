import { useCallback, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { converteMoedaBrParaNumero } from "@/lib/utils";
import type { Lead, Props } from "../types";
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
}: UseKanbanOperacoesParams) {
  const [erroNovoLead, setErroNovoLead] = useState<string | null>(null);
  const [sincronizandoWhatsapp, setSincronizandoWhatsapp] = useState(false);
  const [redistribuindoEmAtendimento, setRedistribuindoEmAtendimento] = useState(false);

  const criarLead = useCallback(
    async (evento: FormEvent<HTMLFormElement>) => {
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
        documento_aprovacao_url: null,
        aprovado_em: null,
        aprovado_por: null,
        atualizado_em: new Date().toISOString(),
      };

      setLeads((atual) => [leadTemporario, ...atual]);

      const resposta = await criarLeadKanban({
        nome,
        telefone,
        valor_consorcio,
        id_estagio,
        id_funcionario,
      });

      if (!resposta.ok) {
        setErroNovoLead(resposta.erro);
        setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
        return;
      }

      if (resposta.dados.lead) {
        const leadCriado = resposta.dados.lead;
        setLeads((atual) => atual.map((item) => (item.id === idTemporario ? leadCriado : item)));
      } else {
        setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
      }

      evento.currentTarget?.reset();
      setEstagioNovoLead("");
      setCargoNovoLead(null);
      setTelefoneNovoLead("");
      setValorNovoLead("");
      setDialogNovoLeadAberto(false);
    },
    [
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
    ],
  );

  const sincronizarWhatsapp = useCallback(async () => {
    if (sincronizandoWhatsapp) {
      return { ok: false, erro: "Sincronizacao ja em andamento." };
    }

    setSincronizandoWhatsapp(true);
    try {
      const resposta = await sincronizarWhatsappKanban();
      if (!resposta.ok) {
        return { ok: false, erro: resposta.erro };
      }

      await bootstrap();
      return { ok: true, criados: resposta.dados.criados };
    } catch {
      return { ok: false, erro: "Erro ao sincronizar contatos do WhatsApp." };
    } finally {
      setSincronizandoWhatsapp(false);
    }
  }, [bootstrap, sincronizandoWhatsapp]);

  const excluirLead = useCallback(
    async (id: string) => {
      const resposta = await excluirLeadKanban(id);
      if (resposta.ok) {
        setLeads((atual) => atual.filter((item) => item.id !== id));
        setLeadSelecionado(null);
        return;
      }

      setErroDetalhesLead(resposta.erro);
    },
    [setLeads, setLeadSelecionado, setErroDetalhesLead],
  );

  const redistribuirLeadsEmAtendimento = useCallback(async () => {
    if (redistribuindoEmAtendimento) {
      return { ok: false as const, erro: "Redistribuicao ja em andamento." };
    }

    setRedistribuindoEmAtendimento(true);
    try {
      const resposta = await redistribuirLeadsEmAtendimentoKanban({});
      if (!resposta.ok) {
        return { ok: false as const, erro: resposta.erro };
      }

      await bootstrap();

      return {
        ok: true as const,
        ...resposta.dados,
      };
    } catch {
      return { ok: false as const, erro: "Erro ao redistribuir leads em atendimento." };
    } finally {
      setRedistribuindoEmAtendimento(false);
    }
  }, [bootstrap, redistribuindoEmAtendimento]);

  return {
    erroNovoLead,
    setErroNovoLead,
    sincronizandoWhatsapp,
    redistribuindoEmAtendimento,
    criarLead,
    sincronizarWhatsapp,
    redistribuirLeadsEmAtendimento,
    excluirLead,
  };
}
