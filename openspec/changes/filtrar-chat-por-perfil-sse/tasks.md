## 1. Ajustar chave do canal SSE

- [x] 1.1 Alterar `criarChaveConversasStream` em `src/lib/whatsapp-chat-realtime.ts` para receber e incluir `idUsuario` na chave
- [x] 1.2 Atualizar a rota `src/app/api/whatsapp/chat/conversations/stream/route.ts` para passar `sessao.id_usuario` na chamada

## 2. Validação

- [x] 2.1 Executar `pnpm lint` e garantir zero erros
- [x] 2.2 Executar `pnpm build` e garantir build limpa
