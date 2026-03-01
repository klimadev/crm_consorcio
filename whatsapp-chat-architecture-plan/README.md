# WhatsApp Chat Architecture Plan (Kanban Lead Drawer)

## 1) Goal and scope

Build a production-ready WhatsApp Chat MVP inside `LeadDetailsDrawer` with:

- Radix `Tabs` replacing direct drawer content (`Detalhes` + `Chat WhatsApp`).
- 5-second polling strategy (no webhooks).
- Strict RBAC reuse from existing backend rules.
- Polished high-end SaaS UI matching the requested visual spec.
- Robust optimistic send with rollback/error handling and no polling leaks.

Out of scope for MVP:

- Media sending/rendering as first-class content (text-only first).
- Realtime websockets.
- Multi-conversation inbox outside lead drawer.

---

## 2) Current project constraints discovered

- Stack: Next.js App Router + TypeScript + Prisma + Tailwind v4 + Radix patterns.
- Kanban drawer entry point: `src/modules/kanban/components/lead-details-drawer.tsx`.
- Existing RBAC helper: `whereLeadsPorPerfil()` in `src/lib/permissoes.ts`.
- Existing phone normalization helper (preferred): `normalizarTelefoneParaWhatsapp()` in `src/lib/phone.ts`.
- Existing Evolution API utility already used for sending and instance checks in `src/lib/evolution-api.ts`.
- There is no local `Tabs` UI wrapper yet in `src/components/ui/`.
- `@radix-ui/react-tabs` is not currently listed in `package.json` dependencies.

---

## 3) Evolution API contract mapping (researched)

Reference docs used:

- `POST /chat/findMessages/{instance}`
- `POST /message/sendText/{instance}`
- `GET /instance/connectionState/{instance}`
- `POST /chat/markMessageAsRead/{instance}`

### 3.1 Find messages

Endpoint:

`POST /chat/findMessages/{instance}`

Required body:

```json
{
  "where": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  }
}
```

Useful optional fields:

```json
{
  "where": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "messageTimestamp": { "gte": 1699000000, "lte": 1699999999 }
  },
  "limit": 80
}
```

Important note:

- Response shape is not strongly documented in one canonical schema. Implementation must normalize safely and handle shape variance.

### 3.2 Send text

Endpoint:

`POST /message/sendText/{instance}`

Required body:

```json
{
  "number": "5511999999999",
  "text": "Ola!"
}
```

Optional body fields supported by API:

- `delay`
- `linkPreview`
- `mentionsEveryOne`
- `mentioned`
- `quoted`

Typical response fields:

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": { "text": "Ola!" }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

### 3.3 Connection status

Endpoint:

`GET /instance/connectionState/{instance}`

Typical response:

```json
{
  "instance": {
    "instanceName": "crm_xxx",
    "state": "open"
  }
}
```

Recommended UI mapping:

- `open` => online (`bg-emerald-400`)
- anything else (`close`, errors, timeout) => offline (`bg-red-500`)

### 3.4 Mark as read

Endpoint:

`POST /chat/markMessageAsRead/{instance}`

Body:

```json
{
  "readMessages": [
    {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5A1234567890"
    }
  ]
}
```

Use as best-effort sync only. Local CRM read state is still source of truth for red dot.

---

## 4) Canonical internal message model (app-level)

Create a normalized DTO used by API + hook + UI:

```ts
type ChatMessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "ERROR";

type WhatsappChatMessage = {
  id: string;                 // DB id or temp id
  messageId: string;          // Evolution key.id when available
  leadId: string;
  remoteJid: string;
  fromMe: boolean;
  direction: "incoming" | "outgoing";
  text: string;
  kind: "text" | "unsupported";
  status: ChatMessageStatus;
  timestamp: number;          // unix seconds
  createdAtIso: string;
  readAtIso: string | null;   // CRM read state for incoming
  optimistic: boolean;
  error: string | null;
};
```

Status mapping recommendation:

- Before server send resolves: `PENDING`.
- API raw status contains `READ` => `READ`.
- API raw status contains `DELIVER` => `DELIVERED`.
- API raw status contains `SENT` or `SERVER_ACK` => `SENT`.
- Unknown but outgoing persisted => `SENT` fallback.
- Send failure => `ERROR`.

---

## 5) Prisma schema update plan (`WhatsappMensagem`)

### 5.1 New model

Add to `prisma/schema.prisma`:

