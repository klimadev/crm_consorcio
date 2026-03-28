# Bug da Sidebar com Usuario sem Nome

Symptom: na sidebar, o bloco do usuario pode aparecer como `Sem nome` e com cargo/perfil inconsistente, especialmente quando o login e feito com conta `EMPRESA`.

Cause: o fluxo atual mistura duas fontes diferentes. O token de sessao de `EMPRESA` salva `id_usuario` como `empresa.id` em `src/app/api/autenticacao/login/route.ts`, mas `obterDadosUsuarioLogado()` em `src/lib/autenticacao.ts` tenta buscar sempre esse id em `prisma.funcionario`. Quando o perfil logado e `EMPRESA`, essa consulta falha, `dadosUsuario` vira `null` e a sidebar cai no fallback `Sem nome`. Alem disso, o cargo exibido mistura `funcionario.cargo` com `sessao.perfil`, o que pode gerar texto incorreto para o papel real do usuario no sistema.

Fix: ajustar `obterDadosUsuarioLogado()` para tratar cada origem corretamente. Se `sessao.perfil === "EMPRESA"`, buscar em `prisma.empresa` usando `sessao.id_usuario` e retornar `nome`, `email`, `nomeEmpresa` e cargo normalizado como `Administrador`. Para `GERENTE` e `COLABORADOR`, continuar buscando em `prisma.funcionario`, mas normalizar o cargo exibido a partir de `sessao.perfil` para manter consistencia visual com o RBAC real. Se ainda aparecer `Sem nome`, verificar se a sessao em cookie foi gerada com os ids corretos e se o layout dashboard realmente recebe `dadosUsuario` valido de `obterDadosUsuarioLogado()`.

Prevention: nao assumir que todo `id_usuario` da sessao referencia `funcionario`. A camada de autenticacao precisa respeitar a entidade de origem do perfil logado. Sempre que o sistema suportar login por tipos diferentes de ator (`empresa`, `funcionario`, etc.), a resolucao de identidade deve ser orientada por `sessao.perfil` ou por um campo explicito de tipo de usuario no token.

Reference: `src/app/api/autenticacao/login/route.ts`, `src/lib/autenticacao.ts`, `src/components/sidebar-principal.tsx`, `src/app/(dashboard)/layout.tsx`
