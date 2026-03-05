type ApiErro = { erro?: string };

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function verificarBootstrapConfigs(): Promise<ResultadoApi<null>> {
  const resposta = await fetch("/api/estagios");
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar configuracoes." };
  }

  return { ok: true, dados: null };
}
