# 🧪 Guia de Teste - Impetus Comunica IA

**Plataforma de Inteligência Operacional Industrial**  
Registro INPI: BR512025007048-9

---

## 📋 Pré-requisitos

Antes de testar, certifique-se de que:

1. **Node.js** >= 18 instalado
2. **PostgreSQL** >= 15 rodando com o banco `impetus_db` criado
3. **Migrations** executadas (`npm run migrate` no backend)

---

## 🚀 PASSO 1: Instalar Dependências

Abra dois terminais (PowerShell ou CMD).

### Terminal 1 - Backend

```powershell
cd "G:\Meu Drive\impetus_complete\backend"
npm install
```

### Terminal 2 - Frontend

```powershell
cd "G:\Meu Drive\impetus_complete\frontend"
npm install
```

---

## ⚙️ PASSO 2: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```powershell
   copy "G:\Meu Drive\impetus_complete\.env.example" "G:\Meu Drive\impetus_complete\backend\.env"
   ```

2. Edite `backend\.env` e preencha:
   - **DB_HOST**, **DB_PORT**, **DB_NAME**, **DB_USER**, **DB_PASSWORD**: configuração do PostgreSQL
   - **OPENAI_API_KEY**: chave da OpenAI (pode deixar em branco para testes sem IA)
   - **SALT**: string aleatória para sessões
   - **LICENSE_VALIDATION_ENABLED**: `false` para testes locais (se a variável existir)

---

## 📂 PASSO 3: Executar Migrations do Banco

Execute as migrations na ordem correta:

```powershell
cd "G:\Meu Drive\impetus_complete\backend"
npm run migrate
```

Isso aplica: `migrations.sql`, `complete_schema.sql`, `tasks_company_migration.sql`, `schema_fixes_migration.sql`, `doc_context_migration.sql`, `user_activity_logs_migration.sql`, `whatsapp_contacts_migration.sql`, `tpm_migration.sql`, `proacao_diag_migration.sql`.

Se preferir aplicar manualmente via psql, siga a ordem descrita em [docs/INSTALACAO.md](docs/INSTALACAO.md).

---

## 👤 PASSO 4: Criar Usuários de Teste

Execute no PostgreSQL (ou use pgAdmin/DBeaver):

```sql
-- 1. Inserir empresa (se não existir)
INSERT INTO companies (id, name, active) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Empresa Teste', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir departamento
INSERT INTO departments (id, company_id, name, level, active)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Administrativo', 1, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar usuário administrador (senha: Admin123!)
-- Gere o hash com: node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('Admin123!',12))"
INSERT INTO users (
  id, company_id, department_id, name, email, password_hash, 
  role, hierarchy_level, active, lgpd_consent
) VALUES (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Administrador',
  'admin@impetus.com.br',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G8mGJKxW7J5mKm',
  'diretor',
  1,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. Criar usuário colaborador (senha: Admin123! - mesmo hash do admin)
INSERT INTO users (
  id, company_id, department_id, name, email, password_hash, 
  role, hierarchy_level, active, lgpd_consent
) VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'João Colaborador',
  'colab@impetus.com.br',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G8mGJKxW7J5mKm',
  'colaborador',
  4,
  true,
  true
) ON CONFLICT (id) DO NOTHING;
```

**Credenciais de teste:**

| Perfil        | Email                  | Senha      |
|---------------|------------------------|------------|
| Administrador | admin@impetus.com.br    | Admin123!  |
| Colaborador   | colab@impetus.com.br   | Admin123!  |

---

## 📷 PASSO 5: Logo (opcional)

Para exibir a logo Impetus no login e na sidebar:

```powershell
cd "G:\Meu Drive\impetus_complete\frontend"
npm run copy-logo
```

Ou copie manualmente a imagem para `frontend/public/logo-impetus.jpg`.

---

## ▶️ PASSO 6: Iniciar os Servidores

### Terminal 1 - Backend (porta 4000)

```powershell
cd "G:\Meu Drive\impetus_complete\backend"
npm run dev
```

**Saída esperada:**
```
Backend listening on 4000
```

### Terminal 2 - Frontend (porta 5173)

```powershell
cd "G:\Meu Drive\impetus_complete\frontend"
npm run dev
```

**Saída esperada:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## 🧪 PASSO 7: Roteiro de Testes

### Teste 1: Login (Administrador)

1. Abra: **http://localhost:5173**
2. Digite: `admin@impetus.com.br` / `Admin123!`
3. Clique em **Entrar**

**Resultado esperado:** Redirecionamento para o Dashboard (ou Dashboard Gerencial se hierarchy_level <= 2).

**Visual:** Página de login com tema azul naval, logo Impetus no topo do card.

---

### Teste 2: Login (Colaborador)

1. Faça logout (ícone de sair no header).
2. Faça login com: `colab@impetus.com.br` / `Admin123!`

**Resultado esperado:** Redirecionamento direto para **Pró-Ação** (`/app/proacao`).

**Menu:** Apenas o item **"Pró-Ação"** deve aparecer na sidebar. Dashboard, Operacional, Biblioteca e outras opções não devem estar visíveis.

---

### Teste 3: Colaborador — Restrição de Acesso

1. Logado como colaborador, tente acessar manualmente: `http://localhost:5173/app`
2. Tente também: `http://localhost:5173/app/biblioteca`

