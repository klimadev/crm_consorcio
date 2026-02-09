import { PDV, Employee, Product, PipelineStage, Customer, Deal } from "../types";

export const BRANDING = {
  appName: "MC CRM",
  logoInitials: "MC",
  companyName: "MC Consórcio"
};

export const INITIAL_PDVS: PDV[] = [
  { id: 'pdv-sp-01', name: 'Matriz - Av. Paulista', type: 'PHYSICAL_STORE', location: 'São Paulo, SP', isActive: true },
  { id: 'pdv-digital', name: 'Vendas Digitais / Inside Sales', type: 'ONLINE', location: 'Remoto / Brasil', isActive: true },
  { id: 'pdv-cwb', name: 'Filial Curitiba', type: 'PHYSICAL_STORE', location: 'Curitiba, PR', isActive: true },
  { id: 'pdv-agro', name: 'Representação Agro (MT)', type: 'PARTNER', location: 'Cuiabá, MT', isActive: true },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'admin-01', name: 'Diretoria (Admin)', email: 'diretoria@mcconsorcio.com.br', role: 'ADMIN', pdvId: null, active: true },
  { id: 'gerente-comercial', name: 'Roberto (Gerente Geral)', email: 'roberto@mcconsorcio.com.br', role: 'MANAGER', pdvId: 'pdv-sp-01', active: true },
  { id: 'vendedor-sp', name: 'Ana (Consultora SP)', email: 'ana@mcconsorcio.com.br', role: 'SALES_REP', pdvId: 'pdv-sp-01', active: true },
  { id: 'vendedor-digital', name: 'Carlos (Inside Sales)', email: 'carlos@mcconsorcio.com.br', role: 'SALES_REP', pdvId: 'pdv-digital', active: true },
  { id: 'parceiro-agro', name: 'João (Rep. Agro)', email: 'joao.agro@partner.com', role: 'SALES_REP', pdvId: 'pdv-agro', active: true },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', name: 'Translog Transportes Ltda', type: 'PJ', document: '12.345.678/0001-90', email: 'compras@translog.com.br', phone: '11 99999-9999', zipCode: '04551-000', 
    status: 'ACTIVE', pdvIds: ['pdv-sp-01', 'pdv-agro'], assignedEmployeeIds: ['vendedor-sp'], createdAt: new Date().toISOString(),
    customValues: { objetivo_compra: 'Troca de Frota' }
  },
  { 
    id: 'c2', name: 'Fazenda Santa Cecília', type: 'PJ', document: '98.765.432/0001-10', email: 'financeiro@stacecilia.com.br', phone: '65 88888-8888', zipCode: '78000-000', 
    status: 'PROPONENT', pdvIds: ['pdv-agro'], assignedEmployeeIds: ['parceiro-agro'], createdAt: new Date().toISOString(),
    customValues: { objetivo_compra: 'Investimento' }
  },
  { 
    id: 'c3', name: 'Dr. Ricardo Silva', type: 'PF', document: '123.456.789-00', email: 'ricardo.silva@gmail.com', phone: '41 98888-7777', zipCode: '80000-000', 
    status: 'LEAD', pdvIds: ['pdv-cwb', 'pdv-digital'], assignedEmployeeIds: ['vendedor-digital'], createdAt: new Date().toISOString(),
    customValues: { objetivo_compra: 'Uso Próprio (1º Imóvel)' }
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', name: 'Carta Imóvel 500k', description: 'Crédito para compra de imóvel, reforma ou construção.', category: 'Imóvel', basePrice: 500000,
    attributes: [{ key: 'taxa_adm', label: 'Taxa Adm Total', value: '14%' }, { key: 'fundo_reserva', label: 'Fundo Reserva', value: '2%' }], 
    active: true
  },
  { 
    id: 'p2', name: 'Carta Auto 80k', description: 'Veículos leves, utilitários e seminovos.', category: 'Automóvel', basePrice: 80000,
    attributes: [{ key: 'taxa_adm', label: 'Taxa Adm Total', value: '16%' }, { key: 'fundo_reserva', label: 'Fundo Reserva', value: '1%' }], 
    active: true
  },
  {
    id: 'p3', name: 'Carta Pesados 400k', description: 'Caminhões, Tratores e Maquinário Agrícola.', category: 'Pesados/Agro', basePrice: 400000,
    attributes: [{ key: 'taxa_adm', label: 'Taxa Adm Total', value: '12%' }],
    active: true
  },
  {
    id: 'p4', name: 'Carta Serviços 30k', description: 'Reformas, Cirurgias, Festas e Viagens.', category: 'Serviços', basePrice: 30000,
    attributes: [{ key: 'taxa_adm', label: 'Taxa Adm Total', value: '18%' }],
    active: true
  }
];

