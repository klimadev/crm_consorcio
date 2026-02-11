'use client';

import React, { useMemo, useState } from 'react';
import { useCRM } from '@/context';
import { SaleSubmissionForm } from './SaleSubmissionForm';
import { ValidationModal } from './ValidationModal';
import { InstallmentGrid } from './InstallmentGrid';
import type { Sale, SaleConsistencyStatus } from '@/types';
import {
  SALE_CONSISTENCY_STATUS_COLORS,
  SALE_CONSISTENCY_STATUS_LABELS,
} from '@/types';
import {
  Plus,
  Search,
  ShieldCheck,
  ChevronDown,
  ClipboardCheck,
  CalendarClock,
} from 'lucide-react';

type TabFilter = SaleConsistencyStatus;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export const ValidatorDashboard: React.FC = () => {
  const {
    currentUser,
    pdvs = [],
    employees = [],
    sales,
    salesLoading,
    salesCounts,
    addSale,
    updateSale,
    validateSale,
    updateInstallment,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<TabFilter>('AWAITING_CONSISTENCY');
  const [searchTerm, setSearchTerm] = useState('');
  const [pdvFilter, setPdvFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Record<string, boolean>>({});
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const role = currentUser?.role;
  const canSubmit = role === 'ADMIN' || role === 'MANAGER' || role === 'SALES_REP';
  const canValidate = role === 'ADMIN';
  const canEditInstallments = role === 'ADMIN' || role === 'MANAGER';
  const isValidator = role === 'ADMIN' || role === 'MANAGER';

  const list = Array.isArray(sales) ? sales : [];

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return list
      .filter((s) => s.consistencyStatus === activeTab)
      .filter((s) => {
        if (!term) return true;
        const product = (s.productName || '').toLowerCase();
        return (
          s.customerName.toLowerCase().includes(term) ||
          s.sellerName.toLowerCase().includes(term) ||
          product.includes(term)
        );
      })
      .filter((s) => {
        if (pdvFilter && s.pdvId !== pdvFilter) return false;
        if (sellerFilter && s.sellerId !== sellerFilter) return false;
        return true;
      });
  }, [list, activeTab, searchTerm, pdvFilter, sellerFilter]);

  const counts = salesCounts || {
    AWAITING_CONSISTENCY: filteredSales.filter((s) => s.consistencyStatus === 'AWAITING_CONSISTENCY').length,
    CONSISTENT: filteredSales.filter((s) => s.consistencyStatus === 'CONSISTENT').length,
    INCONSISTENT: filteredSales.filter((s) => s.consistencyStatus === 'INCONSISTENT').length,
  };

  const toggleExpand = (saleId: string) => {
    setExpandedSaleIds((prev) => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  if (!currentUser) {
    return null;
  }

  const tabs: Array<{ key: TabFilter; icon: React.ElementType }> = [
    { key: 'AWAITING_CONSISTENCY', icon: CalendarClock },
    { key: 'CONSISTENT', icon: ClipboardCheck },
    { key: 'INCONSISTENT', icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Validação de Vendas</div>
              <div className="text-xs text-slate-500">Fila de conferência + rastreio das 4 primeiras parcelas.</div>
            </div>

            <div className="flex items-center gap-2">
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSale(null);
                    setShowSubmitForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={18} /> Nova Venda
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 flex-wrap">
                {tabs.map(({ key, icon: Icon }) => {
                  const isActive = activeTab === key;
                  const badge = (counts as any)?.[key] ?? 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition-colors ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                      {SALE_CONSISTENCY_STATUS_LABELS[key]}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                        isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente, vendedor, produto..."
                    className="w-full sm:w-[340px] rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                {isValidator && (
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-500" />
                      <select
                        value={pdvFilter}
                        onChange={(e) => setPdvFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm font-semibold text-slate-800 outline-none appearance-none"
                      >
                        <option value="">Todos PDVs</option>
                        {pdvs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-500" />
                      <select
                        value={sellerFilter}
                        onChange={(e) => setSellerFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm font-semibold text-slate-800 outline-none appearance-none"
                      >
                        <option value="">Todos vendedores</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {salesLoading ? (
          <div className="text-slate-400">Carregando vendas...</div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-sm font-extrabold text-slate-800">Nenhuma venda nesta aba</div>
            <div className="mt-2 text-xs text-slate-500">Tente ajustar filtros ou criar uma nova venda.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSales.map((sale) => {
              const statusColor = SALE_CONSISTENCY_STATUS_COLORS[sale.consistencyStatus];
              const pdvName = sale.pdvId ? pdvs.find((p) => p.id === sale.pdvId)?.name : null;
              const isExpanded = Boolean(expandedSaleIds[sale.id]);
              const canEditSale =
                (role === 'ADMIN' || role === 'MANAGER' || sale.sellerId === currentUser.id) &&
                sale.consistencyStatus !== 'CONSISTENT';

              return (
                <div key={sale.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-[240px]">
                        <div className="text-lg font-extrabold text-slate-900">{sale.customerName}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {sale.productName || '—'}
                          {pdvName ? ` • ${pdvName}` : ''}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${statusColor}`}>
                            {SALE_CONSISTENCY_STATUS_LABELS[sale.consistencyStatus]}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">Vendedor: {sale.sellerName}</span>
                          <span className="text-xs font-semibold text-slate-500">Criado: {formatDate(sale.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</div>
                          <div className="text-sm font-extrabold text-slate-900">{formatCurrency(sale.totalValue)}</div>
                        </div>

                        {sale.consistencyStatus === 'CONSISTENT' && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(sale.id)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                          >
                            Parcelas
                          </button>
                        )}

                        {canValidate && sale.consistencyStatus !== 'CONSISTENT' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowValidationModal(true);
                            }}
                            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
                          >
                            Validar
                          </button>
                        )}

                        {canEditSale && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSale(sale);
                              setShowSubmitForm(true);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>

                    {sale.consistencyStatus === 'INCONSISTENT' && sale.validationNotes && (
                      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-red-700">Motivo</div>
                        <div className="mt-1 text-sm font-semibold text-red-800">{sale.validationNotes}</div>
                        <div className="mt-2 text-xs text-red-700">Edite e salve para reenviar para conferência.</div>
                      </div>
                    )}
                  </div>

                  {sale.consistencyStatus === 'CONSISTENT' && isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Rastreamento de parcelas</div>
                      <InstallmentGrid
                        saleId={sale.id}
                        installments={sale.installments}
                        canEdit={canEditInstallments}
                        onUpdate={(saleId, instNumber, status, receivedDate) =>
                          updateInstallment(saleId, instNumber, status, receivedDate)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SaleSubmissionForm
        isOpen={showSubmitForm}
        onClose={() => setShowSubmitForm(false)}
        existingSale={editingSale}
        onSave={(data) => {
          if (editingSale?.id) {
            updateSale({ ...(data as any), id: editingSale.id });
          } else {
            addSale(data);
          }
        }}
      />

      {selectedSale && (
        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          sale={selectedSale}
          onValidate={async (saleId, status, notes) => {
            await validateSale(saleId, status, notes);
          }}
        />
      )}
    </div>
  );
};
