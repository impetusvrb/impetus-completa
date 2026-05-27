# IMPETUS — Governance Manifest v1.0

> **Documento executável de governança operacional.**  
> Fonte única de verdade para auditoria, compliance e operação do sistema.  
> Gerado: 2026-05-26 | Runtime: produção | Todas as flags ON.

---

## 1. Visão Geral

### Propósito

O IMPETUS é um sistema SaaS industrial (IIoT + MES + IA) multi-tenant que processa dados pessoais, operacionais e derivados por IA. Este manifest documenta **toda a cadeia de governança** activa em produção.

### Princípios Arquitecturais

| Princípio | Descrição | Implementação |
|-----------|-----------|---------------|
| **Deny-first** | Toda operação é negada até prova explícita de autorização | `runtimeStateEnforcementMiddleware.js`, visibility hardened |
| **Audit-first** | Toda mutação é registada antes de ser confirmada | `universalAuditMiddleware.js` (mode=on) |
| **Isolation-first** | Dados de um tenant nunca vazam para outro | `company_id` em todas as queries, scoping obrigatório |
| **Additive-only** | Mudanças nunca removem; adicionam camadas com fallback | Feature flags + rollback instantâneo |
| **Shadow-first** | Toda feature passa por dry-run antes de enforce | `off → audit → shadow → pilot → enforce` |
| **Fail-safe** | Falha de qualquer componente resulta em deny, não em exposição | `SAFE_MINIMAL_EXPOSURE` no frontend |

### Definição de "Produção Governada"

Um sistema em produção governada satisfaz **simultaneamente**:

1. Todas as flags críticas em modo activo (`on` / `enforce`)
2. Audit trail persistido e imutável
3. Retention workers executando purge/anonymize
4. DSR operacional (export + erase + notifications)
5. Runtime enforcement bloqueando execução indevida
6. AI anonymization activa (non-re-identification garantida)

**Estado actual: TODAS as condições satisfeitas.**

---

## 2. Mapa de Governança

| Domínio | Feature | Flag | Worker | Endpoint | Audit | Rollback |
|---------|---------|------|--------|----------|-------|----------|
| **DSR** | Export (Art. 18 II) | `IMPETUS_DSR_EXPORT=on` | — | `GET /api/lgpd/subject/me/export` | `audit_universal_log` + `lgpd_data_requests` | Flag → `off` |
| **DSR** | Erase (Art. 18 VI) | `IMPETUS_DSR_ERASE=on` | — | `POST /api/lgpd/subject/me/erase` | `audit_universal_log` + `lgpd_data_requests` | Flag → `off` |
| **DSR** | Notifications (SLA) | — | `dsrNotificationService` (6h) | — | `notifications` table | Scheduler stop |
| **Retention** | Policy Registry | `IMPETUS_RETENTION_REGISTRY=on` | — | `GET /api/admin/runtime/retention-registry` | Declarativo | — |
| **Retention** | Shadow Worker | `IMPETUS_RETENTION_MODE=enforce` | `retentionShadowWorker` (6h) | `GET /api/admin/runtime/retention-shadow` | Scan-only logs | — |
| **Retention** | Enforce Worker | `IMPETUS_RETENTION_MODE=enforce` | `retentionEnforceWorker` (24h) | `GET /api/admin/runtime/retention-enforce` | `audit_logs` por batch | Flag → `shadow` |
| **AI** | Anonymization SZ5 | `IMPETUS_AI_ANONYMIZATION=on` | `aiAnonymizationWorker` (12h) | `GET /api/admin/runtime/ai-anonymization` | `audit_logs` + DPO alerts | Flag → `audit` ou `off` |
| **Audit** | Universal Middleware | `IMPETUS_UNIVERSAL_AUDIT=on` | — | `GET /api/admin/runtime/state-enforcement` | `audit_universal_log` | Flag → `off` |
| **Enforcement** | Runtime State | `IMPETUS_RUNTIME_STATE_ENFORCEMENT=enforce` | — | `GET /api/admin/runtime/state-enforcement` | `audit_logs` + notifications | Flag → `audit` ou `off` |
| **Governance** | Flag Reconciler | `IMPETUS_FLAG_RECONCILER=on` | Boot-time | `GET /api/admin/runtime/flags/diagnostics` | Console structured | Flag → `off` |

