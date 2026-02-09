'use client';

import React, { useMemo, useState } from 'react';
import { useCRM } from '@/context';
import {
  CUSTOMER_STATUS_LABELS,
  PDV_TYPES,
  type Customer,
  type CustomerStatus,
  type Employee,
  type PDV,
  type PDVType,
  type Product,
  type Role,
} from '@/types';
import {
  Briefcase,
  Building2,
  Edit,
  Globe,
  Mail,
  MapPin,
  Package,
  Plus,
  Save,
  Search,
  Shield,
  Store,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Modal } from './Modal';
import { generateStableId, getCurrentDateISO } from '@/utils/idUtils';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>{children}</div>
);

interface KPIWidgetProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'slate' | 'emerald' | 'amber';
  trend?: string;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClass =
    {
      blue: 'bg-blue-50 text-blue-600',
      slate: 'bg-slate-100 text-slate-700',
      emerald: 'bg-emerald-50 text-emerald-600',
      amber: 'bg-amber-50 text-amber-600',
    }[color] ?? 'bg-slate-100 text-slate-700';

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-xl p-3 ${colorClass}`}>
          <Icon size={20} />
        </div>
        {trend && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{trend}</span>}
      </div>
      <div>
        <p className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400';
const selectClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer';

const Header: React.FC<{ title: string; subtitle: string; icon: React.ElementType; right?: React.ReactNode }> = ({
  title,
  subtitle,
  icon: Icon,
  right,
}) => (
  <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
    <div className="flex items-center gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-blue-600 shadow-sm">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
    {right}
  </div>
);

const RoleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Gerente',
  SALES_REP: 'Consultor',
  SUPPORT: 'Suporte',
};

export const CustomersView: React.FC = () => {
  const { customers = [], pdvs = [], addCustomer, updateCustomer, currentUser, getPDVName } = useCRM();
  const canEdit = currentUser?.role === 'ADMIN';

  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    type: 'PJ',
    name: '',
    document: '',
    email: '',
    phone: '',
    zipCode: '',
    status: 'LEAD',
    pdvIds: [],
    assignedEmployeeIds: [],
    customValues: {},
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.document.toLowerCase().includes(q));
  }, [customers, query]);

  const openNew = () => {
    setEditingId(null);
    setFormData({
      type: 'PJ',
      name: '',
      document: '',
      email: '',
      phone: '',
      zipCode: '',
      status: 'LEAD',
      pdvIds: [],
      assignedEmployeeIds: [],
      customValues: {},
    });
    setIsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData(customer);
    setIsModalOpen(true);
  };

  const save = () => {
    if (!formData.name?.trim() || !formData.document?.trim()) {
      alert('Nome e Documento sao obrigatorios.');
      return;
    }

    const payload: Customer = {
      id: editingId || generateStableId('cust'),
      type: formData.type || 'PJ',
      name: formData.name.trim(),
      document: formData.document.trim(),
      email: formData.email || '',
      phone: formData.phone || '',
      zipCode: formData.zipCode || '',
      status: (formData.status || 'LEAD') as CustomerStatus,
      pdvIds: Array.isArray(formData.pdvIds) ? formData.pdvIds : [],
      assignedEmployeeIds: [],
      customValues: {},
      createdAt: editingId ? (formData.createdAt || getCurrentDateISO()) : getCurrentDateISO(),
    };

    if (editingId) updateCustomer(payload);
    else addCustomer(payload);

    setIsModalOpen(false);
  };

  const selectedPdvId = (formData.pdvIds || [])[0] || '';

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 md:p-8">
      <Header
        title="Consorciados"
        subtitle="Cadastro e consulta rapida."
        icon={Briefcase}
        right={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            <Plus size={18} /> Novo
          </button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou documento..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{filtered.length} registros</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Consorciado</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">PDV</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c.id} className="group hover:bg-blue-50/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={12} className="text-slate-400" /> {c.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{c.document}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {c.pdvIds?.length ? getPDVName(c.pdvIds[0]) : 'Sem vinculo'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{CUSTOMER_STATUS_LABELS[c.status]}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-blue-600"
                    >
                      <Edit size={16} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Nenhum consorciado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Consorciado' : 'Novo Consorciado'}
        size="lg"
      >
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <button
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
            >
              <Save size={18} /> Salvar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: 'PJ' }))}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    formData.type === 'PJ' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pessoa Juridica
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: 'PF' }))}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    formData.type === 'PF' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pessoa Fisica
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome</label>
              <input
                value={formData.name || ''}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="Ex: Joao da Silva"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Documento</label>
              <input
                value={formData.document || ''}
                onChange={(e) => setFormData((p) => ({ ...p, document: e.target.value }))}
                className={inputClass}
                placeholder={formData.type === 'PJ' ? 'CNPJ' : 'CPF'}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
              <select
                value={(formData.status as string) || 'LEAD'}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as CustomerStatus }))}
                className={selectClass}
              >
                {Object.entries(CUSTOMER_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
              <input
                value={formData.email || ''}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
                placeholder="email@dominio.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Telefone</label>
              <input
                value={formData.phone || ''}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">PDV</label>
              <select
                value={selectedPdvId}
                onChange={(e) => setFormData((p) => ({ ...p, pdvIds: e.target.value ? [e.target.value] : [] }))}
                className={selectClass}
                disabled={!canEdit}
              >
                <option value="">Sem vinculo</option>
                {pdvs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {!canEdit && <p className="mt-2 text-xs text-slate-400">Apenas ADMIN pode alterar o PDV.</p>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const ProductsView: React.FC = () => {
  const { products = [], addProduct, updateProduct, removeProduct, currentUser } = useCRM();
  const canEdit = currentUser?.role === 'ADMIN';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    basePrice: 0,
    description: '',
    active: true,
  });

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', basePrice: 0, description: '', active: true });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData(p);
    setIsModalOpen(true);
  };

  const save = () => {
    if (!formData.name?.trim()) {
      alert('Nome do plano e obrigatorio.');
      return;
    }

    const payload: Product = {
      id: editingId || generateStableId('prod'),
      name: formData.name.trim(),
      description: formData.description || '',
      category: formData.category || '',
      basePrice: Number(formData.basePrice || 0),
      attributes: Array.isArray(formData.attributes) ? formData.attributes : [],
      active: formData.active ?? true,
    };

    if (editingId) updateProduct(payload);
    else addProduct(payload);

    setIsModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 md:p-8">
      <Header
        title="Planos"
        subtitle="Catalogo simples de produtos/planos."
        icon={Package}
        right={
          <button
            onClick={openNew}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus size={18} /> Novo
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-slate-900">{p.name}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{p.category || 'Sem categoria'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">
                  R$ {Number(p.basePrice || 0).toLocaleString('pt-BR')}
                </div>
                <div className={`mt-1 text-xs font-bold ${p.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {p.active ? 'Ativo' : 'Inativo'}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => openEdit(p)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Edit size={14} /> Editar
              </button>
              <button
                onClick={() => {
                  if (!canEdit) return;
                  if (confirm('Excluir este plano?')) removeProduct(p.id);
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Plano' : 'Novo Plano'} size="lg">
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save size={18} /> Salvar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome</label>
              <input
                value={formData.name || ''}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="Ex: Carta Imovel 500k"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Categoria</label>
              <input
                value={formData.category || ''}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className={inputClass}
                placeholder="Imovel / Auto / Agro"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Credito (R$)</label>
              <input
                type="number"
                value={Number(formData.basePrice || 0)}
                onChange={(e) => setFormData((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Descricao</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className={`${inputClass} h-28 resize-none`}
                placeholder="Resumo do plano..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Ativo</label>
              <select
                value={formData.active ? '1' : '0'}
                onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value === '1' }))}
                className={selectClass}
              >
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>
          </div>
          {!canEdit && <p className="text-xs text-slate-400">Apenas ADMIN pode editar planos.</p>}
        </div>
      </Modal>
    </div>
  );
};

