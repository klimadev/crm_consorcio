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

export async function deletarInstancia(instanceName: string): Promise<void> {
  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers,
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.message ?? "Erro ao excluir instância");
    }
  } catch (erro) {
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

export async function buscarConversas(instanceName: string): Promise<EvolutionConversa[]> {
  const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message ?? "Erro ao buscar conversas na Evolution");
  }

  const json = (await resposta.json().catch(() => ({}))) as Array<{
    remoteJid?: string;
    remoteJidAlt?: string;
    pushName?: string | null;
    isGroup?: boolean;
    lastMessage?: {
      key?: {
        remoteJid?: string;
        remoteJidAlt?: string;
        fromMe?: boolean;
      };
      pushName?: string;
    };
  }>;

  return json
    .map((chat) => {
      const remoteJid = (chat.remoteJid ?? "").trim();
      if (!remoteJid || remoteJid.includes("@g.us")) return null;

      const remoteJidAlt =
        chat.remoteJidAlt ??
        chat.lastMessage?.key?.remoteJidAlt ??
        (remoteJid.includes("@lid") ? null : remoteJid);

      const pushName = chat.pushName ?? chat.lastMessage?.pushName ?? null;
      const isGroup = remoteJid.includes("@g.us") || chat.isGroup === true;

      return {
        remoteJid,
        remoteJidAlt: remoteJidAlt && remoteJidAlt.includes("@s.whatsapp.net") ? remoteJidAlt : null,
        pushName: pushName ?? null,
        isGroup,
      };
    })
    .filter((item): item is EvolutionConversa => item !== null);
}

export type EvolutionMensagem = {
  remoteJid: string;
  remoteJidAlt: string | null;
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
      const pushName = msg.pushName ?? null;
      const messageTimestamp = msg.messageTimestamp ?? 0;

      todasMensagens.push({
        remoteJid,
        remoteJidAlt,
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
