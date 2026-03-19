# 🚀 IMPETUS COMUNICA IA

*Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial*

[![Registro INPI](https://img.shields.io/badge/INPI-BR512025007048--9-blue)](https://www.gov.br/inpi)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)]()
[![React](https://img.shields.io/badge/react-18.2.0-blue)]()
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue)]()

---

## 👥 Autores

*Wellington Machado de Freitas* & *Gustavo Júnior da Silva*

Registro INPI: *BR512025007048-9* (30/12/2025)

---

## 📋 Sobre o Sistema

O *Impetus Comunica IA* é uma plataforma industrial de última geração que integra *3 pilares fundamentais*:

### 🎯 *Pilar 1: Comunicação Rastreada Inteligente*
- Canal unificado via **App Impetus Comunica IA** (canal de mensagens integrado)
- IA classifica e organiza mensagens em tempo real
- Agenda inteligente com lembretes proativos
- Monitoramento de conformidade com POPs
- Relatórios auditáveis e rastreabilidade total
- **App Impetus**: API outbox para envio/recebimento (`/api/app-impetus/*`)
- **App Communications**: API para app mobile com mídia (áudio, vídeo)
- **Chat interno**: WebSocket entre colaboradores

### 🔄 *Pilar 2: Pró-Ação (Melhoria Contínua)*
- Metodologia proprietária de melhoria contínua
- Integração das 7 Ferramentas Clássicas da Qualidade
- PDCA completo: Plan, Do, Check, Act
- Ferramentas: Ishikawa, Pareto, 5W2H, 5 Porquês, Kaizen
- Conecta chão de fábrica ↔ alta gestão
- Rotas: `/api/proacao`

### 🔧 *Pilar 3: Manutenção Assistida por IA*
- **ManuIA**: Módulo exclusivo para equipe de manutenção (técnico, supervisor, coordenador, gerente)
- Diagnóstico inteligente de falhas
- Máquinas, sensores, sessões e eventos de emergência
- Análise em manuais técnicos pré-carregados
- Respostas proativas via App Impetus Comunica IA
- Redução de downtime
- Melhoria de OEE (Overall Equipment Effectiveness)
- Rotas: `/api/manutencao-ia/*`, `/api/diagnostics`, `/api/dashboard/maintenance/*`

---

## 🏗️ Arquitetura

Em sigilo industrial.

### Estrutura do Projeto (Estado Atual)

```
impetus-completa/
├── backend/                    # Backend Node.js (raiz)
├── frontend/                   # Frontend React (raiz)
├── impetus_complete/           # Código principal completo
│   ├── backend/               # Backend com todas as rotas
│   └── frontend/              # Frontend (quando aplicável)
├── docs/                      # Documentação técnica
├── uploads/                   # Arquivos enviados (chat, communications)
├── INSTALACAO.md
├── COMO_RODAR.md
├── DEPLOY_PRODUCAO.md
└── teste.mp3
```

### Backend em Uso

O backend ativo está em **`impetus_complete/backend/`** (ou `backend/` na raiz conforme deploy).

---

## 🛠️ Tecnologias

### *Backend*
- *Node.js* 18+ (Runtime)
- *Express.js* (Framework)
- *PostgreSQL* 15+ (Banco de dados)
- *pgvector* (Embeddings para RAG - opcional)
- *OpenAI API* (GPT-4o + Embeddings)
- *Anthropic Claude* (@anthropic-ai/sdk - Tríade de IAs)
- *Google Gemini* (@google/genai - Tríade de IAs)
- *App Impetus Comunica IA* (Canal de mensagens integrado - substitui integração Z-API anterior)
- *Axios* (HTTP client)
- *Socket.io* (Chat interno em tempo real)

### *Frontend*
- *React 18* (UI Library)
- *Vite* (Build tool)
- *React Router 6* (Roteamento)
- *Recharts* (Gráficos)
- *Lucide React* (Ícones)
- *Axios* (API client)
- *date-fns* (Datas)
- *socket.io-client* (Chat em tempo real)

### *Infraestrutura*
- *Docker* (Containerização)
- *Docker Compose* (Orquestração)
- *PM2* (Process manager em produção)

---

## 🚀 Instalação e Configuração

> 📖 *Guia detalhado:* [INSTALACAO.md](INSTALACAO.md) | *Produção:* [DEPLOY_PRODUCAO.md](DEPLOY_PRODUCAO.md) | *Rodar:* [COMO_RODAR.md](COMO_RODAR.md)

### *Pré-requisitos*

- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm ou yarn
- Conta OpenAI (para IA)
- **App Impetus Comunica IA** (canal de mensagens integrado — sem configuração Z-API externa)

### *1. Clone o Repositório*

```bash
git clone <seu-repositorio>
cd impetus-completa
```

### *2. Configurar Banco de Dados*

```bash
# Criar banco de dados
createdb impetus_db

# Extensões necessárias
psql -d impetus_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -d impetus_db -c "CREATE EXTENSION IF NOT EXISTS vector;"  # opcional, para pgvector
```

### *3. Executar Migrations*

```bash
cd impetus_complete/backend   # ou backend/ conforme estrutura
npm install
npm run migrate
```

**Migrations incluídas (ordem):**
- Lacunas Indústria 4.0 (PLC, MES/ERP, Digital Twin)
- Manutenção operacional (monitored_points, work_orders)
- **ManuIA** (manuia_machines, manuia_sensors, manuia_sessions, etc.)
- Warehouse, qualidade, LGPD, segurança, etc.

### *4. Configurar Backend*

```bash
cd impetus_complete/backend  # ou backend/

# Copiar ambiente
cp ../.env.example .env

# Editar .env:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - OPENAI_API_KEY (obrigatório)
# - SALT (string aleatória para senhas)
# - Canal de mensagens: App Impetus (sem config Z-API)
```

### *5. Iniciar Backend*

```bash
npm run dev
```

*Backend rodando em:* http://localhost:4000

### *6. Configurar Frontend*

```bash
cd frontend

npm install

# Opcional: API em outro servidor
echo "VITE_API_URL=http://localhost:4000/api" > .env.local

npm run dev
```

*Frontend rodando em:* http://localhost:5173

---

## 🐳 Docker

### Desenvolvimento
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

- *Frontend:* http://localhost:3000 | *Backend:* http://localhost:4000

### Produção (build otimizado + nginx)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- *Aplicação:* http://localhost (porta 80)

---

## 📊 Estrutura do Banco de Dados

O sistema possui *40+ tabelas* organizadas por módulos:

### *Core*
- companies - Empresas (multi-tenant)
- departments - Departamentos/setores
- users - Usuários com hierarquia (RBAC)
- sessions - Sessões de autenticação

### *Comunicação*
- communications - Mensagens rastreadas
- app_impetus_outbox - Fila de mensagens App Impetus
- smart_reminders - Lembretes inteligentes
- pops - Procedimentos Operacionais Padrão
- pop_compliance_logs - Conformidade com POPs

### *Pró-Ação*
- proposals - Propostas de melhoria
- proposal_actions - Ações do PDCA
- quality_tools_applied - Ferramentas da qualidade
- action_plans_5w2h - Planos 5W2H

### *Manutenção*
- monitored_points - Equipamentos/sensores
- work_orders - Ordens de serviço
- maintenance_preventives - Preventivas programadas
- technical_interventions - Intervenções técnicas
- equipment_failures - Falhas registradas
- **ManuIA**: manuia_machines, manuia_sensors, manuia_sessions, manuia_history, manuia_emergency_events

### *Indústria 4.0*
- machine_monitoring_config - PLC (Modbus/OPC UA/REST)
- integration_connectors - MES/ERP
- production_shift_data - Produção tempo real
- digital_twin_machine_states - Digital Twin
- edge_agents - Edge computing

### *LGPD*
- lgpd_consents - Consentimentos
- data_access_logs - Logs de acesso
- lgpd_data_requests - Solicitações de dados
- audit_logs - Auditoria completa

---

## 📱 Integração App Impetus Comunica IA

> **Nota:** O canal de mensagens utiliza o **App Impetus Comunica IA**, canal integrado próprio. Referências antigas a Z-API/WhatsApp foram substituídas por este canal.

### *Funcionamento*

- **Envio:** Mensagens enfileiradas em `app_impetus_outbox`; o App Impetus busca via `GET /api/app-impetus/outbox`
- **Recebimento:** `POST /api/app-impetus/messages` — App envia mensagens recebidas
- **Status:** `GET /api/app-impetus/status` retorna `{ channel: 'app_impetus' }`

### *Funcionalidades*

- ✅ Recebimento de mensagens em tempo real
- ✅ Envio de mensagens (texto, imagem, documento)
- ✅ Classificação automática por IA
- ✅ Criação de tarefas a partir de mensagens
- ✅ Alertas proativos para equipes
- ✅ Mensagens proativas da IA (lembretes, follow-ups)

---

## 📈 Dashboard e Módulos

### *Dashboard Inteligente*
- Layout personalizado por perfil (CEO, diretor, gerente, coordenador, supervisor, colaborador)
- KPIs dinâmicos conforme área (produção, manutenção, qualidade)
- Centro de Comando / Dashboard Dinâmico
- Smart Summary, insights da IA, gráficos Recharts

### *ManuIA (Manutenção Assistida por IA)*
- **Rota frontend:** `/app/manutencao/manuia`
- **Rota API:** `/api/manutencao-ia/*`
- **Acesso:** Perfis technician_maintenance, supervisor_maintenance, coordinator_maintenance, manager_maintenance
- Máquinas, diagnóstico, sensores, sessões, eventos de emergência
- Integração com chat IA para suporte técnico

### *Outros Módulos*
- Centro de Previsão Operacional
- Centro de Custos Industriais
- Mapa de Vazamento Financeiro
- Almoxarifado Inteligente
- Logística Inteligente
- Qualidade Inteligente
- Detecção de Anomalias
- RH Inteligente
- Validação Organizacional

---

## 📖 API Endpoints (Principais)

### *Autenticação*
- POST /api/auth/login - Login
- POST /api/auth/logout - Logout
- POST /api/auth/register - Registro
- GET /api/auth/me - Usuário atual

### *Dashboard*
- GET /api/dashboard/me - Payload personalizado (perfil, KPIs, insights)
- GET /api/dashboard/personalizado - Config por perfil
- GET /api/dashboard/kpis - Indicadores dinâmicos
- GET /api/dashboard/maintenance/* - Manutenção (mecânico)

### *ManuIA*
- GET /api/manutencao-ia/machines - Lista máquinas
- GET /api/manutencao-ia/machines/:id/diagnostic - Diagnóstico
- GET /api/manutencao-ia/sensors - Sensores
- GET /api/manutencao-ia/sessions - Sessões
- POST /api/manutencao-ia/sessions - Nova sessão
- GET /api/manutencao-ia/emergency-events - Eventos emergência

### *App Impetus*
- GET /api/app-impetus/status - Status do canal
- GET /api/app-impetus/outbox - Mensagens pendentes (App busca)
- POST /api/app-impetus/messages - Receber mensagens do App

### *Comunicações*
- GET /api/communications - Listar
- POST /api/communications - Criar

### *Pró-Ação*
- GET /api/proacao - Listar propostas
- POST /api/proacao - Criar proposta
- POST /api/proacao/:id/evaluate - Avaliar com IA

### *Integrações Indústria 4.0*
- /api/integrations/mes-erp/* - MES/ERP
- /api/integrations/edge/ingest - Edge
- /api/integrations/digital-twin/* - Digital Twin

### *LGPD*
- POST /api/lgpd/consent - Registrar consentimento
- GET /api/lgpd/my-data - Exportar meus dados

---

## 🔐 Segurança e LGPD

O sistema está *conforme à LGPD*:

✅ *Consentimento explícito* obrigatório  
✅ *Logs de auditoria* para todas as ações  
✅ *Anonimização* de dados  
✅ *Portabilidade* de dados (Art. 18)  
✅ *Direito ao esquecimento*  
✅ *Rastreabilidade* completa  
✅ *Controle de acesso hierárquico* (RBAC)  

---

## 📁 Documentação Adicional

| Documento | Descrição |
|----------|-----------|
| [docs/IND4_ARQUITETURA.md](docs/IND4_ARQUITETURA.md) | PLC, MES/ERP, Digital Twin, Edge |
| [docs/CHECKLIST_DEPLOY.md](docs/CHECKLIST_DEPLOY.md) | Checklist produção |
| [GUIA_ATIVACAO_PENDENCIAS.md](GUIA_ATIVACAO_PENDENCIAS.md) | Ativação e pendências |
| [RELATORIO_VERIFICACAO_PONTOS.md](RELATORIO_VERIFICACAO_PONTOS.md) | Verificação de pontos |

---

## 🤝 Suporte

Para suporte técnico ou questões comerciais:

📧 *Email*: contato@impetus.com.br  
🌐 *Site*: [https://impetusvrb.wixsite.com/impetus]

---

## 📄 Licença

© 2025 *Wellington Machado de Freitas* & *Gustavo Júnior da Silva*

*Todos os direitos reservados.*

Este software é *propriedade privada* e protegido por direitos autorais e registro no INPI (BR512025007048-9).

*Proibido*:
- Cópia, redistribuição ou modificação sem autorização
- Uso comercial sem licença
- Engenharia reversa

---

## 🎯 Roadmap

- [x] MVP Completo
- [x] App Impetus Comunica IA (canal de mensagens integrado)
- [x] Dashboard Analytics
- [x] LGPD Compliance
- [x] Indústria 4.0 (PLC, MES/ERP, Digital Twin, Edge)
- [x] ManuIA (Manutenção assistida por IA)
- [x] Dashboard personalizado por perfil
- [ ] Módulo Mobile (React Native)
- [ ] Integrações ERP (SAP, TOTVS)
- [ ] IA Preditiva Avançada
- [ ] Multi-idioma (EN, ES)

---

*Desenvolvido com ❤️ no Brasil | Indústria 4.0*
