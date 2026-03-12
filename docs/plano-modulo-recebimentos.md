# Plano do modulo Recebimentos

## Objetivo

Criar um novo modulo de sidebar chamado `recebimentos`, com visao agregada das parcelas de todos os leads em um unico lugar, focado em leitura operacional e acompanhamento financeiro.

- O drawer de parcelas do lead continua existindo como contexto operacional por lead.
- `GERENTE` continua com acesso ao drawer de parcelas no Kanban.
- O modulo `recebimentos` na sidebar fica disponivel apenas para `EMPRESA`.
- O modulo deve ser DRY e reutilizar o dominio existente de parcelas, sem duplicar regras de status, tipos ou consultas base.

## Posicionamento do produto

O drawer responde a pergunta: `como esta o plano deste lead?`

O novo modulo responde a pergunta: `como esta a saude dos recebimentos da empresa inteira?`

Isso cria uma separacao clara:

- `Parcelas no drawer`: criar plano, ver historico e marcar pagamento do lead atual.
- `Recebimentos no modulo`: analisar recebidos, atrasos, previsao e performance consolidada.

## Escopo inicial recomendado

### Fase 1 - MVP forte

- Adicionar item `Recebimentos` na sidebar apenas para `EMPRESA`.
- Criar rota `src/app/(dashboard)/recebimentos/page.tsx`.
- Criar modulo `src/modules/recebimentos` no padrao MVVM do projeto.
- Criar endpoint agregado proprio para recebimentos com filtros e resumo.
- Exibir KPIs, abas por status, filtros principais e tabela/lista responsiva.
- Permitir abrir o lead correspondente a partir da linha de recebimento.

### Fase 2 - Encantamento visual

- Grafico de recebimentos por periodo.
- Donut de distribuicao por status.
- Cards com tendencia comparando periodo atual vs anterior.
- Rankings simples: maiores recebidos, maiores atrasos, leads mais adimplentes.

### Fase 3 - Operacao avancada

- Exportacao CSV.
- Presets de filtros.
- Agrupamento por PDV e responsavel.
- Drill-down de recebimentos por lead.

## Arquitetura proposta

### Rota server

Arquivo: `src/app/(dashboard)/recebimentos/page.tsx`

Responsabilidades:

- chamar `obterSessaoNoServidor()`
- bloquear nao autenticado
- restringir acesso para `sessao.perfil !== "EMPRESA"`
- renderizar `<ModuloRecebimentos />`

Exemplo de comportamento:

- `EMPRESA`: entra no modulo
- `GERENTE`: nao ve item na sidebar e, se acessar URL manualmente, recebe card de acesso restrito
- `COLABORADOR`: idem

### Modulo frontend

Estrutura:

```text
src/modules/recebimentos/
  index.ts
  page.tsx
  types.ts
  hooks/
    use-recebimentos-module.ts
  components/
    recebimentos-header.tsx
    recebimentos-kpis.tsx
    recebimentos-filters.tsx
    recebimentos-tabs.tsx
    recebimentos-chart-card.tsx
    recebimentos-status-donut.tsx
    recebimentos-table.tsx
    recebimentos-mobile-list.tsx
    recebimento-row-actions.tsx
    recebimentos-empty-state.tsx
```

### Backend/API

Sugestao principal:

```text
src/app/api/recebimentos/route.ts
```

Motivo:

- evita misturar cada vez mais o contrato de `parcelas` com necessidades de dashboard
- deixa claro que o endpoint e agregado e exclusivo do modulo
- facilita devolver `resumo + lista + series` em um unico payload

## Contrato sugerido da API

### GET `/api/recebimentos`

Query params sugeridos:

- `aba`: `recebidos | a_vencer | atrasados | todos`
- `busca`: nome ou telefone do lead
- `data_inicial`
- `data_final`
- `id_pdv`
- `id_funcionario`
- `pagina`
- `limite`
- `ordenar`: `vencimento | pagamento | valor`
- `direcao`: `asc | desc`

Resposta sugerida:

```ts
type RecebimentosResposta = {
  resumo: {
    totalRecebidoPeriodo: number;
    totalEmAberto: number;
    totalAtrasado: number;
    taxaAdimplencia: number;
    quantidadeRecebidas: number;
    quantidadePendentes: number;
    quantidadeAtrasadas: number;
  };
  graficos: {
    recebimentosPorPeriodo: Array<{
      label: string;
      recebido: number;
      previsto: number;
    }>;
    distribuicaoStatus: Array<{
      status: "PAGO" | "PENDENTE" | "ATRASADO";
      quantidade: number;
      valor: number;
    }>;
  };
  lista: Array<{
    id: string;
    numero_parcela: number;
    quantidade_total: number;
    valor: number;
    status: "PAGO" | "PENDENTE" | "ATRASADO";
    data_vencimento: string;
    data_pagamento: string | null;
    lead: {
      id: string;
      nome: string;
      telefone: string;
      valor_consorcio: number;
      estagio?: string;
    };
    pdv?: {
      id: string;
      nome: string;
    };
    responsavel?: {
      id: string;
      nome: string;
    };
  }>;
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};
```

