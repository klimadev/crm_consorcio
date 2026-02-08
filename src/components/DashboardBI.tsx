'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarRange, CircleDollarSign, ShieldCheck, Store, TrendingUp, UserRound } from 'lucide-react';
import { useCRM } from '@/context';
import { commercialDashboardApi } from '@/services/api';
import type { CommercialDashboardFilters } from '@/types';
import { CommercialFilters } from './CommercialFilters';
import { Card, KPIWidget } from './SettingsViews';

type CommercialTab = 'overview' | 'ranking' | 'pdv' | 'insurance';
type RankingScope = 'sellers' | 'managers';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('pt-BR');
const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatPercent(value: number): string {
  return percentFormatter.format(value / 100);
}

const tabButtonClass = (isActive: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
  }`;

const MiniLineChart: React.FC<{ data: Array<{ label: string; value: number }> }> = ({ data }) => {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sem dados no período.</div>;
  }

  const width = 980;
  const height = 260;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
      const y = height - (item.value / maxValue) * (height - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points} />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
          const y = height - (item.value / maxValue) * (height - 30) - 15;
          return <circle key={`${item.label}-${index}`} cx={x} cy={y} r="4" fill="#1d4ed8" />;
        })}
      </svg>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4 lg:grid-cols-6">
        {data.slice(-6).map((item) => (
          <div key={item.label} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center">
            <div>{new Date(item.label).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
            <div className="font-bold text-slate-700">{currencyFormatter.format(item.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeekdayBars: React.FC<{ data: Array<{ label: string; value: number }> }> = ({ data }) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = (item.value / maxValue) * 100;
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{item.label}</span>
              <span>{currencyFormatter.format(item.value)}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-blue-500" style={{ width: `${Math.max(width, 4)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HorizontalBars: React.FC<{ data: Array<{ label: string; value: number; count: number }> }> = ({ data }) => {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sem faturamento no período.</div>;
  }
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const width = (item.value / maxValue) * 100;
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="text-xs font-bold text-slate-500">{numberFormatter.format(item.count)} vendas</span>
            </div>
            <div className="relative h-5 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: `${Math.max(width, 4)}%` }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">{currencyFormatter.format(item.value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const DashboardBI: React.FC = () => {
  const { deals = [], pdvs = [], regions = [], employees = [] } = useCRM();
  const now = new Date();
  const [activeTab, setActiveTab] = React.useState<CommercialTab>('overview');
  const [rankingScope, setRankingScope] = React.useState<RankingScope>('sellers');
  const [filters, setFilters] = React.useState<CommercialDashboardFilters>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    period: 'month',
  });

  const availableYears = React.useMemo(() => {
    const years = new Set<number>([now.getFullYear()]);
    deals.forEach((deal) => years.add(new Date(deal.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [deals, now]);

  const managers = React.useMemo(() => employees.filter((employee) => employee.role === 'MANAGER'), [employees]);
  const sellers = React.useMemo(() => employees.filter((employee) => employee.role === 'SALES_REP'), [employees]);

  const metricsQuery = useQuery({
    queryKey: ['commercialDashboard', filters],
    queryFn: () => commercialDashboardApi.getMetrics(filters),
  });

  const metrics = metricsQuery.data;
  const ranking = rankingScope === 'sellers' ? metrics?.ranking.sellers ?? [] : metrics?.ranking.managers ?? [];
  const insuranceTotal = (metrics?.insuranceBreakdown.withInsurance ?? 0) + (metrics?.insuranceBreakdown.withoutInsurance ?? 0);
  const insuranceShare = insuranceTotal > 0 ? ((metrics?.insuranceBreakdown.withInsurance ?? 0) / insuranceTotal) * 100 : 0;

  return (
    <div className="mx-auto min-h-full max-w-[1600px] space-y-6 p-6 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Comercial</h1>
        <p className="text-sm text-slate-500">Análises de faturamento, desempenho comercial e eficiência no fechamento.</p>
      </div>

      <CommercialFilters
        filters={filters}
        years={availableYears}
        pdvs={pdvs}
        regions={regions}
        managers={managers}
        sellers={sellers}
        onFilterChange={setFilters}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <KPIWidget title="Total Vendas" value={numberFormatter.format(metrics?.totalSalesCount ?? 0)} icon={BarChart3} color="blue" />
        </Card>
        <Card className="p-5">
          <KPIWidget title="Valor Total" value={currencyFormatter.format(metrics?.totalSalesValue ?? 0)} icon={CircleDollarSign} color="emerald" />
        </Card>
        <Card className="p-5">
          <KPIWidget title="Ticket Médio" value={currencyFormatter.format(metrics?.avgTicket ?? 0)} icon={TrendingUp} color="amber" />
        </Card>
        <Card className="p-5">
          <KPIWidget
            title="Comparativo Mensal"
            value={formatPercent(metrics?.monthlyComparisonPct ?? 0)}
            icon={CalendarRange}
            color="slate"
            trend={formatPercent(metrics?.monthlyComparisonPct ?? 0)}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <KPIWidget title="Cotas no Ano" value={numberFormatter.format(metrics?.yearlyQuotaCount ?? 0)} icon={BarChart3} color="blue" />
        </Card>
        <Card className="p-5">
          <KPIWidget title="Valor de Crédito Ano" value={currencyFormatter.format(metrics?.yearlyCreditValue ?? 0)} icon={CircleDollarSign} color="emerald" />
        </Card>
        <Card className="p-5">
          <KPIWidget title="Ticket Médio Ano" value={currencyFormatter.format(metrics?.yearlyAvgTicket ?? 0)} icon={TrendingUp} color="amber" />
        </Card>
        <Card className="p-5">
          <KPIWidget
            title="Comparativo Anual"
            value={formatPercent(metrics?.yearlyComparisonPct ?? 0)}
            icon={CalendarRange}
            color="slate"
            trend={formatPercent(metrics?.yearlyComparisonPct ?? 0)}
          />
        </Card>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap gap-2">
          <button className={tabButtonClass(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
            Visão Geral
          </button>
          <button className={tabButtonClass(activeTab === 'ranking')} onClick={() => setActiveTab('ranking')}>
            Ranking
          </button>
          <button className={tabButtonClass(activeTab === 'pdv')} onClick={() => setActiveTab('pdv')}>
            Faturamento de PDVs
          </button>
          <button className={tabButtonClass(activeTab === 'insurance')} onClick={() => setActiveTab('insurance')}>
            Seguro & Produto
          </button>
        </div>
      </div>

      {metricsQuery.isLoading && (
        <Card className="p-10 text-center text-sm text-slate-500">Carregando métricas comerciais...</Card>
      )}

      {metricsQuery.isError && (
        <Card className="p-10 text-center text-sm text-red-500">Não foi possível carregar o dashboard comercial.</Card>
      )}

      {!metricsQuery.isLoading && !metricsQuery.isError && activeTab === 'overview' && metrics && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Evolução no Período</h3>
              <p className="text-xs text-slate-500">
                {new Date(metrics.periodStart).toLocaleDateString('pt-BR')} até {new Date(metrics.periodEnd).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <MiniLineChart data={metrics.evolutionSeries.map((item) => ({ label: item.label, value: item.value }))} />
          </Card>
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Vendas por Dia da Semana</h3>
              <p className="text-xs text-slate-500">Distribuição de faturamento por dia.</p>
            </div>
            <WeekdayBars data={metrics.weekdaySeries.map((item) => ({ label: item.label, value: item.value }))} />
          </Card>
        </div>
      )}

      {!metricsQuery.isLoading && !metricsQuery.isError && activeTab === 'ranking' && metrics && (
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-800">Ranking Comercial</h3>
            <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1">
              <button className={tabButtonClass(rankingScope === 'sellers')} onClick={() => setRankingScope('sellers')}>
                Vendedores
              </button>
              <button className={tabButtonClass(rankingScope === 'managers')} onClick={() => setRankingScope('managers')}>
                Gerentes
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Pos</th>
                  <th className="py-2">Avatar</th>
                  <th className="py-2">Nome</th>
                  <th className="py-2">Faturamento</th>
                  <th className="py-2">Qtd Vendas</th>
                  <th className="py-2">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((item, index) => (
                  <tr key={item.employeeId}>
                    <td className="py-3 font-semibold text-slate-700">{index + 1}</td>
                    <td className="py-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {item.name
                          .split(' ')
                          .slice(0, 2)
                          .map((token) => token[0]?.toUpperCase() ?? '')
                          .join('')}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-700">{item.name}</td>
                    <td className="py-3 font-bold text-slate-900">{currencyFormatter.format(item.totalValue)}</td>
                    <td className="py-3 text-slate-600">{numberFormatter.format(item.wonDeals)}</td>
                    <td className="py-3 text-slate-600">{currencyFormatter.format(item.avgTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ranking.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sem dados para os filtros selecionados.</p>}
          </div>
        </Card>
      )}

      {!metricsQuery.isLoading && !metricsQuery.isError && activeTab === 'pdv' && metrics && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Store size={18} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Faturamento de PDVs</h3>
          </div>
          <HorizontalBars
            data={metrics.pdvRevenueSeries.map((item) => ({
              label: item.pdvName,
              value: item.value,
              count: item.count,
            }))}
          />
        </Card>
      )}

      {!metricsQuery.isLoading && !metricsQuery.isError && activeTab === 'insurance' && metrics && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Com Seguro</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{numberFormatter.format(metrics.insuranceBreakdown.withInsurance)}</p>
            <p className="mt-2 text-sm text-slate-500">{currencyFormatter.format(metrics.insuranceBreakdown.withInsuranceValue)}</p>
          </Card>
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <UserRound size={18} className="text-slate-600" />
              <h3 className="text-lg font-bold text-slate-800">Sem Seguro</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{numberFormatter.format(metrics.insuranceBreakdown.withoutInsurance)}</p>
            <p className="mt-2 text-sm text-slate-500">{currencyFormatter.format(metrics.insuranceBreakdown.withoutInsuranceValue)}</p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Participação</h3>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
              <span>Negócios com seguro</span>
              <span>{formatPercent(insuranceShare)}</span>
            </div>
            <div className="h-5 rounded-full bg-slate-100">
              <div className="h-5 rounded-full bg-emerald-500" style={{ width: `${Math.max(insuranceShare, 4)}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Base de cálculo: {numberFormatter.format(insuranceTotal)} vendas no período.</p>
          </Card>
        </div>
      )}
    </div>
  );
};
