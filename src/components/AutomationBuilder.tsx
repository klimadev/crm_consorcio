'use client';

import React, { useState } from 'react';
import { AutomationStep, TimeUnit, TIME_UNIT_LABELS } from '@/types';
import { 
  PlayCircle, Timer, Edit, Trash2, Plus, 
  MessageSquare, Zap, Clock, ArrowDown, CheckCircle2,
  MoreHorizontal
} from 'lucide-react';
import { generateStableId } from '@/utils/idUtils';

interface AutomationBuilderProps {
  steps: AutomationStep[];
  onUpdate: (steps: AutomationStep[]) => void;
  triggerLabel: string;
  triggerDescription: string;
  triggerColorClass?: string;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({ 
  steps, 
  onUpdate, 
  triggerLabel, 
  triggerDescription,
  triggerColorClass = "bg-green-100 text-green-700" 
}) => {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepData, setStepData] = useState<Partial<AutomationStep>>({ 
    name: '', delayValue: 1, delayUnit: 'DAYS', messageTemplate: '' 
  });

  const saveStep = () => {
     if(!stepData.name || !stepData.messageTemplate) return;
     
     if (editingStepId) {
        onUpdate(steps.map(s => s.id === editingStepId ? { ...s, ...stepData } as AutomationStep : s));
     } else {
const newStep: AutomationStep = {
            id: generateStableId('step'),
            name: stepData.name!,
            delayValue: stepData.delayValue ?? 1,
            delayUnit: stepData.delayUnit || 'DAYS',
            messageTemplate: stepData.messageTemplate!
         };
        onUpdate([...steps, newStep]);
     }
     resetForm();
  };

  const removeStep = (id: string) => {
     if(confirm('Remover este passo da automação?')) {
        onUpdate(steps.filter(s => s.id !== id));
        if (editingStepId === id) resetForm();
     }
  };

  const resetForm = () => {
    setEditingStepId(null);
    setStepData({ name: '', delayValue: 1, delayUnit: 'DAYS', messageTemplate: '' });
  };

