import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarContatos } from "@/lib/evolution-api";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { exigirSessao } from "@/lib/permissoes";
import { obterEstagioIndefinido } from "@/lib/estagios-fixos";
import { aplicaMascaraTelefoneBr } from "@/lib/utils";
import type { EvolutionContato } from "@/lib/evolution-api";

type InstanciaIgnorada = {
  id: string;
  nome: string;
  motivo: string;
};

function avancarIndiceRoundRobin(indiceAtual: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (indiceAtual + 1) % total;
}

function extrairNumeroWhatsapp(rawId: string) {
  const semDominio = rawId.split("@")[0] ?? "";
  return semDominio.replace(/\D/g, "");
}

function extrairNumeroReal(contato: EvolutionContato): string | null {
  if (contato.remoteJidAlt) {
    return extrairNumeroWhatsapp(contato.remoteJidAlt);
  }
  return extrairNumeroWhatsapp(contato.id);
}

function montarDadosContato(contato: EvolutionContato, waNumber: string) {
  const nomeOriginal = contato.pushName?.trim() ?? contato.nome?.trim() ?? "";
  const telefoneFormatado = aplicaMascaraTelefoneBr(waNumber);

  if (nomeOriginal) {
    return {
      nome: nomeOriginal,
      observacoes: null as string | null,
    };
  }

  return {
    nome: telefoneFormatado || waNumber,
    observacoes:
      "Nome nao identificado na sincronizacao do WhatsApp. O contato foi cadastrado com o numero formatado porque a API nao retornou nome, pushname ou identificador utilizavel, possivelmente devido a politicas recentes do WhatsApp.",
  };
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const whereInstancias =
    auth.sessao.perfil === "EMPRESA"
      ? { id_empresa: auth.sessao.id_empresa }
      : {
          id_empresa: auth.sessao.id_empresa,
          OR: [
            { id_criador: auth.sessao.id_usuario },
            ...(auth.sessao.id_pdv ? [{ pdvs: { some: { id: auth.sessao.id_pdv } } }] : []),
          ],
        };

  const instancias = await prisma.whatsappInstancia.findMany({
    where: whereInstancias,
    select: {
      id: true,
      nome: true,
      instance_name: true,
      pdvs:
        auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {
              where: {
                id: auth.sessao.id_pdv,
                id_empresa: auth.sessao.id_empresa,
              },
              select: { id: true, nome: true },
            }
          : {
              where: { id_empresa: auth.sessao.id_empresa },
              select: { id: true, nome: true },
            },
    },
  });

  if (!instancias.length) {
    return NextResponse.json({
      ok: true,
      processados: 0,
      criados: 0,
      ignorados: 0,
      invalidos: 0,
      motivo: "Nenhuma instancia WhatsApp acessivel para o perfil atual.",
    });
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
    obterEstagioIndefinido(auth.sessao.id_empresa),
    prisma.lead.findMany({
      where: { id_empresa: auth.sessao.id_empresa },
      select: { telefone: true },
    }),
    prisma.funcionario.findMany({
      where: {
        id_empresa: auth.sessao.id_empresa,
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
    if (!pdv) {
      return false;
    }

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
    return NextResponse.json({
      ok: true,
      processados: 0,
      criados: 0,
      ignorados: 0,
      invalidos: 0,
      instancias_ignoradas: instanciasIgnoradas,
      motivo: "Nenhuma instancia WhatsApp valida para sincronizacao no contexto atual.",
    });
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
    if (!pdv) {
      continue;
    }

    const colaboradores = colaboradoresPorPdv.get(pdv.id) ?? [];
    if (!colaboradores.length) {
      continue;
    }

    const contatos = await buscarContatos(instancia.instance_name).catch(() => []);

    for (const contato of contatos) {
      processados += 1;
      const digits = extrairNumeroReal(contato) ?? extrairNumeroWhatsapp(contato.id);
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
          id_empresa: auth.sessao.id_empresa,
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

  return NextResponse.json({
    ok: true,
    processados,
    criados,
    ignorados,
    invalidos,
    instancias_ignoradas: instanciasIgnoradas,
  });
}
