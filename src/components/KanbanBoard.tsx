'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '@/context';
import { Deal, PipelineStage, PipelineStageType, Employee, AutomationStep } from '@/types';
import { 
  GripVertical, Plus, Trash2, CheckCircle2, 
  Filter, X, Search, User, Building2, Tag, 
  DollarSign, RefreshCcw, Settings, Check, XOctagon, ArrowRightCircle,
  MapPin, Package, Clock, MessageSquare
} from 'lucide-react';
import { DealForm } from './DealForm';
import { Modal } from './Modal';
import { AutomationBuilder } from './AutomationBuilder';
import { generateStableId, getCurrentDateISO } from '@/utils/idUtils';

const STAGE_COLORS = [
  { label: 'Blue', value: 'border-t-blue-500', bg: 'bg-blue-500' },
  { label: 'Yellow', value: 'border-t-yellow-500', bg: 'bg-yellow-500' },
  { label: 'Purple', value: 'border-t-purple-500', bg: 'bg-purple-500' },
  { label: 'Orange', value: 'border-t-orange-500', bg: 'bg-orange-500' },
  { label: 'Green', value: 'border-t-green-500', bg: 'bg-green-500' },
  { label: 'Red', value: 'border-t-red-500', bg: 'bg-red-500' },
  { label: 'Indigo', value: 'border-t-indigo-500', bg: 'bg-indigo-500' },
  { label: 'Pink', value: 'border-t-pink-500', bg: 'bg-pink-500' },
  { label: 'Cyan', value: 'border-t-cyan-500', bg: 'bg-cyan-500' },
  { label: 'Slate', value: 'border-t-slate-500', bg: 'bg-slate-500' },
];

export const KanbanBoard: React.FC = () => {
  const {
    deals = [],
    stages = [],
    updateDeal,
    addStage,
    updateStage,
    removeStage,
    reorderStages,
    getEmployeeName,
    getPDVName,
    getProductName,
    employees = [],
    pdvs = [],
    tags = [],
    currentUser,
    products = []
  } = useCRM();
  
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [stageToEdit, setStageToEdit] = useState<PipelineStage | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    pdvId: '',
    employeeId: '',
    tagId: '',
    startDate: '',
    endDate: '',
  });

  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  const availablePdvs = useMemo(() => {
     if (!currentUser) return pdvs;
     if (currentUser.role === 'ADMIN') return pdvs;
     return pdvs.filter(p => p.id === currentUser.pdvId);
  }, [pdvs, currentUser]);

  const availableEmployees = useMemo(() => {
     if (!currentUser) return employees;
     if (currentUser.role === 'ADMIN') return employees;
     if (currentUser.role === 'MANAGER' && currentUser.pdvId) {
        return employees.filter(e => e.pdvId === currentUser.pdvId);
     }
     return employees.filter(e => e.id === currentUser.id);
  }, [employees, currentUser]);

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!deal.title.toLowerCase().includes(searchLower) && !deal.customerName.toLowerCase().includes(searchLower)) return false;
      }
      if (filters.employeeId && !deal.assignedEmployeeIds.includes(filters.employeeId)) return false;
      if (filters.tagId && !deal.tags.some(t => t.id === filters.tagId)) return false;
      if (filters.pdvId && deal.pdvId !== filters.pdvId) return false;
      if (filters.startDate && new Date(deal.createdAt) < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(deal.createdAt) > end) return false;
      }
      return true;
    });
  }, [deals, filters]);

  const clearFilters = () => {
    setFilters({ search: '', pdvId: '', employeeId: '', tagId: '', startDate: '', endDate: '' });
  };

  const handleDealDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.setData('type', 'DEAL');
    e.dataTransfer.setData('dealId', dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); 
  };

  const handleDealDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    
    if (type === 'DEAL') {
      const dealId = e.dataTransfer.getData('dealId');
      const deal = deals.find(d => d.id === dealId);
      if (deal && deal.stageId !== stageId) {
        updateDeal({ ...deal, stageId });
      }
    }
    setDraggedDealId(null);
  };

  const handleStageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStageIndex(index);
    e.dataTransfer.setData('type', 'STAGE');
    e.dataTransfer.setData('stageIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');

    if (type === 'STAGE') {
      const sourceIndex = parseInt(e.dataTransfer.getData('stageIndex'), 10);
      if (sourceIndex !== targetIndex) {
        const newStages = [...stages];
        const [removed] = newStages.splice(sourceIndex, 1);
        newStages.splice(targetIndex, 0, removed);
        reorderStages(newStages);
      }
    }
    setDraggedStageIndex(null);
  };

  const handleAddStage = () => {
    const newStage: PipelineStage = {
      id: generateStableId('stage'),
      name: 'Nova Etapa',
      color: 'border-t-slate-500',
      type: 'OPEN'
    };
    addStage(newStage);
    setStageToEdit(newStage); 
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const getDaysSince = (dateString: string) => {
    if (!mounted) return '--';
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24));
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    return `há ${days}d`;
  };

  const StageTypeIcon = ({ type }: { type: PipelineStageType }) => {
    if (type === 'WON') return <CheckCircle2 size={14} className="text-green-600" />;
    if (type === 'LOST') return <XOctagon size={14} className="text-red-600" />;
    return <ArrowRightCircle size={14} className="text-blue-500" />;
  };

