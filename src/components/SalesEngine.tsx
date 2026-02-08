'use client';

import React, { useState, useMemo } from 'react';
import { useCRM } from '@/context';
import { Deal, CustomFieldDefinition, CustomFieldType } from '@/types';
import { Plus, Search, Filter, Briefcase, FileText, ChevronRight, Sliders, Trash2, XCircle } from 'lucide-react';
import { DealForm } from './DealForm';
import { Modal } from './Modal';
import { generateStableId, getCurrentDateISO } from '@/utils/idUtils';

interface InputGroupProps {
  label: string;
  icon?: any;
  children?: React.ReactNode;
  required?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, children, required }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />}
      {children}
    </div>
  </div>
);

const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 hover:border-slate-300";
const selectClass = "w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer hover:border-slate-300";

export const SalesEngine: React.FC = () => {
  const {
    deals = [],
    currentUser,
    pdvs = [],
    products = [],
    customFieldDefs = [],
    addCustomFieldDef,
    updateCustomFieldDef,
    removeCustomFieldDef
  } = useCRM();
  const [filter, setFilter] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);

  const filteredDeals = deals.filter(d => 
    d.title.toLowerCase().includes(filter.toLowerCase()) || 
    d.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  const createNewDeal = () => {
    if (!currentUser) return;
    setSelectedDeal({
      id: generateStableId('deal'),
      title: '',
      pdvId: currentUser.pdvId,
      customerId: '',
      customerName: '',
      value: 0,
      stageId: 'stage-lead',
      assignedEmployeeIds: [currentUser.id],
      productIds: [],
      tags: [],
      notes: '',
      visibility: 'PUBLIC',
      createdAt: getCurrentDateISO()
    } as Deal);
  };

  const globalDealFields = useMemo(() => customFieldDefs.filter(f => f.scope === 'DEAL' && f.active), [customFieldDefs]);
  const [fieldData, setFieldData] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', scope: 'DEAL', required: false, active: true, options: [] });
  const [fieldEditingId, setFieldEditingId] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState('');

  const saveField = () => {
      if (!fieldData.label) return;
      const key = fieldData.key || fieldData.label.toLowerCase().replace(/\s+/g, '_');
      const payload = { ...fieldData, key, scope: 'DEAL', id: fieldEditingId || generateStableId('cf-deal') } as CustomFieldDefinition;
      
      if (fieldEditingId) updateCustomFieldDef(payload); else addCustomFieldDef(payload);
      
      setFieldData({ label: '', key: '', type: 'text', scope: 'DEAL', required: false, active: true, options: [] });
      setFieldEditingId(null);
  };

  const addOption = () => {
      if (!optionInput.trim()) return;
      setFieldData(prev => ({ ...prev, options: [...(prev.options || []), optionInput.trim()] }));
      setOptionInput('');
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in min-h-screen">
       <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
               <Briefcase className="text-blue-600" /> Motor de Vendas (Propostas)
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestão de pedidos e propostas de consórcio e varejo.</p>
          </div>
          <div className="flex gap-2">
             {currentUser?.role === 'ADMIN' && (
                <button onClick={() => setIsFieldsModalOpen(true)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all">
                   <Sliders size={18}/> Campos Extras
                </button>
             )}
             <button onClick={createNewDeal} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
                <Plus size={20}/> Nova Proposta
             </button>
          </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="relative flex-1 max-w-md group">
                 <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
                 <input 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    placeholder="Buscar proposta, cliente ou ID..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
                 />
              </div>
              <div className="flex gap-2">
                 <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
                    <Filter size={14}/> Filtros
                 </button>
              </div>
          </div>

          <table className="w-full text-left">
             <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 tracking-wider">
                <tr>
                   <th className="px-6 py-4">Proposta</th>
                   <th className="px-6 py-4">Cliente</th>
                   <th className="px-6 py-4">Produto / Detalhes</th>
                   <th className="px-6 py-4">Valor</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4 text-right">Ação</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 text-sm">
                {filteredDeals.map(deal => {
                   const productInfo = deal.productIds.map(pid => products.find(p => p.id === pid)?.name).join(', ');
                   const details = deal.customValues 
                      ? Object.entries(deal.customValues).map(([k,v]) => `${k}: ${v}`).join(' | ') 
                      : '';

                   return (
                     <tr key={deal.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => setSelectedDeal(deal)}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                 <FileText size={18} />
                              </div>
                              <div>
                                 <p className="font-bold text-slate-900">{deal.title}</p>
                                 <p className="text-xs text-slate-400 font-mono">ID: {deal.id.substr(0,8)}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{deal.customerName}</td>
                        <td className="px-6 py-4">
                           <p className="text-slate-800 font-medium">{productInfo || 'Nenhum produto'}</p>
                           {details && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{details}</p>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">R$ {deal.value.toLocaleString()}</td>
                        <td className="px-6 py-4">
                           <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Em Andamento
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="text-slate-300 group-hover:text-blue-500 transition-colors">
                              <ChevronRight size={20} />
                           </button>
                        </td>
                     </tr>
                   )
                })}
             </tbody>
          </table>
          {filteredDeals.length === 0 && (
             <div className="p-12 text-center text-slate-400">Nenhuma proposta encontrada.</div>
          )}
       </div>

       {selectedDeal && (
          <DealForm 
             deal={selectedDeal} 
             isOpen={true} 
             onClose={() => setSelectedDeal(null)} 
             isNew={!deals.some(d => d.id === selectedDeal.id)} 
          />
       )}

       <Modal isOpen={isFieldsModalOpen} onClose={() => setIsFieldsModalOpen(false)} title="Personalizar Campos de Negócio" size="lg">
           <div className="flex flex-col md:flex-row gap-6 h-[60vh] md:h-auto">
              <div className="flex-1 border-r border-slate-100 pr-4 overflow-y-auto custom-scrollbar">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Campos Existentes</h4>
                 <div className="space-y-2">
                    {globalDealFields.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum campo personalizado.</p>}
                    {globalDealFields.map(f => (
                       <div key={f.id} onClick={() => { setFieldData(f); setFieldEditingId(f.id); }} className={`p-3 rounded-lg border cursor-pointer transition-all ${fieldEditingId === f.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                          <div className="flex justify-between items-start">
                             <span className="font-bold text-sm text-slate-800">{f.label}</span>
                             <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir?')) removeCustomFieldDef(f.id); }} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{f.type}</span>
                             {f.required && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Obrigatório</span>}
                          </div>
                       </div>
                    ))}
                    <button onClick={() => { setFieldEditingId(null); setFieldData({ label: '', key: '', type: 'text', scope: 'DEAL', required: false, active: true, options: [] }); }} className="w-full py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors mt-2">
                       + Novo Campo
                    </button>
                 </div>
              </div>

              <div className="flex-1 pl-2">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{fieldEditingId ? 'Editar Campo' : 'Novo Campo'}</h4>
                 <div className="space-y-4">
                     <InputGroup label="Rótulo" required>
                        <input value={fieldData.label} onChange={e => setFieldData({...fieldData, label: e.target.value})} className={inputClass} placeholder="Ex: Origem do Lead" />
                     </InputGroup>
                     
                     <div className="grid grid-cols-2 gap-2">
                        <InputGroup label="Tipo">
                           <select value={fieldData.type} onChange={e => setFieldData({...fieldData, type: e.target.value as CustomFieldType})} className={selectClass}>
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="date">Data</option>
                              <option value="select">Lista</option>
                              <option value="boolean">Sim/Não</option>
                           </select>
                        </InputGroup>
                        <div className="flex items-center mt-6">
                           <input type="checkbox" id="req" checked={fieldData.required} onChange={e => setFieldData({...fieldData, required: e.target.checked})} className="mr-2" />
                           <label htmlFor="req" className="text-sm">Obrigatório</label>
                        </div>
                     </div>

                     {fieldData.type === 'select' && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Opções</label>
                           <div className="flex gap-2 mb-2">
                              <input value={optionInput} onChange={e => setOptionInput(e.target.value)} className="flex-1 px-2 py-1 text-sm border rounded" placeholder="Opção..." />
                              <button onClick={addOption} className="bg-blue-600 text-white px-2 rounded font-bold text-xs">+</button>
                           </div>
                           <div className="flex flex-wrap gap-1">
                              {fieldData.options?.map((o, i) => (
                                 <span key={i} className="text-[10px] bg-white border px-1.5 py-0.5 rounded flex items-center gap-1">
                                    {o} <button onClick={() => setFieldData(prev => ({...prev, options: prev.options?.filter((_, idx) => idx !== i)}))}><XCircle size={10} className="text-red-400"/></button>
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}

                     <button onClick={saveField} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700">
                        {fieldEditingId ? 'Salvar Alterações' : 'Criar Campo'}
                     </button>
                 </div>
              </div>
           </div>
        </Modal>
    </div>
  );
};
