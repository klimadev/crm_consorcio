## 1. API — Rota de impersonação

- [x] 1.1 Adicionar schema Zod `esquemaLoginComo` em `src/lib/validacoes.ts` validando `{ id_funcionario: string }` (não-vazio, formato uuid)
- [x] 1.2 Criar `src/app/api/autenticacao/login-como/route.ts` com handler `POST`
- [x] 1.3 Implementar `POST`: validar sessão com `exigirSessao()`; retornar 403 se perfil não for `EMPRESA`; validar body com `esquemaLoginComo`; buscar funcionário por id com `prisma.funcionario.findUnique` validando mesma empresa (`id_empresa === auth.sessao.id_empresa`) e `ativo === true`; retornar 404 se não encontrado ou inativo
- [x] 1.4 Mapear `cargo` para `perfil` usando mesma lógica do login normal (`ADMINISTRADOR → EMPRESA`, demais → como estão)
- [x] 1.5 Criar token JWT via `criarTokenSessao` com `id_usuario: funcionario.id`, `id_empresa: funcionario.id_empresa`, `perfil` mapeado, `id_pdv: funcionario.id_pdv`
- [x] 1.6 Setar cookie via `definirCookieSessao` e retornar `{ ok: true, perfil, nome: funcionario.nome }`
- [x] 1.7 Registrar auditoria: `prisma.auditoriaEquipe.create` com `acao: "LOGIN_COMO_FUNCIONARIO"`, `id_funcionario_alvo: id_funcionario`, `autor_tipo: "EMPRESA"`, `autor_id: auth.sessao.id_usuario`

## 2. Módulo Equipe — Hook e Tipos

- [x] 2.1 Adicionar `loginComoLoading: string | null` e `loginComo: (id: string) => Promise<void>` ao type `UseEquipeModuleReturn` em `types.ts`
- [x] 2.2 No hook `use-equipe-module.ts`: adicionar estado `const [loginComoLoading, setLoginComoLoading] = useState<string | null>(null)`
- [x] 2.3 Implementar função `loginComo` que faz `fetch("/api/autenticacao/login-como", { method: "POST", body: JSON.stringify({ id_funcionario: id }) })`, trata resposta (sucesso → `window.location.reload()`, erro → toast), e gerencia `loginComoLoading`
- [x] 2.4 Incluir `loginComo` e `loginComoLoading` no objeto de retorno do hook

## 3. Módulo Equipe — UI Desktop

- [x] 3.1 Importar ícone `LogIn` do Lucide em `equipe-desktop-table.tsx`
- [x] 3.2 Adicionar `<TableCell className=\"text-right\">` correspondente ao `<TableHead className=\"text-right\">Ações</TableHead>` já existente
- [x] 3.3 Renderizar botão com ícone `LogIn` condicionado a `vm.podeGerenciarEmpresa`
- [x] 3.4 Botão deve mostrar `Loader2` com `animate-spin` quando `vm.loginComoLoading === funcionario.id`, e ficar desabilitado
- [x] 3.5 Botão deve ter `title="Login como"` e `aria-label="Login como ${funcionario.nome}"` para acessibilidade

## 4. Módulo Equipe — UI Mobile

- [x] 4.1 Importar ícones `LogIn` e `Loader2` do Lucide em `equipe-mobile-list.tsx`
- [x] 4.2 Adicionar botão de ícone em cada card, condicionado a `vm.podeGerenciarEmpresa`, posicionado no canto superior direito ou inferior do card
- [x] 4.3 Mesmo comportamento de loading/disabled do desktop

## 5. Validação e Testes

- [x] 5.1 Executar `pnpm lint` e corrigir eventuais erros — erros são pré-existentes (não dos nossos arquivos)
- [x] 5.2 Executar `pnpm build` e garantir que não há erros de compilação TypeScript — build OK, rota `/api/autenticacao/login-como` registrada
- [ ] 5.3 Verificar manualmente: admin loga como COLABORADOR de PDV diferente e valida que permissões se aplicam corretamente
- [ ] 5.4 Verificar manualmente: admin loga como GERENTE e valida que filtros do kanban/equipe respeitam o PDV do gerente
- [ ] 5.5 Verificar que registro de auditoria aparece corretamente no banco após impersonação
- [ ] 5.6 Verificar cenários de borda: funcionário inativo, id inválido, GERENTE/COLABORADOR tentando acessar a rota diretamente
