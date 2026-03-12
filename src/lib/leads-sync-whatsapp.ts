import { prisma } from "@/lib/prisma";
import { buscarMensagens, type EvolutionMensagem } from "@/lib/evolution-api";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { obterEstagioIndefinido } from "@/lib/estagios-fixos";
import { aplicaMascaraTelefoneBr } from "@/lib/utils";
import type { SessaoToken } from "@/lib/tipos";

type InstanciaIgnorada = {
  id: string;
  nome: string;
  motivo: string;
};

type ContextoSyncWhatsapp =
  | { tipo: "sessao"; sessao: SessaoToken }
  | { tipo: "interno"; idEmpresa?: string };

type EmpresaProcessada = {
  id_empresa: string;
  processados: number;
  criados: number;
  ignorados: number;
  invalidos: number;
  instancias_ignoradas: InstanciaIgnorada[];
  motivo?: string;
};

export type ResultadoSyncWhatsapp = {
  ok: true;
  processados: number;
  criados: number;
  ignorados: number;
  invalidos: number;
  instancias_ignoradas: InstanciaIgnorada[];
  empresas_processadas?: EmpresaProcessada[];
  motivo?: string;
};

function avancarIndiceRoundRobin(indiceAtual: number, total: number) {
  if (total <= 0) return 0;
  return (indiceAtual + 1) % total;
}

function extrairNumeroWhatsapp(rawId: string) {
  const semDominio = rawId.split("@")[0] ?? "";
  return semDominio.replace(/\D/g, "");
}

function jidEhLid(jid: string | null | undefined) {
  return typeof jid === "string" && jid.includes("@lid");
}

function jidEhWhatsappUsuario(jid: string | null | undefined) {
  return typeof jid === "string" && jid.includes("@s.whatsapp.net");
}

function normalizarJidWhatsappUsuario(jid?: string | null): string | null {
  return typeof jid === "string" && jidEhWhatsappUsuario(jid) ? jid : null;
}

function extrairNumeroReal(contato: EvolutionMensagem): string | null {
  const remoteJidAltValido = normalizarJidWhatsappUsuario(contato.remoteJidAlt);
  if (remoteJidAltValido) {
    return extrairNumeroWhatsapp(remoteJidAltValido);
  }

  if (jidEhLid(contato.remoteJid)) {
    const remoteJidAltLastMessageValido = normalizarJidWhatsappUsuario(contato.remoteJidAltLastMessage);
    if (remoteJidAltLastMessageValido) {
      return extrairNumeroWhatsapp(remoteJidAltLastMessageValido);
    }

    return null;
  }

  return extrairNumeroWhatsapp(contato.remoteJid);
}

function montarDadosContato(contato: EvolutionMensagem, waNumber: string) {
  const nomeOriginal = contato.pushName?.trim() ?? "";
  const telefoneFormatado = aplicaMascaraTelefoneBr(waNumber);

  if (nomeOriginal) {
    return { nome: nomeOriginal, observacoes: null as string | null };
  }

  return {
    nome: telefoneFormatado || waNumber,
    observacoes:
      "Nome nao identificado na sincronizacao do WhatsApp. O contato foi cadastrado com o numero formatado porque a API nao retornou nome, pushname ou identificador utilizavel, possivelmente devido a politicas recentes do WhatsApp.",
  };
}

