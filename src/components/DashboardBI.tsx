'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useCRM } from '@/context';
import { DashboardWidget, WidgetType } from '@/types';
import { 
  TrendingUp, PieChart, Users, DollarSign, 
  Briefcase, Activity, Plus, X, LayoutTemplate, RotateCcw,
  ArrowUpRight, ArrowDownRight, GripHorizontal, Edit3, Check, Trophy, Target
} from 'lucide-react';
import { Modal } from './Modal';
import { generateStableId } from '@/utils/idUtils';

const WIDGET_OPTIONS: { type: WidgetType; title: string; colSpan: number; description: string }[] = [
  { type: 'GOAL_PROGRESS', title: 'Metas do Mês', colSpan: 4, description: 'Barra de progresso de metas financeiras e de volume.' },
  { type: 'KPI_TOTAL_SALES', title: 'Volume Total de Vendas', colSpan: 1, description: 'Soma total dos negócios ganhos.' },
  { type: 'KPI_ACTIVE_DEALS', title: 'Pipeline Ativo', colSpan: 1, description: 'Contagem de negócios em andamento.' },
  { type: 'KPI_CONVERSION', title: 'Taxa de Conversão', colSpan: 1, description: 'Percentual de ganho sobre total finalizado.' },
  { type: 'KPI_AVG_TICKET', title: 'Ticket Médio', colSpan: 1, description: 'Valor médio por venda realizada.' },
  { type: 'CHART_FUNNEL', title: 'Funil de Conversão', colSpan: 2, description: 'Gráfico de barras por etapa do funil.' },
  { type: 'CHART_SALES_BY_REP', title: 'Performance por Vendedor', colSpan: 2, description: 'Ranking de vendas por usuário.' },
  { type: 'LIST_RECENT_DEALS', title: 'Negócios Recentes', colSpan: 4, description: 'Lista das últimas movimentações.' },
];