```prisma
model WhatsappMensagem {
  id                    String   @id @default(uuid())
  id_empresa            String
  id_lead               String
  id_whatsapp_instancia String

  mensagem_id           String
  remote_jid            String
  from_me               Boolean
  tipo                  String   @default("text")
  conteudo              String?
  status                String   @default("PENDING")
  timestamp             Int
  lida_no_crm_em        DateTime?
  erro                  String?
  payload_json          String?

  criado_em             DateTime @default(now())
  atualizado_em         DateTime @default(now()) @updatedAt

  lead                  Lead             @relation(fields: [id_lead], references: [id], onDelete: Cascade)
  instancia             WhatsappInstancia @relation(fields: [id_whatsapp_instancia], references: [id], onDelete: Cascade)

  @@unique([id_whatsapp_instancia, mensagem_id])
  @@index([id_empresa, id_lead, timestamp])
  @@index([id_empresa, id_lead, lida_no_crm_em])
  @@index([id_empresa, remote_jid])
}
```

### 5.2 Relation updates

Add relation arrays:

- In `Lead`: `whatsapp_mensagens WhatsappMensagem[]`
- In `WhatsappInstancia`: `mensagens WhatsappMensagem[]`

### 5.3 Why this schema

- Multi-tenant isolation with `id_empresa` in every query.
- Dedup guaranteed by `@@unique([id_whatsapp_instancia, mensagem_id])`.
- Efficient unread badge query via index on `lida_no_crm_em`.
- Keeps raw payload for debugging provider shape drifts.

---

## 6) Backend API architecture (Next.js routes)

### 6.1 Routes to create

- `src/app/api/whatsapp/chat/messages/route.ts` (GET)
- `src/app/api/whatsapp/chat/send-message/route.ts` (POST)
- `src/app/api/whatsapp/chat/mark-read/route.ts` (POST)

### 6.2 Shared server helpers to create

Recommended helper file:

- `src/lib/whatsapp-chat.ts`

Helpers:

- `buscarLeadComAcesso(sessao, leadId)`
- `resolverInstanciaDoLead(idEmpresa, leadId)`
- `normalizarRemoteJidParaLead(lead.telefone)`
- `normalizarMensagensEvolution(payload)`
- `mapearStatusMensagem(rawStatus)`
- `upsertMensagensNoBanco(tx, mensagensNormalizadas)`

### 6.3 GET /messages flow

1. `exigirSessao(request)`.
2. Validate query `leadId`.
3. Find lead with RBAC guard using `whereLeadsPorPerfil()` + `id`.
4. Resolve connected instance for company (or latest used for lead).
5. Build `remoteJid` from lead phone (`waNumber + "@s.whatsapp.net"`).
6. Call Evolution `POST /chat/findMessages/{instance}` with:

   ```json
   {
     "where": { "key": { "remoteJid": "...@s.whatsapp.net" } },
     "limit": 80
   }
   ```

7. Normalize response safely (shape-agnostic parser).
8. Filter only messages belonging to expected chat.
9. Persist with idempotent upsert in Prisma.
10. Fetch canonical messages from DB sorted ascending by `timestamp`.
11. Return:

    - `messages`
    - `connectionStatus`
    - `unreadCount` (`from_me=false AND lida_no_crm_em IS NULL`)

Failure policy:

- If Evolution call fails, return cached DB messages + `connectionStatus: "offline"`.

### 6.4 POST /send-message flow

Request body:

```json
{
  "leadId": "...",
  "text": "...",
  "clientTempId": "temp-..."
}
```

Flow:

1. `exigirSessao()`.
2. Validate body with zod (non-empty text, max length e.g. 4096).
3. RBAC lead check with `whereLeadsPorPerfil()`.
4. Resolve instance.
5. Normalize phone and call `POST /message/sendText/{instance}` with `{ number, text }`.
6. Normalize response into canonical message.
7. Upsert persisted message.
8. Return canonical message + `clientTempId` for optimistic reconciliation.

### 6.5 POST /mark-read flow

Body:

```json
{ "leadId": "..." }
```

Flow:

1. Auth + RBAC lead check.
2. Find unread incoming DB messages for lead.
3. Update `lida_no_crm_em = now()` in DB.
4. Best-effort call Evolution `markMessageAsRead` with message keys.
5. Return updated `unreadCount`.

---

## 7) RBAC guardrails (must not break)

Every chat route must include:

- Session required via `exigirSessao`.
- Lead access check via `whereLeadsPorPerfil(sessao)`.
- Company scoping in all Prisma queries (`id_empresa = sessao.id_empresa`).

Access matrix:

- `COLABORADOR`: only own leads (`id_funcionario = id_usuario`).
- `GERENTE`: leads from own PDV collaborators.
- `EMPRESA`: all company leads.

Never trust `leadId` from client without RBAC filter.

