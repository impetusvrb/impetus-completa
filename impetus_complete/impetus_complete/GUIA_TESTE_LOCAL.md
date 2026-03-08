# IMPETUS — Guia de Teste Local (para Gustavo)

**Objetivo:** Rodar o IMPETUS no computador para teste local.

---

## O que você vai precisar

1. **Node.js 18+** — https://nodejs.org (versão LTS)
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop
   
   **OU** **PostgreSQL 15+** — se preferir sem Docker
3. **Conta OpenAI** (opcional) — para a IA. Sem ela, o sistema roda em modo limitado.

---

## Opção A: Com Docker (recomendado)

### 1. Extrair o projeto
Descompacte o ZIP na pasta desejada.

### 2. Criar arquivo .env
Na pasta raiz (onde está docker-compose.yml), crie `.env`:

```
OPENAI_API_KEY=sk-proj-SUA_CHAVE_AQUI
LICENSE_VALIDATION_ENABLED=false
```

### 3. Subir o sistema
```bash
docker-compose up -d
```

### 4. Criar admin
```bash
docker-compose exec backend npm run seed
```

### 5. Acessar
- **Frontend:** http://localhost:3000
- **Login:** admin@impetus.local / Impetus@2025!

### Parar
```bash
docker-compose down
```

---

## Opção B: Sem Docker

1. Instale PostgreSQL e crie: `createdb impetus_db`
2. Em `backend`, crie `.env` com DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, OPENAI_API_KEY, LICENSE_VALIDATION_ENABLED=false
3. `cd backend && npm install && npm run migrate && npm run seed`
4. `npm run dev` (backend)
5. Em outro terminal: `cd frontend && npm install && npm run dev`
6. Acesse http://localhost:5173

---

## Problemas

- Porta em uso: pare outro serviço ou mude a porta
- Login não funciona: rode `npm run seed` de novo
- IA não responde: configure OPENAI_API_KEY
