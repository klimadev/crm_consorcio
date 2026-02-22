import { prisma } from "@/lib/prisma";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formataMoeda } from "@/lib/utils";
import { GraficoVendas } from "@/components/grafico-vendas";

export default async function PaginaResumo() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  const whereLeads =
    sessao.perfil === "COLABORADOR"
      ? { id_empresa: sessao.id_empresa, id_funcionario: sessao.id_usuario }
      : { id_empresa: sessao.id_empresa };

  const leads = await prisma.lead.findMany({
    where: whereLeads,
    include: {
      estagio: true,
      pendencias: true,
    },
  });

  // Filtrar leads ganhos que têm todas as pendências resolvidas
  const gainsWithAllPendenciesResolved = leads.filter((lead) => {
    if (lead.estagio.tipo !== "GANHO") return false;
    const pendenciasNaoResolvidas = lead.pendencias.filter((p) => !p.resolvida);
    return pendenciasNaoResolvidas.length === 0;
  });

  // Filtrar leads perdidos que têm todas as pendências resolvidas
  const lostsWithAllPendenciesResolved = leads.filter((lead) => {
    if (lead.estagio.tipo !== "PERDIDO") return false;
    const pendenciasNaoResolvidas = lead.pendencias.filter((p) => !p.resolvida);
    return pendenciasNaoResolvidas.length === 0;
  });

  const totalAberto = leads
    .filter((lead) => lead.estagio.tipo === "ABERTO")
    .reduce((acc, lead) => acc + lead.valor_consorcio, 0);

  const ganhos = gainsWithAllPendenciesResolved;
  const perdidos = lostsWithAllPendenciesResolved;
  const totalGanho = ganhos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);
  const taxaConversao = ganhos.length + perdidos.length > 0
    ? (ganhos.length / (ganhos.length + perdidos.length)) * 100
    : 0;

  const agora = new Date();
  const meses = Array.from({ length: 6 }).map((_, index) => {
    const data = new Date(agora.getFullYear(), agora.getMonth() - (5 - index), 1);
    return {
      chave: `${data.getFullYear()}-${data.getMonth() + 1}`,
      mes: data.toLocaleDateString("pt-BR", { month: "short" }),
      total: 0,
    };
  });

  for (const lead of ganhos) {
    const chave = `${lead.criado_em.getFullYear()}-${lead.criado_em.getMonth() + 1}`;
    const alvo = meses.find((mes) => mes.chave === chave);
    if (alvo) {
      alvo.total += lead.valor_consorcio;
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumo</h1>
        <p className="text-sm text-sky-500">Indicadores do seu funil de vendas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formataMoeda(totalAberto)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total fechado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formataMoeda(totalGanho)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de conversao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{taxaConversao.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas (ultimos meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoVendas dados={meses.map((m) => ({ mes: m.mes, total: m.total }))} />
        </CardContent>
      </Card>
    </section>
  );
}
