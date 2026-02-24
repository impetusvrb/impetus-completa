# IMPETUS — Guia de Teste Local (para Gustavo)

**Objetivo:** Rodar o IMPETUS no computador para teste local.

---

## O que você vai precisar

1. **Node.js 18+** — [https://nodejs.org](https://nodejs.org) (versão LTS)
2. **Docker Desktop** — [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) (mais fácil)
   
   **OU**
   
   **PostgreSQL 15+** — se preferir instalar sem Docker
3. **Conta OpenAI** (opcional) — para a IA funcionar. Sem ela, o sistema roda em modo limitado.

---

## Opção A: Com Docker (recomendado — mais simples)

### Passo 1: Extrair o projeto
Se recebeu um ZIP, descompacte na pasta que preferir (ex.: `C:\impetus` ou `~/impetus`).

### Passo 2: Criar arquivo .env
Na pasta raiz do projeto (onde está o `docker-compose.yml`), crie um arquivo chamado `.env` com:

```
OPENAI_API_KEY=sk-proj-SUA_CHAVE_AQUI
LICENSE_VALIDATION_ENABLED=false
```

*Se não tiver chave OpenAI, deixe a linha em branco ou remova — o sistema roda sem IA completa.*

### Passo 3: Subir o sistema
Abra o terminal na pasta do projeto e execute:

```bash
docker-compose up -d
```

Aguarde 1–2 minutos (primeira vez baixa as imagens).

### Passo 4: Criar usuário admin
```bash
docker-compose exec backend npm run seed
```

### Passo 5: Acessar
- **Frontend:** http://localhost:3000
- **Login:** `admin@impetus.local` / senha: `Impetus@2025!`

### Parar o sistema
```bash
docker-compose down
```

---

## Opção B: Sem Docker (PostgreSQL instalado localmente)

### Passo 1: Instalar PostgreSQL
Instale o PostgreSQL 15+ e crie um banco:

```bash
createdb impetus_db
```

### Passo 2: Configurar .env
Na pasta `backend`, crie um `.env` com:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=impetus_db
DB_USER=postgres
DB_PASSWORD=SUA_SENHA
OPENAI_API_KEY=sk-proj-...
LICENSE_VALIDATION_ENABLED=false
```

### Passo 3: Migrations
```bash
cd backend
npm install
npm run migrate
npm run seed
```

### Passo 4: Backend
```bash
npm run dev
```
(Mantém rodando. Backend em http://localhost:4000)

### Passo 5: Frontend (outro terminal)
```bash
cd frontend
npm install
npm run dev
```

### Passo 6: Acessar
- **Frontend:** http://localhost:5173
- **Login:** `admin@impetus.local` / `Impetus@2025!`

---

## Problemas comuns

| Erro | Solução |
|------|---------|
| "port 5432 in use" | Outro PostgreSQL está rodando. Pare o serviço ou mude a porta no .env |
| "port 3000 in use" | Outra aplicação usa a porta. Pare ou mude no docker-compose |
| Login não funciona | Execute `npm run seed` de novo no backend |
| IA não responde | Configure `OPENAI_API_KEY` no .env |

---

## Contato

Dúvidas: Wellington ou contato@impetus.com.br
