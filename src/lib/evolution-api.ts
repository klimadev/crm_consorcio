import { mascararTelefoneParaLog, normalizarTelefoneParaWhatsapp } from "@/lib/phone";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

const headers = {
  "Content-Type": "application/json",
  apikey: EVOLUTION_API_KEY,
};

export type EvolutionInstance = {
  instanceName: string;
  instanceId: string;
  status: string;
  phoneNumber?: string;
  qrcode?: {
    code: string;
    base64: string;
  };
};

export type EvolutionConnectionState = {
  instanceName: string;
  instanceId?: string;
  status: string;
  connected: boolean;
  phoneNumber: string | null;
  profileName: string | null;
  profilePic: string | null;
  disconnectionReasonCode: string | null;
};

export type EvolutionQrCode = {
  code: string | null;
  base64: string | null;
  pairingCode: string | null;
  count: number | null;
};

export type EvolutionContato = {
  id: string;
  nome: string | null;
  pushName: string | null;
  remoteJidAlt: string | null;
  isGroup: boolean;
};

export type EvolutionConversa = {
  remoteJid: string;
  remoteJidAlt: string | null;
  pushName: string | null;
  isGroup: boolean;
  lastMessage?: {
    key: {
      remoteJid: string;
      remoteJidAlt?: string;
      fromMe: boolean;
    };
    pushName?: string;
  };
};

export async function listarInstancias(): Promise<EvolutionInstance[]> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: "GET",
      headers,
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.message ?? "Erro ao buscar instâncias");
    }

    const json = await resposta.json();
    return json.instances ?? [];
  } catch (erro) {
    console.error("Erro ao listar instâncias na Evolution:", erro);
    throw erro;
  }
}

export async function buscarInstancia(instanceName: string): Promise<EvolutionInstance | null> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers,
    });

    if (!resposta.ok) {
      return null;
    }

    const json = await resposta.json();
    return {
      instanceName: json.instanceName,
      instanceId: json.instanceId,
      status: json.status,
      phoneNumber: json.phoneNumber,
    };
  } catch {
    return null;
  }
}

function extrairTelefone(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw.replace("@s.whatsapp.net", "").replace("@lid", "");
}

function extrairCodigoDesconexao(raw: unknown): string | null {
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return null;
}

function normalizarStatusEvolution(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim().length === 0) return "unknown";
  return raw.trim().toLowerCase();
}

function normalizarQrCode(json: Record<string, unknown>): EvolutionQrCode | null {
  const qrcode = (json.qrcode ?? json) as Record<string, unknown>;
  const base64 =
    typeof qrcode.base64 === "string"
      ? qrcode.base64
      : typeof json.base64 === "string"
        ? json.base64
        : null;
  const code =
    typeof qrcode.code === "string"
      ? qrcode.code
      : typeof json.code === "string"
        ? json.code
        : null;
  const pairingCode =
    typeof qrcode.pairingCode === "string"
      ? qrcode.pairingCode
      : typeof json.pairingCode === "string"
        ? json.pairingCode
        : null;
  const count =
    typeof qrcode.count === "number"
      ? qrcode.count
      : typeof json.count === "number"
        ? json.count
        : null;

  if (!base64 && !code && !pairingCode) {
    return null;
  }

  return {
    code,
    base64,
    pairingCode,
    count,
  };
}