---

## 8) React hook architecture (polling + optimistic, leak-safe)

### 8.1 Hook file

- `src/modules/whatsapp/hooks/use-whatsapp-chat.ts`

### 8.2 Hook API

```ts
useWhatsappChat({
  leadId,
  enabled,          // drawer open + lead selected
  markReadEnabled,  // active tab is chat
  pollMs: 5000
})
```

Returns:

- `messages`
- `connectionStatus`
- `unreadCount`
- `loading`, `sending`, `error`
- `sendMessage(text)`
- `markRead()`
- `reload()`

### 8.3 Polling leak prevention checklist

Use all of the below (not just one):

1. Recursive `setTimeout` (not `setInterval`) to avoid overlapping requests.
2. `AbortController` for each request.
3. Abort in-flight request on unmount, lead change, or disable.
4. `isMountedRef` guard before `setState`.
5. `requestSeqRef` to drop stale/out-of-order responses.
6. Pause polling when `enabled=false`.
7. Optional visibility optimization (`document.visibilityState`): pause or backoff in hidden tab.

Pseudo pattern:

```ts
// on start: run fetchLoop once, then schedule next fetch in finally
// on cleanup: clearTimeout + abort controller + mountedRef=false
```

### 8.4 Optimistic send strategy

On `sendMessage(text)`:

1. Add optimistic outgoing message immediately with temp id and `PENDING`.
2. Call `/api/whatsapp/chat/send-message` with `clientTempId`.
3. On success: replace temp message by canonical server message.
4. On failure: mark that item as `ERROR` (do not silently drop), allow retry.

Merge strategy:

- Use stable message key preference: `messageId` first, fallback `id`.
- Dedupe while preserving latest status (`READ` > `DELIVERED` > `SENT` > `PENDING`).

---

## 9) UI architecture and pixel spec

### 9.1 Drawer tabs integration

In `lead-details-drawer.tsx`:

- Wrap content in `Tabs`.
- Full-width `TabsList` with two triggers:
  - `Detalhes`
  - `Chat WhatsApp`
- Add unread indicator dot on chat trigger when `unreadCount > 0`:

```html
<span className="ml-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
```

- Remove old `wa.me` button.

### 9.2 Chat panel layout (exact sections)

Container:

- `h-[500px]` minimum target (or responsive dynamic fill in drawer).
- `flex flex-col overflow-hidden rounded-xl border border-slate-200`.

Section A - Header:

- `bg-emerald-600 px-4 py-3`.
- Left: lead name in white `font-semibold`.
- Right: status dot + label in white.
- Dot color:
  - online => `bg-emerald-400`
  - offline => `bg-red-500`

Section B - Message list/body:

- `flex-1 bg-slate-50 overflow-y-auto scroll-smooth px-3 py-3`.
- Empty state centered with muted icon + `Nenhuma mensagem ainda` (`text-slate-500`).
- Incoming bubble:
  - left aligned
  - `bg-white shadow-sm rounded-2xl rounded-tl-none`
- Outgoing bubble:
  - right aligned
  - `bg-emerald-100 shadow-sm rounded-2xl rounded-tr-none`
- Bubble text:
  - `text-slate-800 text-sm`
- Meta row:
  - timestamp `text-[10px] text-slate-500`
  - outgoing receipt icon:
    - pending: clock
    - sent: one gray check
    - delivered: double gray checks
    - read: double blue checks (`text-blue-500`)

Section C - Input/footer:

- `sticky bottom-0 bg-white border-t border-slate-200 p-3`.
- Input wrapper `rounded-full bg-slate-100`.
- Input placeholder `Digite uma mensagem...`.
- Focus ring: `focus:ring-2 focus:ring-emerald-500`.
- Send button circle with motion:
  - `hover:scale-105 active:scale-95`.

### 9.3 Component split

Create:

- `src/modules/whatsapp/components/chat/whatsapp-chat-panel.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-list.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-bubble.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-message-input.tsx`
- `src/modules/whatsapp/components/chat/whatsapp-connection-badge.tsx`

Optional but recommended:

- `src/components/ui/tabs.tsx` (Radix wrapper).

---

## 10) Edge cases and handling matrix

1. Lead phone invalid for WhatsApp:

- API returns `400` with clear message.
- UI disables send and shows inline warning.

2. No connected instance:

- API returns cached messages + offline status for GET.
- POST send returns `409` or `400` (`WhatsApp desconectado`).

3. Evolution API timeout/intermittent failure:

- GET falls back to DB cache.
- Polling backoff to 10s until one success, then restore 5s.

4. Duplicate messages from repeated polling:

