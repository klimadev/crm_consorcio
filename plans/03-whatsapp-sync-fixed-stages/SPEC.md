# WhatsApp Sync & Fixed Stages Plan

## 1. Fixed Stages Refactoring
We will STOP allowing users to edit stages in the `Configs` module.
- **Remove `EstagiosCard`**: Delete from `src/modules/configs/components/estagios-card.tsx` and remove the reference in `src/modules/configs/page.tsx`.
- **Remove Backend Route**: Delete `src/app/api/estagios/[id]/route.ts` so users cannot PATCH stages.
- **Fixed Stages Data**: Ensure the system has a core set of standard stages (e.g., "Indefinido", "Novo Lead", etc.) either through startup seeding or a fallback script when companies are created. "Indefinido" must be the starting point for incoming syncs.

## 2. Kanban Header UI
- **Add Sync Button**: In `src/modules/kanban/components/kanban-header.tsx`, add a new `Button` next to "Novo lead" called "Sincronizar WhatsApp", with a refresh icon.
- **Loading State**: When clicked, disable the button and show "Sincronizando...".
- **Trigger Refresh**: On successful sync from the API, call a refresh to automatically populate the newly seeded contacts in the Kanban columns.

## 3. Evolution API Integration
- **Add Fetch Function**: In `src/lib/evolution-api.ts`, add a `buscarContatos(instanceName: string)` function that makes a `POST /chat/findContacts/${instanceName}` call.
- **Extraction**: Parse the response to grab the contact's standard WhatsApp ID (`remoteJid` or `id`) and their `pushName`.

## 4. Sync API Logic (`/api/leads/sync-whatsapp/route.ts`)
- **Permission & Instance Discovery**: 
  - Identify which `WhatsappInstancia` the current user has access to. Admin = all instances in their `id_empresa`. Manager/Collab = instances matching their `id_pdv` or creation ID.
- **Fetch Contacts**: Call the `buscarContatos` utility for each valid instance.
- **Deduplication & Merge**:
  - Loop through contacts, extract the clean phone number (strip `@s.whatsapp.net` and apply `normalizarTelefoneParaWhatsapp`).
  - Search `Lead` where `telefone` matches and `id_empresa` matches your current company.
  - If Lead **exists**, skip it.
  - If Lead **DOES NOT exist**, create it.
- **Defaults for New Leads**:
  - `nome`: Contact's `pushName` or `"Indefinido"` if null.
  - `telefone`: Normalized WA number.
  - `valor_consorcio`: `0`.
  - `id_estagio`: Find the ID of the "Indefinido" `EstagioFunil` for this company.
  - `id_funcionario`: Assign to `auth.sessao.id_usuario` (if Collab) or a default assignment.
- **Visual Result**: Returns success so the UI fetches the new full list, and the User sees all new contacts in the "Indefinido" Kanban column.

*This document outlines exactly how an AI can build the feature safely, without dropping data or allowing duplicates.*
