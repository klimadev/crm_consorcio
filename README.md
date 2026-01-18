# CRM-Unify - Next.js 16

CRM Completo para MC Investimentos, construído com Next.js 16, TypeScript e Tailwind CSS.

## Stack

- **Frontend**: Next.js 16 (App Router)
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **Types**: TypeScript
- **Icons**: Lucide React
- **AI**: Google Gemini AI

## Como rodar

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
```

## Estrutura

```
src/
├── app/              # Next.js App Router
├── components/       # Componentes UI
├── context/          # CRM Context (State Management)
├── constants/        # Dados iniciais
├── services/         # Serviços (Gemini AI)
└── types/            # Definições TypeScript
```
