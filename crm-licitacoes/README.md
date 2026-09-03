# CRM de Licitações e Gestão Comercial

Sistema web para coordenadores e especialistas em licitações públicas: acompanhamento de
processos/negócios com controle de acesso por região (UF), múltiplas visualizações
(Tabela agrupada, Kanban e Mapa geográfico), histórico de auditoria e painel de indicadores.

## Stack

- **Next.js 14 (App Router)** + TypeScript (strict mode)
- **Tailwind CSS** + componentes no padrão Shadcn UI (Radix Primitives) + Lucide Icons + Framer Motion
- **TanStack React Query v5** para data fetching no cliente, chamando **Server Actions** do Next.js
- **Prisma ORM** com **PostgreSQL** (`DATABASE_URL` no `.env` — local, Neon, Vercel Postgres, Supabase, etc.)
- **NextAuth.js (Auth.js) v5** com sessões JWT e `middleware.ts` para proteção de rotas + RBAC por estado
- **@dnd-kit** para o quadro Kanban (drag-and-drop)
- **React-Leaflet / OpenStreetMap** para o Mapa (sem chaves pagas)
- **SheetJS (xlsx)** para exportação em Excel
- **React Hook Form + Zod** para formulários e validação

## Como rodar localmente

Requer um banco PostgreSQL acessível (local via Docker/`postgres.app`, ou um banco free-tier
na nuvem como [Neon](https://neon.tech) — veja também a seção de Deploy abaixo).

```bash
npm install
cp .env.example .env         # ajuste DATABASE_URL para o seu Postgres
npm run db:push              # cria/atualiza as tabelas
npm run db:seed              # popula usuários e processos de exemplo
npm run dev
```

Acesse http://localhost:3000.

### Usuários de teste (senha `123456`)

| E-mail | Perfil | Estados permitidos |
|---|---|---|
| admin@crm.com | ADMIN | Todos |
| coordenador.mg@crm.com | USER | MG, SP |
| especialista.rj@crm.com | USER | RJ, ES |

## Deploy na Vercel

O projeto já está pronto para deploy (schema Postgres, `postinstall: prisma generate`,
`trustHost` configurado). Passo a passo:

### 1. Crie o banco PostgreSQL

Mais simples: no [dashboard da Vercel](https://vercel.com/dashboard) → aba **Storage** →
**Create Database** → **Postgres** (Neon). Copie a *connection string* que ela gerar
(`POSTGRES_PRISMA_URL` ou equivalente) — você vai usar como `DATABASE_URL` no passo 3.

Alternativas igualmente simples: [Neon](https://neon.tech) ou [Supabase](https://supabase.com)
(ambos têm free tier e um botão "Connect" que gera a connection string pronta).

### 2. Importe o repositório na Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → selecione
   `wendliguervidal/meus-projetos`.
2. Em **Root Directory**, clique em "Edit" e selecione `crm-licitacoes` (o app fica numa
   subpasta do repositório, não na raiz).
3. Framework Preset: a Vercel detecta **Next.js** automaticamente — não precisa mexer em
   build/output settings.

### 3. Configure as variáveis de ambiente

Ainda na tela de import (ou depois em **Settings → Environment Variables**), adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a connection string do passo 1 |
| `AUTH_SECRET` | um valor aleatório — gere com `openssl rand -base64 32` |

Não é necessário definir `NEXTAUTH_URL` — a Vercel injeta a URL do deployment automaticamente
e o app já está configurado para confiar nela (`trustHost: true`).

### 4. Deploy

Clique em **Deploy**. A Vercel instala as dependências (rodando `prisma generate` via
`postinstall`) e builda o Next.js. Ao final você recebe a URL pública
(`https://seu-projeto.vercel.app`).

### 5. Crie as tabelas e o usuário admin de teste

O deploy não roda migrações automaticamente. Uma única vez, na sua máquina, aponte para o
banco de produção e rode:

```bash
DATABASE_URL="<a mesma connection string do passo 1>" npm run db:deploy
```

Isso cria as tabelas (`prisma db push`) e popula os usuários/processos de exemplo
(`prisma/seed.ts`) — incluindo o admin de teste `admin@crm.com` / `123456` (troque a senha
em produção real).

Pronto — acesse a URL do passo 4 e faça login. Todo push na branch conectada gera um novo
deploy automaticamente.

## Estrutura de pastas

```
src/
├── app/
│   ├── (app)/          # Rotas autenticadas (layout com Sidebar + Header)
│   │   ├── page.tsx           # Tabela / Kanban / Mapa
│   │   ├── dashboard/         # Painel de indicadores
│   │   ├── arquivo/           # Processos arquivados por ano/mês
│   │   ├── mapa/               # Mapa em tela cheia
│   │   └── admin/usuarios/    # Gestão de usuários (ADMIN)
│   ├── actions/         # Server Actions (deals, notes, reminders, attachments, audit, users)
│   ├── login/            # Página de login
│   └── api/auth/          # Route handler do NextAuth
├── components/
│   ├── ui/                # Primitivos (Button, Dialog, Sheet, Table, Accordion, ...)
│   ├── kanban/             # Board com @dnd-kit
│   ├── map/                # Mapa com react-leaflet
│   ├── deal-details/       # Formulário, Drawer com abas, contexto de UI global
│   ├── dashboard/ e admin/
│   └── layout/             # Sidebar, Header, AppShell
├── hooks/                # useDeals, useReminders, useDealDetails, useUsers (React Query)
├── lib/                  # prisma client, auth (NextAuth v5), rbac, utils, export-excel, geocode
└── types/                # Zod schemas + TS types (Deal, User, categorias/status)
prisma/
├── schema.prisma
└── seed.ts
```

## Regras de negócio implementadas

- **RBAC por região**: usuários `USER` só enxergam/criam/editam processos cujo `state` (UF)
  esteja em `allowedStates`; `ADMIN` tem acesso irrestrito. Reforçado tanto nas Server Actions
  (`assertCanAccessState`) quanto no filtro de listagem (`stateScopeWhere`).
- **Categorias e status dinâmicos**: `ANDAMENTO`, `PARALISADA`, `GANHO`, `PERDIDO`, `GARANTIA`,
  `CONCLUIDO`, `ARQUIVADO` — cada uma com sua lista de status (`src/types/deal.ts`).
- **Perdido** exige `lossReason` + `lossDetail` (validado via Zod, no formulário e no
  drag-and-drop do Kanban).
- **Arquivado** agrupa por `archivedYear`/`archivedMonth`, sem apagar o histórico.
- **Auditoria automática**: toda mudança de categoria/status/responsável (ou criação/edição/
  exclusão) grava um `AuditLog` imutável, exibido na aba "Auditoria" do processo.

## Observações técnicas

- Os campos de categoria/status/motivo de perda são `String` no schema (em vez de `enum`
  nativo do Prisma), com os valores válidos garantidos pelos schemas Zod em
  `src/types/deal.ts` — o schema funciona sem alterações caso `DATABASE_URL` aponte para
  SQLite em algum ambiente local pontual, além de PostgreSQL.
- O Mapa usa um pequeno dicionário de coordenadas de capitais + centróides de UF
  (`src/lib/geocode.ts`) para não depender de geocodificação externa/paga.
- Anexos são armazenados como *data URL* (base64) diretamente no banco (limite de 3MB por
  arquivo — margem de segurança abaixo do limite de ~4.5MB de payload de Serverless Functions
  da Vercel no plano Hobby) — simples e suficiente para o escopo atual; para produção em maior
  escala, trocar por um bucket de objetos (S3/R2) é o próximo passo natural.
