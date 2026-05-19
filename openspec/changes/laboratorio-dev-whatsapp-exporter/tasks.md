## 1. Evolution API — Nova funcao de busca de mensagens por chat

- [x] 1.1 Adicionar tipo `EvolutionChatMessage` em `src/lib/evolution-api.ts` com campos: `remoteJid`, `pushName`, `messageType`, `messageText` (ou `conversation`), `messageTimestamp`, `fromMe`
- [x] 1.2 Implementar `buscarMensagensPorChat(instanceName: string, remoteJid: string, limite: number)` que consulta `POST /chat/findMessages/{instanceName}` com filtro `where.key.remoteJid`, paginando se necessario, filtrando grupos e `status@broadcast`
- [x] 1.3 Tratar erros da Evolution API (instancia offline, timeout) com mensagens descritivas

## 2. Validacao — Schema Zod para exportacao

- [x] 2.1 Adicionar `esquemaExportarWhatsapp` em `src/lib/validacoes.ts`: `{ instanceIds: z.array(z.string().uuid()).min(1), chatLimit: z.number().int().min(1).max(1000), messagesPerChat: z.number().int().min(1).max(100) }`

## 3. Sidebar — Secao DESENVOLVIMENTO e modal de senha

- [x] 3.1 Adicionar secao `DESENVOLVIMENTO` no array `secoes` do `sidebar-principal.tsx` com item "Laboratorio" (icone `FlaskConical`, badge `DEV`, cor `text-amber-500`)
- [x] 3.2 Criar componente `ModalSenhaDev` em `src/components/modal-senha-dev.tsx` usando Dialog do Shadcn, com campo de senha, validacao contra `NEXT_PUBLIC_DEV_PASSWORD`, animacao de shake no erro
- [x] 3.3 Integrar `ModalSenhaDev` no `sidebar-principal.tsx`: ao clicar no item Laboratorio, abrir modal em vez de navegar; ao acertar senha, usar `router.push("/laboratorio")`

## 4. Modulo Laboratorio — Estrutura MVVM

- [x] 4.1 Criar `src/modules/laboratorio/types.ts` com tipos `LaboratorioFeature` (id, nome, descricao, icone, href)
- [x] 4.2 Criar `src/modules/laboratorio/hooks/use-laboratorio.ts` como ViewModel que gerencia lista de features disponiveis
- [x] 4.3 Criar `src/modules/laboratorio/page.tsx` como shell que renderiza a feature ativa baseada na URL ou um grid de features
- [x] 4.4 Criar `src/modules/laboratorio/index.ts` exportando `ModuloLaboratorio`

## 5. Pagina e rota do Laboratorio

- [x] 5.1 Criar `src/app/(dashboard)/laboratorio/page.tsx` chamando `obterSessaoNoServidor()`, redirecionando para `/login` se nao autenticado, renderizando `ModuloLaboratorio`

## 6. Modulo WhatsApp Exporter — Estrutura MVVM

- [x] 6.1 Criar `src/modules/laboratorio/whatsapp-exporter/types.ts` com tipos: `WhatsappExporterState` (instances, selectedIds, config, resultados, loading), `ExportConfig` (chatLimit, messagesPerChat), `ExportResultado` (instanceId, status, dump, stats, erro)
- [x] 6.2 Criar `src/modules/laboratorio/whatsapp-exporter/hooks/use-whatsapp-exporter.ts` como ViewModel: busca instancias via `GET /api/whatsapp/instances`, gerencia selecao e configuracao, chama `POST /api/dev/whatsapp-exporter`, trata loading/erro/sucesso
- [x] 6.3 Criar `src/modules/laboratorio/whatsapp-exporter/components/instancia-selector.tsx`: grid de cards com checkbox, foto, nome, telefone, status (online/offline), selecao multipla com contador
- [x] 6.4 Criar `src/modules/laboratorio/whatsapp-exporter/components/export-config.tsx`: inputs numericos para chatLimit e messagesPerChat, botao "Exportar Chats" com loader e desabilitacao
- [x] 6.5 Criar `src/modules/laboratorio/whatsapp-exporter/components/resultado-dump.tsx`: secao expansivel com nome da instancia, stats, dump em `<pre>` com scroll, botoes Copiar (toast) e Download .txt
- [x] 6.6 Criar `src/modules/laboratorio/whatsapp-exporter/page.tsx` como componente principal que compoe os subcomponentes acima
- [x] 6.7 Criar `src/modules/laboratorio/whatsapp-exporter/index.ts` exportando o componente publico
- [x] 6.8 Integrar WhatsApp Exporter como primeira feature no `ModuloLaboratorio` (page.tsx)

## 7. API Route — Endpoint de exportacao

- [x] 7.1 Criar `src/app/api/dev/whatsapp-exporter/route.ts` com handler `POST`: validar sessao com `exigirSessao`, validar payload com `esquemaExportarWhatsapp`, verificar acesso do usuario a cada instancia (EMPRESA: todas da empresa; GERENTE/COLABORADOR: apenas instancia do PDV), para cada instancia: obter `instance_name` do banco, buscar contatos via `buscarContatos`, para cada contato buscar mensagens via `buscarMensagensPorChat`, formatar dump, retornar array de resultados
- [x] 7.2 Criar funcao auxiliar `formatarDumpWhatsapp(nomeInstancia, contatos, mensagensPorChat)` que gera o texto formatado conforme especificacao (headers, chats, timestamps, marcadores de midia)

## 8. Estados de borda e UX

- [x] 8.1 Estado vazio: nenhuma instancia disponivel — mensagem informativa
- [x] 8.2 Estado de loading: botao desabilitado com `Loader2` animado, texto "Exportando..."
- [x] 8.3 Estado de erro: instancia offline — card de resultado com status "Erro" e mensagem descritiva em vermelho
- [x] 8.4 Estado de erro: falha na API — toast de erro generico, log no console
- [x] 8.5 Download: nome do arquivo `whatsapp-export-{instanceName}-{YYYY-MM-DD}.txt`
- [x] 8.6 Copiar: usar `navigator.clipboard.writeText()` com toast "Copiado!" via hook de toast existente
