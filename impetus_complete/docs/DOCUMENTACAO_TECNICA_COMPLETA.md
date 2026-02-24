# IMPETUS COMUNICA IA — Documentação Técnica Completa

**Versão:** 1.0  
**Data:** 2025  
**Registro INPI:** BR512025007048-9 (30/12/2025)  
**Autores:** Wellington Machado de Freitas & Gustavo Júnior da Silva

---

## 1. VISÃO GERAL DO SISTEMA

O **Impetus Comunica IA** é uma plataforma industrial que implementa o processo registrado no INPI sob o número **BR512025007048-9**, integrando três pilares:

1. **Comunicação Rastreada Inteligente** — Captura, classificação e roteamento automático de mensagens via WhatsApp (Z-API)
2. **Pró-Ação (Melhoria Contínua)** — Metodologia PDCA com 7 ferramentas da qualidade (Ishikawa, Pareto, 5W2H, 5 Porquês, Kaizen)
3. **Manutenção Assistida por IA** — Diagnóstico de falhas com base em manuais técnicos indexados (embeddings + pgvector)

O sistema opera em modo **multi-tenant**, com suporte a múltiplas empresas, conformidade LGPD e arquitetura extensível.

---

## 2. IMPLEMENTAÇÃO DO PROCESSO INPI BR512025007048-9

### 2.1 Mapeamento Processo → Implementação

| Elemento do Processo | Implementação no Software |
|----------------------|---------------------------|
| **Captura automática de comunicações** | Webhook Z-API (`/api/webhook/zapi`), gravação em `communications` |
| **Classificação por IA** | `ai.classify()` em `backend/src/services/ai.js` — tipos: `tarefa`, `lembrete`, `comunicado`, `falha_técnica`, `autorização`, `alerta`, `dúvida`, `outro` |
| **Criação automática de tarefas** | `incomingMessageProcessor.createTaskFromMessage()` chamado por `ai.processIncomingMessage()` |
| **Diagnóstico de falhas** | `ai.generateDiagnosticReport()` usando embeddings em `manual_chunks` |
| **Manuais técnicos indexados** | Tabelas `manuals`, `manual_chunks` com vetor pgvector (1536 dimensões) |
| **Rastreabilidade** | `communications.ai_classification`, `related_task_id`, `processed_at` |
| **Resposta automática via WhatsApp** | `zapi.sendTextMessage()` após classificação |
| **Política Impetus** | Arquivo `backend/src/data/impetus-policy.md` carregado por `documentContext.getImpetusPolicy()` — sempre incluída no contexto da IA |
| **Documentação da empresa** | `companies.company_policy_text`, POPs, políticas — consultados via `documentContext.buildAIContext()` |
| **Pró-Ação / PDCA** | Propostas em `proposals`, fases em `proposal_actions`, ferramentas em `quality_tools_applied`, planos 5W2H em `action_plans_5w2h` |
| **Formulário TPM** | Sessões conversacionais via WhatsApp, persistência em `tpm_incidents`, `tpm_shift_totals` |

### 2.2 Fluxo de Comunicação (Processo Registrado)

```
[Operador/Colaborador] → WhatsApp
    ↓
[Z-API] → POST /api/webhook/zapi
    ↓
[Backend] zapi.processWebhook() → salva em communications
    ↓
[IA] tpmConversation.processMessage() — se ativo: fluxo TPM
    OU ai.processIncomingMessage() — classificação + tarefa/diagnóstico
    ↓
[Resposta] zapi.sendTextMessage() — confirmação ao remetente
```

---

## 3. ARQUITETURA DO SISTEMA

### 3.1 Estrutura de Diretórios