---

## 3. Data Lifecycle & Custody Chain

### Diagrama de Ciclo de Vida

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         IMPETUS — DATA LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  INGEST  │───▶│   USE    │───▶│  AUDIT   │───▶│ RETENTION│───▶│  PURGE/  │  │
│  │          │    │          │    │          │    │          │    │  ANON    │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │               │         │
│       ▼               ▼               ▼               ▼               ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ users    │    │ chat_msg │    │ audit_   │    │ retention│    │ DELETE/  │  │
│  │ sessions │    │ ai_trace │    │ universal│    │ _policy  │    │ NULL/    │  │
│  │ consent  │    │ memoria  │    │ _log     │    │ _registry│    │ HASH     │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  IMUTÁVEL (nunca purge):  audit_logs, consent_logs, audit_universal_log         │
│  ANONIMIZÁVEL:            ai_interaction_traces, memoria_usuario, embeddings    │
│  PURGÁVEL (TTL):          chat_messages (365d), notifications (90d),            │
│                           session_context (30d), operational_memory (365d)       │
│  LEGALLY PROTECTED:       audit_logs (NEVER), consent_logs (NEVER)              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Onde o dado nasce

| Dado | Origem | Tabela | Scoping |
|------|--------|--------|---------|
| Cadastro | Registo do utilizador | `users` | `company_id` |
| Mensagens | Chat IA | `chat_messages` | `user_id` + `company_id` |
| Traces IA | LLM calls | `ai_interaction_traces` | `user_id` + `company_id` |
| Memória | Conversas resumidas | `memoria_usuario` | `user_id` + `company_id` |
| Embeddings | Vectorização | `manual_chunks` | `company_id` |
| Sessões | Login | `session_context` | `user_id` + `company_id` |
| Eventos | IoT / SCADA | `eventos_empresa` | `company_id` |
| Consentimento | Aceite do titular | `lgpd_consents` | `user_id` + `company_id` |

### Onde é auditado

| Operação | Tabela de Audit | Imutável |
|----------|----------------|----------|
| Toda mutação P0 (POST/PUT/PATCH/DELETE) | `audit_universal_log` | Sim |
| Acções admin | `audit_logs` | Sim |
| DSR requests | `lgpd_data_requests` | Sim |
| Consentimento | `lgpd_consents` | Sim |
| Runtime violations | `audit_logs` + `notifications` | Sim |

### Onde expira (Retention)

| Tabela | TTL | Acção | Worker |
|--------|-----|-------|--------|
| `session_context` | 30 dias | Purge | `retentionEnforceWorker` |
| `notifications` | 90 dias | Purge | `retentionEnforceWorker` |
| `ai_diagnostics` | 180 dias | Purge | `retentionEnforceWorker` |
| `chat_messages` | 365 dias | Purge | `retentionEnforceWorker` |
| `operational_memory` | 365 dias | Anonymize | `retentionEnforceWorker` |
| `ai_interaction_traces` | 180 dias | Anonymize | `retentionEnforceWorker` |

### Onde é anonimizado

| Tabela | Pipeline | Garantia |
|--------|----------|----------|
| `ai_interaction_traces` | `aiAnonymizationService.anonymizeTraces()` | Non-re-identification |
| `memoria_usuario` | `aiAnonymizationService.markSummariesForRegeneration()` | Summary regeneration |
| `manual_chunks` | `aiAnonymizationService.reEmbedOrphanedChunks()` | Embedding reset |

### Onde é legalmente imutável

| Tabela | Razão Legal | TTL |
|--------|-------------|-----|
| `audit_logs` | Art. 37 LGPD — Registro de operações | NEVER |
| `audit_universal_log` | Art. 37 LGPD — Registro de operações | NEVER |
| `consent_logs` / `lgpd_consents` | Art. 8 LGPD — Prova de consentimento | NEVER |
| `lgpd_data_requests` | Art. 18 LGPD — Histórico de requisições | NEVER |

---

## 4. LGPD Articles → Code Mapping

