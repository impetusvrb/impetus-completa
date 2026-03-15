# 📦 GUIA DE INSTALAÇÃO - IMPETUS COMUNICA IA

## 🎯 Passo a Passo para Primeira Instalação

### **Pré-requisitos**

Antes de começar, certifique-se de ter instalado:

- ✅ **Node.js** >= 18.0.0 ([Baixar](https://nodejs.org))
- ✅ **PostgreSQL** >= 15 ([Baixar](https://www.postgresql.org/download/))
- ✅ **Git** ([Baixar](https://git-scm.com/))
- ✅ **Conta OpenAI** com API Key ([OpenAI](https://platform.openai.com/))
- ✅ **App Impetus** (canal de mensagens integrado)

---

## 🗄️ ETAPA 1: Configurar Banco de Dados

### **Windows (PowerShell)**

```powershell
# 1. Criar banco de dados
psql -U postgres -c "CREATE DATABASE impetus_db;"

# 2. Criar extensões necessárias
psql -U postgres -d impetus_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -U postgres -d impetus_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Executar schema completo
psql -U postgres -d impetus_db -f backend/src/models/complete_schema.sql
```

### **Linux/Mac (Terminal)**

```bash
# 1. Criar banco de dados
createdb impetus_db

# 2. Executar schema completo
psql impetus_db < backend/src/models/complete_schema.sql
```

---

## ⚙️ ETAPA 2: Configurar Backend

```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env
cp ../.env.example .env
```

### **Editar arquivo `.env`**

Abra o arquivo `backend/.env` e preencha:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=impetus_db
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_POSTGRES

# OpenAI (OBRIGATÓRIO)
OPENAI_API_KEY=sk-proj-COLE_SUA_CHAVE_AQUI

# Salt para senhas (GERE UMA STRING ALEATÓRIA)
SALT=impetus_2025_TROQUE_POR_ALGO_ALEATORIO

# Canal de mensagens: App Impetus (sem config extra)
```

### **Executar migrations (Indústria 4.0, etc.)**

```bash
cd backend
npm run migrate
```

### **Iniciar Backend**

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

✅ **Backend rodando em**: `http://localhost:4000` (ou porta definida em `PORT` no .env)

---

## 🎨 ETAPA 3: Configurar Frontend

```bash
# 1. Entrar na pasta do frontend (nova aba do terminal)
cd frontend

# 2. Instalar dependências
npm install

# 3. (Opcional) Criar .env.local se API estiver em outro servidor
echo "VITE_API_URL=http://localhost:3000/api" > .env.local

# 4. Iniciar frontend
npm run dev
```

✅ **Frontend rodando em**: `http://localhost:5173`

---

## 👤 ETAPA 4: Criar Primeiro Usuário

### **Opção A: Via SQL (Recomendado)**

```sql
-- Conectar ao banco
psql impetus_db

-- 1. Criar empresa
INSERT INTO companies (name, cnpj, active) 
VALUES ('Minha Empresa', '12345678000199', true)
RETURNING id;

-- Copie o ID retornado (ex: uuid '123e4567-e89b-12d3-a456-426614174000')

-- 2. Criar usuário administrador
INSERT INTO users (
  name, 
  email, 
  password_hash, 
  company_id, 
  role, 
  hierarchy_level, 
  lgpd_consent,
  active
) VALUES (
  'Admin Impetus',
  'admin@empresa.com',
  -- Senha: admin123 (hash SHA256 com salt padrão)
  '7c6a180b36896a0a8c02787eeafb0e4c4f6c4d2b6f5b3f8c3f5c3f5c3f5c3f5c',
  'COLE_ID_DA_EMPRESA_AQUI',
  'administrador',
  1,
  true,
  true
);
```

### **Opção B: Via API (Registro)**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Impetus",
    "email": "admin@empresa.com",
    "password": "admin123",
    "company_id": "COLE_ID_DA_EMPRESA_AQUI",
    "role": "administrador",
    "hierarchy_level": 1,
    "lgpd_consent": true
  }'
```

---

## 🚀 ETAPA 5: Primeiro Acesso

1. Abra o navegador em `http://localhost:5173`
2. Faça login com:
   - **Email**: `admin@empresa.com`
   - **Senha**: `admin123`
3. ✅ Você será redirecionado para o Dashboard!

---

## 🔧 Configurações Adicionais

### **Configurar Z-API (WhatsApp)**

1. Acesse [Z-API](https://z-api.io) e crie uma conta
2. Crie uma instância e obtenha as credenciais
3. No banco de dados:

```sql
INSERT INTO zapi_configurations (
  company_id,
  instance_id,
  instance_token,
  client_token,
  business_phone,
  active
) VALUES (
  'ID_DA_SUA_EMPRESA',
  'INSTANCE_ID_DA_ZAPI',
  'INSTANCE_TOKEN_DA_ZAPI',
  'CLIENT_TOKEN_DA_ZAPI',
  '5511999999999',
  true
);
```

4. Configure webhook no painel Z-API:
   - **URL**: `https://seu-dominio.com/api/webhook`
   - **Token**: Defina um token de segurança

---

## 🐳 Instalação com Docker (Alternativa)

```bash
# 1. Subir todos os serviços
docker-compose up -d

# 2. Aguardar inicialização (30-60s)
docker-compose logs -f

# 3. Executar migrations
docker-compose exec backend npm run migrate

# 4. Criar primeiro usuário
docker-compose exec postgres psql -U postgres impetus_db < init-user.sql
```

---

## ✅ Verificar Instalação

### **Backend**

```bash
curl http://localhost:4000/health
```

Resposta esperada:
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": 123.45
}
```

### **Banco de Dados**

```sql
-- Verificar tabelas criadas
\dt

-- Deve mostrar 30+ tabelas
```

---

## 🔍 Troubleshooting

### **Erro: "Cannot connect to database"**

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql  # Linux
brew services list                # Mac
sc query postgresql-x64-15        # Windows
```

### **Erro: "Extension vector does not exist"**

```bash
# Instalar pgvector
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# Mac
brew install pgvector

# Windows
# Baixar de: https://github.com/pgvector/pgvector/releases
```

### **Erro: "OpenAI API Key invalid"**

1. Verifique se a chave está correta em `.env`
2. Teste a chave:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer SEU_TOKEN"
```

### **Erro: "Port 4000 already in use"**

```bash
# Mudar porta no .env
PORT=4001
```

---

## 📊 Próximos Passos

Após instalação bem-sucedida:

1. ✅ **Configurar empresa** no banco de dados
2. ✅ **Criar departamentos** (Produção, Manutenção, etc)
3. ✅ **Adicionar usuários** com diferentes hierarquias
4. ✅ **Carregar POPs** da empresa
5. ✅ **Adicionar equipamentos monitorados** (tabela `machine_monitoring_config` para PLC real)
6. ✅ **Configurar Z-API** para WhatsApp
7. ✅ **Integrações Indústria 4.0** — ver `docs/IND4_ARQUITETURA.md`

---

## 📞 Suporte

Dúvidas ou problemas na instalação?

📧 **Email**: suporte@impetus.com.br

---

**Desenvolvido por Wellington Machado de Freitas & Gustavo Júnior da Silva**  
**Registro INPI: BR512025007048-9**
