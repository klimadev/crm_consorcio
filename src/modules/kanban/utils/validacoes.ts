import { converteMoedaBrParaNumero } from "@/lib/utils";
import type { Props } from "../types";

export type DadosValidacaoNovoLead = {
  nome: string;
  telefone: string;
  valor: string;
  idEstagio: string;
  idFuncionario?: string | null;
  perfil: Props["perfil"];
};

export type ResultadoValidacaoNovoLead =
  | {
    ok: true;
    dados: {
      nome: string;
      telefone: string;
      valorConsorcio: number;
      idEstagio: string;
      idFuncionario: string;
    };
  }
  | {
    ok: false;
    erro: string;
  };

function extrairDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarTelefoneLead(telefone: string): string | null {
  const telefoneNumerico = extrairDigitos(telefone.trim());

  if (!telefoneNumerico.length) return null;

  if (telefoneNumerico.length < 10 || telefoneNumerico.length > 11) {
    return "Revise o telefone. Use DDD e numero completo para evitar erro no contato.";
  }

  return null;
}

export function validarDocumentoLeadUrl(url: string): string | null {
  const urlNormalizada = url.trim();

  if (!urlNormalizada) return null;

  try {
    const urlValidada = new URL(urlNormalizada);
    if (!["http:", "https:"].includes(urlValidada.protocol)) {
      return "Informe uma URL valida ou envie um arquivo PDF.";
    }

    return null;
  } catch {
    return "Informe uma URL valida ou envie um arquivo PDF.";
  }
}

export function validarArquivoDocumentoLead(arquivo: File): string | null {
  if (arquivo.type !== "application/pdf") {
    return "Apenas arquivos PDF sao permitidos.";
  }

  if (arquivo.size > 10 * 1024 * 1024) {
    return "Arquivo muito grande. Maximo 10MB.";
  }

  return null;
}

export function validarNovoLead(dados: DadosValidacaoNovoLead): ResultadoValidacaoNovoLead {
  const nome = dados.nome.trim();
  const telefone = dados.telefone.trim();
  const idEstagio = dados.idEstagio.trim();
  const idFuncionario = dados.idFuncionario?.trim() ?? "";
  const valorConsorcio = converteMoedaBrParaNumero(dados.valor);

  if (nome.length < 3) {
    return { ok: false, erro: "Informe o nome completo do lead." };
  }

  if (validarTelefoneLead(telefone)) {
    return { ok: false, erro: "Informe um telefone valido com DDD." };
  }

  if (!Number.isFinite(valorConsorcio) || valorConsorcio <= 0) {
    return { ok: false, erro: "Informe um valor de consorcio maior que zero." };
  }

  if (!idEstagio) {
    return { ok: false, erro: "Selecione um estagio para o lead." };
  }

  if (dados.perfil !== "COLABORADOR" && !idFuncionario) {
    return { ok: false, erro: "Selecione um funcionario responsavel." };
  }

  return {
    ok: true,
    dados: {
      nome,
      telefone,
      valorConsorcio,
      idEstagio,
      idFuncionario,
    },
  };
}

export function obterTelefoneNumericoNovoLead(telefone: string): string {
  return extrairDigitos(telefone);
}