| Artigo LGPD | Direito / Obrigação | Implementação | Código | Flag | Evidência |
|-------------|---------------------|---------------|--------|------|-----------|
| **Art. 8** | Consentimento deve ser comprovável | Registro de consentimento com timestamp e scope | `routes/lgpd.js` → `POST /consent` | — | `lgpd_consents` table |
| **Art. 16** | Eliminação de dados pós-revogação | DSR Erase soft-delete + anonymization | `dsrEraseService.js` | `IMPETUS_DSR_ERASE=on` | `lgpd_data_requests` status=EXECUTED |
| **Art. 18, II** | Acesso / Portabilidade | DSR Export com approval flow | `dsrExportService.js` | `IMPETUS_DSR_EXPORT=on` | JSON export + `lgpd_data_requests` |
| **Art. 18, V** | Oposição ao tratamento | Erase request + DPO review | `routes/lgpd.js` → `POST /subject/me/erase` | `IMPETUS_DSR_ERASE=on` | `lgpd_data_requests` + notifications |
| **Art. 18, VI** | Eliminação de dados pessoais | Erase execution (soft-delete + anonymize) | `dsrEraseService.js` → `executeEraseRequest()` | `IMPETUS_DSR_ERASE=on` | Audit trail + execution status |
| **Art. 20** | Revisão de decisão automatizada | AI traces exportáveis + explicabilidade | `dsrExportService.js` (inclui `ai_interaction_traces`) | `IMPETUS_DSR_EXPORT=on` | Export JSON com input/output IA |
| **Art. 37** | Registro de operações de tratamento | Universal audit + retention registry | `universalAuditMiddleware.js` + `retentionPolicyRegistry.js` | `IMPETUS_UNIVERSAL_AUDIT=on` | `audit_universal_log` (153 policies) |

---

## 5. Live Runtime Evidence

### 5.1 Flags Activas (valores reais em produção)

```
IMPETUS_DSR_EXPORT=on
IMPETUS_DSR_ERASE=on
IMPETUS_DSR_ERASE_STRICT=off
IMPETUS_RETENTION_MODE=enforce
IMPETUS_RETENTION_BATCH_SIZE=100
IMPETUS_RETENTION_MAX_PER_RUN=500
IMPETUS_AI_ANONYMIZATION=on
IMPETUS_UNIVERSAL_AUDIT=on
IMPETUS_RUNTIME_STATE_ENFORCEMENT=enforce
IMPETUS_FLAG_RECONCILER=on
IMPETUS_FLAG_RECONCILER_STRICT=off
```

### 5.2 Schedulers Activos

| Scheduler | Intervalo | Ficheiro | Boot |
|-----------|-----------|----------|------|
| DSR SLA Scanner | 6h | `services/dsrNotificationService.js` | `server.js` |
| Retention Shadow | 6h | `workers/retentionShadowWorker.js` | `server.js` |
| Retention Enforce | 24h | `workers/retentionEnforceWorker.js` | `server.js` |
| AI Anonymization | 12h | `workers/aiAnonymizationWorker.js` | `server.js` |
| Flag Reconciler | Boot-time (once) | `governance/flagReconcilerRuntime.js` | `server.js` |

### 5.3 Workers em Execução

| Worker | Modo | Batch Size | Rate Limit |
|--------|------|------------|------------|
| `retentionEnforceWorker` | enforce | 100 | 500/run |
| `aiAnonymizationWorker` | on | — | 1 run/12h |
| `retentionShadowWorker` | scan-only | — | — |

### 5.4 Endpoints Admin de Verificação

| Endpoint | Método | Retorna |
|----------|--------|---------|
| `/api/admin/runtime/state-enforcement` | GET | Mode, stats, violations, alerts |
| `/api/admin/runtime/retention-registry` | GET | 153 policies, filtráveis |
| `/api/admin/runtime/retention-shadow` | GET | Shadow scan stats |
| `/api/admin/runtime/retention-enforce` | GET | Enforce execution stats |
| `/api/admin/runtime/retention/status` | GET | Status consolidado |
| `/api/admin/runtime/ai-anonymization` | GET | Pipeline diagnostics |
| `/api/admin/runtime/ai-anonymization/worker` | GET | Worker stats, alerts |
| `/api/admin/runtime/flags/effective` | GET | Todas as flags lidas |
| `/api/admin/runtime/flags/diagnostics` | GET | Conflicts, dependencies |
| `/api/admin/runtime/state-classification` | GET | 29 módulos classificados |

