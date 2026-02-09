'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '@/context';
import type { Deal } from '@/types';
import { Modal } from './Modal';
import { Building2, CalendarClock, Save, Trash2, User, Wallet } from 'lucide-react';

interface DealFormProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  isNew: boolean;
}

const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400';
const selectClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer';

export const DealForm: React.FC<DealFormProps> = ({ deal: initialDeal, isOpen, onClose, isNew }) => {
  const {
    addDeal,
    updateDeal,
    removeDeal,
    customers = [],
    products = [],
    employees = [],
    pdvs = [],
    stages = [],
    currentUser,
  } = useCRM();

  const [form, setForm] = useState<Deal>(initialDeal);

  useEffect(() => {
    setForm(initialDeal);
  }, [initialDeal]);

  // defaults for new deals
  useEffect(() => {
    if (!isNew || !currentUser) return;
    setForm((prev) => {
      const assignedEmployeeIds = prev.assignedEmployeeIds?.length ? prev.assignedEmployeeIds : [currentUser.id];
      const pdvId = prev.pdvId !== undefined ? prev.pdvId : currentUser.pdvId;
      return {
        ...prev,
        visibility: prev.visibility || 'PUBLIC',
        assignedEmployeeIds,
        pdvId: pdvId ?? null,
      };
    });
  }, [isNew, currentUser]);

  const selectedProduct = useMemo(() => {
    const id = form.productIds?.[0];
    if (!id) return null;
    return products.find((p) => p.id === id) ?? null;
  }, [form.productIds, products]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (Number(form.value || 0) === Number(selectedProduct.basePrice || 0)) return;
    // only auto-fill when value is empty/zero on new deals
    if (!isNew && Number(form.value || 0) > 0) return;
    setForm((prev) => ({ ...prev, value: Number(selectedProduct.basePrice || 0) }));
  }, [selectedProduct, isNew, form.value]);

  const canEditPdv = currentUser?.role === 'ADMIN';

  const save = () => {
    if (!form.title?.trim()) return alert('Titulo e obrigatorio.');
    if (!form.customerId) return alert('Selecione um consorciado.');
    if (!form.stageId) return alert('Selecione uma etapa.');

    const finalDeal: Deal = {
      ...form,
      title: form.title.trim(),
      visibility: 'PUBLIC',
      assignedEmployeeIds: Array.isArray(form.assignedEmployeeIds) ? form.assignedEmployeeIds : [],
      productIds: Array.isArray(form.productIds) ? form.productIds : [],
      customValues: form.customValues ?? {},
      notes: form.notes ?? '',
    };

    if (isNew) addDeal(finalDeal);
    else updateDeal(finalDeal);
    onClose();
  };

  const del = () => {
    if (confirm('Excluir esta cota/proposta?')) {
      removeDeal(form.id);
      onClose();
    }
  };

  const selectedCustomerId = form.customerId || '';
  const selectedProductId = form.productIds?.[0] || '';
  const selectedOwnerId = form.assignedEmployeeIds?.[0] || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Nova Cota' : 'Editar Cota'} size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <select
            value={form.stageId}
            onChange={(e) => setForm((p) => ({ ...p, stageId: e.target.value }))}
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={del}
                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Titulo</label>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className={inputClass}
            placeholder="Ex: Carta imovel 500k"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <User size={14} className="text-slate-400" /> Consorciado
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const id = e.target.value;
                const customer = customers.find((c) => c.id === id);
                setForm((p) => ({
                  ...p,
                  customerId: id,
                  customerName: customer?.name ?? '',
                }));
              }}
              className={selectClass}
            >
              <option value="">Selecione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wallet size={14} className="text-slate-400" /> Plano
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setForm((p) => ({ ...p, productIds: e.target.value ? [e.target.value] : [] }))}
              className={selectClass}
            >
              <option value="">Sem plano</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Building2 size={14} className="text-slate-400" /> PDV
            </label>
            <select
              value={form.pdvId === null ? '' : (form.pdvId || '')}
              onChange={(e) => setForm((p) => ({ ...p, pdvId: e.target.value ? e.target.value : null }))}
              className={selectClass}
              disabled={!canEditPdv}
            >
              <option value="">Sem vinculo</option>
              {pdvs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!canEditPdv && <p className="mt-2 text-xs text-slate-400">Apenas ADMIN pode alterar o PDV.</p>}
          </div>

          <div>
            <label className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Responsavel</label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setForm((p) => ({ ...p, assignedEmployeeIds: e.target.value ? [e.target.value] : [] }))}
              className={selectClass}
            >
              <option value="">Sem responsavel</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Valor (R$)</label>
            <input
              type="number"
              value={Number(form.value || 0)}
              onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value) }))}
              className={inputClass}
            />
            {selectedProduct && (
              <p className="mt-2 text-xs text-slate-400">
                Sugestao do plano: R$ {Number(selectedProduct.basePrice || 0).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <CalendarClock size={14} className="text-slate-400" /> Proximo contato
            </label>
            <input
              type="date"
              value={form.nextFollowUpDate ? form.nextFollowUpDate.slice(0, 10) : ''}
              onChange={(e) => {
                const iso = e.target.value ? new Date(e.target.value + 'T12:00:00Z').toISOString() : undefined;
                setForm((p) => ({ ...p, nextFollowUpDate: iso }));
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Observacoes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className={`${inputClass} h-40 resize-none`}
            placeholder="Notas do atendimento..."
          />
        </div>
      </div>
    </Modal>
  );
};