```
impetus_complete/
├── backend/                    # API Node.js + Express
│   ├── src/
│   │   ├── routes/             # Endpoints HTTP
│   │   │   ├── auth.js
│   │   │   ├── webhook.js      # Webhook genérico
│   │   │   ├── zapi_webhook.js # Webhook Z-API
│   │   │   ├── manuals.js
│   │   │   ├── tasks.js
│   │   │   ├── proacao.js
│   │   │   ├── alerts.js
│   │   │   ├── diagnostic.js
│   │   │   ├── diag_report.js
│   │   │   ├── tpm.js
│   │   │   ├── communications.js
│   │   │   ├── dashboard.js
│   │   │   ├── lgpd.js
│   │   │   └── admin/         # Administração
│   │   ├── services/           # Lógica de negócio
│   │   │   ├── ai.js           # Classificação e diagnóstico
│   │   │   ├── zapi.js         # Integração Z-API
│   │   │   ├── proacao.js
│   │   │   ├── documentContext.js  # Política + docs
│   │   │   ├── incomingMessageProcessor.js
│   │   │   ├── tpmConversation.js
│   │   │   ├── tpmFormService.js
│   │   │   ├── tpmNotifications.js
│   │   │   └── manuals.js
│   │   ├── middleware/        # Auth, LGPD, Rate limit
│   │   ├── models/             # Schemas SQL
│   │   ├── db/                  # Conexão PostgreSQL
│   │   ├── data/                # impetus-policy.md
│   │   └── utils/
│   └── scripts/                # Manutenção, migrations
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── features/
│   │   ├── context/
│   │   └── styles.css
│   └── vite.config.js          # Proxy /api → backend
│
├── infra/
│   └── postgres-init.sql       # Extensões pgcrypto, vector
├── docs/
└── .env.example
```

### 3.2 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js 18+, Express 4, pg (PostgreSQL) |
| Banco | PostgreSQL 15+, pgvector (embeddings) |
| IA | OpenAI API (gpt-4o-mini, text-embedding-3-small) |
| WhatsApp | Z-API (gateway oficial) |
| Frontend | React 18, Vite 5, React Router 6 |
| Auth | Token JWT-style, bcryptjs, sessões em DB |

---

## 4. APIs CRIADAS — REFERÊNCIA COMPLETA

### 4.1 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login (email + senha) |
| POST | `/api/auth/logout` | Encerra sessão |
| POST | `/api/auth/register` | Registro de usuário |
| GET | `/api/auth/me` | Usuário atual |

**Headers:** `Authorization: Bearer <token>` (rotas protegidas).

### 4.2 Webhooks (sem auth)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/webhook` | Webhook genérico (Twilio/Meta) — grava em `messages` |
| POST | `/api/webhook/zapi` | Webhook Z-API — grava em `communications`, processa IA e TPM |

### 4.3 Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/summary` | KPIs resumidos |
| GET | `/api/dashboard/trend` | Tendência operacional |
| GET | `/api/dashboard/insights` | Insights da IA |

### 4.4 Comunicações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/communications` | Listar comunicações |
| POST | `/api/communications` | Criar comunicação |
| GET | `/api/communications/:id` | Buscar por ID |

### 4.5 Pró-Ação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/proacao` | Listar propostas |
| POST | `/api/proacao` | Criar proposta |
| GET | `/api/proacao/:id` | Buscar proposta |
| POST | `/api/proacao/:id/evaluate` | Avaliar com IA |
| POST | `/api/proacao/:id/escalate` | Escalar para Projetos |
| POST | `/api/proacao/:id/assign` | Atribuir ao administrativo |
| POST | `/api/proacao/:id/record` | Registrar dados de fase |
| POST | `/api/proacao/:id/finalize` | Finalizar proposta |

### 4.6 Alertas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/alerts` | Listar alertas |
| POST | `/api/alerts` | Criar alerta |

### 4.7 Diagnóstico Assistido

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/diagnostic` | Executar diagnóstico |
| POST | `/api/diagnostic/validate` | Validar se há detalhes suficientes |
| GET | `/api/diagnostic/report/:id` | Relatório HTML do diagnóstico |

### 4.8 TPM (Formulário de Perdas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/tpm/incidents` | Listar incidentes TPM |
| GET | `/api/tpm/shift-totals` | Perdas por turno |

### 4.9 Manuais e Tarefas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/manuals` | Listar manuais |
| POST | `/api/manuals/upload` | Upload de manual (PDF) |
| GET | `/api/tasks` | Listar tarefas |