### 5.5 Logs Estruturados Esperados

| Prefixo | Significado | Severidade |
|---------|-------------|------------|
| `[RUNTIME_ENFORCEMENT]` | Bloqueio de execução | HIGH |
| `[RUNTIME_STATE]` | Classificação negada | MEDIUM |
| `[UNIVERSAL_AUDIT]` | Registo de mutação | INFO |
| `[RETENTION_ENFORCE]` | Purge/anonymize executado | HIGH |
| `[AI_ANON_WORKER]` | Pipeline de anonimização | HIGH |
| `[DSR_SLA_SCHEDULER]` | Alerta de SLA approaching | CRITICAL |
| `[FLAG_RECONCILER]` | Conflito de flags detectado | WARNING |

---

## 6. External Audit Readiness

### 6.1 Checklist de Auditor

| # | Item | Onde verificar | Resultado esperado |
|---|------|----------------|-------------------|
| 1 | Consentimento registado | `SELECT * FROM lgpd_consents WHERE user_id = ?` | Registos com timestamp, scope, version |
| 2 | Audit trail de mutações | `SELECT * FROM audit_universal_log WHERE tenant_id = ? ORDER BY timestamp DESC` | Todas as operações POST/PUT/PATCH/DELETE |
| 3 | DSR Export funcional | `GET /api/lgpd/subject/me/export` (autenticado) | Request criada com status PENDING |
| 4 | DSR Erase funcional | `POST /api/lgpd/subject/me/erase` (autenticado) | Request criada com approval flow |
| 5 | Retention activa | `GET /api/admin/runtime/retention/status` | Mode=enforce, last_run populated |
| 6 | AI non-re-identification | `GET /api/admin/runtime/ai-anonymization/worker` | Alerts=0, mode=on |
| 7 | Runtime enforcement | `GET /api/admin/runtime/state-enforcement` | Mode=enforce, denied>0 se violation |
| 8 | Multi-tenant isolation | `SELECT * FROM chat_messages WHERE company_id != ?` (should be empty for tenant scope) | Zero cross-tenant leakage |
| 9 | Dados imutáveis preservados | `SELECT COUNT(*) FROM audit_logs` | Nunca decresce |
| 10 | Flag governance | `GET /api/admin/runtime/flags/conflicts` | Zero conflitos activos |

### 6.2 Onde cada evidência pode ser verificada

| Evidência | Fonte Primária | Fonte Secundária |
|-----------|----------------|------------------|
| Prova de consentimento | `lgpd_consents` | `audit_universal_log` (POST /consent) |
| Prova de eliminação | `lgpd_data_requests` (status=EXECUTED) | `audit_logs` (action=dsr_erase_*) |
| Prova de portabilidade | `lgpd_data_requests` (type=export, status=EXECUTED) | JSON export file |
| Prova de retention | `audit_logs` (action=retention_enforce_*) | Worker stats via admin API |
| Prova de anonimização IA | `audit_logs` (action=ai_anonymization_*) | `ai_interaction_traces.input_payload._anonymized` |
| Prova de bloqueio indevido | `audit_logs` (action=runtime_state_violation) | `notifications` (type=runtime_state_violation) |

### 6.3 O que é imutável

| Artefacto | Protecção | Reversível |
|-----------|-----------|------------|
| `audit_logs` | Retention policy = NEVER | **Não** |
| `audit_universal_log` | Retention policy = NEVER | **Não** |
| `lgpd_consents` | Retention policy = NEVER | **Não** |
| `lgpd_data_requests` | Retention policy = NEVER | **Não** |
| Runtime enforcement logs | Persistidos em `audit_logs` | **Não** |

### 6.4 O que é reversível

| Operação | Mecanismo de Rollback | Tempo |
|----------|----------------------|-------|
| DSR Export | Flag `IMPETUS_DSR_EXPORT=off` | Instantâneo |
| DSR Erase | Flag `IMPETUS_DSR_ERASE=off` | Instantâneo |
| Retention enforce | Flag `IMPETUS_RETENTION_MODE=shadow` | Instantâneo (dados já purgados não retornam) |
| AI Anonymization | Flag `IMPETUS_AI_ANONYMIZATION=off` | Instantâneo (traces já anon. não revertem) |
| Universal Audit | Flag `IMPETUS_UNIVERSAL_AUDIT=off` | Instantâneo |
| Runtime Enforcement | Flag `IMPETUS_RUNTIME_STATE_ENFORCEMENT=off` | Instantâneo |

