# Constituição do Projeto: MC CRM Consórcio

**Contexto:** Este é um CRM multi-tenant focado na venda de consórcios. O sistema possui três perfis de acesso estritos: `EMPRESA` (Admin), `GERENTE` (gestão de um PDV específico) e `COLABORADOR` (vendedor/corretor).

A IA deve atuar como uma Desenvolvedora Sênior (Full Stack Next.js 15, React, TypeScript, Prisma, Tailwind). Ao gerar ou refatorar código, siga estritamente as regras abaixo. NUNCA desvie desta arquitetura sem perguntar antes.

## 1. Arquitetura Modular e Padrão MVVM (Frontend)
O projeto usa uma abordagem Feature-Sliced/Modular. O código não fica solto na pasta `app`.
- **Rotas (`src/app`):** Servem APENAS para roteamento e verificação inicial de sessão (`obterSessaoNoServidor`). Elas importam o módulo correspondente (ex: `<ModuloEquipe perfil={sessao.perfil} />`).
- **Módulos (`src/modules/[nome-do-modulo]`):** Toda a lógica de negócio visual vive aqui.
  - `page.tsx`: O componente principal do módulo. Ele NÃO deve ter estados complexos. Ele invoca o hook principal (ex: `const vm = useEquipeModule()`) e repassa o objeto `vm` (ViewModel) para os subcomponentes.
  - `hooks/use-[modulo].ts`: O "Cérebro" da tela. Contém todos os `useState`, `useEffect`, chamadas de API (`fetch`) e funções de manipulação. Retorna tipagens estritas definidas em `types.ts`.
  - `components/`: Componentes visuais burros ou semi-burros que recebem `vm` via props ou callbacks específicos.
  - `types.ts`: Tipagens isoladas do módulo.
  - `index.ts`: Exporta o módulo publicamente.

## 2. Regras de Backend e API Routes (Next.js 15)
- **Acesso assíncrono (Next 15):** Parâmetros dinâmicos (`params`) e `searchParams` DEVEM ser `await` (ex: `const { id } = await params;`).
- **Segurança:** Toda rota em `src/app/api/` DEVE começar invocando `await exigirSessao(request)`. Se a rota for restrita, verificar em seguida (ex: `if (!podeGerenciarEmpresa(auth.sessao)) return respostaSemPermissao();`).
- **Validação:** TODO e qualquer payload (`request.json()`) DEVE ser validado usando esquemas do `Zod` exportados de `src/lib/validacoes.ts`. Em caso de erro, retornar `NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 })`.
- **Banco de Dados (Prisma):** 
  - Mutações que envolvem mais de uma tabela ou dependem uma da outra DEVEM usar `prisma.$transaction`.
  - Nunca exclua fisicamente (hard delete) se houver impacto em histórico. Use soft deletes (`ativo: false`, `deleted_at: Date`) ou realocação (como no caso de `inativarFuncionario`).

## 3. Regras de UI, UX e Estilização
- **Tailwind & Utilitários:** Use `cn()` (`clsx` + `tailwind-merge`) localizado em `@/lib/utils` para condicional de classes.
- **Componentes Base:** Use os componentes da pasta `src/components/ui/` (baseados em Shadcn UI / Radix). Não crie botões ou inputs do zero sem usar `<Button>` ou `<Input>`.
- **Cores Oficiais:** `slate` (neutro), `emerald` (sucesso/ação principal), `rose` (erros/destrutivo), `amber` (alertas), `blue/cyan` (informações/destaques).
- **Feedback Visual:**
  - Ações de mutação devem desabilitar botões e mostrar `Loader2` (Lucide) rodando (`animate-spin`).
  - Ações otimistas (como adicionar item antes da API responder) devem envolver o item no componente `<OptimisticSync active={condicao}>`.
  - Notificações de sucesso/erro DEVEM usar o hook `useToast` ou mensagens renderizadas em tela com ícones claros (`AlertCircle`, `CheckCircle2`).