export async function obterEstadoConexao(instanceName: string): Promise<EvolutionConnectionState | null> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers,
    });

    if (!resposta.ok) {
      return null;
    }

    const json = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
    const data = (json.instance ?? json) as Record<string, unknown>;
    const status = normalizarStatusEvolution(data.state ?? data.status ?? json.state ?? json.status);
    const phoneNumber = extrairTelefone(data.owner ?? data.phoneNumber ?? json.owner ?? json.phoneNumber);
    const connected = status === "open" || status === "connected" || phoneNumber !== null;
    const disconnectionReasonCode = extrairCodigoDesconexao(
      data.disconnectionReasonCode ?? json.disconnectionReasonCode,
    );

    return {
      instanceName:
        typeof data.instanceName === "string"
          ? data.instanceName
          : typeof json.instanceName === "string"
            ? json.instanceName
            : instanceName,
      instanceId:
        typeof data.instanceId === "string"
          ? data.instanceId
          : typeof json.instanceId === "string"
            ? json.instanceId
            : undefined,
      status,
      connected,
      phoneNumber,
      profileName:
        typeof data.profileName === "string"
          ? data.profileName
          : typeof json.profileName === "string"
            ? json.profileName
            : null,
      profilePic:
        typeof data.profilePicUrl === "string"
          ? data.profilePicUrl
          : typeof json.profilePicUrl === "string"
            ? json.profilePicUrl
            : null,
      disconnectionReasonCode,
    };
  } catch {
    return null;
  }
}

export type CriarInstanciaParams = {
  nome: string;
};

export async function criarInstancia(params: CriarInstanciaParams): Promise<{
  instanceName: string;
  qr_code?: string;
  base64?: string;
}> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        instanceName: params.nome,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      const mensagemErro = erro?.error?.message ?? erro?.message ?? erro?.reason ?? "Erro ao criar instância";
      throw new Error(mensagemErro);
    }

    const json = await resposta.json();
    
    let qrCodeData = json.qrcode?.base64 ?? json.qrcode;
    
    if (!qrCodeData && json.instance?.qrcode) {
      qrCodeData = json.instance.qrcode.base64 ?? json.instance.qrcode;
    }

    return {
      instanceName: json.instance?.instanceName ?? json.instanceName ?? params.nome,
      qr_code: json.qrcode?.code,
      base64: qrCodeData,
    };
  } catch (erro) {
    console.error("Erro ao criar instância na Evolution:", erro);
    throw erro;
  }
}

export type ResultadoSaudeInstancia = {
  saudavel: boolean;
  status: string;
  phoneNumber: string | null;
  motivo?: string;
};

/**
 * Sonda real da Evolution API para verificar se a instancia esta OPERACIONAL.
 * 
 * Diferente do `obterEstadoConexao` que retorna `state: "open"` assim que
 * o socket WebSocket e autenticado, esta funcao faz uma chamada que EXIGE
 * conexao WebSocket viva (`fetchProfile`) — diferente de `findMessages` que
 * le do cache local do Baileys e retorna 200 mesmo em zombies.
 *
 * `phoneNumber` opcional: se disponivel, usa `fetchProfile` (probe real);
 * se ausente, cai para `findMessages` (menos confiavel — falso positivo em zombies).
 */
export async function verificarSaudeInstancia(
  instanceName: string,
  phoneNumber?: string | null,
): Promise<ResultadoSaudeInstancia> {
  const estado = await obterEstadoConexao(instanceName);

  if (!estado) {
    return { saudavel: false, status: "offline", phoneNumber: null, motivo: "Instancia nao encontrada na Evolution API" };
  }

  if (!estado.connected) {
    return { saudavel: false, status: estado.status, phoneNumber: estado.phoneNumber, motivo: `Estado: ${estado.status}` };
  }

  const phone = phoneNumber || estado.phoneNumber;

  if (phone) {
    try {
      const resposta = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfile/${instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ number: phone }),
      });

      if (!resposta.ok) {
        return {
          saudavel: false,
          status: estado.status,
          phoneNumber: estado.phoneNumber,
          motivo: `fetchProfile retornou HTTP ${resposta.status}`,
        };
      }

      return { saudavel: true, status: estado.status, phoneNumber: estado.phoneNumber };
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro);
      return {
        saudavel: false,
        status: estado.status,
        phoneNumber: estado.phoneNumber,
        motivo: `Erro ao sondar fetchProfile: ${msg}`,
      };
    }
  }

  console.warn(
    `[verificarSaudeInstancia] Sem numero de telefone para "${instanceName}" — ` +
    `usando findMessages (menos confiavel, pode dar falso positivo em zombies).`,
  );

  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ page: 1, offset: 1 }),
    });

    if (!resposta.ok) {
      return {
        saudavel: false,
        status: estado.status,
        phoneNumber: estado.phoneNumber,
        motivo: `findMessages retornou HTTP ${resposta.status}`,
      };
    }

    return { saudavel: true, status: estado.status, phoneNumber: estado.phoneNumber };
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    return {
      saudavel: false,
      status: estado.status,
      phoneNumber: estado.phoneNumber,
      motivo: `Erro ao sondar findMessages: ${msg}`,
    };
  }
}