export const INITIAL_STAGES: PipelineStage[] = [
  { id: 'stage-lead', name: 'Prospecção / Lead', color: 'border-t-blue-500', type: 'OPEN' },
  { id: 'stage-contato', name: 'Contato Realizado', color: 'border-t-cyan-500', type: 'OPEN' },
  { id: 'stage-simulacao', name: 'Simulação Enviada', color: 'border-t-yellow-500', type: 'OPEN' },
  { id: 'stage-analise', name: 'Análise de Crédito', color: 'border-t-purple-500', type: 'OPEN' },
  { id: 'stage-fechamento', name: 'Assinatura / Pagto', color: 'border-t-orange-500', type: 'OPEN' },
  { id: 'stage-won', name: 'Adesão Confirmada', color: 'border-t-green-500', type: 'WON' },
  { id: 'stage-lost', name: 'Não Adesão / Cancelado', color: 'border-t-red-500', type: 'LOST' },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'd1',
    title: 'Renovação Frota Translog',
    pdvId: 'pdv-sp-01',
    customerId: 'c1',
    customerName: 'Translog Transportes Ltda',
    value: 2000000,
    stageId: 'stage-simulacao',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['vendedor-sp'],
    productIds: ['p3'], // Carta Pesados
    customValues: { prazo: '100', tipo_bem: 'Caminhão', origin_source: 'Base de Clientes', prazo_desejado: 100 },
    notes: 'Cliente quer usar 30% de lance embutido para retirar 2 caminhões no primeiro semestre.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    title: 'Maquinário Safra 2026',
    pdvId: 'pdv-agro',
    customerId: 'c2',
    customerName: 'Fazenda Santa Cecília',
    value: 400000,
    stageId: 'stage-analise',
    visibility: 'RESTRICTED',
    assignedEmployeeIds: ['parceiro-agro'],
    productIds: ['p3'], // Carta Pesados
    customValues: { prazo: '80', tipo_bem: 'Colheitadeira', origin_source: 'Indicação' },
    notes: 'Documentação enviada para análise. Pendente IR do sócio.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd3',
    title: 'Apartamento Dr. Ricardo',
    pdvId: 'pdv-digital',
    customerId: 'c3',
    customerName: 'Dr. Ricardo Silva',
    value: 500000,
    stageId: 'stage-lead',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['vendedor-digital'],
    productIds: ['p1'], // Carta Imóvel
    customValues: { origin_source: 'Google Ads', prazo_desejado: 180 },
    notes: 'Lead chegou via campanha de Imóveis. Quer sair do aluguel.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'd4',
    title: 'Carro para Filho',
    pdvId: 'pdv-cwb',
    customerId: 'c3',
    customerName: 'Dr. Ricardo Silva',
    value: 80000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['vendedor-digital'],
    productIds: ['p2'], // Carta Auto
    customValues: { prazo: '60', modelo_interesse: 'SUV Compacto', origin_source: 'Base de Clientes' },
    notes: 'Venda cruzada realizada com sucesso. Cliente não tem pressa, vai pagar no sorteio.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 dias atrás
  },
  {
    id: 'd5',
    title: 'Renovação Contrato Translog',
    pdvId: 'pdv-sp-01',
    customerId: 'c1',
    customerName: 'Translog Transportes Ltda',
    value: 1200000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['vendedor-sp'],
    productIds: ['p3'], // Carta Pesados
    customValues: { prazo: '120', tipo_bem: 'Caminhão', origin_source: 'Base de Clientes' },
    notes: 'Renovação anual do contrato de frota.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString() // 5 dias atrás
  },
  {
    id: 'd7',
    title: 'Venda Digital Produto X',
    pdvId: 'pdv-digital',
    customerId: 'c3',
    customerName: 'Dr. Ricardo Silva',
    value: 95000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['vendedor-digital'],
    productIds: ['p2'], // Carta Auto
    customValues: { prazo: '90', tipo_bem: 'Carro', origin_source: 'Google Ads' },
    notes: 'Venda online realizada com sucesso.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString() // 1 dia atrás
  },
  {
    id: 'd8',
    title: 'Representação Agro Produto Y',
    pdvId: 'pdv-agro',
    customerId: 'c2',
    customerName: 'Fazenda Santa Cecília',
    value: 320000,
    stageId: 'stage-won',
    visibility: 'PUBLIC',
    assignedEmployeeIds: ['parceiro-agro'],
    productIds: ['p3'], // Carta Pesados
    customValues: { prazo: '100', tipo_bem: 'Trator', origin_source: 'Indicação' },
    notes: 'Venda realizada pela representante agro.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString() // 4 dias atrás
  }
];
