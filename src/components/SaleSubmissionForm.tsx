'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '@/context';
import { Modal } from './Modal';
import type { Sale } from '@/types';
import { Save, User, Wallet, Building2, CalendarDays } from 'lucide-react';

interface SaleSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Sale> & { customerName: string; totalValue: number }) => void;
  existingSale?: Sale | null;
}

const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400';
const selectClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer';

type InstallmentDraft = { dueDate: string; value: number };

const emptyInstallments: InstallmentDraft[] = [
  { dueDate: '', value: 0 },
  { dueDate: '', value: 0 },
  { dueDate: '', value: 0 },
  { dueDate: '', value: 0 },
];

export const SaleSubmissionForm: React.FC<SaleSubmissionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSale,
}) => {
  const { customers = [], products = [], pdvs = [], currentUser } = useCRM();

  const canEditPdv = currentUser?.role === 'ADMIN';

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState<string | null>(null);
  const [pdvId, setPdvId] = useState<string>('');
  const [totalValue, setTotalValue] = useState<number>(0);
  const [creditValue, setCreditValue] = useState<number>(0);
  const [planMonths, setPlanMonths] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<InstallmentDraft[]>(emptyInstallments);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId) ?? null, [customers, customerId]);
  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  useEffect(() => {
    if (!isOpen) return;

    if (existingSale) {
      setCustomerId(existingSale.customerId || '');
      setCustomerName(existingSale.customerName || '');
      setProductId(existingSale.productId || '');
      setProductName(existingSale.productName ?? null);
      setPdvId(existingSale.pdvId || '');
      setTotalValue(Number(existingSale.totalValue || 0));
      setCreditValue(Number(existingSale.creditValue || 0));
      setPlanMonths(existingSale.planMonths ?? '');
      setNotes(existingSale.notes || '');
      const mapped = ([1, 2, 3, 4] as const).map((n) => {
        const inst = existingSale.installments.find((i) => i.number === n);
        return {
          dueDate: inst?.dueDate ? inst.dueDate.slice(0, 10) : '',
          value: Number(inst?.value || 0),
        };
      });
      setInstallments(mapped);
      return;
    }

    setCustomerId('');
    setCustomerName('');
    setProductId('');
    setProductName(null);
    setPdvId(currentUser?.pdvId || '');
    setTotalValue(0);
    setCreditValue(0);
    setPlanMonths('');
    setNotes('');
    setInstallments(emptyInstallments);
  }, [isOpen, existingSale, currentUser]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomerName(selectedCustomer.name);
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedProduct) {
      setProductName(null);
      return;
    }
    setProductName(selectedProduct.name);
  }, [selectedProduct]);

  const submit = () => {
    const name = customerName.trim();
    if (!name) return alert('Selecione um consorciado ou informe o nome do cliente.');
    if (!Number.isFinite(totalValue) || Number(totalValue) <= 0) return alert('Informe o valor total.');

    onSave({
      id: existingSale?.id,
      customerId: customerId || null,
      customerName: name,
      productId: productId || null,
      productName: productName ?? null,
      pdvId: pdvId || null,
      totalValue: Number(totalValue),
      creditValue: Number(creditValue || 0),
      planMonths: planMonths === '' ? null : Number(planMonths),
      notes: notes.trim() ? notes.trim() : null,
      installment1: { dueDate: installments[0].dueDate ? new Date(`${installments[0].dueDate}T12:00:00Z`).toISOString() : undefined, value: Number(installments[0].value || 0) },
      installment2: { dueDate: installments[1].dueDate ? new Date(`${installments[1].dueDate}T12:00:00Z`).toISOString() : undefined, value: Number(installments[1].value || 0) },
      installment3: { dueDate: installments[2].dueDate ? new Date(`${installments[2].dueDate}T12:00:00Z`).toISOString() : undefined, value: Number(installments[2].value || 0) },
      installment4: { dueDate: installments[3].dueDate ? new Date(`${installments[3].dueDate}T12:00:00Z`).toISOString() : undefined, value: Number(installments[3].value || 0) },
    } as any);

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSale ? 'Editar Venda' : 'Nova Venda'}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <User size={14} className="text-slate-400" /> Consorciado
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            {!customerId && (
              <input
                className={`${inputClass} mt-3`}
                placeholder="Ou digite o nome do cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wallet size={14} className="text-slate-400" /> Plano
            </label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass}>
              <option value="">Sem plano</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Building2 size={14} className="text-slate-400" /> PDV
            </label>
            <select
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
              className={selectClass}
              disabled={!canEditPdv}
            >
              <option value="">Sem vínculo</option>
              {pdvs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!canEditPdv && <p className="mt-2 text-xs text-slate-400">Apenas ADMIN pode alterar o PDV.</p>}
          </div>

          <div>
            <label className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Valor total (R$)</label>
            <input
              type="number"
              value={totalValue}
              onChange={(e) => setTotalValue(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Crédito (R$)</label>
            <input
              type="number"
              value={creditValue}
              onChange={(e) => setCreditValue(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Prazo (meses)</label>
            <input
              type="number"
              value={planMonths}
              onChange={(e) => setPlanMonths(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
              placeholder="Ex: 60"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <CalendarDays size={14} className="text-slate-400" /> Parcelas (1-4)
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {installments.map((inst, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-extrabold text-slate-700">{idx + 1}ª parcela</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Venc.</label>
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => {
                        const next = [...installments];
                        next[idx] = { ...next[idx], dueDate: e.target.value };
                        setInstallments(next);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor (R$)</label>
                    <input
                      type="number"
                      value={inst.value}
                      onChange={(e) => {
                        const next = [...installments];
                        next[idx] = { ...next[idx], value: Number(e.target.value) };
                        setInstallments(next);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} h-28 resize-none bg-white`}
            placeholder="Informações adicionais..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            <Save size={18} /> Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
};