export async function deletarInstancia(instanceName: string): Promise<void> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers,
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));

      // Se a instância já foi deletada (404 ou mensagem específica), considera sucesso
      const mensagemErro = erro.message ?? "";
      if (
        resposta.status === 404 ||
        mensagemErro.toLowerCase().includes("not found") ||
        mensagemErro.toLowerCase().includes("instance not found") ||
        mensagemErro.toLowerCase().includes("does not exist")
      ) {
        console.warn(`Instância "${instanceName}" já foi deletada na Evolution API.`);
        return; // Sucesso - instância não existe mais
      }

      throw new Error(mensagemErro || "Erro ao excluir instância");
    }
  } catch (erro) {
    // Se for erro de instância não encontrada, não relança
    if (erro instanceof Error) {
      const msg = erro.message.toLowerCase();
      if (
        msg.includes("not found") ||
        msg.includes("instance not found") ||
        msg.includes("does not exist")
      ) {
        console.warn(`Instância "${instanceName}" já foi deletada (erro capturado):`, erro.message);
        return;
      }
    }
    console.error("Erro ao deletar instância na Evolution:", erro);
    throw erro;
  }
}

export async function gerarQrCode(instanceName: string): Promise<{
  code: string;
  base64: string;
} | null> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers,
    });

    if (!resposta.ok) {
      return null;
    }

    const json = await resposta.json();
    return json.qrcode ?? null;
  } catch {
    return null;
  }
}

export async function conectarInstancia(instanceName: string): Promise<EvolutionQrCode | null> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers,
    });

    if (!resposta.ok) {
      return null;
    }

    const json = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
    return normalizarQrCode(json);
  } catch {
    return null;
  }
}

export async function reiniciarInstancia(instanceName: string): Promise<EvolutionConnectionState | null> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
      method: "PUT",
      headers,
    });

    if (!resposta.ok) {
      return null;
    }

    return obterEstadoConexao(instanceName);
  } catch {
    return null;
  }
}

type EnviarMensagemTextoParams = {
  instanceName: string;
  telefone: string;
  mensagem: string;
};

