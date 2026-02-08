'use client';

import React from 'react';
import type { CommercialDashboardFilters, Employee, PDV, Region } from '@/types';

interface CommercialFiltersProps {
  filters: CommercialDashboardFilters;
  years: number[];
  pdvs: PDV[];
  regions: Region[];
  managers: Employee[];
  sellers: Employee[];
  onFilterChange: (next: CommercialDashboardFilters) => void;
}

const selectClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-500';

const periodOptions: Array<{ value: NonNullable<CommercialDashboardFilters['period']>; label: string }> = [
  { value: 'month', label: 'Mensal' },
  { value: 'year', label: 'Anual' },
  { value: 'last_30_days', label: 'Últimos 30 dias' },
  { value: 'last_90_days', label: 'Últimos 90 dias' },
];

const monthOptions = [
  { value: '', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export const CommercialFilters: React.FC<CommercialFiltersProps> = ({
  filters,
  years,
  pdvs,
  regions,
  managers,
  sellers,
  onFilterChange,
}) => {
  return (
    <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <select
          className={selectClass}
          value={filters.year ?? ''}
          onChange={(event) => onFilterChange({ ...filters, year: Number(event.target.value) || undefined })}
          aria-label="Filtro por ano"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              Ano {year}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.month ?? ''}
          onChange={(event) =>
            onFilterChange({
              ...filters,
              month: event.target.value ? Number(event.target.value) : null,
            })
          }
          aria-label="Filtro por mês"
        >
          {monthOptions.map((month) => (
            <option key={month.value || 'all'} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.period ?? 'month'}
          onChange={(event) =>
            onFilterChange({
              ...filters,
              period: event.target.value as NonNullable<CommercialDashboardFilters['period']>,
            })
          }
          aria-label="Filtro por período"
        >
          {periodOptions.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.pdvId ?? ''}
          onChange={(event) => onFilterChange({ ...filters, pdvId: event.target.value || undefined })}
          aria-label="Filtro por PDV"
        >
          <option value="">Todos os PDVs</option>
          {pdvs.map((pdv) => (
            <option key={pdv.id} value={pdv.id}>
              {pdv.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.regionId ?? ''}
          onChange={(event) => onFilterChange({ ...filters, regionId: event.target.value || undefined })}
          aria-label="Filtro por praça"
        >
          <option value="">Todas as praças</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.managerId ?? ''}
          onChange={(event) => onFilterChange({ ...filters, managerId: event.target.value || undefined })}
          aria-label="Filtro por gerente"
        >
          <option value="">Todos os gerentes</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.sellerId ?? ''}
          onChange={(event) => onFilterChange({ ...filters, sellerId: event.target.value || undefined })}
          aria-label="Filtro por vendedor"
        >
          <option value="">Todos os vendedores</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
