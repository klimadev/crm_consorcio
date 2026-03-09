import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarContatos } from "@/lib/evolution-api";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { exigirSessao } from "@/lib/permissoes";
import { obterEstagioIndefinido } from "@/lib/estagios-fixos";
import { aplicaMascaraTelefoneBr } from "@/lib/utils";

function extrairNumeroWhatsapp(rawId: string) {
  const semDominio = rawId.split("@")[0] ?? "";
  return semDominio.replace(/\D/g, "");
}

function montarDadosContato(contatoNome: string | null, waNumber: string) {
  const nomeOriginal = contatoNome?.trim() ?? "";
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
    select: { id: true, instance_name: true },
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

  const [estagioIndefinido, leadsExistentes, funcionarioSessao] = await Promise.all([
    obterEstagioIndefinido(auth.sessao.id_empresa),
    prisma.lead.findMany({
      where: { id_empresa: auth.sessao.id_empresa },
      select: { telefone: true },
    }),
    auth.sessao.perfil !== "EMPRESA"
      ? prisma.funcionario.findFirst({
          where: {
            id: auth.sessao.id_usuario,
            id_empresa: auth.sessao.id_empresa,
            ativo: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const funcionarioResponsavel =
    funcionarioSessao ??
    (await prisma.funcionario.findFirst({
      where: {
        id_empresa: auth.sessao.id_empresa,
        ativo: true,
        ...(auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? { id_pdv: auth.sessao.id_pdv }
          : {}),
      },
      select: { id: true },
      orderBy: { criado_em: "asc" },
    }));

  if (!funcionarioResponsavel) {
    return NextResponse.json(
      { erro: "Nao ha funcionario ativo para atribuir os leads sincronizados." },
      { status: 400 },
    );
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

  for (const instancia of instancias) {
    const contatos = await buscarContatos(instancia.instance_name).catch(() => []);

    for (const contato of contatos) {
      processados += 1;
      const digits = extrairNumeroWhatsapp(contato.id);
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

      const { nome, observacoes } = montarDadosContato(contato.nome, waNumber);

      await prisma.lead.create({
        data: {
          id_empresa: auth.sessao.id_empresa,
          id_estagio: estagioIndefinido.id,
          id_funcionario: funcionarioResponsavel.id,
          nome,
          telefone: waNumber,
          valor_consorcio: 0,
          observacoes,
          origem: "SINCRONIZACAO_WHATSAPP",
        },
      });

      criados += 1;
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
  });
}
