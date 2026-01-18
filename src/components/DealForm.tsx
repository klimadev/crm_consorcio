'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '@/context';
import { Deal, Tag } from '@/types';
import { Modal } from './Modal';
import { 
  Save, Trash2, User, Box, AlignLeft, DollarSign, Upload, 
  CheckCircle, Car, Plus, X, Building2, ClipboardList, 
  Lock, Users, Sliders, Zap
} from 'lucide-react';

interface DealFormProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  isNew: boolean;
}

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

const TAG_COLORS = [
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-orange-100 text-orange-800',
];

export const DealForm: React.FC<DealFormProps> = ({ deal: initialDeal, isOpen, onClose, isNew }) => {
  const { addDeal, updateDeal, removeDeal, products, tags, addTag, stages, currentUser, pdvs, employees, customFieldDefs, customers } = useCRM();
  const [formData, setFormData] = useState<Deal>(initialDeal);
  const [activeTab, setActiveTab] = useState<'details' | 'products' | 'notes'>('details');
  const [tagInput, setTagInput] = useState('');

  const selectedProducts = useMemo(() => products.filter(p => formData.productIds.includes(p.id)), [formData.productIds, products]);
  const globalDealFields = useMemo(() => customFieldDefs.filter(f => f.scope === 'DEAL' && f.active), [customFieldDefs]);

  const availableEmployees = useMemo(() => {
     if (formData.pdvId) return employees.filter(e => e.pdvId === formData.pdvId);
     if (formData.pdvId === null) return employees.filter(e => e.pdvId === null);
     return employees;
  }, [employees, formData.pdvId]);

  const availableCustomers = useMemo(() => {
     if (currentUser.role === 'ADMIN') return customers;
     return customers;
  }, [customers, currentUser]);

  useEffect(() => {
    if (isNew) {
      setFormData(prev => {
        const newData = { ...prev };
        if (newData.assignedEmployeeIds.length === 0) newData.assignedEmployeeIds = [currentUser.id];
        if (currentUser.pdvId && newData.pdvId === undefined) newData.pdvId = currentUser.pdvId;
        else if (newData.pdvId === undefined) newData.pdvId = null;
        if (!newData.visibility) newData.visibility = 'PUBLIC';
        return newData;
      });
    }
  }, [isNew, currentUser]);

  const handleChange = (field: keyof Deal, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleCustomFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, customValues: { ...prev.customValues, [key]: value } }));
  };

  useEffect(() => {
    const totalValue = selectedProducts.reduce((sum, p) => sum + p.basePrice, 0);
    if (selectedProducts.length > 0 && totalValue !== formData.value) {
       handleChange('value', totalValue);
    }
  }, [formData.productIds, products, selectedProducts]);

  const handleSelectionShortcut = (mode: 'ALL' | 'RESTRICTED') => {
     if (mode === 'ALL') {
        handleChange('visibility', 'PUBLIC');
        handleChange('assignedEmployeeIds', availableEmployees.map(e => e.id));
     } else {
        handleChange('visibility', 'RESTRICTED');
        handleChange('assignedEmployeeIds', []); 
     }
  };

  const handleSave = () => {
    if (!formData.title) return alert('O Título do negócio é obrigatório.');
    if (!formData.customerId) return alert('Selecione um Cliente.');
    
    for (const field of globalDealFields) {
       if (field.required && !formData.customValues?.[field.key]) {
          return alert(`O campo ${field.label} é obrigatório.`);
       }
    }
    
    const finalData = { ...formData };
    if (!finalData.visibility) finalData.visibility = 'PUBLIC';
    
    if (finalData.visibility === 'RESTRICTED' && finalData.assignedEmployeeIds.length === 0) {
        if(!confirm("Nenhum responsável selecionado. O negócio ficará órfão?")) return;
    }

    if (isNew) addDeal(finalData);
    else updateDeal(finalData);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Excluir este negócio permanentemente?')) {
      removeDeal(formData.id);
      onClose();
    }
  };

  const toggleProductSelection = (id: string) => {
    const current = formData.productIds;
    const updated = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    handleChange('productIds', updated);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter') {
        e.preventDefault();
        if (!tagInput.trim()) return;
        const existing = tags.find(t => t.label.toLowerCase() === tagInput.toLowerCase());
        if (existing) toggleTag(existing);
        else {
           const newTag: Tag = { id: `tag-${Date.now()}`, label: tagInput.trim(), color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] };
           addTag(newTag);
           toggleTag(newTag);
        }
        setTagInput('');
     }
  };

  const toggleTag = (tag: Tag) => {
    const hasTag = formData.tags.find(t => t.id === tag.id);
    const updated = hasTag ? formData.tags.filter(t => t.id !== tag.id) : [...formData.tags, tag];
    handleChange('tags', updated);
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 hover:border-slate-300";
  const selectClass = "w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer hover:border-slate-300";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Novo Negócio' : 'Gerenciar Negócio'} size="xl">
      <div className="flex flex-col h-[80vh] md:h-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-1 mb-6 gap-4">
           <div className="flex-1 w-full md:w-auto relative flex gap-2">
              <select 
                value={formData.stageId} 
                onChange={(e) => handleChange('stageId', e.target.value)}
                className="appearance-none w-full md:max-w-xs bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
              >
                {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             {!isNew && (
                <button onClick={handleDelete} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                  <Trash2 size={18} />
                </button>
             )}
             <button onClick={handleSave} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
               <Save size={18} /> <span>Salvar</span>
             </button>
           </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 overflow-x-auto gap-1">
          {[
            { id: 'details', label: 'Cadastro', icon: Car },
            { id: 'products', label: 'Produtos', icon: Box },
            { id: 'notes', label: 'Obs.', icon: AlignLeft }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-2">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="md:col-span-2">
                 <InputGroup label="Título da Proposta" required>
                    <input 
                      value={formData.title} 
                      onChange={(e) => handleChange('title', e.target.value)} 
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400" 
                      placeholder="Ex: Venda Corporativa" 
                      autoFocus 
                    />
                 </InputGroup>
              </div>

              <div className="md:col-span-1">
                <InputGroup label="Cliente" icon={User} required>
                  <select 
                     value={formData.customerId || ''} 
                     onChange={(e) => {
                        const cust = customers.find(c => c.id === e.target.value);
                        if (cust) setFormData(prev => ({ ...prev, customerId: cust.id, customerName: cust.name }));
                        else setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
                     }}
                     className={selectClass}
                  >
                     <option value="">Selecione um Cliente...</option>
                     {availableCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                     ))}
                  </select>
                </InputGroup>
              </div>

              <div className="md:col-span-1">
                <InputGroup label="Valor Total" icon={DollarSign}>
                   <input type="number" value={formData.value} onChange={(e) => handleChange('value', parseFloat(e.target.value))} className={inputClass} placeholder="0,00" />
                </InputGroup>
              </div>

              {globalDealFields.length > 0 && (
                 <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    {globalDealFields.map(field => (
                       <InputGroup key={field.id} label={field.label} required={field.required} icon={Sliders}>
                           {field.type === 'select' ? (
                              <select 
                                 value={formData.customValues?.[field.key] || ''}
                                 onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                                 className={`${inputClass} appearance-none`}
                              >
                                 <option value="">Selecione...</option>
                                 {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                           ) : (
                              <input 
                                 type={field.type}
                                 value={formData.customValues?.[field.key] || ''}
                                 onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                                 className={inputClass}
                              />
                           )}
                       </InputGroup>
                    ))}
                 </div>
              )}
              
              <div className="md:col-span-2 pt-4 border-t border-slate-100 mt-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Unidade / Filial (Empresa)" icon={Building2} required>
                       <select 
                          value={formData.pdvId === null ? 'null' : formData.pdvId}
                          onChange={e => {
                             const val = e.target.value;
                             handleChange('pdvId', val === 'null' ? null : val);
                          }}
                          className={selectClass}
                          disabled={currentUser.role !== 'ADMIN'}
                        >
                          <option value="null">Matriz / Corporativo (HQ)</option>
                          {pdvs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </InputGroup>

                    <InputGroup label="Atribuição Rápida" icon={Zap} required>
                       <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button 
                             type="button"
                             onClick={() => handleSelectionShortcut('ALL')}
                             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.visibility === 'PUBLIC' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                             <Users size={14}/> Equipe Toda (Todos)
                          </button>
                          <button 
                             type="button"
                             onClick={() => handleSelectionShortcut('RESTRICTED')}
                             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.visibility === 'RESTRICTED' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                             <Lock size={14}/> Manual (Restrito)
                          </button>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1.5 ml-1 leading-tight">
                         * "Equipe Toda" seleciona todos. "Manual" limpa a seleção para você escolher os responsáveis.
                       </p>
                    </InputGroup>
                 </div>
              </div>

              <div className="md:col-span-2 relative">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Responsáveis (Equipe)</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 min-h-[60px]">
                      {availableEmployees.length > 0 ? availableEmployees.map(emp => {
                          const isSelected = formData.assignedEmployeeIds.includes(emp.id);
                          return (
                            <button
                                key={emp.id}
                                onClick={() => {
                                    const current = formData.assignedEmployeeIds;
                                    const updated = current.includes(emp.id) 
                                        ? current.filter(id => id !== emp.id) 
                                        : [...current, emp.id];
                                    handleChange('assignedEmployeeIds', updated);
                                }}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200
                                    ${isSelected 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}
                                `}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                    {emp.name.charAt(0)}
                                </div>
                                <span>{emp.name}</span>
                                {isSelected && <CheckCircle size={14} className="ml-1"/>}
                            </button>
                          );
                      }) : (
                        <p className="text-xs text-slate-400 italic p-2">Nenhum colaborador disponível nesta unidade.</p>
                      )}
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
             <div className="space-y-6 animate-fade-in">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Selecione os Produtos</label>
                    <div className="grid grid-cols-1 gap-2">
                        {products.map(p => (
                          <div key={p.id} onClick={() => toggleProductSelection(p.id)} className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${formData.productIds.includes(p.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                              <div>
                                <p className="font-bold text-sm text-slate-800">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.category} • R$ {p.basePrice.toLocaleString()}</p>
                              </div>
                              {formData.productIds.includes(p.id) && <CheckCircle size={20} className="text-blue-600"/>}
                          </div>
                        ))}
                    </div>
                 </div>

                 {selectedProducts.length > 0 && (
                   <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList size={16}/> Especificações do Pedido</h3>
                      <div className="space-y-6">
                        {selectedProducts.map(prod => {
                           if (!prod.formSchema || prod.formSchema.length === 0) return null;
                           return (
                             <div key={prod.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 border-b border-blue-50 pb-2">{prod.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {prod.formSchema.map(field => (
                                     <div key={field.key} className={field.type === 'select' ? 'md:col-span-2' : ''}>
                                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">{field.label}</label>
                                        {field.type === 'select' ? (
                                           <select 
                                              value={formData.customValues?.[field.key] || ''} 
                                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                           >
                                              <option value="">Selecione...</option>
                                              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                           </select>
                                        ) : (
                                           <input 
                                              type={field.type}
                                              value={formData.customValues?.[field.key] || ''}
                                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                           />
                                        )}
                                     </div>
                                   ))}
                                </div>
                             </div>
                           );
                        })}
                      </div>
                   </div>
                 )}
             </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="md:col-span-2 mt-2">
                 <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 ml-1"><Upload size={12}/> Etiquetas</label>
                 <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                    {formData.tags.map(tag => (
                       <span key={tag.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${tag.color}`}>
                          {tag.label}
                          <button onClick={() => toggleTag(tag)} className="hover:text-red-600"><X size={12}/></button>
                       </span>
                    ))}
                    <input 
                       value={tagInput}
                       onChange={e => setTagInput(e.target.value)}
                       onKeyDown={handleTagInputKeyDown}
                       placeholder="Adicionar tag..."
                       className="flex-1 min-w-[150px] outline-none text-sm py-1 px-1 bg-transparent placeholder:text-slate-400"
                    />
                 </div>
              </div>
              <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-blue-500 outline-none resize-none leading-relaxed" placeholder="Escreva suas anotações sobre o cliente ou o andamento da negociação..." />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