- DB unique constraint + upsert by `(id_whatsapp_instancia, mensagem_id)`.

5. Out-of-order responses:

- Request sequence guard in hook; ignore stale responses.

6. Memory leaks on drawer close/tab switch:

- Abort request + clear timeout on cleanup.

7. Empty/non-text messages:

- Text-only MVP: keep `kind="unsupported"` and show safe placeholder or ignore in list.

8. `remoteJid` shape variance (`@s.whatsapp.net`, `@lid`):

- Prefer exact `remoteJid` filter to API.
- Add defensive fallback filtering by normalized phone digits when possible.

9. Unread dot correctness:

- Dot is based on DB unread incoming count, not only local state.
- Mark read only when chat tab becomes active.

10. Multi-instance ambiguity:

- For lead with existing history, prefer last used instance from `WhatsappMensagem`.
- Else fallback to latest connected instance from company.

---

## 11) Implementation sequence (step-by-step)

### Phase 0 - Foundation

1. Add `@radix-ui/react-tabs` dependency.
2. Create `src/components/ui/tabs.tsx` wrapper.
3. Add chat message types to whatsapp module.

### Phase 1 - Data layer

4. Add `WhatsappMensagem` model and relations in Prisma schema.
5. Regenerate Prisma client and sync DB.

### Phase 2 - Server contracts

6. Add zod validation for chat payloads (`send-message`, `mark-read`).
7. Build shared helper module (`src/lib/whatsapp-chat.ts`) for normalization and persistence.
8. Implement `GET /api/whatsapp/chat/messages`.
9. Implement `POST /api/whatsapp/chat/send-message`.
10. Implement `POST /api/whatsapp/chat/mark-read`.

### Phase 3 - Hook and polling

11. Implement `useWhatsappChat` with leak-safe recursive polling.
12. Implement optimistic send + reconciliation + retry error state.

### Phase 4 - UI components

13. Build chat panel components (header, list, bubble, input).
14. Implement read receipt icons and timestamp formatting (`HH:mm`).
15. Implement empty state and loading states.

### Phase 5 - Drawer integration

16. Replace drawer direct body with Tabs (`Detalhes`, `Chat WhatsApp`).
17. Insert unread red dot indicator in chat trigger.
18. Wire tab state so opening chat tab triggers `markRead()`.
19. Remove old `wa.me` button from details actions.

### Phase 6 - Hardening

20. Validate RBAC paths for all profiles.
21. Add route tests for auth, RBAC, invalid payload, no instance, success paths.
22. Add hook tests for polling cleanup and optimistic behavior.

---

## 12) Suggested files to touch

- `package.json`
- `prisma/schema.prisma`
- `src/components/ui/tabs.tsx` (new)
- `src/lib/evolution-api.ts` (extend with chat-specific helpers, optional)
- `src/lib/validacoes.ts` (add chat schemas)
- `src/lib/whatsapp-chat.ts` (new)
- `src/app/api/whatsapp/chat/messages/route.ts` (new)
- `src/app/api/whatsapp/chat/send-message/route.ts` (new)
- `src/app/api/whatsapp/chat/mark-read/route.ts` (new)
- `src/modules/whatsapp/types.ts` (or dedicated chat types file)
- `src/modules/whatsapp/hooks/use-whatsapp-chat.ts` (new)
- `src/modules/whatsapp/components/chat/*` (new)
- `src/modules/kanban/components/lead-details-drawer.tsx`

---

## 13) Quality gates (definition of done)

Functional:

- Tabs render correctly in drawer, full-width trigger list.
- Chat tab shows exact requested three-section layout.
- Polling every 5s while enabled.
- Optimistic message appears instantly with pending clock icon.
- Send success reconciles temp bubble; failure marks bubble as error.
- Unread red dot appears/disappears correctly.
- RBAC verified for EMPRESA, GERENTE, COLABORADOR.

Technical:

- No memory leaks (cleanup + abort validated).
- No duplicate persisted messages from polling.
- Strict tenant scoping (`id_empresa`) in every chat query.
- No API key exposed to client.

UX:

- Bubble alignment/colors/rounding exactly match requested spec.
- Input focus ring and send button motion match requested behavior.
- Empty state is polished and centered.

---

## 14) AI implementation notes

When handing this plan to an implementation model, require it to:

1. Follow file-by-file edits in phase order.
2. Keep all RBAC checks server-side.
3. Implement parser defensively for Evolution response shape drift.
4. Keep optimistic state deterministic with `clientTempId` reconciliation.
5. Keep polling single-flight and abortable.
6. Preserve existing drawer save/delete behaviors.
