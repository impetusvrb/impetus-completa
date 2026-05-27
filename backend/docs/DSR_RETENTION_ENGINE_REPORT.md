# DSR + Retention Engine — Relatório Técnico & Legal

> **Versão:** 1.0  
> **Data:** 2026-05-27  
> **Status:** Produção Governada (todas as flags ON, evidência comprovada)  
> **Baseline:** GOVERNANCE_REALITY_AUDIT_REPORT_v2.md

---

## 1. Visão Geral

O IMPETUS implementa um DSR (Data Subject Rights) + Retention Engine enterprise-grade que cobre:

- **DSR Export** (Art. 18, II LGPD — Portabilidade)
- **DSR Erase** (Art. 18, VI LGPD — Eliminação)
- **Retention Policies** (Art. 16 LGPD — Eliminação pós-tratamento)
- **Policy Transparency** (Art. 9 LGPD — Informação ao titular)
- **AI Anonymization** (Art. 20 LGPD — Decisão automatizada)

---

## 2. Endpoints Implementados

### 2.1 DSR Export

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/lgpd/subject/me/export` | GET | requireAuth | Submeter pedido de exportação |
| `/api/lgpd/subject/me/export/status` | GET | requireAuth | Consultar estado do pedido |
| `/api/lgpd/subject/export/:id/approve` | POST | hierarchy ≤ 1 | DPO aprova |
| `/api/lgpd/subject/export/:id/execute` | POST | hierarchy ≤ 1 | DPO executa |
| `/api/lgpd/subject/export/:id/reject` | POST | hierarchy ≤ 1 | DPO rejeita (justificativa legal) |

**Flag:** `IMPETUS_DSR_EXPORT=on`  
**SLA:** 21 dias corridos  
**Formato:** JSON estruturado versionado  
**Prova:** Request `17aa0137` — 805 registos exportados em 21 secções

### 2.2 DSR Erase

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/lgpd/subject/me/erase` | POST | requireAuth | Submeter pedido de eliminação |
| `/api/lgpd/subject/me/erase/status` | GET | requireAuth | Consultar estado |
| `/api/lgpd/subject/erase/:id/approve` | POST | hierarchy ≤ 1 | DPO aprova |
| `/api/lgpd/subject/erase/:id/execute` | POST | hierarchy ≤ 1 | DPO executa |
| `/api/lgpd/subject/erase/:id/reject` | POST | hierarchy ≤ 1 | DPO rejeita |

**Flag:** `IMPETUS_DSR_ERASE=on`  
**SLA:** 21 dias corridos  
**Rollback window:** 72h  
**Prova:** Request `3649e30d` — 828 registos afectados em 19 tabelas

### 2.3 Policy Transparency

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/lgpd/policy` | GET | requireAuth | Consultar políticas de retenção aplicáveis |

Retorna: policies PII/DSR-erasable, DSR info (endpoints, SLA), artigos LGPD cobertos.

---

## 3. Retention Engine

### 3.1 Registry (154 policies)

**Ficheiro:** `backend/src/governance/retentionPolicyRegistry.js`

| Métrica | Valor |
|---------|-------|
| Total policies | 154 |
| PII/DSR-erasable | 50 |
| Purge | 53 |
| Anonymize | 22 |
| Retain (NEVER) | 79 |

### 3.2 Enforce Worker (11 targets)

**Ficheiro:** `backend/src/workers/retentionEnforceWorker.js`

| Tabela | Acção | TTL | Tenant-scoped |
|--------|-------|-----|---------------|
| `industrial_event_outbox` | purge | 14d | company_id |
| `industrial_event_dlq` | purge | 90d | — |
| `app_impetus_outbox` | purge | 14d | — |
| `sessions` | purge | 30d | — |
| `notifications` | purge | 90d | company_id |
| `operational_memory` | anonymize | 365d | company_id |
| `chat_messages` | anonymize | 730d | — |
| `internal_chat_messages` | anonymize | 730d | company_id |
| `user_activity_logs` | purge | 180d | company_id |
| `dashboard_usage_events` | purge | 180d | company_id |
| `eventos_empresa` | anonymize | 365d | company_id |

**Scheduler:** 24h (1 run/dia)  
**Batch size:** 100 (configurável via `IMPETUS_RETENTION_BATCH_SIZE`)  
**Max per table:** 500 (configurável via `IMPETUS_RETENTION_MAX_PER_RUN`)  
**Kill-switch:** `IMPETUS_RETENTION_MODE=off|shadow`

### 3.3 Shadow Worker (scan-only)

**Ficheiro:** `backend/src/workers/retentionShadowWorker.js`

Executa scan sem mutations a cada 6h. Serve como observabilidade e baseline para o enforce.

### 3.4 Tabelas adicionais no Registry (sem enforce worker activo)

| Tabela | TTL | Acção | Razão |
|--------|-----|-------|-------|
| `z_conversation_message_index` | 730d | purge | Acompanha chat_messages; tabela não existe ainda na BD |
| `eventos_empresa` | 365d | anonymize | ✅ Enforce worker activo |

---

## 4. Fluxo Operacional

### 4.1 DSR Export

```
TITULAR → GET /subject/me/export → PENDING
                                      ↓
DPO ← Notification (priority: medium) ← SLA Scanner (6h)
 ↓
POST /export/:id/approve → APPROVED
 ↓
POST /export/:id/execute → EXECUTED (JSON export, 21 secções)
 ↓
audit_universal_log + lgpd_data_requests (status=completed)
```

### 4.2 DSR Erase

```
TITULAR → POST /subject/me/erase → PENDING
                                      ↓
DPO ← Notification (priority: high) ← SLA Scanner (6h)
 ↓
