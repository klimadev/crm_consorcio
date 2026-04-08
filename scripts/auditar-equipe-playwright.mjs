#!/usr/bin/env node

import fs from "fs";
import path from "path";

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { chromium, request } from "playwright";

const NOME_COOKIE_SESSAO = "crm_consorcio_sessao";
const BASE_URL_PADRAO = "http://127.0.0.1:3333";

function carregarEnvLocal() {
  const caminhoEnv = path.join(process.cwd(), ".env");

  if (!fs.existsSync(caminhoEnv)) {
    return;
  }

  const conteudo = fs.readFileSync(caminhoEnv, "utf8");

  for (const linhaOriginal of conteudo.split(/\r?\n/)) {
    const linha = linhaOriginal.trim();
    if (!linha || linha.startsWith("#") || !linha.includes("=")) {
      continue;
    }

    const indiceIgual = linha.indexOf("=");
    const chave = linha.slice(0, indiceIgual).trim();
    let valor = linha.slice(indiceIgual + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (chave && !process.env[chave]) {
      process.env[chave] = valor;
    }
  }
}

function agruparPorIdPdv(funcionarios) {
  const contagem = new Map();

  for (const funcionario of funcionarios) {
    if (!funcionario.id_pdv) {
      continue;
    }

    contagem.set(funcionario.id_pdv, (contagem.get(funcionario.id_pdv) ?? 0) + 1);
  }

  return contagem;
}

function escolherEmpresaComEquipe(empresas) {
  const candidatas = empresas
    .map((empresa) => {
      const ativos = empresa.funcionarios.filter((funcionario) => funcionario.ativo);
      const porCargo = {
        ADMINISTRADOR: ativos.filter((funcionario) => funcionario.cargo === "ADMINISTRADOR").length,
        GERENTE: ativos.filter((funcionario) => funcionario.cargo === "GERENTE").length,
        COLABORADOR: ativos.filter((funcionario) => funcionario.cargo === "COLABORADOR").length,
      };

      return {
        empresa,
        ativos,
        porCargo,
        totalAtivos: ativos.length,
        totalFuncionarios: empresa.funcionarios.length,
      };
    })
    .filter(({ porCargo }) => porCargo.ADMINISTRADOR > 0 && porCargo.GERENTE > 0 && porCargo.COLABORADOR > 0)
    .sort((a, b) => {
      if (b.totalAtivos !== a.totalAtivos) return b.totalAtivos - a.totalAtivos;
      if (b.totalFuncionarios !== a.totalFuncionarios) return b.totalFuncionarios - a.totalFuncionarios;
      return a.empresa.nome.localeCompare(b.empresa.nome, "pt-BR");
    });

  return candidatas[0] ?? null;
}

function escolherFuncionario(funcionarios, cargo, comparador) {
  const candidatos = funcionarios
    .filter((funcionario) => funcionario.ativo && funcionario.cargo === cargo)
    .sort(comparador);

  return candidatos[0] ?? null;
}

function mapearFuncionarioResumo(funcionario) {
  return {
    id: funcionario.id,
    nome: funcionario.nome,
    email: funcionario.email,
    cargo: funcionario.cargo,
    ativo: funcionario.ativo,
    pdv: funcionario.pdv?.nome ?? null,
  };
}

async function auditarEquipeComFetchNode(baseUrl, token) {
  const cabecalhoCookie = {
    Cookie: `${NOME_COOKIE_SESSAO}=${token}`,
  };

  const respostaPagina = await fetch(`${baseUrl}/equipe`, {
    headers: cabecalhoCookie,
    redirect: "follow",
  });
  const htmlPagina = await respostaPagina.text();

  const respostaApi = await fetch(`${baseUrl}/api/funcionarios`, {
    headers: cabecalhoCookie,
  });

  let payload = null;

  try {
    payload = await respostaApi.json();
  } catch {
    payload = null;
  }

  const funcionarios = Array.isArray(payload?.funcionarios)
    ? payload.funcionarios.map(mapearFuncionarioResumo)
    : [];

  const acessoNegado =
    htmlPagina.includes("Sem permissao para acessar equipe") || respostaApi.status === 403;

  return {
    tipo: acessoNegado ? "acesso_negado" : "equipes_carregadas",
    urlFinal: `${baseUrl}/equipe`,
    statusPagina: respostaPagina.status,
    statusApi: respostaApi.status,
    kpis: payload?.kpis ?? null,
    paginacao: payload?.paginacao ?? null,
    equipe: acessoNegado ? null : funcionarios,
    mensagemPagina: acessoNegado ? htmlPagina.trim() : null,
    textoPagina: acessoNegado ? htmlPagina.trim() : null,
  };
}

async function assinarToken(sessao, segredo) {
  const chave = new TextEncoder().encode(segredo);

  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(chave);
}

async function auditarEquipeComToken(browser, baseUrl, token) {
  try {
    const context = await browser.newContext();
    try {
      await context.addCookies([
        {
          name: NOME_COOKIE_SESSAO,
          value: token,
          domain: "127.0.0.1",
          httpOnly: true,
          sameSite: "Lax",
          path: "/",
        },
      ]);

      const page = await context.newPage();
      const respostaEquipePromise = page
        .waitForResponse(
          (response) => response.request().method() === "GET" && response.url().includes("/api/funcionarios"),
          { timeout: 12000 },
        )
        .catch(() => null);

      await page.goto(`${baseUrl}/equipe`, { waitUntil: "domcontentloaded" });

      const respostaEquipe = await respostaEquipePromise;
      const textoPagina = await page.locator("body").innerText().catch(() => "");

      if (!respostaEquipe || respostaEquipe.status() === 403) {
        return {
          tipo: "acesso_negado",
          urlFinal: page.url(),
          mensagemPagina: textoPagina.trim(),
          equipe: null,
          kpis: null,
          paginacao: null,
        };
      }

      const statusApi = respostaEquipe.status();
      let payload = null;

      try {
        payload = await respostaEquipe.json();
      } catch {
        payload = null;
      }

      const funcionarios = Array.isArray(payload?.funcionarios)
        ? payload.funcionarios.map(mapearFuncionarioResumo)
        : [];

      return {
        tipo: "equipes_carregadas",
        urlFinal: page.url(),
        statusApi,
        kpis: payload?.kpis ?? null,
        paginacao: payload?.paginacao ?? null,
        equipe: funcionarios,
        textoPagina: textoPagina.trim(),
      };
    } finally {
      await context.close().catch(() => {});
    }
  } catch (erro) {
    const mensagemErro = erro instanceof Error ? erro.message : String(erro);
    if (
      mensagemErro.includes("ERR_CONNECTION_REFUSED") ||
      mensagemErro.includes("ERR_ABORTED") ||
      mensagemErro.includes("ERR_NAME_NOT_RESOLVED")
    ) {
      const requestContext = await request.newContext({
        baseURL: baseUrl,
        extraHTTPHeaders: {
          Cookie: `${NOME_COOKIE_SESSAO}=${token}`,
        },
      });

      try {
        const respostaPagina = await requestContext.get("/equipe");
        const htmlPagina = await respostaPagina.text();
        const respostaApi = await requestContext.get("/api/funcionarios");
        const statusApi = respostaApi.status();

        let payload = null;

        try {
          payload = await respostaApi.json();
        } catch {
          payload = null;
        }

        const funcionarios = Array.isArray(payload?.funcionarios)
          ? payload.funcionarios.map(mapearFuncionarioResumo)
          : [];

        const acessoNegado =
          htmlPagina.includes("Sem permissao para acessar equipe") || respostaApi.status() === 403;

        return {
          tipo: acessoNegado ? "acesso_negado" : "equipes_carregadas",
          urlFinal: `${baseUrl}/equipe`,
          statusPagina: respostaPagina.status(),
          statusApi,
          kpis: payload?.kpis ?? null,
          paginacao: payload?.paginacao ?? null,
          equipe: acessoNegado ? null : funcionarios,
          mensagemPagina: acessoNegado ? htmlPagina.trim() : null,
          textoPagina: acessoNegado ? htmlPagina.trim() : null,
        };
      } catch {
        return auditarEquipeComFetchNode(baseUrl, token);
      } finally {
        await requestContext.dispose();
      }
    }

    throw erro;
  }
}

async function main() {
  carregarEnvLocal();

  const baseUrl = process.env.APP_URL ?? BASE_URL_PADRAO;
  const segredoJwt = process.env.JWT_SECRET;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao encontrada no ambiente.");
  }

  if (!segredoJwt) {
    throw new Error("JWT_SECRET nao encontrada no ambiente.");
  }

  const prisma = new PrismaClient();

  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        funcionarios: {
          include: {
            pdv: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: {
            nome: "asc",
          },
        },
        pdvs: {
          select: {
            id: true,
            nome: true,
          },
          orderBy: {
            nome: "asc",
          },
        },
      },
      orderBy: {
        criado_em: "asc",
      },
    });

    const empresaSelecionada = escolherEmpresaComEquipe(empresas);

    if (!empresaSelecionada) {
      throw new Error("Nenhuma empresa com ADMINISTRADOR, GERENTE e COLABORADOR ativos foi encontrada.");
    }

    const administradores = empresaSelecionada.ativos
      .filter((funcionario) => funcionario.cargo === "ADMINISTRADOR")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const mapaContagemPdv = agruparPorIdPdv(empresaSelecionada.ativos);
    const gerentes = empresaSelecionada.ativos
      .filter((funcionario) => funcionario.cargo === "GERENTE")
      .sort((a, b) => {
        const totalA = mapaContagemPdv.get(a.id_pdv ?? "") ?? 0;
        const totalB = mapaContagemPdv.get(b.id_pdv ?? "") ?? 0;

        if (totalB !== totalA) return totalB - totalA;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });

    const gerenteSelecionado = gerentes[0] ?? null;
    const colaboradorSelecionado = gerenteSelecionado
      ? escolherFuncionario(
          empresaSelecionada.ativos.filter(
            (funcionario) => funcionario.cargo === "COLABORADOR" && funcionario.id_pdv === gerenteSelecionado.id_pdv,
          ),
          "COLABORADOR",
          (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
        ) ?? escolherFuncionario(
          empresaSelecionada.ativos,
          "COLABORADOR",
          (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
        )
      : null;

    if (!administradores[0] || !gerenteSelecionado || !colaboradorSelecionado) {
      throw new Error("Nao foi possivel escolher um funcionario para cada perfil na empresa selecionada.");
    }

    const tokens = {
      empresa: await assinarToken(
        {
          id_usuario: empresaSelecionada.empresa.id,
          id_empresa: empresaSelecionada.empresa.id,
          perfil: "EMPRESA",
          id_pdv: null,
        },
        segredoJwt,
      ),
      administrador: await assinarToken(
        {
          id_usuario: administradores[0].id,
          id_empresa: empresaSelecionada.empresa.id,
          perfil: "EMPRESA",
          id_pdv: administradores[0].id_pdv ?? null,
        },
        segredoJwt,
      ),
      gerente: await assinarToken(
        {
          id_usuario: gerenteSelecionado.id,
          id_empresa: empresaSelecionada.empresa.id,
          perfil: "GERENTE",
          id_pdv: gerenteSelecionado.id_pdv ?? null,
        },
        segredoJwt,
      ),
      colaborador: await assinarToken(
        {
          id_usuario: colaboradorSelecionado.id,
          id_empresa: empresaSelecionada.empresa.id,
          perfil: "COLABORADOR",
          id_pdv: colaboradorSelecionado.id_pdv ?? null,
        },
        segredoJwt,
      ),
    };

    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    };

    if (process.env.PLAYWRIGHT_CHROME_PATH) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROME_PATH;
    }

    const browser = await chromium.launch(launchOptions);

    try {
      const resultados = {
        empresa: await auditarEquipeComToken(browser, baseUrl, tokens.empresa),
        administrador: await auditarEquipeComToken(browser, baseUrl, tokens.administrador),
        gerente: await auditarEquipeComToken(browser, baseUrl, tokens.gerente),
        colaborador: await auditarEquipeComToken(browser, baseUrl, tokens.colaborador),
      };

      const saida = {
        empresaSelecionada: {
          id: empresaSelecionada.empresa.id,
          nome: empresaSelecionada.empresa.nome,
          email: empresaSelecionada.empresa.email,
          totalFuncionarios: empresaSelecionada.empresa.funcionarios.length,
          totalAtivos: empresaSelecionada.ativos.length,
          porCargo: empresaSelecionada.porCargo,
        },
        escolhidos: {
          empresa: {
            id_usuario: empresaSelecionada.empresa.id,
            perfil: "EMPRESA",
            id_pdv: null,
          },
          administrador: mapearFuncionarioResumo(administradores[0]),
          gerente: mapearFuncionarioResumo(gerenteSelecionado),
          colaborador: mapearFuncionarioResumo(colaboradorSelecionado),
        },
        tokens,
        resultados,
      };

      console.log(JSON.stringify(saida, null, 2));
    } finally {
      await browser.close();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(`Erro ao auditar /equipe: ${erro.message}`);
  process.exit(1);
});
