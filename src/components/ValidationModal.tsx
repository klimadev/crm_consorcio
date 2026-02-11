'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from './Modal';
import type { Sale } from '@/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onValidate: (saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes: string) => Promise<void> | void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateLong(iso: string | null) {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, sale, onValidate }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const installments = useMemo(() => {
    return ([1, 2, 3, 4] as const).map((n) => sale.installments.find((i) => i.number === n));
  }, [sale.installments]);

  const handleValidate = async (status: 'CONSISTENT' | 'INCONSISTENT') => {
    setLoading(true);
    try {
      await onValidate(sale.id, status, notes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validar Venda" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{sale.customerName}</div>
            <div className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Vendedor</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{sale.sellerName}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Produto</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{sale.productName || '—'}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor total</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">{formatCurrency(sale.totalValue)}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Crédito</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(sale.creditValue)}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">Prazo: {sale.planMonths ? `${sale.planMonths} meses` : '--'}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Parcelas (1-4)</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {installments.map((inst, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-sm font-bold text-slate-800">{idx + 1}ª</div>
                <div className="text-sm font-semibold text-slate-700">{formatCurrency(inst?.value || 0)}</div>
                <div className="text-xs font-semibold text-slate-500">Venc: {formatDateLong(inst?.dueDate || null)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Observações da validação</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none h-28"
            placeholder="Descreva o motivo (se inconsistente) ou anotações da aprovação..."
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleValidate('CONSISTENT')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 size={18} /> Consistente
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleValidate('INCONSISTENT')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            <XCircle size={18} /> Inconsistente
          </button>
        </div>
      </div>
    </Modal>
  );
};
