# 🚀 IMPETUS COMUNICA IA - Plataforma de Inteligência Operacional Industrial

**Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial**

[![Registro INPI](https://img.shields.io/badge/INPI-BR512025007048--9-blue)](https://www.gov.br/inpi)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)]()
[![React](https://img.shields.io/badge/react-18.2.0-blue)]()
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue)]()

---

## 👥 Autores

**Wellington Machado de Freitas** & **Gustavo Júnior da Silva**

Registro INPI: **BR512025007048-9** (30/12/2025)

---

## 📋 Sobre o Sistema

O **Impetus Comunica IA** é uma plataforma industrial de última geração que integra **3 pilares fundamentais**:

### 🎯 **Pilar 1: Comunicação Rastreada Inteligente**
- Captura automática de comunicações via App Impetus
- IA classifica e organiza mensagens em tempo real
- Agenda inteligente com lembretes proativos
- Monitoramento de conformidade com POPs
- Relatórios auditáveis e rastreabilidade total

### 🔄 **Pilar 2: Pró-Ação (Melhoria Contínua)**
- Metodologia proprietária de melhoria contínua
- Integração das 7 Ferramentas Clássicas da Qualidade
- PDCA completo: Plan, Do, Check, Act
- Ferramentas: Ishikawa, Pareto, 5W2H, 5 Porquês, Kaizen
- Conecta chão de fábrica ↔ alta gestão

### 🔧 **Pilar 3: Manutenção Assistida por IA**
- Diagnóstico inteligente de falhas
- Análise em manuais técnicos pré-carregados
- Respostas proativas via App Impetus
- Redução de downtime
- Melhoria de OEE (Overall Equipment Effectiveness)

---

## 🏗️ Arquitetura

```
impetus_complete/
├── backend/              # API Node.js + Express
│   ├── src/
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Lógica de negócio
│   │   ├── middleware/   # Auth, LGPD, Audit
│   │   ├── models/       # Schemas PostgreSQL
│   │   └── db/           # Conexão banco de dados
│   └── package.json
│
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── services/     # API client (Axios)
│   │   └── styles.css    # Design System
│   └── package.json
│
├── infra/                # PostgreSQL init scripts
├── .env.example          # Template de variáveis
└── README.md
```

---

## 🛠️ Tecnologias

### **Backend**
- **Node.js** 18+ (Runtime)
- **Express.js** (Framework)
- **PostgreSQL** 15+ (Banco de dados)
- **pgvector** (Embeddings para RAG)
- **OpenAI API** (GPT-4o-mini + Embeddings)
- **App Impetus** (canal de mensagens)
- **Axios** (HTTP client)

### **Frontend**
- **React 18** (UI Library)
- **React Router** (Roteamento)
- **Recharts** (Gráficos)
- **Lucide React** (Ícones)
- **Axios** (API client)
- **date-fns** (Datas)

### **Infraestrutura**
- **Docker** (Containerização)
- **Docker Compose** (Orquestração)

---

## 🚀 Instalação e Configuração

> 📖 **Guia detalhado:** [docs/INSTALACAO.md](docs/INSTALACAO.md) | **Produção:** [docs/PRODUCAO.md](docs/PRODUCAO.md)

### **Pré-requisitos**

- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm ou yarn
- Conta OpenAI (para IA)
- App Impetus (canal integrado)

### **1. Clone o Repositório**

```bash
git clone <seu-repositorio>
cd impetus_complete
```

### **2. Configurar Banco de Dados**

```bash
# Criar banco de dados
createdb impetus_db

# Executar migrations (ordem obrigatória)
cd backend
npm run migrate

# Criar usuário internal_admin (ativação comercial)
npm run seed
```

### **3. Configurar Backend**

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp ../.env.example .env

# Editar .env com suas credenciais:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - OPENAI_API_KEY
# - SALT (gere uma string aleatória)

# Iniciar servidor
npm run dev
```

**Backend rodando em:** `http://localhost:4000` (ou `PORT` definido no .env)

> 📋 **Ativação Comercial:** Migrations + seed + SMTP + uso da rota de ativação em [docs/ATIVACAO_COMERCIAL.md](docs/ATIVACAO_COMERCIAL.md)

### **4. Configurar Frontend**

```bash
cd frontend

# Instalar dependências
npm install

# Criar arquivo .env.local (opcional)
echo "VITE_API_URL=http://localhost:4000/api" > .env.local

# Iniciar aplicação
npm run dev
```

**Frontend rodando em:** `http://localhost:5173`

---

## 🐳 Docker

### Desenvolvimento
```bash
# Subir todos os serviços (inclui migrations automáticas)
docker-compose up -d

# Verificar logs
docker-compose logs -f

# Parar serviços
docker-compose down
```
- **Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

### Produção (build otimizado + nginx)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
- **Aplicação:** http://localhost (porta 80)

Guia completo: [docs/INSTALACAO.md](docs/INSTALACAO.md)

### **5. Produção (Servidor Industrial)**

```bash
cd backend

# Variáveis para produção
cp ../.env.production.example .env
# Edite .env com credenciais reais

# PM2 (restart automático)
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # inicia com o sistema

# Manutenção (cron diário às 3h)
# 0 3 * * * cd /path/backend && npm run maintenance

# Health check (monitoramento)
npm run health-check
```

**Scripts disponíveis:** `maintenance`, `maintenance:dry`, `health-check` — ver `docs/DESEMPENHO_E_MANUTENCAO.md`.

---

## 📊 Estrutura do Banco de Dados

O sistema possui **30+ tabelas** organizadas por módulos:

### **Core**
- `companies` - Empresas (multi-tenant)
- `departments` - Departamentos/setores
- `users` - Usuários com hierarquia (RBAC)
- `sessions` - Sessões de autenticação

### **Comunicação**
- `communications` - Mensagens rastreadas
- `smart_reminders` - Lembretes inteligentes
- `pops` - Procedimentos Operacionais Padrão
- `pop_compliance_logs` - Conformidade com POPs

### **Pró-Ação**
- `proposals` - Propostas de melhoria
- `proposal_actions` - Ações do PDCA
- `quality_tools_applied` - Ferramentas da qualidade
- `action_plans_5w2h` - Planos 5W2H

### **Manutenção**
- `monitored_points` - Equipamentos/sensores
- `equipment_failures` - Falhas registradas
- `ai_diagnostics` - Diagnósticos da IA
- `manuals` + `manual_chunks` - Manuais técnicos

### **LGPD**
- `lgpd_consents` - Consentimentos
- `data_access_logs` - Logs de acesso
- `lgpd_data_requests` - Solicitações de dados
- `audit_logs` - Auditoria completa

### **Mensagens (App Impetus)**
- `app_impetus_outbox` - Mensagens pendentes para o App
- `communications` - Comunicações rastreadas por empresa

---

## 🔐 Segurança e LGPD

O sistema está **100% conforme à LGPD**:

✅ **Consentimento explícito** obrigatório  
✅ **Logs de auditoria** para todas as ações  
✅ **Anonimização** de dados  
✅ **Portabilidade** de dados (Art. 18)  
✅ **Direito ao esquecimento**  
✅ **Rastreabilidade** completa  
✅ **Controle de acesso hierárquico** (RBAC)  

---

## 📱 Canal de Comunicação (App Impetus)

O canal de mensagens é o **App Impetus**, integrado ao backend via API.

### **Rotas**

- **Entrada:** `POST /api/app-impetus/messages` — App envia mensagens dos usuários
- **Saída:** `GET /api/app-impetus/outbox` — App busca mensagens pendentes
- **Status:** `GET /api/app-impetus/status` — Estado da conexão

### **Funcionalidades**

- ✅ Recebimento de mensagens em tempo real
- ✅ Envio de mensagens (texto, imagem, documento)
- ✅ Classificação automática por IA
- ✅ Criação de tarefas a partir de mensagens
- ✅ Alertas proativos para equipes

---

## 📈 Dashboard

O dashboard exibe em tempo real:

- **Interações Operacionais** (total + crescimento semanal)
- **Insights Acionáveis da IA** (prioridade alta/crítica)
- **Pontos Monitorados** (sensores + máquinas)
- **Gráfico de Tendência** (últimos 6 meses)
- **Distribuição de Pontos** (Pizza chart)
- **Insights Prioritários** (alertas da IA)
- **Feed de Interações Recentes**

---

## 🧪 Testes

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## 📖 API Endpoints

### **Autenticação**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Usuário atual

### **Dashboard**
- `GET /api/dashboard/summary` - Resumo KPIs
- `GET /api/dashboard/trend` - Tendência operacional
- `GET /api/dashboard/insights` - Insights da IA

### **Comunicações**
- `GET /api/communications` - Listar
- `POST /api/communications` - Criar
- `GET /api/communications/:id` - Buscar

### **Pró-Ação**
- `GET /api/proacao` - Listar propostas
- `POST /api/proacao` - Criar proposta
- `POST /api/proacao/:id/evaluate` - Avaliar com IA

### **LGPD**
- `POST /api/lgpd/consent` - Registrar consentimento
- `GET /api/lgpd/my-data` - Exportar meus dados
- `POST /api/lgpd/data-request` - Solicitar ação

---

## 🤝 Suporte

Para suporte técnico ou questões comerciais:

📧 **Email**: contato@impetus.com.br  
🌐 **Site**: [https://impetusvrb.wixsite.com/impetus]

---

## 📄 Licença

© 2025 **Wellington Machado de Freitas** & **Gustavo Júnior da Silva**

**Todos os direitos reservados.**

Este software é **propriedade privada** e protegido por direitos autorais e registro no INPI (BR512025007048-9).

**Proibido**:
- Cópia, redistribuição ou modificação sem autorização
- Uso comercial sem licença
- Engenharia reversa

---

## 🎯 Roadmap

- [x] MVP Completo
- [x] Canal App Impetus
- [x] Dashboard Analytics
- [x] LGPD Compliance
- [ ] Módulo Mobile (React Native)
- [ ] Integrações ERP (SAP, TOTVS)
- [ ] IA Preditiva Avançada
- [ ] Multi-idioma (EN, ES)

---

**Desenvolvido com ❤️ no Brasil | Indústria 4.0**