## 4. Regras de Negócio Específicas
- **Cargo x Perfil:** `ADMINISTRADOR` é um `cargo` de `Funcionario`, mas no login ele vira `perfil: EMPRESA`; nunca trate isso como um quarto perfil de acesso.
- **Equipe:** `GERENTE` pode adicionar somente `COLABORADOR` no próprio PDV; `EMPRESA` pode adicionar qualquer cargo em qualquer PDV.
- **Automação/WhatsApp:** Lógica de agendamento (`jobs`) exige uso de chaves de *idempotência* para evitar disparos duplicados. Se um lead muda de estágio, agendamentos antigos incompatíveis devem ser cancelados.
- **Pendências:** Nunca são salvas fixamente no banco, são calculadas "on the fly" em `src/lib/pendencias-dinamicas.ts` ou `calculo-pendencias.ts` baseado em regras de tempo (ex: `DIAS_ESTAGIO_PARADO`).
- **Telefones e Moeda:** Sempre use utilitários de máscara (`aplicaMascaraTelefoneBr`, `aplicaMascaraMoedaBr`) para exibição e `normalizarTelefoneParaWhatsapp` antes de enviar para a API (Evolution).

## 5. Fluxo de Pensamento da IA
Antes de gerar código:
1. Analise o contexto e os arquivos envolvidos.
2. Identifique se a mudança é no Banco, na API, no Hook (VM) ou na View.
3. Se o pedido for grande, crie um plano em Markdown e peça aprovação ANTES de escrever o código final.
4. Escreva código limpo, em português do Brasil (para variáveis, funções e comentários de negócio), seguindo estritamente as tipagens Typescript.

## Produção (systemd, substituiu PM2)
- **Verificar status:** `systemctl status crmconsorcio`
- **Ver logs:** `journalctl -u crmconsorcio -f`
- **Reiniciar:** `systemctl restart crmconsorcio`
- **Após build:** `pnpm build && systemctl restart crmconsorcio`

## 7. Diretrizes de Estilo de Código

### Importações
- Use `@/` para imports absolutos (configurado em tsconfig.json)
- Agrupe imports: 1) externas, 2) internas do projeto, 3) relativas
- Ordem alfabética dentro de cada grupo
- Evite imports duplicados ou não utilizados

### Formatação
- Use 2 espaços para identação (padrão do Prettier/ESLint)
- Máximo 100 caracteres por linha quando possível
- Use vírgula trailing em objetos e arrays multilinha
- Pontos e vírgulas obrigatórios

### Tipos e Interfaces
- Defina tipos em arquivos `types.ts` dentro de cada módulo
- Use interface para formas de objetos que podem ser estendidas
- Use type para tipos primitivos, unions, intersections e mapeamentos
- Nomeie interfaces com letra maiúscula inicial (ex: `IFuncionario`)
- Seja explícito com tipos, evite `any` quando possível

### Convenções de Nomenclatura
- **Componentes:** PascalCase (ex: `FuncionarioForm.tsx`)
- **Funções e variáveis:** camelCase (ex: `calcularSalario`)
- **Constantes:** UPPER_SNAKE_CASE (ex: `DIAS_ESTAGIO_PARADO`)
- **Arquivos:** kebab-case (ex: `funcionario-form.tsx`)
- **Pastas:** kebab-case
- **Hooks:** comece com `use` seguido de camelCase (ex: `useFuncionarioModule`)
- **API routes:** use estrutura RESTful em `src/app/api/[recurso]/route.ts`

### Tratamento de Erros
- API routes: sempre retornar respostas JSON estruturadas com `{ erro: "mensagem" }` ou dados
- Use try/catch em operações assíncronas
- Para erros esperados, retorne mensagens amigáveis ao usuário
- Erros inesperados devem ser logados (considere usar serviço de logging)
- Validações de entrada devem usar Zod e retornar 400 para dados inválidos

### Boas Práticas Adicionais
- Mantenha componentes pequenos e focados em uma única responsabilidade
- Prefira composição sobre herança
- Use React.memo para componentes que recebem props estáveis
- Implemente loading states e tratamento de vazios em listas
- Separe regras de negócio pura de componentes de UI
- Use variáveis de ambiente para configurações (arquivo .env.example)
- Comentários devem explicar o "porquê", não o "o que"