**Resultado esperado:** Redirecionamento automático para `/app/proacao`.

---

### Teste 4: Dashboard (Administrador/Gerente)

1. Faça login como `admin@impetus.com.br`.
2. Verifique o **Dashboard** ou **Dashboard Gerencial** (conforme hierarchy_level).

**Resultado esperado:**
- Sidebar com logo Impetus no topo
- Menu completo: Dashboard, Pró-Ação, Operacional, Biblioteca, Chatbot, IA Insights, Pontos Monitorados, Admin, Configurações
- KPIs, gráficos de tendência, insights e interações recentes

---

### Teste 5: Gestão de Usuários

1. Acesse: **http://localhost:5173/app/admin/users**
2. Ou use o menu lateral → **Gestão de Usuários**

**Resultado esperado:** Página de listagem de usuários com o admin e o colaborador na lista.

---

### Teste 6: Criar Novo Usuário

1. Na página de usuários, clique em **Novo Usuário**
2. Preencha:
   - Nome: `Maria Gerente`
   - Email: `maria@teste.com`
   - Senha: `Teste123!`
   - Função: Gerente
   - Nível hierárquico: 2
3. Clique em **Criar**

**Resultado esperado:** Usuário criado e exibido na tabela.

---

### Teste 7: Pró-Ação (Propostas)

1. Acesse: **http://localhost:5173/app/proacao**
2. Ou use o menu → **Pró-Ação**

**Resultado esperado:** Página "Pró-Ação — Propostas de Melhoria" com lista de propostas (ou lista vazia se não houver dados).

---

### Teste 8: Chat (Impetus)

1. Acesse: **http://localhost:5173/app/chatbot**
2. Verifique o cabeçalho e as mensagens de saudação

**Resultado esperado:** Título **"Impetus"**, mensagens identificando o assistente como "Impetus" (ex.: "Aqui é o Impetus").

---

## 🔧 Troubleshooting

### Erro: "Cannot find module '../db'"

Verifique se existe `backend/src/db/index.js` e se o caminho de importação está correto nas rotas.

### Erro: "relation X does not exist"

Execute as migrations: `cd backend && npm run migrate`.

### Erro: "Credenciais inválidas" ao fazer login

1. Gere um novo hash bcrypt:
   ```powershell
   cd backend
   node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('Admin123!',12))"
   ```
2. Atualize o usuário:
   ```sql
   UPDATE users SET password_hash='HASH_GERADO' WHERE email='admin@impetus.com.br';
   ```

### Erro de CORS / API não responde

- Backend deve rodar na **porta 4000**
- O Vite proxy redireciona `/api` para `http://localhost:4000`
- Verifique se o backend está rodando antes do frontend

### Logo não aparece

Execute `npm run copy-logo` no frontend ou copie a imagem manualmente para `frontend/public/logo-impetus.jpg`.

### Licença inválida

Configure `LICENSE_VALIDATION_ENABLED=false` no `.env` do backend para ambiente de desenvolvimento.

---

## 📊 APIs para Teste Manual

Com o backend rodando na porta 4000:

```powershell
# Health check
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@impetus.com.br\",\"password\":\"Admin123!\"}"

# Usar o token retornado:
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" http://localhost:4000/api/admin/users
```

---

## ✅ Checklist de Teste

- [ ] Backend inicia na porta 4000
- [ ] Frontend inicia na porta 5173
- [ ] Login funciona (admin e colaborador)
- [ ] Colaborador é redirecionado para Pró-Ação
- [ ] Colaborador tem menu apenas com Pró-Ação
- [ ] Colaborador não acessa outras rotas (redirecionamento)
- [ ] Administrador vê Dashboard completo
- [ ] Página /app/admin/users carrega
- [ ] Criar, editar e resetar senha de usuário funcionam
- [ ] Página Pró-Ação carrega e lista propostas
- [ ] Chat identifica-se como "Impetus"
- [ ] Logo aparece no login e na sidebar

---

**Bons testes!** 🚀
