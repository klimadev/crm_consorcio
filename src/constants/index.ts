import { Region, PDV, Employee, Product, Tag, PipelineStage, Customer, Deal, DashboardWidget, CustomFieldDefinition } from "../types";

export const BRANDING = {
  appName: "MC I CRM",
  logoInitials: "MC",
  companyName: "MC Investimentos"
};

export const INITIAL_REGIONS: Region[] = [
  { id: 'r1', name: 'Sudeste (SP/RJ)' },
  { id: 'r2', name: 'Sul (PR/SC/RS)' },
];

export const INITIAL_PDVS: PDV[] = [
  { id: 'pdv-sp-01', name: 'Loja Berrini (SP)', type: 'PHYSICAL_STORE', regionId: 'r1', location: 'São Paulo, SP', isActive: true },
  { id: 'pdv-sp-02', name: 'Quiosque Morumbi', type: 'KIOSK', regionId: 'r1', location: 'São Paulo, SP', isActive: true },
  { id: 'pdv-sul-01', name: 'Filial Curitiba', type: 'PHYSICAL_STORE', regionId: 'r2', location: 'Curitiba, PR', isActive: true },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'admin-01', name: 'Diretoria (Admin)', email: 'admin@mc.com', role: 'ADMIN', pdvId: null, active: true },
  { id: 'gerente-sp', name: 'Roberto (Gerente SP)', email: 'roberto@mc.com', role: 'MANAGER', pdvId: 'pdv-sp-01', active: true },
  { id: 'rep-sp-01', name: 'Ana (Vendedora SP)', email: 'ana@mc.com', role: 'SALES_REP', pdvId: 'pdv-sp-01', active: true },
  { id: 'gerente-sul', name: 'Carla (Gerente Sul)', email: 'carla@mc.com', role: 'MANAGER', pdvId: 'pdv-sul-01', active: true },
  { id: 'rep-sul-01', name: 'João (Vendedor Sul)', email: 'joao@mc.com', role: 'SALES_REP', pdvId: 'pdv-sul-01', active: true },
];

export const INITIAL_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  { id: 'cf-deal-source', key: 'origin_source', label: 'Origem do Lead', type: 'select', scope: 'DEAL', options: ['Google Ads', 'Indicação', 'Instagram', 'Passante'], required: true, active: true },
  { id: 'cf-cust-birth', key: 'birthdate', label: 'Data de Nascimento / Fundação', type: 'date', scope: 'CUSTOMER', required: false, active: true },
  { id: 'cf-cust-segment', key: 'segment', label: 'Segmento', type: 'select', scope: 'CUSTOMER', options: ['Varejo', 'Atacado', 'Serviços'], required: false, active: true }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', name: 'Tech Solutions PJ', type: 'PJ', document: '12.345.678/0001-90', email: 'contato@tech.com', phone: '11 99999-9999', zipCode: '04551-000', 
    status: 'ACTIVE', pdvIds: ['pdv-sp-01'], assignedEmployeeIds: ['rep-sp-01'], createdAt: new Date().toISOString(),
    customValues: { segment: 'Serviços' }
  },
  { 
    id: 'c2', name: 'Agro Sul Ltda', type: 'PJ', document: '98.765.432/0001-10', email: 'comercial@agrosul.com', phone: '41 88888-8888', zipCode: '80240-000', 
    status: 'PROPONENT', pdvIds: ['pdv-sul-01'], assignedEmployeeIds: ['rep-sul-01'], createdAt: new Date().toISOString(),
    customValues: { segment: 'Atacado' }
  },
  { 
    id: 'c3', name: 'Investidor João', type: 'PF', document: '123.456.789-00', email: 'joao@gmail.com', phone: '11 98888-7777', zipCode: '01310-100', 
    status: 'LEAD', pdvIds: ['pdv-sp-01', 'pdv-sul-01'], assignedEmployeeIds: ['gerente-sp'], createdAt: new Date().toISOString(),
    customValues: { birthdate: '1985-05-15' }
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', name: 'Carta Imóvel 500k', description: 'Consórcio Imobiliário Premium', category: 'Consórcio', basePrice: 500000,
    attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '14%' }], 
    active: true,
    formSchema: [
      { key: 'group_number', label: 'Grupo', type: 'text', required: true },
      { key: 'quota_number', label: 'Cota', type: 'text', required: true },
      { key: 'contract_term', label: 'Prazo (Meses)', type: 'number', required: true }
    ],
    automationSteps: [
      { id: 's1', name: 'Boas vindas imediata', delayValue: 5, delayUnit: 'MINUTES', messageTemplate: 'Olá, obrigado por adquirir o Consórcio Imóvel. Seu contrato está sendo gerado.' },
      { id: 's2', name: 'Check de assembleia', delayValue: 20, delayUnit: 'DAYS', messageTemplate: 'Olá, sua primeira assembleia está chegando. Fique atento!' }
    ]
  },
  { 
    id: 'p2', name: 'Consórcio Auto 80k', description: 'Veículos leves e utilitários', category: 'Consórcio', basePrice: 80000,
    attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '16%' }], 
    active: true,
    formSchema: [
      { key: 'group_number', label: 'Grupo', type: 'text', required: true },
      { key: 'quota_number', label: 'Cota', type: 'text', required: true },
    ],
    automationSteps: []
  },
  {
    id: 'p3', name: 'iPhone 15 Pro Max', description: 'Dispositivo eletrônico de varejo', category: 'Varejo', basePrice: 9000,
    attributes: [{ key: 'brand', label: 'Marca', value: 'Apple'}],
    active: true,
    formSchema: [
      { key: 'sku', label: 'SKU / Código', type: 'text', required: true },
      { key: 'color', label: 'Cor', type: 'select', options: ['Titânio Natural', 'Preto', 'Branco', 'Azul'], required: true },
      { key: 'imei', label: 'IMEI', type: 'text', required: false }
    ],
    automationSteps: []
  }
];