async function sincronizarEmpresa(idEmpresa: string, sessao?: SessaoToken): Promise<EmpresaProcessada> {
  const whereInstancias = sessao
    ? sessao.perfil === "EMPRESA"
      ? { id_empresa: sessao.id_empresa }
      : {
          id_empresa: sessao.id_empresa,
          OR: [
            { id_criador: sessao.id_usuario },
            ...(sessao.id_pdv ? [{ pdvs: { some: { id: sessao.id_pdv } } }] : []),
          ],
        }
    : { id_empresa: idEmpresa };

  const instancias = await prisma.whatsappInstancia.findMany({
    where: whereInstancias,
    select: {
      id: true,
      nome: true,
      instance_name: true,
      pdvs:
        sessao?.perfil === "GERENTE" && sessao.id_pdv
          ? {
              where: { id: sessao.id_pdv, id_empresa: sessao.id_empresa },
              select: { id: true, nome: true },
            }
          : {
              where: { id_empresa: idEmpresa },
              select: { id: true, nome: true },
            },
    },
  });

  if (!instancias.length) {
    return {
      id_empresa: idEmpresa,
      processados: 0,
      criados: 0,
      ignorados: 0,
      invalidos: 0,
      instancias_ignoradas: [],
      motivo: sessao
        ? "Nenhuma instancia WhatsApp acessivel para o perfil atual."
        : "Nenhuma instancia WhatsApp encontrada para a empresa.",
    };
  }

  const pdvsElegiveisPorInstancia = new Map<string, { id: string; nome: string }>();
  const instanciasIgnoradas: InstanciaIgnorada[] = [];

  for (const instancia of instancias) {
    if (instancia.pdvs.length !== 1) {
      instanciasIgnoradas.push({
        id: instancia.id,
        nome: instancia.nome,
        motivo:
          instancia.pdvs.length === 0
            ? "Instancia sem PDV configurado."
            : `Instancia vinculada a ${instancia.pdvs.length} PDVs. Sincronizacao permite apenas 1 PDV por instancia para garantir distribuicao correta dos leads.`,
      });
      continue;
    }

    pdvsElegiveisPorInstancia.set(instancia.id, instancia.pdvs[0]);
  }

  const idsPdvsElegiveis = Array.from(new Set(Array.from(pdvsElegiveisPorInstancia.values()).map((pdv) => pdv.id)));

  const [estagioIndefinido, leadsExistentes, colaboradoresAtivosPorPdv] = await Promise.all([
    obterEstagioIndefinido(idEmpresa),
    prisma.lead.findMany({ where: { id_empresa: idEmpresa }, select: { telefone: true } }),
    prisma.funcionario.findMany({
      where: {
        id_empresa: idEmpresa,
        ativo: true,
        cargo: "COLABORADOR",
        ...(idsPdvsElegiveis.length ? { id_pdv: { in: idsPdvsElegiveis } } : { id_pdv: "__sem_pdv__" }),
      },
      select: { id: true, id_pdv: true, nome: true },
      orderBy: [{ nome: "asc" }, { criado_em: "asc" }, { id: "asc" }],
    }),
  ]);

  const colaboradoresPorPdv = new Map<string, Array<{ id: string; nome: string }>>();
  for (const colaborador of colaboradoresAtivosPorPdv) {
    const listaAtual = colaboradoresPorPdv.get(colaborador.id_pdv) ?? [];
    listaAtual.push({ id: colaborador.id, nome: colaborador.nome });
    colaboradoresPorPdv.set(colaborador.id_pdv, listaAtual);
  }

  const instanciasValidas = instancias.filter((instancia) => {
    const pdv = pdvsElegiveisPorInstancia.get(instancia.id);
    if (!pdv) return false;

    const colaboradores = colaboradoresPorPdv.get(pdv.id) ?? [];
    if (colaboradores.length === 0) {
      instanciasIgnoradas.push({
        id: instancia.id,
        nome: instancia.nome,
        motivo: `PDV '${pdv.nome}' sem colaboradores ativos para receber leads.`,
      });
      return false;
    }

    return true;
  });

  if (!instanciasValidas.length) {
    return {
      id_empresa: idEmpresa,
      processados: 0,
      criados: 0,
      ignorados: 0,
      invalidos: 0,
      instancias_ignoradas: instanciasIgnoradas,
      motivo: "Nenhuma instancia WhatsApp valida para sincronizacao no contexto atual.",
    };
  }

  const telefonesExistentes = new Set<string>();
  const digitosExistentes = new Set<string>();
  for (const lead of leadsExistentes) {
    const digitosLead = lead.telefone.replace(/\D/g, "");
    if (digitosLead) {
      digitosExistentes.add(digitosLead);
    }
    const normalizado = normalizarTelefoneParaWhatsapp(lead.telefone);
    if (normalizado.valido && normalizado.waNumber) {
      telefonesExistentes.add(normalizado.waNumber);
    }
  }

  let processados = 0;
  let criados = 0;
  let ignorados = 0;
  let invalidos = 0;
  const telefonesLoteAtual = new Set<string>();
  const digitosLoteAtual = new Set<string>();
  const indiceRoundRobinPorPdv = new Map<string, number>();

  for (const instancia of instanciasValidas) {
    const pdv = pdvsElegiveisPorInstancia.get(instancia.id);
    if (!pdv) continue;

    const colaboradores = colaboradoresPorPdv.get(pdv.id) ?? [];
    if (!colaboradores.length) continue;

    const contatos = await buscarMensagens(instancia.instance_name).catch(() => []);

    for (const contato of contatos) {
      processados += 1;
      const digits = extrairNumeroReal(contato);
      if (!digits) {
        invalidos += 1;
        continue;
      }

      const normalizado = normalizarTelefoneParaWhatsapp(digits);
      if (!normalizado.valido || !normalizado.waNumber) {
        invalidos += 1;
        continue;
      }

      const waNumber = normalizado.waNumber;
      if (
        telefonesExistentes.has(waNumber) ||
        telefonesLoteAtual.has(waNumber) ||
        digitosExistentes.has(digits) ||
        digitosLoteAtual.has(digits)
      ) {
        ignorados += 1;
        continue;
      }

      const { nome, observacoes } = montarDadosContato(contato, waNumber);
      const indiceAtual = indiceRoundRobinPorPdv.get(pdv.id) ?? 0;
      const colaboradorResponsavel = colaboradores[indiceAtual];

      await prisma.lead.create({
        data: {
          id_empresa: idEmpresa,
          id_estagio: estagioIndefinido.id,
          id_funcionario: colaboradorResponsavel.id,
          nome,
          telefone: waNumber,
          valor_consorcio: 0,
          observacoes,
          origem: "SINCRONIZACAO_WHATSAPP",
        },
      });

      criados += 1;
      indiceRoundRobinPorPdv.set(pdv.id, avancarIndiceRoundRobin(indiceAtual, colaboradores.length));
      telefonesLoteAtual.add(waNumber);
      telefonesExistentes.add(waNumber);
      digitosLoteAtual.add(digits);
      digitosExistentes.add(digits);
    }
  }

  return {
    id_empresa: idEmpresa,
    processados,
    criados,
    ignorados,
    invalidos,
    instancias_ignoradas: instanciasIgnoradas,
  };
}

