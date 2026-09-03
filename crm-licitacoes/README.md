# CRM de Licitações e Gestão Comercial

Sistema web para coordenadores e especialistas em licitações públicas: acompanhamento de
processos/negócios com controle de acesso por região (UF), múltiplas visualizações
(Tabela agrupada, Kanban e Mapa geográfico), histórico de auditoria e painel de indicadores.

## Stack

- **Next.js 14 (App Router)** + TypeScript (strict mode)
- **Tailwind CSS** + componentes no padrão Shadcn UI (Radix Primitives) + Lucide Icons + Framer Motion
- **TanStack React Query v5** para data fetching no cliente, chamando **Server Actions** do Next.js
- **Prisma ORM** — SQLite em desenvolvimento (`DATABASE_URL` no `.env`), PostgreSQL em produção
- **NextAuth.js (Auth.js) v5** com sessões JWT e `middleware.ts` para proteção de rotas + RBAC por estado
- **@dnd-kit** para o quadro Kanban (drag-and-drop)
- **React-Leaflet / OpenStreetMap** para o Mapa (sem chaves pagas)
- **SheetJS (xlsx)** para exportação em Excel
- **React Hook Form + Zod** para formulários e validação

## Como rodar localmente

```bash
npm install
cp .env.example .env   # ajuste se necessário (SQLite já vem pronto)
npm run db:push        # cria/atualiza o schema no SQLite
npm run db:seed        # popula usuários e processos de exemplo
npm run dev
```

Acesse http://localhost:3000.

### Usuários de teste (senha `123456`)

| E-mail | Perfil | Estados permitidos |
|---|---|---|
| admin@crm.com | ADMIN | Todos |
| coordenador.mg@crm.com | USER | MG, SP |
| especialista.rj@crm.com | USER | RJ, ES |

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

- SQLite não suporta `enum` nativo do Prisma — os campos de categoria/status/motivo de perda
  são `String` no schema, com os valores válidos garantidos pelos schemas Zod em
  `src/types/deal.ts` (o mesmo schema funciona sem alterações em PostgreSQL).
- O Mapa usa um pequeno dicionário de coordenadas de capitais + centróides de UF
  (`src/lib/geocode.ts`) para não depender de geocodificação externa/paga.
- Anexos são armazenados como *data URL* (base64) diretamente no banco (limite de 5MB por
  arquivo) — simples e suficiente para o escopo atual; para produção em maior escala, trocar
  por um bucket de objetos (S3/R2) é o próximo passo natural.
