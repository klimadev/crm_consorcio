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
      throw new Error(erro.message ?? "Erro ao criar instância");
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

function normalizarTelefoneWhatsapp(telefone: string) {
  return telefone.replace(/\D/g, "");
}

export async function enviarMensagemTexto(params: EnviarMensagemTextoParams): Promise<void> {
  const numero = normalizarTelefoneWhatsapp(params.telefone);

  const resposta = await fetch(`${EVOLUTION_API_URL}/message/sendText/${params.instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      number: numero,
      text: params.mensagem,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message ?? "Erro ao enviar mensagem WhatsApp");
  }
}