## Dados que devem ser reaproveitados

### Reuso imediato

- `Parcela` e `ParcelaComLead` de `src/lib/api/parcelas.ts`
- logica de status derivado de `src/modules/kanban/hooks/use-lead-parcelas.ts`
- estrutura de `GET /api/parcelas?tab=` em `src/app/api/parcelas/route.ts`
- card visual e semantica de parcela de `src/modules/kanban/components/parcelas/installment-card.tsx`
- resumo atual de parcelas em `src/modules/kanban/components/lead-parcelas-tab.tsx`

### Refatoracoes DRY recomendadas antes ou junto

Criar util compartilhado do dominio financeiro, por exemplo:

```text
src/lib/financeiro/parcelas.ts
```

Conteudo sugerido:

- `computarStatusParcela(parcela)`
- `computarStatusParcelas(parcelas)`
- `somarValorParcelas(parcelas)`
- `calcularResumoParcelas(parcelas)`
- `agruparParcelasPorStatus(parcelas)`
- `formatarAbaRecebimentosParaStatus(aba)`

Assim o drawer e o novo modulo passam a usar a mesma regra de negocio.

## Permissoes e seguranca

### Regra final desejada

- Drawer de parcelas do lead: `EMPRESA` e `GERENTE` acessam conforme escopo do lead.
- Modulo `recebimentos`: apenas `EMPRESA`.

### Ajustes necessarios

#### 1. Modulo novo

- usar `withPerfis(request, ["EMPRESA"], ...)` ou `podeGerenciarEmpresa(sessao)` na API de recebimentos
- bloquear server page para qualquer perfil diferente de `EMPRESA`
- esconder item da sidebar para `GERENTE` e `COLABORADOR`

#### 2. Drawer/API atual de parcelas

Mesmo mantendo `GERENTE` no drawer, as rotas atuais precisam ficar consistentes com escopo por perfil.

Hoje o risco e:

- `GET /api/parcelas` aceita qualquer usuario autenticado da empresa
- `PATCH /api/parcelas/[id]/pagar` nao valida escopo do lead

Plano de endurecimento:

- em `src/app/api/parcelas/route.ts`, usar `whereLeadsPorPerfil(sessao)` quando houver listagem por lead
- se houver `tab` agregado, permitir apenas `EMPRESA`
- em `src/app/api/parcelas/[id]/pagar/route.ts`, buscar a parcela junto do lead e validar acesso pelo mesmo escopo

## UX proposta

### Hero do modulo

Topo com `ModulePageHeader` e mensagem forte de valor:

- titulo: `Recebimentos`
- subtitulo: `Acompanhe o que entrou, o que vence e o que exige acao agora.`
- badges: periodo ativo, total de parcelas monitoradas, status do filtro

### KPIs principais

Bloco com 4 cards:

1. `Recebido no periodo`
2. `Previsto a receber`
3. `Em atraso`
4. `Taxa de adimplencia`

Detalhes visuais:

- `emerald` para recebido
- `blue/cyan` para previsto
- `rose` para atraso
- `amber` para alertas operacionais

### Linha de filtros

Filtros compactos em card proprio:

- busca por nome/telefone
- periodo
- PDV
- responsavel
- faixa de valor
- botao `Limpar filtros`

UX importante:

- filtros sempre visiveis no desktop
- no mobile, colapsar em drawer/sheet
- atualizar lista sem recarregar pagina

### Abas operacionais

Abas principais com contadores:

- `Todos`
- `Recebidos`
- `A vencer`
- `Atrasados`

Cada aba muda:

- ordem padrao
- destaque visual
- empty state contextual

### Grafico e visuais

Layout de encantamento recomendado:

- lado esquerdo: barras de `recebido vs previsto por periodo`
- lado direito: donut de distribuicao por status

Observacao:

- pode reaproveitar `recharts`, ja usado em `src/components/grafico-vendas.tsx`
- nao precisa exagerar; 2 graficos bons bastam

### Tabela principal

Tabela desktop com colunas:

- lead
- parcela
- vencimento
- pagamento
- valor
- status
- PDV
- responsavel
- acao

Acoes da linha:

- `Abrir lead`
- `Ver no Kanban`
- opcional futuro: `Marcar como pago` apenas se fizer sentido para `EMPRESA`

### Lista mobile

Card por recebimento com:

- nome do lead
- numero da parcela
- valor
- status
- vencimento/pagamento
- CTA para abrir lead

## Design direction para encantar

Visual sugerido: `painel executivo comercial`, nao `financeiro burocratico`.

- base clara em `slate`
- areas de destaque com gradientes suaves de `emerald`, `cyan` e `amber`
- cards com brilho sutil, sem ficar chamativo demais
- tipografia forte nos numeros e mais leve nos metadados
- microanimacoes apenas em carregamento, progresso e hover

Sensacao desejada:

- rapido de escanear em 10 segundos
- bonito o bastante para demonstracao comercial
- pratico o bastante para usar todo dia

## Blueprint de arquivos

### 1. Rota

```text
src/app/(dashboard)/recebimentos/page.tsx
```

### 2. Sidebar

```text
src/components/sidebar-principal.tsx
```

Adicionar item apenas quando `sessao.perfil === "EMPRESA"`.

### 3. API

```text
src/app/api/recebimentos/route.ts
```

### 4. Dominio compartilhado

```text
src/lib/financeiro/parcelas.ts
src/lib/api/recebimentos.ts
```

### 5. Modulo

```text
src/modules/recebimentos/index.ts
src/modules/recebimentos/page.tsx
src/modules/recebimentos/types.ts
src/modules/recebimentos/hooks/use-recebimentos-module.ts
src/modules/recebimentos/components/recebimentos-header.tsx
src/modules/recebimentos/components/recebimentos-kpis.tsx
src/modules/recebimentos/components/recebimentos-filters.tsx
src/modules/recebimentos/components/recebimentos-tabs.tsx
src/modules/recebimentos/components/recebimentos-chart-card.tsx
src/modules/recebimentos/components/recebimentos-status-donut.tsx
src/modules/recebimentos/components/recebimentos-table.tsx
src/modules/recebimentos/components/recebimentos-mobile-list.tsx
src/modules/recebimentos/components/recebimentos-empty-state.tsx
```

## Fluxo da tela

### Estado padrao

- header com contexto
- KPIs
- graficos
- filtros
- abas
- tabela/lista

### Estado carregando

- skeleton nos cards
- loader na tabela
- preservacao do header para evitar layout jump

### Estado vazio geral

Mensagem exemplo:

`Ainda nao ha recebimentos suficientes para analise. Assim que as parcelas forem geradas e pagas, este painel comeca a ganhar vida.`

### Estado vazio por aba

- `Recebidos`: nenhum pagamento no periodo
- `A vencer`: nenhuma parcela futura no filtro atual
- `Atrasados`: parabens, nao ha parcelas vencidas em aberto

### Estado de erro

- `InlineStatusAlert` no topo do conteudo
- CTA para tentar novamente

## Ordenacao e inteligencia operacional

Ordenacao padrao por aba:

- `Atrasados`: vencimento mais antigo primeiro
- `A vencer`: vencimento mais proximo primeiro
- `Recebidos`: pagamento mais recente primeiro
- `Todos`: atraso mais critico primeiro, depois vencimento

Insights simples que geram valor rapido:

- quantidade de parcelas vencendo nos proximos 7 dias
- percentual do previsto que ja entrou
- top 5 leads com maior valor em aberto
- comparativo do periodo atual vs anterior

## Sequencia de implementacao sugerida

1. criar util compartilhado de parcelas
2. endurecer permissao das rotas de parcelas atuais
3. criar endpoint `api/recebimentos`
4. criar `lib/api/recebimentos.ts`
5. criar modulo `src/modules/recebimentos`
6. adicionar rota dashboard
7. adicionar item na sidebar
8. ligar KPIs, filtros, graficos e tabela
9. validar responsividade
10. rodar lint e build

## Criterios de pronto

- modulo aparece na sidebar apenas para `EMPRESA`
- URL direta bloqueia perfis sem acesso
- drawer continua funcionando para `EMPRESA` e `GERENTE`
- nenhuma regra de status fica duplicada entre drawer e modulo
- lista agregada mostra recebimentos de todos os leads da empresa
- UX funciona bem em desktop e mobile
- lint e build verdes

## Recomendacao final

Implementar o modulo como uma experiencia premium de leitura consolidada, nao como uma segunda tela de cadastro.

O brilho do modulo vem de 3 coisas:

- reaproveitar corretamente o dominio de parcelas
- mostrar sinais visuais fortes de performance financeira
- dar poder de decisao em poucos segundos para o administrador
