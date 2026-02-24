# IMPETUS COMUNICA IA — Guia de Instalação

**Registro INPI:** BR512025007048-9  

Este guia descreve como instalar e executar o sistema em ambiente local ou produção.

---

## 1. Pré-requisitos

| Requisito | Versão |
|-----------|--------|
| Node.js | >= 18.0.0 |
| PostgreSQL | >= 15 |
| npm | >= 8 |
| Docker + Docker Compose | (opcional, para containerizado) |

---

## 2. Instalação com Docker (Recomendado)

### 2.1 Desenvolvimento (Vite dev server)

```bash
cd impetus_complete
docker-compose up -d
```

- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:4000  
- **PostgreSQL:** localhost:5432 (impetus/impetus/impetusdb)

### 2.2 Produção (build otimizado + nginx)

```bash
cd impetus_complete
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

- **Aplicação:** http://localhost (porta 80)  
- **Backend API:** acessível via `/api` (proxy nginx)

### 2.3 Variáveis de ambiente (Docker)

Crie `.env` na raiz do projeto:

```env
OPENAI_API_KEY=sk-proj-...
# LICENSE_VALIDATION_ENABLED=false  # para desenvolvimento sem licença
```

---

## 3. Migrations do Banco de Dados

**Ordem obrigatória** para o schema funcionar:

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | migrations.sql | Tabelas base (users, proposals, tasks, manuals, etc.) |
| 2 | complete_schema.sql | Schema completo (companies, communications, LGPD, etc.) |
| 3 | tpm_migration.sql | Formulário TPM |

### 3.1 Script único (recomendado)

```bash
cd backend
npm run migrate
```

Executa as 3 migrations na ordem correta.

### 3.2 Manual (psql)

```bash
# Conectar ao banco (ajuste user/db conforme seu .env)
psql -U postgres -d impetus_db -f backend/src/models/migrations.sql
psql -U postgres -d impetus_db -f backend/src/models/complete_schema.sql
psql -U postgres -d impetus_db -f backend/src/models/tpm_migration.sql
```

### 3.3 Com Docker

As migrations são executadas **automaticamente** pelo serviço `migrate` antes do backend iniciar. Não é necessário rodar manualmente.

Se precisar rodar novamente (ex.: novo banco):
```bash
docker-compose run --rm migrate
```

**Criar admin inicial (após primeiro `up`):**
```bash
docker-compose exec backend npm run seed
```

---

## 4. Instalação Manual (sem Docker)

### 4.1 Banco de dados

```bash
# Criar banco
createdb impetus_db

# Executar migrations
cd backend
npm run migrate
```

### 4.2 Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Editar .env com DB_HOST, DB_USER, DB_PASSWORD, OPENAI_API_KEY, etc.

npm run dev   # ou npm start para produção
```

Backend em **http://localhost:4000** (ou `PORT` definido no .env).

### 4.3 Frontend

```bash
cd frontend
npm install

# Desenvolvimento (usa proxy para /api)
npm run dev

# Produção (build estático)
npm run build
# Servir a pasta dist/ com nginx, Apache ou: npx serve dist
```

Frontend dev em **http://localhost:5173**.

---

## 5. Configuração Mínima

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| DB_HOST / DATABASE_URL | Sim | Conexão PostgreSQL |
| DB_USER, DB_PASSWORD, DB_NAME | Sim | Se não usar DATABASE_URL |
| OPENAI_API_KEY | Não* | *Sem ela, a IA usa fallback (sem classificações) |
| LICENSE_VALIDATION_ENABLED | Não | `false` para desenvolvimento sem servidor de licenças |
| SALT | Sim (prod) | String aleatória para segurança |

---

## 6. Primeiro acesso

### Opção A: Seed inicial (recomendado)
```bash
cd backend
npm run seed
```
Cria empresa "Empresa Demo" e admin `admin@impetus.local` / senha `Impetus@2025!`.

Variáveis opcionais: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_COMPANY_NAME`.

### Opção B: Manual
1. Via `POST /api/auth/register` (criar usuário com `company_id`)
2. Ou inserir em `companies` e `users` diretamente no banco

3. Acessar o frontend e fazer login.

---

## 7. Troubleshooting

| Problema | Solução |
|----------|---------|
| Erro ao rodar migrations | Verificar ordem: 1) migrations.sql 2) complete_schema.sql 3) tpm_migration.sql |
| "Licença inválida" | Definir `LICENSE_VALIDATION_ENABLED=false` no .env |
| IA não classifica | Configurar `OPENAI_API_KEY` |
| Frontend não conecta ao backend | Em dev: verificar proxy no `vite.config.js`. Em prod: nginx proxy em `/api` |
| Erro pgvector | Instalar extensão: `CREATE EXTENSION IF NOT EXISTS vector;` no Postgres |

---

## 8. Referências

- **README principal:** [README.md](../README.md)
- **Documentação técnica:** [DOCUMENTACAO_TECNICA_COMPLETA.md](./DOCUMENTACAO_TECNICA_COMPLETA.md)
- **Produção (backup, HTTPS):** [PRODUCAO.md](./PRODUCAO.md)
- **Variáveis de ambiente:** [.env.example](../.env.example)
