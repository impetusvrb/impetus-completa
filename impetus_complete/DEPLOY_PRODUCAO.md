# Deploy em Produção - Impetus Comunica IA

## Pré-requisitos

- Node.js 18+
- PostgreSQL
- Variáveis de ambiente configuradas (copie `.env.production.example` para `.env`)

## Build Frontend

```bash
cd impetus_complete/frontend
VITE_API_URL=/api npm run build
```

## Docker (recomendado)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- Frontend: porta 80 (nginx)
- Backend: interno na 4000, exposto via proxy em `/api`

## Migrations

```bash
cd impetus_complete/backend
node -r dotenv/config scripts/run-all-migrations.js
```

## Variáveis críticas para produção

- `LICENSE_VALIDATION_ENABLED=true` (em produção real)
- `NODE_ENV=production`
- `FRONTEND_URL` com domínio real
- Credenciais de banco seguras
