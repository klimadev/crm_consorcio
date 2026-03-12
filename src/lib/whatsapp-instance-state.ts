import { ensureSqliteOptimizations, prisma } from "@/lib/prisma";
import { conectarInstancia, obterEstadoConexao, reiniciarInstancia } from "@/lib/evolution-api";
import { withRetry } from "@/lib/api/retry";

type InstanciaDbMinima = {
  id: string;
  instance_name: string;
};

export type ResultadoConexaoWhatsapp = {
  status: string;
  conectado: boolean;
  phone: string | null;
  profile_name: string | null;
  profile_pic: string | null;
  qrCode: string | null;
  pairingCode: string | null;
  origem: "status" | "restart" | "connect";
};

async function persistirEstadoInstancia(instanciaId: string, dados: Omit<ResultadoConexaoWhatsapp, "origem" | "qrCode" | "pairingCode">) {
  await ensureSqliteOptimizations();

  const instanciaAtual = await prisma.whatsappInstancia.findUnique({
    where: { id: instanciaId },
    select: {
      status: true,
      phone: true,
      profile_name: true,
      profile_pic: true,
    },
  });

  if (
    instanciaAtual &&
    instanciaAtual.status === dados.status &&
    instanciaAtual.phone === dados.phone &&
    instanciaAtual.profile_name === dados.profile_name &&
    instanciaAtual.profile_pic === dados.profile_pic
  ) {
    return instanciaAtual;
  }

  return withRetry(
    () =>
      prisma.whatsappInstancia.update({
        where: { id: instanciaId },
        data: {
          status: dados.status,
          phone: dados.phone,
          profile_name: dados.profile_name,
          profile_pic: dados.profile_pic,
        },
      }),
    { maxAttempts: 3, delayMs: 1000 },
  );
}

function resultadoOffline(origem: ResultadoConexaoWhatsapp["origem"]): ResultadoConexaoWhatsapp {
  return {
    status: "disconnected",
    conectado: false,
    phone: null,
    profile_name: null,
    profile_pic: null,
    qrCode: null,
    pairingCode: null,
    origem,
  };
}

export async function sincronizarEstadoWhatsapp(instancia: InstanciaDbMinima): Promise<ResultadoConexaoWhatsapp> {
  const estado = await obterEstadoConexao(instancia.instance_name);

  if (!estado) {
    const offline = resultadoOffline("status");
    await persistirEstadoInstancia(instancia.id, offline);
    return offline;
  }

  const resultado: ResultadoConexaoWhatsapp = {
    status: estado.status,
    conectado: estado.connected,
    phone: estado.phoneNumber,
    profile_name: estado.profileName,
    profile_pic: estado.profilePic,
    qrCode: null,
    pairingCode: null,
    origem: "status",
  };

  await persistirEstadoInstancia(instancia.id, resultado);
  return resultado;
}

export async function reconectarInstanciaWhatsapp(
  instancia: InstanciaDbMinima,
  opcoes?: { forcarQrCode?: boolean },
): Promise<ResultadoConexaoWhatsapp> {
  const estadoAtual = await sincronizarEstadoWhatsapp(instancia);

  if (estadoAtual.conectado && !opcoes?.forcarQrCode) {
    return estadoAtual;
  }

  const estadoReiniciado = await reiniciarInstancia(instancia.instance_name);

  if (estadoReiniciado?.connected && !opcoes?.forcarQrCode) {
    const resultado: ResultadoConexaoWhatsapp = {
      status: estadoReiniciado.status,
      conectado: true,
      phone: estadoReiniciado.phoneNumber,
      profile_name: estadoReiniciado.profileName,
      profile_pic: estadoReiniciado.profilePic,
      qrCode: null,
      pairingCode: null,
      origem: "restart",
    };
    await persistirEstadoInstancia(instancia.id, resultado);
    return resultado;
  }

  const qrCode = await conectarInstancia(instancia.instance_name);
  const estadoFinal = await obterEstadoConexao(instancia.instance_name);

  const resultado: ResultadoConexaoWhatsapp = {
    status: estadoFinal?.status ?? (qrCode ? "qrcode" : "disconnected"),
    conectado: estadoFinal?.connected ?? false,
    phone: estadoFinal?.phoneNumber ?? null,
    profile_name: estadoFinal?.profileName ?? null,
    profile_pic: estadoFinal?.profilePic ?? null,
    qrCode: qrCode?.base64 ?? qrCode?.code ?? null,
    pairingCode: qrCode?.pairingCode ?? null,
    origem: "connect",
  };

  await persistirEstadoInstancia(instancia.id, resultado);
  return resultado;
}
