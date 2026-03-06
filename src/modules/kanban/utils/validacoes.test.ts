import { describe, expect, it } from "vitest";
import { obterTelefoneNumericoNovoLead, validarArquivoDocumentoLead, validarDocumentoLeadUrl, validarNovoLead, validarTelefoneLead } from "./validacoes";

describe("validarNovoLead", () => {
  it("valida payload completo para colaborador", () => {
    const resultado = validarNovoLead({
      nome: "Maria da Silva",
      telefone: "(11) 99876-5432",
      valor: "R$ 35.000,00",
      idEstagio: "estagio-1",
      perfil: "COLABORADOR",
      idFuncionario: "usuario-1",
    });

    expect(resultado).toEqual({
      ok: true,
      dados: {
        nome: "Maria da Silva",
        telefone: "(11) 99876-5432",
        valorConsorcio: 35000,
        idEstagio: "estagio-1",
        idFuncionario: "usuario-1",
      },
    });
  });

  it("exige funcionario para perfis de gestao", () => {
    const resultado = validarNovoLead({
      nome: "Maria da Silva",
      telefone: "(11) 99876-5432",
      valor: "R$ 35.000,00",
      idEstagio: "estagio-1",
      perfil: "GERENTE",
    });

    expect(resultado).toEqual({
      ok: false,
      erro: "Selecione um funcionario responsavel.",
    });
  });

  it("rejeita telefone incompleto", () => {
    const resultado = validarNovoLead({
      nome: "Maria da Silva",
      telefone: "1199",
      valor: "R$ 35.000,00",
      idEstagio: "estagio-1",
      perfil: "EMPRESA",
      idFuncionario: "func-1",
    });

    expect(resultado).toEqual({
      ok: false,
      erro: "Informe um telefone valido com DDD.",
    });
  });
});

describe("obterTelefoneNumericoNovoLead", () => {
  it("remove mascara do telefone", () => {
    expect(obterTelefoneNumericoNovoLead("(11) 99876-5432")).toBe("11998765432");
  });
});

describe("validarTelefoneLead", () => {
  it("aceita telefone vazio durante digitacao inicial", () => {
    expect(validarTelefoneLead("")).toBeNull();
  });

  it("rejeita telefone incompleto", () => {
    expect(validarTelefoneLead("1199")).toBe("Revise o telefone. Use DDD e numero completo para evitar erro no contato.");
  });
});

describe("validarDocumentoLeadUrl", () => {
  it("aceita url https valida", () => {
    expect(validarDocumentoLeadUrl("https://exemplo.com/doc.pdf")).toBeNull();
  });

  it("rejeita protocolo invalido", () => {
    expect(validarDocumentoLeadUrl("ftp://exemplo.com/doc.pdf")).toBe("Informe uma URL valida ou envie um arquivo PDF.");
  });
});

describe("validarArquivoDocumentoLead", () => {
  it("aceita pdf menor que 10mb", () => {
    const arquivo = new File([new Uint8Array(1024)], "documento.pdf", { type: "application/pdf" });
    expect(validarArquivoDocumentoLead(arquivo)).toBeNull();
  });

  it("rejeita arquivo que nao seja pdf", () => {
    const arquivo = new File([new Uint8Array(1024)], "documento.png", { type: "image/png" });
    expect(validarArquivoDocumentoLead(arquivo)).toBe("Apenas arquivos PDF sao permitidos.");
  });
});
