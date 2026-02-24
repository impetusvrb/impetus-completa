# IMPETUS — Como testar localmente

Guia rápido para rodar o IMPETUS no seu computador.

---

## Pré-requisitos

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **PostgreSQL** 15+ — [postgresql.org](https://postgresql.org) ou [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **npm** (vem com Node.js)

---

## Opção A: Com Docker (mais fácil)

Se você tem **Docker Desktop** instalado:

```bash
# 1. Descompactar o ZIP e entrar na pasta
cd impetus_complete

# 2. Criar arquivo .env (copiar de .env.example)
# Editar e colocar OPENAI_API_KEY=sk-... (opcional)
# LICENSE_VALIDATION_ENABLED=false

# 3. Subir tudo
docker-compose up -d

# 4. Aguardar ~2 minutos (migrations rodam automaticamente)
# 5. Acessar:
#    Frontend: http://localhost:3000
#    Backend:  http://localhost:4000

# 6. Criar usuário admin
docker-compose exec backend npm run seed

# Login: admin@impetus.local / Senha: Impetus@2025!
```

---

## Opção B: Sem Docker (manual)

### 1. PostgreSQL

Criar o banco:
```sql
CREATE DATABASE impetus_db;
-- Usuário padrão: postgres (ou o seu)
```

### 2. Backend

```bash
cd backend

# Instalar
npm install

# Configurar
cp ../.env.example .env
# Editar .env: DB_HOST=localhost, DB_USER=postgres, DB_PASSWORD=sua_senha

# Rodar migrations
npm run migrate

# Criar admin
npm run seed

# Iniciar
npm run dev
```

Backend em **http://localhost:4000**

### 3. Frontend (outro terminal)

```bash
cd frontend

npm install
npm run dev
```

Frontend em **http://localhost:5173**

### 4. Acessar

- **http://localhost:5173** (ou 3000 se usar Docker)
- Login: `admin@impetus.local` / Senha: `Impetus@2025!`

---

## Variáveis importantes para teste

| Variável | Valor para teste |
|----------|------------------|
| `LICENSE_VALIDATION_ENABLED` | `false` |
| `OPENAI_API_KEY` | Sua chave (ou deixe vazio = IA em modo limitado) |
| `DB_HOST` | `localhost` |
| `DB_PASSWORD` | Senha do seu Postgres |

---

## Problemas comuns

**"Licença inválida"** → Definir `LICENSE_VALIDATION_ENABLED=false` no .env

**"Erro de conexão ao banco"** → Verificar se Postgres está rodando e se DB_HOST, DB_USER, DB_PASSWORD estão corretos

**"npm run migrate" falha** → Garantir que o banco `impetus_db` existe e que o usuário tem permissão

**pgvector não encontrado** → Usar Docker (imagem `pgvector/pgvector:pg15`) ou instalar a extensão no Postgres

---

## Suporte

Dúvidas: Wellington ou documentação em `docs/INSTALACAO.md`
