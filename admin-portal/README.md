# IMPETUS — Painel administrativo (equipe interna)

Aplicação **separada** do frontend do cliente (`frontend/`). Mesma stack: React + Vite, tema alinhado ao design industrial IMPETUS.

## Rotas da API (backend)

Todas sob o prefixo **`/api/impetus-admin`** (evita colisão com `/api/admin/*` usado pelos administradores **da empresa cliente**).

- `POST /api/impetus-admin/auth/login` — corpo: `{ "email", "senha" }`
- `POST /api/impetus-admin/auth/logout` — requer `Authorization: Bearer <jwt>`
- `GET /api/impetus-admin/auth/me`
- `GET /api/impetus-admin/dashboard/stats`
- CRUD em `/api/impetus-admin/companies` … (ver `backend/src/routes/impetusAdmin/`)

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição |
|----------|-----------|
| `IMPETUS_ADMIN_JWT_SECRET` | **Obrigatório em produção.** Segredo exclusivo do JWT do painel (não reutilizar `JWT_SECRET` dos utilizadores cliente). |
| `ADMIN_PORTAL_SEED_EMAIL` | Opcional; e-mail do seed (default `admin@impetus.local`) |
| `ADMIN_PORTAL_SEED_PASSWORD` | Opcional; senha só para script de seed em dev |

### Desenvolvimento local

O `vite.config.js` faz **proxy** de `/api` → `http://127.0.0.1:4000`. Subir o backend na porta 4000 e o admin em:

```bash
cd admin-portal && npm run dev
```

Abrir: `http://localhost:5174`

## Produção (mesma VPS, dois “sites”)

1. Build do admin: `cd admin-portal && npm run build` → pasta `admin-portal/dist`.
2. Servir `dist` em **outro host virtual** (ex.: `admin.seudominio.com`) ou subdomínio.
3. O browser chama a **mesma API** (`https://api.seudominio.com` ou mesmo origin com proxy reverso).
4. Garantir CORS se origens forem diferentes, ou usar mesmo domínio com path (Nginx).

## Segurança

- O utilizador inicial `admin@impetus.local` / `123456` é **apenas para desenvolvimento**. Alterar a senha assim que possível.
- Em produção, definir `IMPETUS_ADMIN_JWT_SECRET` com valor forte e aleatório.

## Banco de dados

Executar a migration e o seed (ordem):

```bash
cd backend
# garantir PostgreSQL acessível via .env
npm run migrate
npm run seed:admin-portal
```

Arquivo SQL: `backend/src/models/admin_portal_migration.sql`