export const AVAILABLE_TAGS: Tag[] = [
  { id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
  { id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' },
  { id: 't3', label: 'Frio', color: 'bg-blue-100 text-blue-800' },
];

export const INITIAL_STAGES: PipelineStage[] = [
  { id: 'stage-lead', name: 'Prospecção', color: 'border-t-blue-500', type: 'OPEN' },
  { id: 'stage-contacted', name: 'Qualificação', color: 'border-t-yellow-500', type: 'OPEN' },
  { id: 'stage-proposal', name: 'Apresentação', color: 'border-t-purple-500', type: 'OPEN' },
  { id: 'stage-negotiation', name: 'Fechamento', color: 'border-t-orange-500', type: 'OPEN' },
  { id: 'stage-won', name: 'Vendido', color: 'border-t-green-500', type: 'WON' },
  { id: 'stage-lost', name: 'Perdido', color: 'border-t-red-500', type: 'LOST' },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'd1',
    title: 'Expansão Sede Tech',
    pdvId: 'pdv-sp-01',
    customerId: 'c1',
    customerName: 'Tech Solutions PJ',
    value: 500000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['rep-sp-01'],
    productIds: ['p1'],
    customValues: { group_number: '1020', quota_number: '55', contract_term: 180, origin_source: 'Indicação' },
    tags: [AVAILABLE_TAGS[0]],
    notes: 'Cliente quer usar lance embutido.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    title: 'Frota Agro Sul',
    pdvId: 'pdv-sul-01',
    customerId: 'c2',
    customerName: 'Agro Sul Ltda',
    value: 160000,
    stageId: 'stage-proposal',
    visibility: 'RESTRICTED',
    assignedEmployeeIds: ['rep-sul-01'],
    productIds: ['p2'],
    tags: [AVAILABLE_TAGS[1]],
    notes: 'Cotando 2 cartas de auto.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd3',
    title: 'Compra iPhone Corporativo',
    pdvId: 'pdv-sp-02',
    customerId: 'c3',
    customerName: 'Investidor João',
    value: 9000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['gerente-sp'],
    productIds: ['p3'],
    customValues: { sku: 'IPH15-TIT', color: 'Titânio Natural', origin_source: 'Passante' },
    tags: [],
    notes: 'Retirada em loja.',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'w0', type: 'GOAL_PROGRESS', title: 'Metas do Mês', colSpan: 4 },
  { id: 'w1', type: 'KPI_TOTAL_SALES', title: 'Volume Geral', colSpan: 1 },
  { id: 'w2', type: 'KPI_ACTIVE_DEALS', title: 'Pipeline Ativo', colSpan: 1 },
  { id: 'w3', type: 'KPI_CONVERSION', title: 'Conversão', colSpan: 1 },
  { id: 'w4', type: 'KPI_AVG_TICKET', title: 'Ticket Médio', colSpan: 1 },
  { id: 'w5', type: 'CHART_FUNNEL', title: 'Funil de Vendas', colSpan: 2 },
  { id: 'w6', type: 'CHART_SALES_BY_REP', title: 'Ranking Equipe', colSpan: 2 },
];
