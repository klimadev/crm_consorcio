## Why

Testar funcionalidades com perfis diferentes (GERENTE, COLABORADOR) exige deslogar, decorar senhas de funcionários e logar manualmente — um ciclo lento e quebradiço que penaliza QA e debugging. O administrador (perfil EMPRESA) já tem acesso total aos dados; permitir que ele assuma temporariamente a sessão de qualquer funcionário, sem senha, elimina esse atrito sem abrir brecha de segurança: a sessão EMPRESA original é a prova de autoridade.

## What Changes

- Nova rota API `POST /api/autenticacao/login-como` — recebe `id_funcionario`, valida permissão EMPRESA e mesma empresa, cria token JWT do funcionário alvo e sobrescreve o cookie de sessão
- Registro de auditoria (`AuditoriaEquipe`) a cada impersonação com acao `LOGIN_COMO_FUNCIONARIO`
- Botão "Login como" na tabela desktop e lista mobile do módulo `/equipe`, visível apenas quando `perfil === "EMPRESA"`
- Hook `useEquipeModule` ganha função `loginComo` e estado de loading para feedback visual
- Type `UseEquipeModuleReturn` estendido com os novos campos

## Capabilities

### New Capabilities

- `login-como-funcionario`: Impersonação de sessão — administrador assume a sessão de qualquer funcionário da empresa diretamente da tela de equipe, sem exigir senha do alvo.

### Modified Capabilities

<!-- Nenhuma capability existente é modificada — este é um recurso novo. -->

## Impact

- **API**: nova rota `POST /api/autenticacao/login-como` com validação Zod e guard EMPRESA
- **Módulo Equipe**: `use-equipe-module.ts` (hook), `equipe-desktop-table.tsx` (tabela), `equipe-mobile-list.tsx` (lista mobile), `types.ts` (tipagens)
- **Permissões**: apenas EMPRESA pode usar; a rota API verifica `perfil === "EMPRESA"` + `id_empresa` do alvo
- **Segurança**: cookie httpOnly, mesma empresa, auditoria registrada, sem alteração no schema do banco
