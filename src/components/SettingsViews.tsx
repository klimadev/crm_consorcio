'use client';

import React, { useState, useMemo } from 'react';
import { useCRM } from '@/context';
import { 
  PDV, PDV_TYPES, PDVType, Employee, Role, Product, ProductAttribute, AutomationStep, 
  Customer, CustomerStatus, CUSTOMER_STATUS_COLORS, CUSTOMER_STATUS_LABELS, CustomFieldDefinition, CustomFieldType
} from '@/types';
import { 
  Trash2, Map, User, ShoppingBag, Plus, Search, Mail, MapPin, Tag, Smartphone, 
  Briefcase, Activity, Edit, QrCode, RefreshCw, 
  SmartphoneCharging, Plug, Shield, Building, Globe, Store, Save, FileText,
  Sliders, Database, XCircle, MessageSquare, Users
} from 'lucide-react';
import { Modal } from './Modal';
import { AutomationBuilder } from './AutomationBuilder';
import { generateStableId, getCurrentDateISO } from '@/utils/idUtils';

const Header = ({ title, subtitle, icon: Icon }: { title: string, subtitle: string, icon: any }) => (
  <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-200">
    <div className="p-4 bg-white border border-slate-200 shadow-md rounded-2xl text-blue-600">
      <Icon size={32} strokeWidth={1.5} />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h2>
      <p className="text-base text-slate-500 mt-1">{subtitle}</p>
    </div>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${color}`}>
    {children}
  </span>
);

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

const OrganizationView: React.FC = () => {
  const { pdvs = [], addPDV, updatePDV, removePDV, regions = [], getRegionName } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PDV>>({ name: '', type: 'PHYSICAL_STORE', regionId: '', location: '', isActive: true });

  const handleEdit = (pdv: PDV) => {
    setEditingId(pdv.id);
    setFormData(pdv);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'PHYSICAL_STORE', regionId: '', location: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if(!formData.name || !formData.regionId) return alert('Nome e Regional são obrigatórios');
    
    if (editingId) {
       updatePDV({ ...formData, id: editingId } as PDV);
    } else {
       addPDV({ 
         name: formData.name!, 
         type: formData.type as PDVType, 
         regionId: formData.regionId!, 
         location: formData.location || '', 
         isActive: true 
       });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-start">
         <Header title="Estrutura Organizacional" subtitle="Gerencie Praças e Pontos de Venda." icon={Map} />
         <button onClick={handleCreate} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
           <Plus size={20}/> Novo PDV
         </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pdvs.map(pdv => (
          <Card key={pdv.id} className="p-6 group relative border-l-[6px] border-l-blue-500">
             <div className="flex justify-between items-start mb-4">
                <Badge color="bg-blue-50 text-blue-700 border border-blue-100">
                  {PDV_TYPES[pdv.type]}
                </Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(pdv)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit size={16}/>
                  </button>
                  <button onClick={() => removePDV(pdv.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">{pdv.name}</h3>
             <div className="space-y-2 mt-4">
               <p className="text-sm text-slate-500 flex items-center gap-2">
                 <MapPin size={16} className="text-slate-400"/> {pdv.location || 'Local não definido'}
               </p>
               <p className="text-sm text-slate-500 flex items-center gap-2">
                 <Globe size={16} className="text-slate-400"/> {getRegionName(pdv.regionId)}
               </p>
             </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Ponto de Venda' : 'Novo Ponto de Venda'} size="lg">
         <div className="flex flex-col">
            <div className="flex justify-end items-center bg-white mb-6">
               <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
                 <Save size={18} /> <span>Salvar Unidade</span>
               </button>
            </div>

            <div className="space-y-6">
               <InputGroup label="Nome da Unidade" icon={Store} required>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Matriz Berrini" className={inputClass} autoFocus />
               </InputGroup>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Tipo de Canal" icon={Briefcase}>
                     <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PDVType})} className={selectClass}>
                        {Object.entries(PDV_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                     </select>
                  </InputGroup>
                  <InputGroup label="Regional" icon={Globe} required>
                     <select value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})} className={selectClass}>
                        <option value="">Selecione...</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                  </InputGroup>
               </div>

               <InputGroup label="Localização (Cidade/Estado)" icon={MapPin}>
                  <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: São Paulo, SP" className={inputClass} />
               </InputGroup>
            </div>
         </div>
      </Modal>
    </div>
  );
};

const IntegrationsView: React.FC = () => {
  const { integrations = [], updateIntegrationStatus } = useCRM();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleConnect = (id: string) => {
     setActiveId(id);
     setQrModalOpen(true);
     setScanning(true);
     setTimeout(() => setScanning(false), 3000); 
  };

  const finalizeConnection = () => {
    if(activeId) {
      updateIntegrationStatus(activeId, 'CONNECTED');
      setQrModalOpen(false);
      setActiveId(null);
    }
  };

  const handleDisconnect = (id: string) => {
    if(confirm('Desconectar integração? As automações irão parar.')) {
       updateIntegrationStatus(id, 'DISCONNECTED');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
       <Header title="Central de Integrações" subtitle="Conecte seus canais de comunicação." icon={Plug} />
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map(int => (
             <Card key={int.id} className={`p-6 border-l-[6px] ${int.status === 'CONNECTED' ? 'border-l-green-500' : 'border-l-slate-300'}`}>
                <div className="flex justify-between items-start mb-6">
                   <div className="p-3 bg-green-50 rounded-xl">
                      <MessageSquare size={24} className="text-green-600" />
                   </div>
                   <Badge color={int.status === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {int.status === 'CONNECTED' ? 'ONLINE' : 'DESCONECTADO'}
                   </Badge>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{int.name}</h3>
                <p className="text-sm text-slate-500 mb-6">Envie mensagens automáticas e lembretes de follow-up diretamente pelo WhatsApp Web.</p>
                {int.status === 'CONNECTED' ? (
                   <button onClick={() => handleDisconnect(int.id)} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100">
                      Desconectar
                   </button>
                ) : (
                   <button onClick={() => handleConnect(int.id)} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-500/20 flex items-center justify-center gap-2">
                      <QrCode size={18}/> Ler QR Code
                   </button>
                )}
             </Card>
          ))}
       </div>

       <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Conectar WhatsApp" size="md">
          <div className="flex flex-col items-center py-6">
             {scanning ? (
                <div className="w-64 h-64 bg-slate-50 rounded-2xl flex flex-col items-center justify-center animate-pulse border-2 border-slate-100">
                   <RefreshCw size={32} className="text-blue-500 animate-spin mb-4"/>
                   <p className="text-sm font-bold text-slate-500">Gerando sessão segura...</p>
                </div>
             ) : (
                <div className="flex flex-col items-center animate-fade-in">
                   <div className="w-64 h-64 bg-white border-4 border-slate-800 rounded-2xl p-2 mb-6 shadow-2xl relative group cursor-pointer overflow-hidden" onClick={finalizeConnection}>
                      <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ConnectCRM')] bg-contain bg-center opacity-90 group-hover:opacity-20 transition-all duration-300"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                         <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-xl">
                            Simular Conexão
                         </div>
                      </div>
                   </div>
                   <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em <b>Aparelhos conectados</b> {'>'} <b>Conectar aparelho</b></li>
                      <li>Aponte a câmera para esta tela</li>
                   </ol>
                </div>
             )}
          </div>
       </Modal>
    </div>
  );
};

const ProductsView: React.FC = () => {
  const { products = [], addProduct, updateProduct, removeProduct } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({ name: '', category: '', basePrice: 0, description: '', active: true, attributes: [], automationSteps: [], defaultFollowUpDays: 3 });
  
  const [newAttr, setNewAttr] = useState<ProductAttribute>({ key: '', label: '', value: '' });
  const [activeTab, setActiveTab] = useState<'info'|'automation'>('info');

  const handleEdit = (p: Product) => { setEditingId(p.id); setFormData(p); setIsModalOpen(true); };
  
  const handleSave = () => {
      const payload = { ...formData, id: editingId || generateStableId('prod') } as Product;
      if (editingId) updateProduct(payload); else addProduct(payload);
      setIsModalOpen(false);
  };

  const addAttribute = () => {
    if (!newAttr.label || !newAttr.value) return;
    const key = newAttr.key || newAttr.label.toLowerCase().replace(/\s+/g, '_');
    setFormData(prev => ({ ...prev, attributes: [...(prev.attributes || []), { ...newAttr, key }] }));
    setNewAttr({ key: '', label: '', value: '' });
  };
  const removeAttribute = (i: number) => setFormData(prev => ({ ...prev, attributes: prev.attributes?.filter((_, idx) => idx !== i) }));

  const updateAutomationSteps = (steps: AutomationStep[]) => {
     setFormData(prev => ({ ...prev, automationSteps: steps }));
  };

  return (
     <div className="p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex justify-between items-start">
           <Header title="Catálogo & Automação" subtitle="Produtos com atributos dinâmicos." icon={ShoppingBag} />
           <button onClick={() => { setEditingId(null); setFormData({}); setIsModalOpen(true); }} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
             <Plus size={20}/> Novo Produto
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {products.map(p => (
              <Card key={p.id} className="flex flex-col h-full group">
                 <div className="p-6 flex-1 relative">
                    <div className="flex justify-between items-start mb-4">
                       <Badge>{p.category}</Badge>
                       <span className="text-lg font-bold text-slate-800">R$ {p.basePrice.toLocaleString('pt-BR')}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{p.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{p.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                       {p.attributes.slice(0,3).map((attr,i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500 font-medium">{attr.label}: {attr.value}</span>
                       ))}
                    </div>

                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button onClick={() => handleEdit(p)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl transform scale-95 group-hover:scale-100 transition-transform">Editar</button>
                    </div>
                 </div>
                 <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                       <Activity size={12}/> {p.automationSteps?.length || 0} automações
                    </span>
                    <button onClick={() => removeProduct(p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                 </div>
              </Card>
           ))}
        </div>
        
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Produto" : "Novo Produto"} size="lg">
           <div className="flex flex-col h-[80vh] md:h-auto">
             <div className="flex justify-end items-center bg-white mb-4">
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
                   <Save size={18} /> <span>Salvar Produto</span>
                </button>
             </div>

             <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 gap-1">
               <button onClick={() => setActiveTab('info')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileText size={16} /> Informações
               </button>
               <button onClick={() => setActiveTab('automation')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'automation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <SmartphoneCharging size={16} /> Régua de Pós-Venda
               </button>
             </div>
             
             <div className="overflow-y-auto custom-scrollbar px-1 pb-2 flex-1">
               {activeTab === 'info' && (
                  <div className="space-y-6">
                    <InputGroup label="Nome do Produto" icon={ShoppingBag} required>
                       <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} autoFocus />
                    </InputGroup>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <InputGroup label="Preço Base (R$)" icon={Smartphone}>
                         <input type="number" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})} className={inputClass} />
                      </InputGroup>
                      <InputGroup label="Categoria" icon={Tag}>
                         <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass} />
                      </InputGroup>
                    </div>
                    
                    <InputGroup label="Descrição">
                       <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500" rows={3} />
                    </InputGroup>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                       <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Atributos Personalizados</p>
                       <div className="flex gap-3 mb-3">
                          <input value={newAttr.label} onChange={e => setNewAttr({...newAttr, label: e.target.value})} placeholder="Nome (Ex: Voltagem)" className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500" />
                          <input value={newAttr.value} onChange={e => setNewAttr({...newAttr, value: e.target.value})} placeholder="Valor (Ex: 220v)" className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500" />
                          <button onClick={addAttribute} className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors">+</button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {formData.attributes?.map((a, i) => (
                             <div key={i} className="text-xs bg-white border border-slate-200 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                <span className="font-bold text-slate-700">{a.label}:</span> <span className="text-slate-500">{a.value}</span>
                                <button onClick={() => removeAttribute(i)} className="text-red-400 hover:text-red-600"><XCircle size={14}/></button>
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
               )}

               {activeTab === 'automation' && (
                  <AutomationBuilder 
                    steps={formData.automationSteps || []}
                    onUpdate={updateAutomationSteps}
                    triggerLabel="Venda Realizada (Ganho)"
                    triggerDescription="Esta régua inicia quando o negócio é marcado como 'Ganho'."
                  />
               )}
             </div>
           </div>
        </Modal>
     </div>
  );
};

const EmployeesView: React.FC = () => {
  const { employees = [], addEmployee, updateEmployee, removeEmployee, pdvs = [], getPDVName } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({ name: '', email: '', role: 'SALES_REP', pdvId: '', active: true });

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData(emp);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', role: 'SALES_REP', pdvId: '', active: true });
    setIsModalOpen(true);
  };

  const handleSave = () => {
     if(!formData.name || !formData.email) return alert('Nome e Email obrigatórios');
     
     const payload = { 
        id: editingId || generateStableId('emp'),
        name: formData.name!,
        email: formData.email!,
        role: formData.role as Role,
        pdvId: formData.pdvId || null,
        active: formData.active ?? true
     };

     if (editingId) updateEmployee(payload);
     else addEmployee(payload);

     setIsModalOpen(false);
  };

  const ROLES_LABEL: Record<Role, string> = {
     'ADMIN': 'Administrador',
     'MANAGER': 'Gerente Regional',
     'SALES_REP': 'Consultor Comercial',
     'SUPPORT': 'Suporte / Backoffice'
  };

  return (
     <div className="p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex justify-between items-start">
           <Header title="Gestão de Equipe" subtitle="Controle de acessos e funções." icon={Users} />
           <button onClick={handleCreate} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
             <Plus size={20}/> Novo Colaborador
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {employees.map(e => (
              <Card key={e.id} className="p-5 flex items-start gap-4 group">
                 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-2xl text-slate-500 shadow-inner flex-shrink-0">
                    {e.name.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                       <h3 className="font-bold text-slate-800 truncate text-lg">{e.name}</h3>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEdit(e)} className="text-slate-300 hover:text-blue-500"><Edit size={16}/></button>
                         <button onClick={() => removeEmployee(e.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-3 truncate">{e.email}</p>
                    <div className="flex flex-col gap-2">
                       <Badge color="bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit">{ROLES_LABEL[e.role]}</Badge>
                       <p className="text-xs text-slate-400 flex items-center gap-1.5"><Building size={12}/> {getPDVName(e.pdvId)}</p>
                    </div>
                 </div>
              </Card>
           ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Colaborador' : 'Adicionar Colaborador'} size="lg">
           <div className="flex flex-col">
              <div className="flex justify-end items-center bg-white mb-6">
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
                   <Save size={18} /> <span>Salvar Acesso</span>
                 </button>
              </div>

              <div className="space-y-6">
                 <InputGroup label="Nome Completo" icon={User} required>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} autoFocus />
                 </InputGroup>
                 <InputGroup label="E-mail Corporativo" icon={Mail} required>
                    <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} />
                 </InputGroup>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Função (Cargo)" icon={Shield} required>
                       <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className={selectClass}>
                          {Object.entries(ROLES_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                       </select>
                    </InputGroup>
                    <InputGroup label="Alocação (PDV)" icon={Building}>
                       <select value={formData.pdvId || ''} onChange={e => setFormData({...formData, pdvId: e.target.value})} className={selectClass}>
                          <option value="">Matriz / Corporativo</option>
                          {pdvs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </InputGroup>
                 </div>
              </div>
           </div>
        </Modal>
     </div>
  );
};

const CustomersView: React.FC = () => {
  const {
    customers = [],
    addCustomer,
    updateCustomer,
    pdvs = [],
    getPDVName,
    currentUser,
    customFieldDefs = [],
    addCustomFieldDef,
    removeCustomFieldDef,
    updateCustomFieldDef
  } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({ 
    type: 'PJ', name: '', document: '', email: '', phone: '', zipCode: '', status: 'LEAD', pdvIds: [], assignedEmployeeIds: [], customValues: {}
  });
  const [activeTab, setActiveTab] = useState<'info'|'contact'>('info');
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const globalCustomerFields = useMemo(() => customFieldDefs.filter(f => f.scope === 'CUSTOMER' && f.active), [customFieldDefs]);

  const filteredCustomers = customers.filter(c => 
     c.name.toLowerCase().includes(filter.toLowerCase()) || 
     c.document.includes(filter)
  );

  const handleEdit = (c: Customer) => { setEditingId(c.id); setFormData(c); setIsModalOpen(true); };

  const handleSave = () => {
    if(!formData.name || !formData.document) return alert("Nome e Documento são obrigatórios");
    
    const pdvIds = formData.pdvIds || [];
    const assignedEmployeeIds = formData.assignedEmployeeIds || [];

    const payload = { ...formData, id: editingId || generateStableId('cust'), pdvIds, assignedEmployeeIds, createdAt: editingId ? formData.createdAt : getCurrentDateISO() } as Customer;
    
    if(editingId) updateCustomer(payload);
    else addCustomer(payload);

    setIsModalOpen(false);
  };

  const toggleSelection = (field: 'pdvIds' | 'assignedEmployeeIds', id: string) => {
    const current = formData[field] || [];
    const updated = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    setFormData(prev => ({ ...prev, [field]: updated }));
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, customValues: { ...prev.customValues, [key]: value } }));
  };

  const [fieldData, setFieldData] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', scope: 'CUSTOMER', required: false, active: true, options: [] });
  const [fieldEditingId, setFieldEditingId] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState('');

  const saveField = () => {
      if (!fieldData.label) return;
      const key = fieldData.key || fieldData.label.toLowerCase().replace(/\s+/g, '_');
      const payload = { ...fieldData, key, scope: 'CUSTOMER', id: fieldEditingId || generateStableId('cf') } as CustomFieldDefinition;
      
      if (fieldEditingId) updateCustomFieldDef(payload); else addCustomFieldDef(payload);
      
      setFieldData({ label: '', key: '', type: 'text', scope: 'CUSTOMER', required: false, active: true, options: [] });
      setFieldEditingId(null);
  };

  const addOption = () => {
      if (!optionInput.trim()) return;
      setFieldData(prev => ({ ...prev, options: [...(prev.options || []), optionInput.trim()] }));
      setOptionInput('');
  };

  return (
     <div className="p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex justify-between items-start">
           <Header title="Carteira de Clientes" subtitle="Gestão de relacionamento PF e PJ." icon={Briefcase} />
           <div className="flex gap-2">
               {currentUser?.role === 'ADMIN' && (
                  <button onClick={() => setIsFieldsModalOpen(true)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all">
                     <Sliders size={18}/> Campos Extras
                  </button>
               )}
               <button onClick={() => { setEditingId(null); setFormData({type: 'PJ', status: 'LEAD', pdvIds: [], assignedEmployeeIds: [], customValues: {}}); setIsModalOpen(true); }} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                 <Plus size={20}/> Novo Cliente
               </button>
           </div>
        </div>

        <Card>
           <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="relative flex-1 max-w-md group">
                 <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
                 <input 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    placeholder="Buscar por nome ou documento..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
                 />
              </div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                 {filteredCustomers.length} registros
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 tracking-wider">
                    <tr>
                       <th className="px-6 py-4">Cliente / Razão</th>
                       <th className="px-6 py-4">Documento</th>
                       <th className="px-6 py-4">Contato</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredCustomers.map(c => {
                       const pdvNames = c.pdvIds.map(pid => getPDVName(pid));
                       const pdvDisplay = pdvNames.length > 0 ? (pdvNames.length > 1 ? `${pdvNames[0]} +${pdvNames.length - 1}` : pdvNames[0]) : 'Sem vínculo';

                       return (
                       <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${c.type === 'PJ' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                   {c.type}
                                </div>
                                <div>
                                   <p className="font-bold text-slate-900">{c.name}</p>
                                   <p className="text-xs text-slate-500 flex items-center gap-1" title={pdvNames.join(', ')}>
                                      <MapPin size={10}/> {pdvDisplay}
                                   </p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 text-xs">{c.document}</td>
                          <td className="px-6 py-4 text-slate-600">
                             <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-2"><Mail size={12} className="text-slate-400"/> {c.email || '-'}</span>
                                <span className="flex items-center gap-2"><Smartphone size={12} className="text-slate-400"/> {c.phone || '-'}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <Badge color={CUSTOMER_STATUS_COLORS[c.status]}>{CUSTOMER_STATUS_LABELS[c.status]}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => handleEdit(c)} className="text-slate-300 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all">
                                <Edit size={18}/>
                             </button>
                          </td>
                       </tr>
                    )})}
                 </tbody>
              </table>
           </div>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Cliente" : "Novo Cliente"} size="lg">
           <div className="flex flex-col">
              <div className="flex justify-end items-center bg-white mb-4">
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
                   <Save size={18} /> <span>Salvar Cliente</span>
                 </button>
              </div>

              <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 gap-1">
                  <button onClick={() => setActiveTab('info')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                     <User size={16} /> Dados Cadastrais
                  </button>
                  <button onClick={() => setActiveTab('contact')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'contact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                     <MapPin size={16} /> Contato & Acesso
                  </button>
              </div>

              <div className="space-y-6">
                 {activeTab === 'info' && (
                    <>
                       <div className="flex bg-slate-100 p-1.5 rounded-xl">
                          <button onClick={() => setFormData({...formData, type: 'PJ'})} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.type === 'PJ' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Pessoa Jurídica</button>
                          <button onClick={() => setFormData({...formData, type: 'PF'})} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.type === 'PF' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Pessoa Física</button>
                       </div>

                       <InputGroup label={formData.type === 'PJ' ? "Razão Social" : "Nome Completo"} icon={User} required>
                          <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} autoFocus />
                       </InputGroup>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputGroup label={formData.type === 'PJ' ? "CNPJ" : "CPF"} icon={Shield} required>
                             <input value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className={inputClass} />
                          </InputGroup>
                          <InputGroup label="Status da Carteira" icon={Activity}>
                             <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as CustomerStatus})} className={selectClass}>
                                {Object.entries(CUSTOMER_STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                             </select>
                          </InputGroup>
                       </div>

                       {globalCustomerFields.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                             {globalCustomerFields.map(field => (
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
                    </>
                 )}
                 
                 {activeTab === 'contact' && (
                    <>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputGroup label="Email" icon={Mail}>
                             <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} />
                          </InputGroup>
                          <InputGroup label="Telefone" icon={Smartphone}>
                             <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} />
                          </InputGroup>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-6">
                          <InputGroup label="CEP" icon={MapPin}>
                             <input value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className={inputClass} />
                          </InputGroup>
                       </div>

                       <div className="border-t border-slate-100 pt-4 mt-2">
                           {currentUser?.role === 'ADMIN' && (
                              <div className="mb-6">
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Vincular Unidades (Filiais)</label>
                                 <div className="flex flex-wrap gap-2">
                                    {pdvs.map(p => {
                                       const isSelected = formData.pdvIds?.includes(p.id);
                                       return (
                                          <button 
                                             key={p.id}
                                             onClick={() => toggleSelection('pdvIds', p.id)}
                                             className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                          >
                                             {p.name}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           )}

                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Equipe de Atendimento (Account Team)</label>
                              <div className="flex flex-wrap gap-2">
                                 {customers.map(() => null)}
                              </div>
                           </div>
                       </div>
                    </>
                 )}
              </div>
           </div>
        </Modal>
        
        <Modal isOpen={isFieldsModalOpen} onClose={() => setIsFieldsModalOpen(false)} title="Personalizar Campos de Cliente" size="lg">
           <div className="flex flex-col md:flex-row gap-6 h-[60vh] md:h-auto">
              <div className="flex-1 border-r border-slate-100 pr-4 overflow-y-auto custom-scrollbar">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Campos Existentes</h4>
                 <div className="space-y-2">
                    {globalCustomerFields.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum campo personalizado.</p>}
                    {globalCustomerFields.map(f => (
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
                    <button onClick={() => { setFieldEditingId(null); setFieldData({ label: '', key: '', type: 'text', scope: 'CUSTOMER', required: false, active: true, options: [] }); }} className="w-full py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors mt-2">
                       + Novo Campo
                    </button>
                 </div>
              </div>

              <div className="flex-1 pl-2">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{fieldEditingId ? 'Editar Campo' : 'Novo Campo'}</h4>
                 <div className="space-y-4">
                     <InputGroup label="Rótulo" required>
                        <input value={fieldData.label} onChange={e => setFieldData({...fieldData, label: e.target.value})} className={inputClass} placeholder="Ex: Data de Fundação" />
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

export { OrganizationView, IntegrationsView, ProductsView, EmployeesView, CustomersView };