POST /erase/:id/approve → APPROVED
 ↓
POST /erase/:id/execute → EXECUTED (soft-delete + anonymize)
 ↓
19 tabelas processadas (delete/anonymize conforme tipo)
 ↓
72h rollback window
 ↓
audit_logs + lgpd_data_requests (status=completed)
```

### 4.3 Retention Lifecycle

```
BOOT → retentionShadowWorker (scan, 6h)
     → retentionEnforceWorker (purge/anonymize, 24h)
                ↓
     Para cada tabela target:
       1. Consultar TTL do retentionPolicyRegistry
       2. Calcular threshold (NOW - TTL_days)
       3. Executar em batches (100 rows)
       4. Audit trail em audit_logs
       5. Log estruturado [RETENTION_ENFORCE]
```

---

## 5. Garantias Arquitecturais

| Garantia | Implementação |
|----------|---------------|
| **Additive-only** | Nenhuma remoção de código existente; apenas adição de targets e endpoint |
| **Multi-tenant safety** | `company_id` em todas as queries de erase e anonymize |
| **Rollback safety** | Kill-switch por flag (`off`/`shadow`), rollback window 72h para erase |
| **Auditabilidade** | `audit_universal_log` (middleware), `audit_logs` (workers), `lgpd_data_requests` (DSR) |
| **Tenant isolation** | Scoping obrigatório em export, erase, e retention |
| **Cross-thread safety** | Batching com pause (150ms entre batches), max 500/table/run |
| **LGPD compliance** | Art. 9, 16, 18 (II, V, VI), 20, 37 mapeados a código |
| **ANPD readiness** | Audit trail imutável, SLA tracking, DPO workflow, policy transparency |

---

## 6. Flags Envolvidas

| Flag | Valor | Impacto |
|------|-------|---------|
| `IMPETUS_DSR_EXPORT` | on | Habilita pipeline de exportação |
| `IMPETUS_DSR_ERASE` | on | Habilita pipeline de eliminação |
| `IMPETUS_DSR_ERASE_STRICT` | off | Se on, erase irreversível (sem rollback window) |
| `IMPETUS_RETENTION_MODE` | enforce | shadow\|pilot\|enforce |
| `IMPETUS_RETENTION_BATCH_SIZE` | 100 | Rows por batch |
| `IMPETUS_RETENTION_MAX_PER_RUN` | 500 | Máximo por tabela por run |
| `IMPETUS_AI_ANONYMIZATION` | on | Pipeline de anonimização IA |
| `IMPETUS_UNIVERSAL_AUDIT` | on | Audit trail de mutações P0 |

---

## 7. Matriz Legal LGPD

| Artigo | Direito | Endpoint/Serviço | Flag |
|--------|---------|-------------------|------|
| Art. 9 | Transparência | `GET /api/lgpd/policy` | — |
| Art. 16 | Eliminação pós-tratamento | `retentionEnforceWorker` | `IMPETUS_RETENTION_MODE` |
| Art. 18, II | Portabilidade | `GET /api/lgpd/subject/me/export` | `IMPETUS_DSR_EXPORT` |
| Art. 18, V | Oposição | `POST /api/lgpd/subject/me/erase` | `IMPETUS_DSR_ERASE` |
| Art. 18, VI | Eliminação | `POST /api/lgpd/subject/erase/:id/execute` | `IMPETUS_DSR_ERASE` |
| Art. 20 | Revisão de decisão IA | Export inclui `ai_interaction_traces` | `IMPETUS_DSR_EXPORT` |
| Art. 37 | Registro de operações | `audit_universal_log` + `audit_logs` | `IMPETUS_UNIVERSAL_AUDIT` |

---

## 8. Estratégias de Rollback

| Componente | Rollback | Tempo |
|------------|----------|-------|
| DSR Export | `IMPETUS_DSR_EXPORT=off` | Instantâneo |
| DSR Erase | `IMPETUS_DSR_ERASE=off` | Instantâneo |
| Retention enforce | `IMPETUS_RETENTION_MODE=shadow` | Instantâneo (dados purgados não retornam) |
| AI Anonymization | `IMPETUS_AI_ANONYMIZATION=off` | Instantâneo |
| Novo endpoint `/policy` | Remover rota do ficheiro | Zero impacto |

---

## 9. Riscos Mitigados

| Risco | Mitigação |
|-------|-----------|
| Eliminação acidental | Approval flow DPO + rollback 72h |
| Retenção infinita | Enforce worker com TTL declarativo por tabela |
| Exposição cross-tenant | `company_id` scope em todas as queries |
| Purge de dados legais | `audit_immutable` class protegida pelo enforce worker |
| Perda de evidência | `audit_logs` e `lgpd_data_requests` com TTL=NEVER |

---

## 10. Artefactos

| Ficheiro | Tipo |
|----------|------|
| `backend/src/routes/lgpd.js` | Endpoints DSR + Policy |
| `backend/src/services/dsrExportService.js` | Pipeline de exportação |
| `backend/src/services/dsrEraseService.js` | Pipeline de eliminação |
| `backend/src/services/dsrNotificationService.js` | Notificações DSR |
| `backend/src/governance/retentionPolicyRegistry.js` | 154 policies declarativas |
| `backend/src/workers/retentionShadowWorker.js` | Scan-only (6h) |
| `backend/src/workers/retentionEnforceWorker.js` | Purge/anonymize (24h, 11 targets) |
| `backend/src/workers/aiAnonymizationWorker.js` | AI anonymization (12h) |
| `backend/src/services/aiAnonymizationService.js` | Pipeline SZ5 |
| `backend/docs/DSR_RETENTION_ENGINE_REPORT.md` | Este documento |