export async function sincronizarLeadsWhatsapp(contexto: ContextoSyncWhatsapp): Promise<ResultadoSyncWhatsapp> {
  if (contexto.tipo === "sessao") {
    const resultado = await sincronizarEmpresa(contexto.sessao.id_empresa, contexto.sessao);
    return {
      ok: true,
      processados: resultado.processados,
      criados: resultado.criados,
      ignorados: resultado.ignorados,
      invalidos: resultado.invalidos,
      instancias_ignoradas: resultado.instancias_ignoradas,
      ...(resultado.motivo ? { motivo: resultado.motivo } : {}),
    };
  }

  const empresas = await prisma.empresa.findMany({
    where: contexto.idEmpresa ? { id: contexto.idEmpresa } : undefined,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!empresas.length) {
    return {
      ok: true,
      processados: 0,
      criados: 0,
      ignorados: 0,
      invalidos: 0,
      instancias_ignoradas: [],
      empresas_processadas: [],
      motivo: contexto.idEmpresa
        ? "Empresa informada nao encontrada."
        : "Nenhuma empresa encontrada para sincronizacao.",
    };
  }

  const empresasProcessadas: EmpresaProcessada[] = [];
  for (const empresa of empresas) {
    empresasProcessadas.push(await sincronizarEmpresa(empresa.id));
  }

  return {
    ok: true,
    processados: empresasProcessadas.reduce((total, item) => total + item.processados, 0),
    criados: empresasProcessadas.reduce((total, item) => total + item.criados, 0),
    ignorados: empresasProcessadas.reduce((total, item) => total + item.ignorados, 0),
    invalidos: empresasProcessadas.reduce((total, item) => total + item.invalidos, 0),
    instancias_ignoradas: empresasProcessadas.flatMap((item) => item.instancias_ignoradas),
    empresas_processadas: empresasProcessadas,
  };
}
