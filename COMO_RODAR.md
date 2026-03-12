# Como rodar o Impetus

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (com extensão pgvector opcional)
- npm

## Passo a passo

### 1. Variáveis de ambiente

O arquivo `.env` na raiz já está configurado. Ajuste se necessário:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `OPENAI_API_KEY` (obrigatório para IA)

### 2. Banco de dados

```bash
# Criar database (se não existir)
sudo -u postgres psql -c "CREATE DATABASE impetus_db;"

# Ajustar senha do usuário postgres (se necessário)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'sua_senha';"
```

### 3. Migrations

```bash
cd impetus_complete/backend
npm install
npm run migrate
```

### 4. Subir a aplicação

**Opção A – Script único:**
```bash
cd impetus_complete
chmod +x start.sh
./start.sh
```

**Opção B – Manual (2 terminais):**

Terminal 1 – Backend:
```bash
cd impetus_complete/backend
npm run dev
```

Terminal 2 – Frontend:
```bash
cd impetus_complete/frontend
npm install
npm run dev
```

### 5. Acessar

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

## Funcionalidades disponíveis

- **Base Estrutural** – Admin > Base Estrutural (empresa, cargos, linhas, ativos, etc.)
- **Registro Inteligente** – Menu lateral (todos os perfis)
- **Chat interno** – WebSocket entre colaboradores
- **Impetus IA** – Assistente de IA no dashboard
- **App Communications** – API para app mobile
- **Dashboard executivo** – Visão CEO