export const DashboardBI: React.FC = () => {
  const { deals, stages, employees, dashboardWidgets, addWidget, updateWidget, removeWidget, reorderWidgets, resetDashboard } = useCRM();
  const widgetList = dashboardWidgets ?? [];
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const metrics = useMemo(() => {
    const stageList = stages ?? [];
    const dealList = deals ?? [];
    const employeeList = employees ?? [];
    const getStageType = (stageId: string) => stageList.find(s => s.id === stageId)?.type || 'OPEN';

    const wonDeals = dealList.filter(d => getStageType(d.stageId) === 'WON');
    const lostDeals = dealList.filter(d => getStageType(d.stageId) === 'LOST');
    const activeDeals = dealList.filter(d => getStageType(d.stageId) === 'OPEN');
    
    const totalSales = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const avgTicket = wonDeals.length > 0 ? totalSales / wonDeals.length : 0;
    
    const finishedCount = wonDeals.length + lostDeals.length;
    const conversionRate = finishedCount > 0 ? (wonDeals.length / finishedCount) * 100 : 0;

    const funnelData = stageList.map(stage => ({
      name: stage.name,
      value: dealList.filter(d => d.stageId === stage.id).reduce((sum, d) => sum + d.value, 0),
      count: dealList.filter(d => d.stageId === stage.id).length,
      color: stage.color.replace('border-t-', 'bg-'),
      type: stage.type
    }));

    const repData = employeeList
      .map(emp => {
        const empDeals = wonDeals.filter(d => d.assignedEmployeeIds.includes(emp.id));
        return {
          name: emp.name,
          total: empDeals.reduce((sum, d) => sum + d.value, 0),
          count: empDeals.length
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const recentDeals = [...dealList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    
    const goals = {
       financial: { target: 1000000, current: totalSales },
       volume: { target: 10, current: wonDeals.length }
    };

    return { totalSales, activeCount: activeDeals.length, conversionRate, avgTicket, funnelData, repData, recentDeals, goals };
  }, [deals, stages, employees]);

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const copyListItems = [...widgetList];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      reorderWidgets(copyListItems);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const cycleSize = (widget: DashboardWidget) => {
    const sizes = [1, 2, 4];
    const currentIndex = sizes.indexOf(widget.colSpan);
    const nextSize = sizes[(currentIndex + 1) % sizes.length] as 1 | 2 | 4;
    updateWidget({ ...widget, colSpan: nextSize });
  };

  const handleRename = (id: string, newTitle: string) => {
    const widget = widgetList.find(w => w.id === id);
    if (widget) {
      updateWidget({ ...widget, title: newTitle });
    }
    setEditingTitleId(null);
  };

  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'GOAL_PROGRESS':
         const finPct = Math.min((metrics.goals.financial.current / metrics.goals.financial.target) * 100, 100);
         const volPct = Math.min((metrics.goals.volume.current / metrics.goals.volume.target) * 100, 100);
         
         return (
            <div className="flex flex-col md:flex-row gap-8 h-full items-center">
               <div className="flex-1 w-full">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><Target size={16}/> Meta Financeira</span>
                     <span className="text-xs font-bold text-slate-400">R$ {metrics.goals.financial.current.toLocaleString()} / {metrics.goals.financial.target.toLocaleString()}</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${finPct}%` }}></div>
                  </div>
               </div>
               <div className="flex-1 w-full">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><Trophy size={16}/> Meta de Vendas (Qtd)</span>
                     <span className="text-xs font-bold text-slate-400">{metrics.goals.volume.current} / {metrics.goals.volume.target} un.</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${volPct}%` }}></div>
                  </div>
               </div>
            </div>
         );

      case 'KPI_TOTAL_SALES':
        return <KPIWidget title={widget.title} value={`R$ ${metrics.totalSales.toLocaleString('pt-BR')}`} icon={DollarSign} color="blue" trend="+12%" />;
      case 'KPI_ACTIVE_DEALS':
        return <KPIWidget title={widget.title} value={metrics.activeCount.toString()} icon={Briefcase} color="purple" />;
      case 'KPI_CONVERSION':
        return <KPIWidget title={widget.title} value={`${metrics.conversionRate.toFixed(1)}%`} icon={Activity} color="emerald" trend="+2.5%" />;
      case 'KPI_AVG_TICKET':
        return <KPIWidget title={widget.title} value={`R$ ${metrics.avgTicket.toLocaleString('pt-BR')}`} icon={TrendingUp} color="orange" />;
      
      case 'CHART_FUNNEL':
        return (
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 truncate">{widget.title}</h3>
            <div className="flex-1 flex items-end gap-2 px-2 border-b border-slate-100 pb-2">
              {metrics.funnelData.map((step, idx) => {
                const maxVal = Math.max(...metrics.funnelData.map(f => f.value));
                const height = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
                const opacityClass = step.type === 'LOST' ? 'opacity-40' : 'opacity-100';
                return (
                  <div key={idx} className={`flex-1 flex flex-col items-center group relative ${opacityClass}`}>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">R$ {step.value.toLocaleString()}</div>
                    <div className={`w-full rounded-t-lg transition-all duration-500 hover:opacity-80 ${step.color}`} style={{ height: `${Math.max(height, 5)}%` }}></div>
                    <div className="mt-2 text-[10px] text-center text-slate-500 font-medium truncate w-full" title={`${step.name} (${step.type})`}>{step.name}</div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-center gap-4 mt-2">
               <span className="text-[10px] flex items-center gap-1 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Aberto</span>
               <span className="text-[10px] flex items-center gap-1 text-green-500"><div className="w-2 h-2 rounded-full bg-green-500"></div> Ganho</span>
               <span className="text-[10px] flex items-center gap-1 text-red-300"><div className="w-2 h-2 rounded-full bg-red-300"></div> Perdido</span>
            </div>
          </div>
        );

      case 'CHART_SALES_BY_REP':
        return (
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 truncate">{widget.title}</h3>
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
              {metrics.repData.map((rep, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{idx + 1}</div>
                  <div className="flex-1">
                     <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">{rep.name}</span>
                        <span className="font-bold text-slate-900">R$ {rep.total.toLocaleString()}</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${metrics.repData[0].total > 0 ? (rep.total / metrics.repData[0].total) * 100 : 0}%` }}></div>
                     </div>
                  </div>
                </div>
              ))}
              {metrics.repData.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem dados de vendas (Ganho).</p>}
            </div>
          </div>
        );

      case 'LIST_RECENT_DEALS':
        return (
          <div className="h-full flex flex-col">
             <h3 className="text-sm font-bold text-slate-700 mb-4 truncate">{widget.title}</h3>
             <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="text-xs text-slate-400 uppercase font-bold border-b border-slate-100">
                      <tr>
                        <th className="pb-2">Negócio</th>
                        <th className="pb-2">Cliente</th>
                        <th className="pb-2">Valor</th>
                        <th className="pb-2">Data</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {metrics.recentDeals.map(d => (
                        <tr key={d.id}>
                          <td className="py-3 font-medium text-slate-700">{d.title}</td>
                          <td className="py-3 text-slate-500">{d.customerName}</td>
                          <td className="py-3 font-bold text-slate-700">R$ {d.value.toLocaleString()}</td>
                          <td className="py-3 text-slate-400 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        );

      default:
        return <div>Widget Desconhecido</div>;
    }
  };

  return (
    <div className={`p-8 max-w-[1600px] mx-auto animate-fade-in min-h-full ${isEditMode ? 'bg-slate-100' : 'bg-slate-50'} transition-colors duration-500`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
               <LayoutTemplate className="text-blue-600" /> Dashboard Executivo
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isEditMode ? 'MODO EDIÇÃO: Arraste para reordenar, redimensione e personalize os widgets.' : 'Visão macro estratégica e indicadores de performance.'}
            </p>
         </div>
         
         <div className="flex items-center gap-3">
            {isEditMode ? (
               <>
                 <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors">
                    <Plus size={16} /> Adicionar
                 </button>
                 <button onClick={resetDashboard} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors">
                    <RotateCcw size={16} /> Resetar
                 </button>
                 <button onClick={() => setIsEditMode(false)} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors flex items-center gap-2">
                    <Check size={16} /> Concluir
                 </button>
               </>
            ) : (
               <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors shadow-sm">
                  <Edit3 size={16} /> Personalizar
               </button>
            )}
         </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isEditMode ? 'border-2 border-dashed border-slate-300 p-4 rounded-xl min-h-[500px]' : ''}`}>
         {widgetList.map((widget, index) => (
            <div 
              key={widget.id}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`bg-white rounded-2xl p-6 shadow-sm border relative group transition-all duration-200 
                 ${isEditMode ? 'border-blue-200 cursor-move hover:shadow-lg hover:scale-[1.01]' : 'border-slate-200'}
              `}
              style={{ gridColumn: `span ${widget.colSpan}` }}
            >
               {isEditMode && (
                 <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white via-white to-transparent flex items-start justify-between px-2 pt-2 rounded-t-2xl z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1">
                      <div className="p-1.5 bg-slate-100 rounded text-slate-400 cursor-grab active:cursor-grabbing">
                        <GripHorizontal size={14} />
                      </div>
                      <button 
                        onClick={() => cycleSize(widget)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 hover:bg-blue-100"
                        title="Mudar Tamanho"
                      >
                        {widget.colSpan === 1 ? '1x' : widget.colSpan === 2 ? '2x' : '4x'} Largura
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeWidget(widget.id)}
                      className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                      title="Remover Widget"
                    >
                      <X size={14} />
                    </button>
                 </div>
               )}

               {isEditMode && editingTitleId === widget.id ? (
                 <div className="mb-4">
                   <input 
                     autoFocus
                     defaultValue={widget.title}
                     onBlur={(e) => handleRename(widget.id, e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleRename(widget.id, e.currentTarget.value)}
                     className="w-full text-sm font-bold border-b-2 border-blue-500 outline-none pb-1"
                   />
                   <p className="text-[10px] text-slate-400 mt-1">Pressione Enter para salvar</p>
                 </div>
               ) : (
                  <div className="relative">
                    {renderWidgetContent(widget)}
                    {isEditMode && (
                      <div 
                        onClick={() => setEditingTitleId(widget.id)}
                        className="absolute inset-0 z-10 cursor-text group/edit"
                        title="Clique para editar o título"
                      ></div>
                    )}
                  </div>
               )}
            </div>
         ))}
         
         {isEditMode && (
            <button 
               onClick={() => setIsAddModalOpen(true)}
               className="min-h-[150px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer col-span-1"
            >
               <Plus size={32} className="mb-2" />
               <span className="font-bold text-sm">Adicionar Espaço</span>
            </button>
         )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Widget ao Dashboard">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WIDGET_OPTIONS.map((opt, idx) => (
               <button 
                 key={idx}
                 onClick={() => {
                    addWidget({ id: generateStableId('w'), type: opt.type, title: opt.title, colSpan: opt.colSpan as any });
                    setIsAddModalOpen(false);
                 }}
                 className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
               >
                  <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-slate-800 group-hover:text-blue-700">{opt.title}</span>
                     <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">Padrão: {opt.colSpan}x</span>
                  </div>
                  <p className="text-xs text-slate-500">{opt.description}</p>
               </button>
            ))}
         </div>
      </Modal>
    </div>
  );
};

const KPIWidget = ({ title, value, icon: Icon, color, trend }: { title: string, value: string, icon: any, color: string, trend?: string }) => {
   const colors = {
      blue: 'bg-blue-50 text-blue-600',
      purple: 'bg-purple-50 text-purple-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      orange: 'bg-orange-50 text-orange-600'
   }[color] || 'bg-slate-50 text-slate-600';

   return (
      <div className="flex flex-col h-full justify-between pointer-events-none select-none">
         <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${colors}`}>
               <Icon size={24} />
            </div>
            {trend && (
               <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {trend.startsWith('+') ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {trend}
               </span>
            )}
         </div>
         <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1 truncate">{title}</h4>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
         </div>
      </div>
   );
};