### 4.10 LGPD

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/lgpd/consent` | Registrar consentimento |
| GET | `/api/lgpd/my-data` | Exportar meus dados |
| POST | `/api/lgpd/data-request` | Solicitar ação (acesso, correção, exclusão) |

### 4.11 Administração

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | `/api/admin/users/*` | CRUD usuários |
| GET/POST | `/api/admin/departments/*` | CRUD departamentos |
| GET | `/api/admin/logs/*` | Logs de auditoria |
| GET/POST | `/api/admin/settings/*` | Configurações |

### 4.12 Health

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Status da API |
| GET | `/health` | Saúde (DB, memória, cache) |

---

## 5. BANCO DE DADOS

### 5.1 Ordem de Execução das Migrations

1. **Extensões:** `CREATE EXTENSION pgcrypto`, `vector` (infra/postgres-init.sql)
2. **Schema base:** `complete_schema.sql` — assume tabelas base do scaffold (`users`, `proposals`, `tasks`, `messages`, `manuals`, `manual_chunks`, `proposal_actions`, `alerts`). Se não existirem, o schema usa `ALTER TABLE` que falhará — é necessário ter migrations base ou executar scripts de scaffold primeiro.
3. **TPM:** `backend/scripts/run-tpm-migration.js` — executa `tpm_migration.sql`

```bash
npm run tpm-migrate   # Backend
```

### 5.2 Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `companies` | Multi-tenant |
| `departments` | Setores/hierarquia |
| `users` | Usuários com RBAC |
| `sessions` | Sessões de autenticação |
| `communications` | Mensagens rastreadas (Z-API, web) |
| `manuals` | Manuais técnicos |
| `manual_chunks` | Chunks com embedding embedding TEXT |
| `proposals` | Propostas Pró-Ação |
| `proposal_actions` | Ações PDCA e diagnósticos |
| `tasks` | Tarefas criadas pela IA |
| `tpm_incidents` | Incidentes TPM (perdas) |
| `tpm_form_sessions` | Sessões conversacionais TPM |
| `tpm_shift_totals` | Perdas agregadas por turno |
| `messages` | Webhook genérico (legado) |
| `audit_logs`, `data_access_logs` | LGPD e auditoria |
| `zapi_configurations`, `zapi_sent_messages` | Integração Z-API |

### 5.3 Índices Relevantes

- `manual_chunks`: `idx_manual_chunks_embedding` (ivfflat para similarity search) — ver `proacao_diag_migration.sql`
- `communications`: `idx_communications_company`, `idx_communications_created`, `idx_communications_status`
- `tpm_incidents`: `idx_tpm_incidents_company`, `idx_tpm_incidents_date`

---

## 6. LÓGICA DA IA E DO PROCESSO INPI

### 6.1 Política Impetus (Registro BR512025007048-9)

A política está em `backend/src/data/impetus-policy.md` e é **sempre** injetada no contexto da IA via `documentContext.buildAIContext()`.

Princípios:
- Conformidade com normas (NRs, NBRs, ANVISA, etc.)
- Segurança em primeiro lugar (LOTO, EPI)
- Preferência à documentação interna (POPs, políticas)
- Melhoria contínua (Pró-Ação)
- Rastreabilidade de comunicações
- Manutenção assistida com referência a manuais
- LGPD e limites legais

### 6.2 Contexto da IA (RAG)

A IA consulta, em ordem:
1. Política Impetus (obrigatória)
2. Política da empresa (`companies.company_policy_text`)
3. POPs da empresa (`pops`)
4. Manuais (via embeddings em `manual_chunks`)

### 6.3 Classificação de Mensagens

- **Entrada:** texto da mensagem
- **Saída:** uma de: `tarefa`, `lembrete`, `comunicado`, `falha_técnica`, `autorização`, `alerta`, `dúvida`, `outro`
- **Fallback:** `classifyByKeywords()` quando OpenAI falha ou não configurada

### 6.4 processIncomingMessage

1. Chama `classify(text)`
2. **Se falha_técnica:**
   - Busca manuais (`searchManualsForText`)
   - Gera relatório (`generateDiagnosticReport`)
   - Cria tarefa com descrição = relatório
   - Resposta Z-API: "Diagnóstico gerado e tarefa criada" + oferta formulário TPM
3. **Se tarefa:**
   - Cria tarefa com descrição = texto
   - Resposta Z-API: "Tarefa registrada com sucesso"
4. **Demais tipos:** retorna `{ kind }` sem criar tarefa

### 6.5 Diagnóstico Assistido

- `ensureSufficientDetail()`: valida texto (comprimento, keywords de sintoma)
- Se insuficiente: retorna `need_more_info` + perguntas
- **Safety mode:** confiança baixa quando < 2 trechos ou `avgDistance > 0.5` → pede mais informações
- **Disclaimer:** aviso de segurança para procedimentos elétricos/sob pressão

### 6.6 Formulário TPM (Pró-Ação em tempo real)

Fluxo conversacional via WhatsApp:
1. Após diagnóstico de falha, a IA oferece: "Houve perda ou desperdício? Responda SIM para preencher o formulário TPM"
2. Se operador responder SIM: inicia sessão em `tpm_form_sessions`
3. Perguntas sequenciais: data, hora, equipamento/componente, manutentor, causa raiz (COMP/AJUSTE/OPER), frequência, peça específica, ação corretiva, perdas antes/durante/após, nome do operador, observação, confirmação
4. Ao confirmar: grava em `tpm_incidents`, atualiza `tpm_shift_totals`, notifica gestores via WhatsApp e cria alerta em `alerts`

---

## 7. PROXY E INTEGRAÇÃO FRONTEND-BACKEND

O frontend (Vite) usa proxy para `/api` e `/uploads`:

```js
// vite.config.js
proxy: {
  '/api': { target: 'http://localhost:4000', changeOrigin: true },
  '/uploads': { target: 'http://localhost:4000', changeOrigin: true }
}
```

- Backend padrão: porta **4000**
- Frontend dev: porta **5173**

Links como `/api/diagnostic/report/:id` funcionam porque o frontend faz requisições relativas e o proxy encaminha ao backend.

---

## 8. VARIÁVEIS DE AMBIENTE

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Alternativa a DATABASE_URL |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `BASE_URL` / `FRONTEND_URL` | URL do frontend (para links em mensagens) |
| `ZAPI_*` | Configuração Z-API (por empresa em `zapi_configurations`) |
| `SALT` | Salt para tokens/licença |
| `ENCRYPTION_KEY` | Criptografia de tokens Z-API em DB |
| `AUDIT_LOG_RETENTION_DAYS` | Retenção de logs (padrão 90) |

---

## 9. SCRIPTS DE MANUTENÇÃO

| Script | Comando | Descrição |
|--------|---------|-----------|
| Backend dev | `npm run dev` | Nodemon + dotenv |
| Backend prod | `npm start` | node src/index.js |
| Health check | `npm run health-check` | Verifica saúde |
| Manutenção | `npm run maintenance` | Limpeza de sessões, logs, VACUUM |
| Manutenção dry | `npm run maintenance:dry` | Simulação |
| TPM migration | `npm run tpm-migrate` | Cria tabelas TPM |
| Pró-Ação worker | `npm run proacao-worker` | Regras e alertas |

---

## 10. SEGURANÇA E LGPD

- **Rate limiting:** login (5/15min), registro (10/h), API (200/min)
- **Helmet:** headers de segurança
- **RBAC:** hierarquia (1=Diretoria … 4=Colaborador), `permissions` JSONB
- **LGPD:** consentimentos, logs de acesso, solicitações de titulares, anonimização
- **Audit logs:** ações críticas em `audit_logs`
- **Licença:** middleware `requireValidLicense` em `/api`

---

## 11. MANUAL DE MANUTENÇÃO FUTURA

### 11.1 Adicionar Novo Tipo de Classificação

1. Atualizar `CLASSIFY_TYPES` em `backend/src/services/ai.js`
2. Ajustar prompt em `classify()`
3. Incluir tratamento em `processIncomingMessage()` se necessário

### 11.2 Adicionar Novo Campo ao Formulário TPM

1. Atualizar `PROMPTS` e `parseValue()` em `tpmConversation.js`
2. Incluir passo em `STEPS` em `tpmFormService.js`
3. Adicionar coluna em `tpm_incidents` via migration
4. Atualizar `saveIncident()` e `formatIncidentSummary()`

### 11.3 Alterar Política Impetus

Editar `backend/src/data/impetus-policy.md`. O arquivo é carregado em cache; reiniciar backend para atualizar.

### 11.4 Troubleshooting

- **IA não classifica:** verificar `OPENAI_API_KEY`, logs `[AI_ERROR]`
- **Webhook Z-API não recebe:** verificar `instance_id` em `zapi_configurations`, URL do webhook na Z-API
- **Tarefas não criadas:** verificar `tasks` table existe, logs `[INCOMING_MSG]`
- **Relatório HTML 404:** proxy ativo? Backend rodando na porta correta?
- **TPM não inicia:** migration executada? `tpm_form_sessions` existe?

---

## 12. REFERÊNCIAS

- **README principal:** `README.md`
- **Guia de instalação:** `docs/INSTALACAO.md`
- **Desempenho e manutenção:** `docs/DESEMPENHO_E_MANUTENCAO.md`
- **Política Impetus:** `backend/src/data/impetus-policy.md`
- **Schema completo:** `backend/src/models/complete_schema.sql`
- **Migration TPM:** `backend/src/models/tpm_migration.sql`
- **Script migrations unificado:** `npm run migrate` (executa migrations.sql → complete_schema.sql → tpm_migration.sql)

---

*Documentação gerada para manutenção do sistema Impetus Comunica IA — Registro INPI BR512025007048-9.*