  const injectVariable = (variable: string) => {
    setStepData(prev => ({ ...prev, messageTemplate: (prev.messageTemplate || '') + variable + ' ' }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full items-start">
        <div className="flex-1 w-full min-w-[300px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className={`p-5 border-b border-slate-100 flex items-center gap-4 ${triggerColorClass} bg-opacity-10`}>
                <div className="p-3 rounded-xl bg-white bg-opacity-60 shadow-sm">
                    <Zap size={24} className="fill-current" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold opacity-70 mb-0.5 tracking-wider">Gatilho (Início)</p>
                    <h4 className="font-bold text-sm leading-tight text-slate-800">{triggerLabel}</h4>
                    <p className="text-xs opacity-80 mt-1 leading-relaxed">{triggerDescription}</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/50 relative">
                {steps.length === 0 && (
                    <div className="text-center py-12 opacity-60 flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                           <ArrowDown size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">A fila está vazia</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Adicione o primeiro evento ao lado para iniciar a sequência.</p>
                    </div>
                )}

                {steps.map((step, index) => (
                    <div key={step.id} className="relative group animate-fade-in pl-4">
                        <div className="absolute left-[27px] -top-8 bottom-0 w-0.5 bg-slate-300 -z-10 opacity-50"></div>
                        
                        <div className="absolute left-0 top-0 w-14 flex flex-col items-center">
                           <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-slate-500 z-10 shadow-sm font-bold text-xs group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                               {index + 1}
                           </div>
                        </div>

                        <div 
                            onClick={() => { setStepData(step); setEditingStepId(step.id); }}
                            className={`
                                ml-10 relative bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md
                                ${editingStepId === step.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 hover:border-blue-400'}
                            `}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border ${step.delayValue === 0 ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            <Clock size={12}/>
                                            {step.delayValue === 0 ? 'Imediatamente' : `+ ${step.delayValue} ${TIME_UNIT_LABELS[step.delayUnit]}`}
                                        </span>
                                    </div>
                                    <h5 className="font-bold text-slate-800 text-sm mb-1 truncate">{step.name}</h5>
                                    <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                       <MessageSquare size={10} className="inline mr-1 opacity-50"/>
                                       {step.messageTemplate}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                                    className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                                    title="Remover passo"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="absolute -left-2 top-3 w-2 h-2 bg-white border-l border-b border-slate-200 transform rotate-45 group-hover:border-blue-400 transition-colors"></div>
                        </div>
                    </div>
                ))}
                
                {steps.length > 0 && (
                   <div className="pl-14 pt-4 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider opacity-60">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      Fim da Automação
                   </div>
                )}
            </div>
        </div>

        <div className="w-full md:w-[400px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col h-full overflow-hidden sticky top-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Edit size={18} className="text-blue-600"/>
                    {editingStepId ? 'Editar Evento' : 'Novo Evento'}
                </h3>
                {editingStepId && (
                    <button onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded hover:bg-slate-200 transition-colors">
                        Cancelar Edição
                    </button>
                )}
            </div>
            
            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                       Nome da Ação <span className="text-red-500">*</span>
                    </label>
                    <input 
                        value={stepData.name} 
                        onChange={e => setStepData({...stepData, name: e.target.value})}
                        placeholder="Ex: Cobrança Boleto, Boas-vindas..."
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Timer size={14} className="text-blue-500"/> Tempo de Espera
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="0" 
                            value={stepData.delayValue} 
                            onChange={e => setStepData({...stepData, delayValue: parseInt(e.target.value)})}
                            className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center outline-none focus:border-blue-500"
                        />
                        <div className="flex-1 relative">
                           <select 
                               value={stepData.delayUnit}
                               onChange={e => setStepData({...stepData, delayUnit: e.target.value as TimeUnit})}
                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 cursor-pointer appearance-none font-medium"
                           >
                               {Object.entries(TIME_UNIT_LABELS).map(([k,v]) => (
                                   <option key={k} value={k}>{v}</option>
                               ))}
                           </select>
                           <MoreHorizontal size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500 leading-tight bg-white p-2 rounded border border-slate-100">
                        <ArrowDown size={12} className="flex-shrink-0 mt-0.5 text-blue-500"/>
                        Este evento ocorrerá {stepData.delayValue === 0 ? <b>IMEDIATAMENTE</b> : <span><b>{stepData.delayValue} {TIME_UNIT_LABELS[stepData.delayUnit || 'DAYS']}</b></span>} após a conclusão do passo anterior.
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MessageSquare size={14}/> Mensagem <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">WhatsApp</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                         <span className="text-[10px] text-slate-400 font-bold mr-1">Inserir:</span>
                         {['{{cliente}}', '{{valor}}', '{{produto}}', '{{vendedor}}'].map(v => (
                             <button 
                                key={v}
                                onClick={() => injectVariable(v)}
                                className="px-2 py-1 bg-white border border-slate-200 text-blue-600 rounded text-[10px] font-mono font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm"
                             >
                                {v}
                             </button>
                         ))}
                    </div>

                    <textarea 
                        value={stepData.messageTemplate} 
                        onChange={e => setStepData({...stepData, messageTemplate: e.target.value})}
                        placeholder="Olá {{cliente}}, tudo bem? Gostaríamos de confirmar..."
                        className="w-full h-40 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button 
                    onClick={saveStep}
                    disabled={!stepData.name || !stepData.messageTemplate}
                    className="w-full py-3.5 bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    {editingStepId ? <CheckCircle2 size={18}/> : <Plus size={18}/>}
                    {editingStepId ? 'Salvar Alterações' : 'Adicionar Evento à Fila'}
                </button>
            </div>
        </div>
    </div>
  );
};