export const TeamPlacesView: React.FC = () => {
  const {
    currentUser,
    pdvs = [],
    employees = [],
    addPDV,
    updatePDV,
    removePDV,
    addEmployee,
    updateEmployee,
    removeEmployee,
    getPDVName,
  } = useCRM();

  const canEdit = currentUser?.role === 'ADMIN';
  const [tab, setTab] = useState<'pdvs' | 'team'>('pdvs');

  // PDV modal
  const [pdvModalOpen, setPdvModalOpen] = useState(false);
  const [pdvEditingId, setPdvEditingId] = useState<string | null>(null);
  const [pdvForm, setPdvForm] = useState<Partial<PDV>>({ name: '', type: 'PHYSICAL_STORE', location: '', isActive: true });

  const openNewPdv = () => {
    setPdvEditingId(null);
    setPdvForm({ name: '', type: 'PHYSICAL_STORE', location: '', isActive: true });
    setPdvModalOpen(true);
  };

  const openEditPdv = (pdv: PDV) => {
    setPdvEditingId(pdv.id);
    setPdvForm(pdv);
    setPdvModalOpen(true);
  };

  const savePdv = () => {
    if (!pdvForm.name?.trim()) {
      alert('Nome do PDV e obrigatorio.');
      return;
    }
    const payload: PDV = {
      id: pdvEditingId || generateStableId('pdv'),
      name: pdvForm.name.trim(),
      type: (pdvForm.type as PDVType) || 'PHYSICAL_STORE',
      location: pdvForm.location || '',
      isActive: pdvForm.isActive ?? true,
    };

    if (pdvEditingId) updatePDV(payload);
    else addPDV(payload);

    setPdvModalOpen(false);
  };

  // Employee modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empEditingId, setEmpEditingId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<Partial<Employee>>({ name: '', email: '', role: 'SALES_REP', pdvId: null, active: true });

  const openNewEmployee = () => {
    setEmpEditingId(null);
    setEmpForm({ name: '', email: '', role: 'SALES_REP', pdvId: null, active: true });
    setEmpModalOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEmpEditingId(emp.id);
    setEmpForm(emp);
    setEmpModalOpen(true);
  };

  const saveEmployee = () => {
    if (!empForm.name?.trim() || !empForm.email?.trim()) {
      alert('Nome e Email sao obrigatorios.');
      return;
    }

    const payload: Employee = {
      id: empEditingId || generateStableId('emp'),
      name: empForm.name.trim(),
      email: empForm.email.trim(),
      role: (empForm.role as Role) || 'SALES_REP',
      pdvId: empForm.pdvId ?? null,
      active: empForm.active ?? true,
    };

    if (empEditingId) updateEmployee(payload);
    else addEmployee(payload);
    setEmpModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 md:p-8">
      <Header title="Equipe & PDVs" subtitle="Tudo de organizacao em um lugar." icon={Building2} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'pdvs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setTab('pdvs')}
          >
            PDVs
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setTab('team')}
          >
            Equipe
          </button>
        </div>
      </div>

      {tab === 'pdvs' && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">PDVs</h3>
            </div>
            <button
              onClick={openNewPdv}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={16} /> Novo PDV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">PDV</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pdvs.map((p: PDV) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{PDV_TYPES[p.type] || p.type}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" /> {p.location || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditPdv(p)}
                        disabled={!canEdit}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (!canEdit) return;
                          if (confirm('Excluir este PDV?')) removePDV(p.id);
                        }}
                        disabled={!canEdit}
                        className="ml-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {pdvs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                      Nenhum PDV cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'team' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Equipe</h3>
            </div>
            <button
              onClick={openNewEmployee}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={16} /> Novo colaborador
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Pessoa</th>
                  <th className="px-6 py-4">Funcao</th>
                  <th className="px-6 py-4">PDV</th>
                  <th className="px-6 py-4 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map((e: Employee) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{e.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{e.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{RoleLabels[e.role]}</td>
                    <td className="px-6 py-4 text-slate-600">{getPDVName(e.pdvId)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditEmployee(e)}
                        disabled={!canEdit}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (!canEdit) return;
                          if (confirm('Excluir este colaborador?')) removeEmployee(e.id);
                        }}
                        disabled={!canEdit}
                        className="ml-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canEdit && <div className="px-6 py-4 text-xs text-slate-400">Apenas ADMIN pode editar equipe.</div>}
        </Card>
      )}

      <Modal isOpen={pdvModalOpen} onClose={() => setPdvModalOpen(false)} title={pdvEditingId ? 'Editar PDV' : 'Novo PDV'} size="lg">
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <button
              onClick={savePdv}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome</label>
              <input
                value={pdvForm.name || ''}
                onChange={(e) => setPdvForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</label>
              <select
                value={(pdvForm.type as string) || 'PHYSICAL_STORE'}
                onChange={(e) => setPdvForm((p) => ({ ...p, type: e.target.value as PDVType }))}
                className={selectClass}
              >
                {Object.entries(PDV_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Local</label>
              <input
                value={pdvForm.location || ''}
                onChange={(e) => setPdvForm((p) => ({ ...p, location: e.target.value }))}
                className={inputClass}
                placeholder="Cidade/UF"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={empModalOpen} onClose={() => setEmpModalOpen(false)} title={empEditingId ? 'Editar Colaborador' : 'Novo Colaborador'} size="lg">
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <button
              onClick={saveEmployee}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save size={18} /> Salvar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome</label>
              <input
                value={empForm.name || ''}
                onChange={(e) => setEmpForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
              <input
                value={empForm.email || ''}
                onChange={(e) => setEmpForm((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Funcao</label>
              <select
                value={(empForm.role as string) || 'SALES_REP'}
                onChange={(e) => setEmpForm((p) => ({ ...p, role: e.target.value as Role }))}
                className={selectClass}
              >
                {Object.entries(RoleLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">PDV</label>
              <select
                value={empForm.pdvId || ''}
                onChange={(e) => setEmpForm((p) => ({ ...p, pdvId: e.target.value ? e.target.value : null }))}
                className={selectClass}
              >
                <option value="">Sem vinculo</option>
                {pdvs.map((p: PDV) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Ativo</label>
              <select
                value={empForm.active ? '1' : '0'}
                onChange={(e) => setEmpForm((p) => ({ ...p, active: e.target.value === '1' }))}
                className={selectClass}
              >
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
