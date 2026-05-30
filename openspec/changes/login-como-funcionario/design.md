## Context

Atualmente o CRM não oferece mecanismo de impersonação. Testar fluxos com perfis restritos (GERENTE, COLABORADOR) exige ciclo completo de logout → login com credenciais do funcionário alvo. O sistema já possui:

- **Sessão JWT** armazenada em cookie httpOnly `crm_consorcio_sessao`, com payload `{ id_usuario, id_empresa, perfil, id_pdv }`
- **Login normal** em `POST /api/autenticacao/login` que valida email+senha, mapeia cargo para perfil e cria token
- **Módulo Equipe** (`/equipe`) que lista funcionários com permissões segregadas: EMPRESA vê todos, GERENTE vê só do seu PDV
- **Tabela AuditoriaEquipe** que já registra ações como `INATIVAR_FUNCIONARIO`, `ATIVAR_FUNCIONARIO`, `ATUALIZAR_CARGO_FUNCIONARIO` com campo `acao` livre (string)
- **Guard de perfil** via `exigirSessao()` + `podeGerenciarEmpresa()` em `src/lib/permissoes.ts`

O ponto de integração natural é a tela de equipe: o admin já vê todos os funcionários e já tem os dados necessários (id, nome, cargo, PDV) para disparar a impersonação.

## Goals / Non-Goals

**Goals:**
- Permitir que EMPRESA assuma a sessão de qualquer funcionário ativo da mesma empresa sem senha
- Registrar toda impersonação na tabela `AuditoriaEquipe` para rastreabilidade
- Fornecer feedback visual (loading spinner, toast de erro/sucesso) na UI
- O admin volta à própria conta via logout + login normal (sem botão "voltar" nesta iteração)

**Non-Goals:**
- Botão "voltar para admin" dentro da sessão impersonada (complexidade de token adicional)
- Impersonação entre empresas diferentes (bloqueado por verificação de `id_empresa`)
- Impersonação por GERENTE ou COLABORADOR (restrito a EMPRESA)
- Indicador visual de "você está logado como X" durante a sessão impersonada (pode ser adicionado depois)
- Login como empresa (admin → admin): o admin já está como EMPRESA, impersonar outro ADMINISTRADOR resulta no mesmo perfil

## Decisions

### Decisão 1: Rota sob `/api/autenticacao/login-como` (não `/api/dev/`)

**Alternativa considerada:** Colocar sob `/api/dev/login-como` seguindo o padrão do `whatsapp-exporter`.

**Decisão:** Colocar sob `/api/autenticacao/`. Razões:
- A ação é autenticação (troca de sessão), não ferramenta de desenvolvimento
- Já existe `login` e `logout` em `/api/autenticacao/` — `login-como` é semanticamente parte desse grupo
- Não há necessidade de senha dev (`ModalSenhaDev`) — a própria sessão EMPRESA é a autoridade
- A rota fica naturalmente documentada junto dos outros endpoints de autenticação

### Decisão 2: Token JWT puro, sem campo `impersonado_por`

**Alternativa considerada:** Adicionar campo `impersonado_por: string` ao payload do JWT para distinguir sessão impersonada de sessão normal.

**Decisão:** Não adicionar. Razões:
- Adiciona complexidade sem ganho imediato: a auditoria já registra quem impersonou
- O admin volta à própria conta via logout → login normal (fluxo simples e conhecido)
- Evita modificar o tipo `SessaoToken` e todos os lugares que o consomem
- Pode ser adicionado futuramente se houver demanda por botão "voltar para admin"

### Decisão 3: Validação Zod no payload da API

**Decisão:** Usar Zod para validar `{ id_funcionario: string }` seguindo o padrão do projeto (`src/lib/validacoes.ts`). O esquema `esquemaLoginComo` valida que `id_funcionario` é string não-vazia.

### Decisão 4: Botão com ícone `LogIn` (Lucide) na coluna Ações

**Alternativa considerada:** Ícone `UserCog`, `ArrowRightLeft`, ou texto puro.

**Decisão:** Ícone `LogIn` do Lucide com tooltip "Login como". É o ícone mais universal para "assumir sessão". Na versão mobile, um botão pequeno com o mesmo ícone no canto do card.

### Decisão 5: Recarregar a página com `window.location.reload()`

**Alternativa considerada:** `router.push('/resumo')` ou `router.refresh()`.

**Decisão:** `window.location.reload()`. O cookie httpOnly é lido pelo servidor no layout raiz — um hard reload garante que o servidor leia o novo cookie e renderize o layout com a sessão correta. Um `router.refresh()` pode não propagar corretamente o cookie recém-setado em todos os casos.

## Data Model

Sem alterações no schema Prisma. A tabela `AuditoriaEquipe` existente já suporta o registro:

```prisma
model AuditoriaEquipe {
  // ... campos existentes
  acao                String   // "LOGIN_COMO_FUNCIONARIO" será o valor usado
  id_funcionario_alvo String   // ID do funcionário sendo impersonado
  autor_tipo          String   // "EMPRESA"
  autor_id            String   // ID do admin que disparou a impersonação
}
```

## API Contract

### `POST /api/autenticacao/login-como`

**Request Body:**
```json
{
  "id_funcionario": "uuid-do-funcionario"
}
```

**Response 200 (sucesso):**
```json
{
  "ok": true,
  "perfil": "COLABORADOR",
  "nome": "João Silva"
}
```

**Response 400 (validação):**
```json
{
  "erro": "id_funcionario obrigatório"
}
```

**Response 403 (sem permissão):**
```json
{
  "erro": "Sem permissao."
}
```

**Response 404 (não encontrado):**
```json
{
  "erro": "Funcionario inativo ou nao encontrado."
}
```

Set-Cookie: `crm_consorcio_sessao=<novo-jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`

## Risks / Trade-offs

- **[Risco] Admin pode impersonar e realizar ações maliciosas como se fosse o funcionário** → Mitigação: auditoria registra EXATAMENTE quem disparou a impersonação (`autor_id`). Em caso de auditoria forense, o rastro está preservado.
- **[Risco] Cookie sobrescrito — admin perde a própria sessão** → Mitigação: isso é intencional e documentado. O admin faz logout e login normal para retomar. Uma melhoria futura pode adicionar botão "voltar".
- **[Risco] Concorrência: admin abre duas abas e impersona em uma delas** → Mitigação: o cookie é compartilhado entre abas. O refresh na segunda aba também refletirá a nova sessão. Comportamento aceitável para ferramenta de QA/dev.