export async function enviarMensagemTexto(params: EnviarMensagemTextoParams): Promise<void> {
  const numeroNormalizado = normalizarTelefoneParaWhatsapp(params.telefone);
  if (!numeroNormalizado.valido || !numeroNormalizado.waNumber) {
    throw new Error(numeroNormalizado.motivoErro ?? "Telefone invalido para envio WhatsApp.");
  }

  const resposta = await fetch(`${EVOLUTION_API_URL}/message/sendText/${params.instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      number: `+${numeroNormalizado.waNumber}`,
      text: params.mensagem,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    const mensagemErro =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar mensagem WhatsApp";
    throw new Error(
      `${mensagemErro} (status=${resposta.status}, instancia=${params.instanceName}, numero=${mascararTelefoneParaLog(numeroNormalizado.waNumber)})`,
    );
  }
}

type EnviarMidiaParams = {
  instanceName: string;
  telefone: string;
  mediaType: "image" | "video" | "document";
  media: string;
  fileName: string;
  caption?: string;
};

export async function enviarMidiaEvolution(params: EnviarMidiaParams) {
  const numeroNormalizado = normalizarTelefoneParaWhatsapp(params.telefone);
  if (!numeroNormalizado.valido || !numeroNormalizado.waNumber) {
    throw new Error(numeroNormalizado.motivoErro ?? "Telefone invalido para envio WhatsApp.");
  }

  const body: Record<string, unknown> = {
    number: `+${numeroNormalizado.waNumber}`,
    mediatype: params.mediaType,
    media: params.media,
    fileName: params.fileName,
  };
  if (params.caption) body.caption = params.caption;

  const resposta = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${params.instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    const mensagemErro =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar midia WhatsApp";
    throw new Error(
      `${mensagemErro} (status=${resposta.status}, instancia=${params.instanceName})`,
    );
  }

  return resposta.json().catch(() => ({}));
}

type EnviarAudioParams = {
  instanceName: string;
  telefone: string;
  audio: string;
};

export async function enviarAudioEvolution(params: EnviarAudioParams) {
  const numeroNormalizado = normalizarTelefoneParaWhatsapp(params.telefone);
  if (!numeroNormalizado.valido || !numeroNormalizado.waNumber) {
    throw new Error(numeroNormalizado.motivoErro ?? "Telefone invalido para envio WhatsApp.");
  }

  const resposta = await fetch(
    `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${params.instanceName}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: `+${numeroNormalizado.waNumber}`,
        audio: params.audio,
      }),
    },
  );

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    const mensagemErro =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar audio WhatsApp";
    throw new Error(
      `${mensagemErro} (status=${resposta.status}, instancia=${params.instanceName})`,
    );
  }

  return resposta.json().catch(() => ({}));
}

export async function buscarContatos(instanceName: string): Promise<EvolutionContato[]> {
  const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message ?? "Erro ao buscar conversas na Evolution");
  }

  const json = (await resposta.json().catch(() => ({}))) as EvolutionConversa[];

  return json
    .map((chat) => {
      const remoteJid = (chat.remoteJid ?? "").trim();
      if (!remoteJid || remoteJid.includes("@g.us")) return null;

      const remoteJidAlt = chat.remoteJidAlt ?? chat.lastMessage?.key?.remoteJidAlt ?? null;
      const pushName = chat.pushName ?? chat.lastMessage?.pushName ?? null;
      const isGroup = remoteJid.includes("@g.us") || chat.isGroup === true;

      return {
        id: remoteJidAlt ?? remoteJid,
        nome: pushName,
        pushName: pushName,
        remoteJidAlt: remoteJidAlt,
        isGroup,
      };
    })
    .filter((item): item is EvolutionContato => item !== null);
}

/**
 * Busca conversas na Evolution API usando filtro OR dinâmico.
 * 
 * Esta função foi criada para resolver o problema de dependência do banco de dados Prisma.
 * Quando o banco do CRM está indisponível, a pesquisa de conversas falha. Esta função
 * usa diretamente a Evolution API como fonte de dados, eliminando a dependência do banco.
 * 
 * A lógica OR funciona da seguinte forma:
 * - O mesmo termo de busca é aplicado em TODOS os campos de filtro (remoteJid, remoteJidAlt, senderPn, pushName)
 * - Se QUALQUER um desses campos conter o termo, a mensagem é retornada
 * - Isso elimina a necessidade de saber antecipadamente se o termo é nome ou telefone
 * 
 * @example
 * // Busca por telefone ou nome - funciona para ambos automaticamente
 * const conversas = await buscarConversasEvolution("minhaInstancia", "Maria", 1, 30);
 * const conversas = await buscarConversasEvolution("minhaInstancia", "5511988776655", 1, 30);
 * 
 * @param instanceName - Nome da instância na Evolution API
 * @param termo - Termo de busca (será aplicado em todos os campos via OR)
 * @param page - Número da página (padrão: 1)
 * @param offset - Quantidade de resultados por página (padrão: 30)
 * @returns Array de conversas agrupadas por remoteJidAlt
 * 
 * @throws Error se a Evolution API retornar erro
 */