if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="bg-white border-b border-slate-200 shadow-sm z-20 flex-shrink-0">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Funil Operacional</h2>
                <div className="h-4 w-px bg-slate-200 mx-2"></div>
                <p className="text-xs text-slate-500">Carregando...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 shadow-sm z-20 flex-shrink-0 transition-all duration-300">
         <div className="px-6 py-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Funil Operacional</h2>
                   <div className="h-4 w-px bg-slate-200 mx-2"></div>
                   <p className="text-xs text-slate-500">{filteredDeals.length} Negócios listados</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {Object.values(filters).some(x => x !== '') && (
                    <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                      <RefreshCcw size={12} /> Limpar
                    </button>
                  )}
                  <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${showFilters ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                    {showFilters ? <X size={14} /> : <Filter size={14} />}
                    <span className="hidden sm:inline">Filtros</span>
                  </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-96 pt-4 opacity-100 border-t border-slate-100 mt-3' : 'max-h-0 opacity-0'}`}>
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input type="text" placeholder="Buscar cliente, título..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <select value={filters.pdvId} onChange={(e) => setFilters({...filters, pdvId: e.target.value})} className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer">
                    <option value="">Todas Unidades</option>
                    {availablePdvs.map(pdv => <option key={pdv.id} value={pdv.id}>{pdv.name}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <select value={filters.employeeId} onChange={(e) => setFilters({...filters, employeeId: e.target.value})} className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer">
                    <option value="">Todos Responsáveis</option>
                    {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                
                 <div className="relative">
                  <Tag className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <select value={filters.tagId} onChange={(e) => setFilters({...filters, tagId: e.target.value})} className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer">
                    <option value="">Todas Etiquetas</option>
                    {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar items-start">
        {stages.map((stage, index) => {
          const stageDeals = filteredDeals.filter(d => d.stageId === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div 
              key={stage.id}
              className={`flex-shrink-0 w-80 flex flex-col h-full max-h-full transition-opacity duration-200 ${draggedStageIndex !== null && draggedStageIndex !== index ? 'opacity-50' : 'opacity-100'}`}
              draggable
              onDragStart={(e) => handleStageDragStart(e, index)}
              onDragOver={handleStageDragOver}
              onDrop={(e) => handleStageDrop(e, index)}
            >
              <div className="group/header relative mb-4">
                 <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-opacity p-2">
                    <GripVertical size={16} />
                 </div>

                 <div className={`rounded-xl bg-white border-b-4 ${stage.color} p-4 shadow-sm border border-slate-100 relative`}>
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider truncate mr-2 flex items-center gap-2">
                          {stage.name}
                          <div title={`Tipo: ${stage.type}`}>
                             <StageTypeIcon type={stage.type} />
                          </div>
                          {(stage.automationSteps?.length || 0) > 0 && (
                             <div className="p-1 rounded bg-blue-50 text-blue-500" title="Automação Ativa">
                                <MessageSquare size={12}/>
                             </div>
                          )}
                       </h3>
                       <div className="flex gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                         <button onClick={() => setStageToEdit(stage)} className="text-slate-300 hover:text-blue-500 p-1 rounded hover:bg-slate-100" title="Configurar Estágio"><Settings size={14} /></button>
                         <button onClick={() => { if(confirm('Excluir etapa? Deals serão movidos para a anterior.')) removeStage(stage.id)}} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-slate-100"><Trash2 size={14}/></button>
                       </div>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="text-xs font-semibold text-slate-500">{stageDeals.length} negócios</span>
                       <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{formatCurrency(stageTotal)}</span>
                    </div>
                 </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1 pb-4"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => handleDealDrop(e, stage.id)}
              >
                {stageDeals.map((deal) => {
                  const dealPdvName = getPDVName(deal.pdvId);
                  const productName = deal.productIds.length > 0 ? getProductName(deal.productIds[0]) : 'Produto não def.';

                  return (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDealDragStart(e, deal.id)}
                      onClick={() => setEditingDeal(deal)}
                      className="group/card bg-white p-0 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                    >
                      <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-100">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            <MapPin size={10} className="text-slate-400"/>
                            <span className="truncate max-w-[120px]">{dealPdvName}</span>
                         </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                             <Clock size={10}/>
                             {mounted ? getDaysSince(deal.createdAt) : '--'}
                          </div>
                      </div>

                      <div className="p-4">
                          <div className="flex flex-wrap gap-1 mb-2">
                             {deal.tags.length > 0 ? deal.tags.slice(0, 3).map(tag => (
                               <span key={tag.id} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${tag.color}`}>
                                 {tag.label}
                               </span>
                             )) : <span className="text-[9px] text-slate-300 italic">Sem etiquetas</span>}
                          </div>

                          <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug line-clamp-2">{deal.title}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                             <Building2 size={12} className="text-slate-400"/>
                             <span className="truncate">{deal.customerName}</span>
                          </div>
                          
                          <div className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                             <Package size={12} className="text-blue-400"/>
                             <span className="truncate">{productName}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                             <span className="font-bold text-slate-800 text-sm">{formatCurrency(deal.value)}</span>
                             
                             <div className="flex -space-x-2">
                                {deal.assignedEmployeeIds.length > 0 ? deal.assignedEmployeeIds.slice(0, 3).map(eid => {
                                   const emp = employees.find(e => e.id === eid);
                                   return (
                                     <div key={eid} className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-50" title={`${emp?.name} (${emp?.role})`}>
                                       {emp?.name.charAt(0)}
                                     </div>
                                   );
                                }) : (
                                   <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">?</div>
                                )}
                             </div>
                          </div>
                      </div>
                    </div>
                  );
                })}
                
                {stageDeals.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60 hover:opacity-100 hover:bg-slate-50 transition-all">
                    <span className="text-xs font-semibold">Sem negócios</span>
                  </div>
                )}
                
                  <button 
                  onClick={() => setEditingDeal({ 
                      id: generateStableId('deal'),
                      title: '', 
                      pdvId: currentUser?.pdvId || '',
                      customerId: '',
                      customerName: '', 
                      value: 0, 
                      stageId: stage.id, 
                      assignedEmployeeIds: currentUser?.id ? [currentUser.id] : [], 
                      productIds: [], 
                      tags: [], 
                      notes: '', 
                      visibility: 'PUBLIC',
                      createdAt: getCurrentDateISO()
                  })}
                  className="w-full py-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Novo Card
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex-shrink-0 w-12 pt-4 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button onClick={handleAddStage} className="w-10 h-10 rounded-full bg-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all shadow-sm" title="Nova Etapa">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {stageToEdit && (
         <StageSettingsModal 
           stage={stageToEdit}
           isOpen={true}
           onClose={() => setStageToEdit(null)}
           onSave={(updated) => { updateStage(updated); setStageToEdit(null); }}
         />
      )}

      {editingDeal && (
        <DealForm 
          deal={editingDeal} 
          isOpen={true} 
          onClose={() => setEditingDeal(null)} 
          isNew={!deals.find(d => d.id === editingDeal.id)}
        />
      )}
    </div>
  );
};

const StageSettingsModal = ({ 
   stage, isOpen, onClose, onSave 
}: { 
   stage: PipelineStage, isOpen: boolean, onClose: () => void, onSave: (s: PipelineStage) => void 
}) => {
   const [data, setData] = useState(stage);
   const [activeTab, setActiveTab] = useState<'general' | 'automation'>('general');

   const updateAutomationSteps = (steps: AutomationStep[]) => {
      setData(prev => ({ ...prev, automationSteps: steps }));
   };

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="Configurar Etapa do Funil" size="lg">
         <div className="flex flex-col h-[70vh] md:h-auto">
             <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 gap-1">
               <button onClick={() => setActiveTab('general')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={16} /> Configurações Gerais
               </button>
               <button onClick={() => setActiveTab('automation')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'automation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <MessageSquare size={16} /> Automação (WhatsApp)
               </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-2">
                 {activeTab === 'general' ? (
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-slate-700">Nome da Etapa</label>
                           <input 
                              value={data.name} 
                              onChange={(e) => setData({...data, name: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Ex: Prospecção"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-sm font-bold text-slate-700">Tipo de Comportamento</label>
                           <p className="text-xs text-slate-500 mb-2">Define como o dashboard contabiliza os negócios nesta etapa.</p>
                           <div className="grid grid-cols-3 gap-3">
                              <button onClick={() => setData({...data, type: 'OPEN'})} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${data.type === 'OPEN' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                 <ArrowRightCircle size={20} /> Em Aberto
                              </button>
                              <button onClick={() => setData({...data, type: 'WON'})} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${data.type === 'WON' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                 <Check size={20} /> Venda (Ganho)
                              </button>
                              <button onClick={() => setData({...data, type: 'LOST'})} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${data.type === 'LOST' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                 <XOctagon size={20} /> Perdido
                              </button>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-sm font-bold text-slate-700">Cor de Destaque</label>
                           <div className="flex flex-wrap gap-2">
                              {STAGE_COLORS.map(c => (
                                 <button
                                    key={c.value}
                                    onClick={() => setData({...data, color: c.value})}
                                    className={`w-8 h-8 rounded-full ${c.bg} transition-transform hover:scale-110 ring-2 ring-offset-2 ${data.color === c.value ? 'ring-slate-400' : 'ring-transparent'}`}
                                    title={c.label}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                 ) : (
                     <AutomationBuilder 
                        steps={data.automationSteps || []}
                        onUpdate={updateAutomationSteps}
                        triggerLabel={`Movido para "${data.name}"`}
                        triggerDescription="Esta automação inicia quando um card é arrastado para esta etapa."
                        triggerColorClass="bg-indigo-100 text-indigo-700"
                     />
                 )}
             </div>

             <div className="mt-6 pt-4 border-t border-slate-100">
                <button onClick={() => onSave(data)} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                   Salvar Configuração
                </button>
             </div>
         </div>
      </Modal>
   );
};