### 6.5 O que exige DPO Approval

| Acção | Quem pode aprovar | Endpoint |
|-------|-------------------|----------|
| DSR Export execution | `hierarchy_level ≤ 1` | `POST /api/lgpd/subject/export/:id/approve` |
| DSR Erase execution | `hierarchy_level ≤ 1` | `POST /api/lgpd/subject/erase/:id/approve` |
| DSR Rejection | `hierarchy_level ≤ 1` + justificativa legal | `POST /api/lgpd/subject/erase/:id/reject` |
| AI Anonymization activation | Configuração de flag (devops/DPO) | `.env` → PM2 restart |
| Retention enforce activation | Configuração de flag (devops/DPO) | `.env` → PM2 restart |

---

## 7. Correlação End-to-End

### DSR → Retention → AI → Audit → Enforcement

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE CORRELATION CHAIN                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TITULAR ──▶ DSR Request ──▶ DPO Approval ──▶ Execution                 │
│       │                                            │                      │
│       │                                            ▼                      │
│       │                                     ┌─────────────┐              │
│       │                                     │ RETENTION   │              │
│       │                                     │ (purge TTL) │              │
│       │                                     └──────┬──────┘              │
│       │                                            │                      │
│       │                                            ▼                      │
│       │                                     ┌─────────────┐              │
│       │                                     │ AI ANON     │              │
│       │                                     │ (non-re-id) │              │
│       │                                     └──────┬──────┘              │
│       │                                            │                      │
│       ▼                                            ▼                      │
│  ┌─────────┐                               ┌─────────────┐              │
│  │ AUDIT   │◀──────────────────────────────│ AUDIT TRAIL │              │
│  │ (NEVER  │  Cada passo é registado       │ (immutable) │              │
│  │  purge) │                               └─────────────┘              │
│  └────┬────┘                                                             │
│       │                                                                   │
│       ▼                                                                   │
│  ┌─────────────────────┐                                                 │
│  │ RUNTIME ENFORCEMENT │  Bloqueia execução indevida em qualquer passo  │
│  │ (deny-first gate)   │                                                 │
│  └─────────────────────┘                                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Fluxo DSR Erase completo (exemplo)

1. Titular submete `POST /api/lgpd/subject/me/erase`
2. **Universal Audit** regista a operação em `audit_universal_log`
3. **Runtime Enforcement** valida que `lgpd.anonymize` é EXECUTION (permite)
4. Request persiste em `lgpd_data_requests` (status=PENDING)
5. **Notification** enviada ao DPO team
6. DPO aprova via `POST /api/lgpd/subject/erase/:id/approve`
7. DPO executa via `POST /api/lgpd/subject/erase/:id/execute`
8. Soft-delete aplicado nas tabelas do titular
9. **AI Anonymization Worker** (próximo ciclo 12h) anonimiza traces
10. **Retention Worker** (próximo ciclo 24h) purga dados expirados
11. Audit trail completo preservado em `audit_logs` (NEVER purge)
12. **SLA Scanner** (6h) monitora deadlines pendentes

---

## 8. Resumo Quantitativo

| Métrica | Valor |
|---------|-------|
| Flags críticas activas | 6/6 |
| Retention policies declaradas | 153 |
| Módulos classificados (runtime) | 29 |
| Tabelas com TTL definido | 75 (purge: 53, anonymize: 22) |
| Tabelas legalmente imutáveis | 78 (retain: NEVER) |
| Schedulers activos | 5 |
| Endpoints admin de observabilidade | 10 |
| Artigos LGPD cobertos | 7 (Art. 7, 8, 16, 18, 20, 37, 41) |
| Modos de rollback | 6 (todos instantâneos por flag) |
| Estágios de execução | 5 (OBSERVABILITY → AUTHORITATIVE) |

---

## 9. Versionamento

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-26 | Criação — todas as 6 flags activas, enforcement em produção |

---

> **Este documento é a fonte única de verdade para auditorias internas e externas.**  
> Qualquer divergência entre este manifest e o estado real do sistema deve ser reportada ao DPO.
