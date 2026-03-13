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

### Nginx para SPA (evitar 404 em rotas como Centro de Previsão)

O frontend é uma SPA; o nginx deve servir `index.html` para todas as rotas não-API:

```nginx
location / {
  root /caminho/para/frontend/dist;
  try_files $uri $uri/ /index.html;
}
location /api {
  proxy_pass http://localhost:4000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

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
