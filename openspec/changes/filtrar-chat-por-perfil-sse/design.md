## Context

O sistema de SSE (Server-Sent Events) do chat usa um mapa global em memória (`globalThis.__whatsappChatRealtimeState`) para gerenciar canais de polling. Cada canal é identificado por uma chave string e contém um `carregarSnapshot` (closure) + lista de `subscribers`. Quando um novo assinante se conecta com uma chave já existente, o canal é reutilizado — e com ele o `carregarSnapshot` do primeiro assinante, cuja closure capturou a `SessaoToken` original.

Atualmente, a chave do canal de conversas é:

```
conversation-list:<idEmpresa>:<busca>:<naoLidas?>:<limite>
```

Isso significa que usuários distintos da mesma empresa, com os mesmos parâmetros de busca, compartilham o mesmo canal. O primeiro a conectar define qual sessão será usada para filtrar os dados de TODOS os assinantes subsequentes.

A filtragem de leads por perfil no `obterSnapshotConversas` (linhas 391-411 de `whatsapp-chat-realtime.ts`) está correta — o problema é que o canal errado a executa com a sessão errada.

## Goals / Non-Goals

**Goals:**
- Isolar o canal SSE de conversas por usuário, garantindo que cada um receba apenas os dados filtrados por sua própria sessão
- Mudança mínima e localizada, sem alterar a lógica de filtragem existente

**Non-Goals:**
- Alterar a filtragem de leads (`obterSnapshotConversas`, `whereLeadsPorPerfil`)
- Alterar o canal de mensagens individuais (`chat:<empresa>:<instancia>:<leadId>`) — este já é isolado por lead
- Incluir transferências pendentes na listagem de conversas do chat (confirmado como desnecessário)

## Decisions

### Decisão 1: Incluir `id_usuario` na chave do canal

A chave passa de:

```
conversation-list:<idEmpresa>:<busca>:<naoLidas?>:<limite>
```

Para:

```
conversation-list:<idEmpresa>:<idUsuario>:<busca>:<naoLidas?>:<limite>
```

**Alternativa considerada:** Injetar a sessão correta em cada polling em vez de criar canais separados.

Rejeitada porque exigiria refatorar o sistema de canais para armazenar a sessão por subscriber (não por canal), aumentando a complexidade e o risco. A abordagem de canais por usuário é mais simples e alinhada ao modelo existente.

**Alternativa considerada:** Passar `perfil` + `id_usuario` como query params no frontend, em vez de depender da sessão.

Rejeitada porque viola o princípio de segurança — o frontend nunca deve ditar o que o backend filtra. A sessão (cookie) é a fonte de verdade.

### Decisão 2: Manter `busca` + `naoLidas` na chave

A busca e o filtro de não lidas permanecem na chave. Isso significa que se o mesmo usuário abrir duas abas com buscas diferentes, cada aba terá seu próprio canal. Comportamento existente, mantido.

### Decisão 3: Não usar hash do perfil na chave

Apenas `id_usuario` é suficiente. O perfil (`COLABORADOR`, `GERENTE`, `EMPRESA`) é uma propriedade derivada do usuário na sessão — não varia independentemente. Incluí-lo seria redundante.

## Risks / Trade-offs

**[Risco: mais canais em memória]** Com `id_usuario` na chave, cada usuário terá seu próprio canal em vez de compartilhar um por empresa. Para uma empresa com 50 usuários simultâneos no chat, são 50 canais em vez de 1.

→ **Mitigação:** O impacto é desprezível. Cada canal é um objeto leve (~100 bytes + 1 timer) e a limpeza automática já existe (canais sem subscribers são removidos). Além disso, o comportamento atual já era incorreto — o número de canais "corretos" sempre deveria ter sido este.

**[Risco: canais existentes com chave antiga]** Após o deploy, canais criados com a chave antiga continuarão ativos até que todos os subscribers se desconectem. Durante essa janela, novos assinantes (com chave nova) terão canais isolados, mas assinantes antigos (com chave velha) ainda compartilhariam.

→ **Mitigação:** Janela de transição é de no máximo 10 segundos (pollMs do canal de conversas). Subscribers antigos desconectam naturalmente. Em um deploy com reinicialização do servidor, todos os canais em memória são destruídos — migração instantânea.
