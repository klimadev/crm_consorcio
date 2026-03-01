# AI Implementation Brief - WhatsApp Chat MVP

Use this brief to implement the feature exactly as designed in `whatsapp-chat-architecture-plan/README.md`.

## Task

Implement a production-ready WhatsApp chat tab inside `LeadDetailsDrawer` with 5s polling, optimistic send, unread badge, and strict RBAC.

## Must-keep constraints

1. Do not break existing Kanban details behaviors (autosave, delete, pendencias, upload).
2. Keep tenant isolation (`id_empresa`) in all chat data access.
3. Reuse RBAC via `whereLeadsPorPerfil()`.
4. Never expose `EVOLUTION_API_KEY` to frontend.
5. Text-only MVP for now.

## Files and deliverables

### Add

- `src/components/ui/tabs.tsx`
- `src/lib/whatsapp-chat.ts`
- `src/app/api/whatsapp/chat/messages/route.ts`
- `src/app/api/whatsapp/chat/send-message/route.ts`
- `src/app/api/whatsapp/chat/mark-read/route.ts`
- `src/modules/whatsapp/hooks/use-whatsapp-chat.ts`
- `src/modules/whatsapp/components/chat/whatsapp-chat-panel.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-list.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-bubble.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-input.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-connection-badge.tsx`

### Modify

- `package.json` (add `@radix-ui/react-tabs`)
- `prisma/schema.prisma` (add `WhatsappMensagem` + relations)
- `src/lib/validacoes.ts` (chat payload schemas)
- `src/modules/kanban/components/lead-details-drawer.tsx` (Tabs integration + unread dot + remove wa.me button)
- `src/modules/whatsapp/types.ts` (or dedicated chat types file)

## API contracts to implement

### GET `/api/whatsapp/chat/messages?leadId=...`

Response:

```json
{
  "messages": [],
  "connectionStatus": "online|offline|unknown",
  "unreadCount": 0
}
```

Behavior:

- Auth + RBAC check.
- Find lead + resolve instance.
- Call Evolution `POST /chat/findMessages/{instance}`.
- Normalize and upsert DB messages.
- Return DB canonical list sorted ascending.
- If Evolution fails, return cached DB messages and offline status.

### POST `/api/whatsapp/chat/send-message`

Request:

```json
{
  "leadId": "...",
  "text": "...",
  "clientTempId": "temp-..."
}
```

Response:

```json
{
  "message": {},
  "clientTempId": "temp-..."
}
```

Behavior:

- Auth + RBAC check.
- Validate text.
- Call Evolution `POST /message/sendText/{instance}` with `{ number, text }`.
- Normalize and persist.
- Return canonical message to replace optimistic one.

### POST `/api/whatsapp/chat/mark-read`

Request:

```json
{ "leadId": "..." }
```

Behavior:

- Mark incoming DB messages as read (`lida_no_crm_em`).
- Best-effort call Evolution `markMessageAsRead`.

## Polling and memory-safety requirements

In `useWhatsappChat`:

- Use recursive `setTimeout` loop (single-flight polling).
- Use `AbortController` per request.
- Abort and cleanup on unmount / lead change / disable.
- Ignore stale responses using request sequence id.
- Poll every 5000ms when enabled.
- Support optimistic send with temp ids and reconciliation by `clientTempId`.

## UI requirements (must match)

Drawer tabs:

- Full-width `TabsList`.
- Triggers: `Detalhes`, `Chat WhatsApp`.
- Red pulsing dot when unread exists:
  - `w-2 h-2 rounded-full bg-red-500 animate-pulse`.

Chat panel (height `h-[500px]` or dynamic fill):

1. Header `bg-emerald-600`
   - left lead name white `font-semibold`
   - right status badge (emerald/red dot + white status text)
2. Body `bg-slate-50 overflow-y-auto scroll-smooth`
   - empty state icon + `Nenhuma mensagem ainda` in `text-slate-500`
   - incoming bubble: left, `bg-white shadow-sm rounded-2xl rounded-tl-none`
   - outgoing bubble: right, `bg-emerald-100 shadow-sm rounded-2xl rounded-tr-none`
   - text: `text-slate-800 text-sm`
   - meta: tiny timestamp + receipt icon
3. Footer sticky, `bg-white border-t border-slate-200`
   - rounded input container `bg-slate-100`
   - placeholder `Digite uma mensagem...`
   - focus ring `ring-2 ring-emerald-500`
   - circular send button with `hover:scale-105 active:scale-95`

Receipt icons:

- pending: clock
- sent: single gray check
- delivered: double gray checks
- read: double blue checks (`text-blue-500`)

## Edge cases to cover

- Lead not found/forbidden (404)
- Invalid phone for WhatsApp (400)
- No connected instance
- Evolution timeout/error (fallback cache on GET)
- Duplicate messages from polling (dedup/upsert)
- Out-of-order responses (ignore stale)
- Drawer close mid-request (abort)
- Send failure after optimistic render (mark error + retry)

## Acceptance checks

- Chat tab visual polish matches requested classes and behavior.
- Unread dot appears only when there are unread incoming messages.
- Polling stable at 5s with no leak.
- RBAC remains intact across all profiles.
- Existing drawer detail workflows remain working.