export async function buscarConversasEvolution(
  instanceName: string,
  termo: string,
  page: number = 1,
  offset: number = 30,
): Promise<EvolutionConversa[]> {
  const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      where: {
        key: {
          remoteJid: termo,
          remoteJidAlt: termo,
          senderPn: termo,
        },
        pushName: termo,
      },
      page,
      offset,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message ?? "Erro ao buscar conversas na Evolution");
  }

  const json = (await resposta.json().catch(() => ({}))) as {
    messages?: {
      records?: Array<{
        key?: {
          remoteJid?: string;
          remoteJidAlt?: string;
          fromMe?: boolean;
        };
        pushName?: string | null;
        messageTimestamp?: number;
      }>;
      pages?: number;
      total?: number;
    };
  };

  const registros = json.messages?.records ?? [];

  // Agrupar por remoteJidAlt - cada grupo = uma conversa
  const conversasAgrupadas = new Map<string, {
    remoteJid: string;
    remoteJidAlt: string | null;
    pushName: string | null;
    ultimaMensagemTimestamp: number;
  }>();

  for (const msg of registros) {
    const remoteJid = msg.key?.remoteJid ?? "";
    if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
      continue;
    }

    const remoteJidAlt = msg.key?.remoteJidAlt ?? null;
    const pushName = msg.pushName ?? null;
    const messageTimestamp = msg.messageTimestamp ?? 0;

    // Usa remoteJidAlt como chave principal, ou remoteJid se não existir
    const chaveConversa = remoteJidAlt ?? remoteJid;

    const existente = conversasAgrupadas.get(chaveConversa);

    // Mantém a conversa com a mensagem mais recente
    if (!existente || messageTimestamp > existente.ultimaMensagemTimestamp) {
      conversasAgrupadas.set(chaveConversa, {
        remoteJid,
        remoteJidAlt,
        pushName,
        ultimaMensagemTimestamp: messageTimestamp,
      });
    }
  }

  // Ordena por última mensagem mais recente
  return Array.from(conversasAgrupadas.values())
    .sort((a, b) => b.ultimaMensagemTimestamp - a.ultimaMensagemTimestamp)
    .map((conversa) => ({
      remoteJid: conversa.remoteJid,
      remoteJidAlt: conversa.remoteJidAlt,
      pushName: conversa.pushName,
      isGroup: false,
    }));
}

export type EvolutionChatMessage = {
  remoteJid: string;
  pushName: string | null;
  messageType: string;
  messageText: string | null;
  messageTimestamp: number;
  fromMe: boolean;
};

export type EvolutionMensagem = {
  remoteJid: string;
  remoteJidAlt: string | null;
  remoteJidAltLastMessage: string | null;
  pushName: string | null;
  messageTimestamp: number;
};

export async function buscarMensagens(instanceName: string, limitePorPagina: number = 1000): Promise<EvolutionMensagem[]> {
  const todasMensagens: EvolutionMensagem[] = [];
  let pagina = 1;
  let temMaisPaginas = true;

  while (temMaisPaginas) {
    const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        limit: limitePorPagina,
        page: pagina,
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.message ?? "Erro ao buscar mensagens na Evolution");
    }

    const json = (await resposta.json().catch(() => ({}))) as {
      messages?: {
        records?: Array<{
          key?: {
            remoteJid?: string;
            remoteJidAlt?: string;
          };
          lastMessage?: {
            key?: {
              remoteJidAlt?: string;
            };
          };
          pushName?: string | null;
          messageTimestamp?: number;
        }>;
        pages?: number;
        total?: number;
      };
    };

    const registros = json.messages?.records ?? [];
    if (registros.length === 0) {
      temMaisPaginas = false;
      break;
    }

    for (const msg of registros) {
      const remoteJid = msg.key?.remoteJid ?? "";
      if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
        continue;
      }

      const remoteJidAlt = msg.key?.remoteJidAlt ?? null;
      const remoteJidAltLastMessage = msg.lastMessage?.key?.remoteJidAlt ?? null;
      const pushName = msg.pushName ?? null;
      const messageTimestamp = msg.messageTimestamp ?? 0;

      todasMensagens.push({
        remoteJid,
        remoteJidAlt,
        remoteJidAltLastMessage,
        pushName,
        messageTimestamp,
      });
    }

    const totalPaginas = json.messages?.pages ?? 1;
    if (pagina >= totalPaginas) {
      temMaisPaginas = false;
    } else {
      pagina += 1;
    }
  }

  const contactosUnicos = new Map<string, EvolutionMensagem>();

  for (const msg of todasMensagens) {
    const chave = msg.remoteJidAlt ?? msg.remoteJid;
    const existente = contactosUnicos.get(chave);

    if (!existente || msg.messageTimestamp > existente.messageTimestamp) {
      contactosUnicos.set(chave, msg);
    }
  }

  return Array.from(contactosUnicos.values());
}

export async function buscarMensagensPorChat(
  instanceName: string,
  remoteJid: string,
  limite: number = 30,
): Promise<EvolutionChatMessage[]> {
  const todasMensagens: EvolutionChatMessage[] = [];
  let pagina = 1;
  const limitePorPagina = Math.min(limite, 100);

  while (todasMensagens.length < limite) {
    try {
      const resposta = await fetch(
        `${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            where: {
              key: {
                remoteJid,
              },
            },
            page: pagina,
            offset: limitePorPagina,
          }),
        },
      );

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(erro.message ?? "Erro ao buscar mensagens do chat na Evolution");
      }

      const json = (await resposta.json().catch(() => ({}))) as {
        messages?: {
          records?: Array<{
            key?: {
              remoteJid?: string;
              fromMe?: boolean;
            };
            pushName?: string | null;
            messageType?: string;
            messageTimestamp?: number;
            message?: {
              conversation?: string;
              imageMessage?: unknown;
              videoMessage?: unknown;
              audioMessage?: unknown;
              documentMessage?: unknown;
              stickerMessage?: unknown;
              extendedTextMessage?: { text?: string };
            };
          }>;
          pages?: number;
        };
      };

      const registros = json.messages?.records ?? [];
      if (registros.length === 0) break;

      for (const msg of registros) {
        if (todasMensagens.length >= limite) break;

        const jid = msg.key?.remoteJid ?? "";
        if (!jid || jid.includes("@g.us") || jid === "status@broadcast") continue;

        const messageType = msg.messageType ?? "unknown";
        let messageText: string | null = null;

        if (msg.message) {
          if (msg.message.conversation) {
            messageText = msg.message.conversation;
          } else if (msg.message.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
          } else if (msg.message.imageMessage) {
            messageText = "[Midia: imagem]";
          } else if (msg.message.videoMessage) {
            messageText = "[Midia: video]";
          } else if (msg.message.audioMessage) {
            messageText = "[Audio]";
          } else if (msg.message.documentMessage) {
            messageText = "[Documento]";
          } else if (msg.message.stickerMessage) {
            messageText = "[Sticker]";
          }
        }

        todasMensagens.push({
          remoteJid: jid,
          pushName: msg.pushName ?? null,
          messageType,
          messageText,
          messageTimestamp: msg.messageTimestamp ?? 0,
          fromMe: msg.key?.fromMe ?? false,
        });
      }

      const totalPaginas = json.messages?.pages ?? 1;
      if (pagina >= totalPaginas) break;
      pagina += 1;
    } catch (erro) {
      console.error(
        `Erro ao buscar mensagens do chat ${remoteJid} na instancia ${instanceName}:`,
        erro,
      );
      throw erro;
    }
  }

  return todasMensagens;
}
