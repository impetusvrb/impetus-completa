# IMPETUS — AUDITORIA GLOBAL LGPD / RETENTION / DSR

**Data:** 2026-05-26
**Fase:** T1.A.2 — Prompt 08
**Tipo:** Auditoria não-implementadora (somente diagnóstico e estratégias)
**Base:** `ENTERPRISE_COMPLIANCE_AUDIT.md`, `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`

---

## 0. Sumário Executivo

O IMPETUS possui **281 tabelas** no PostgreSQL. Deste universo, **~45 tabelas** armazenam dados pessoais, logs de actividade, ou dados operacionais com relevância LGPD/retenção.

**Estado actual:**
- Existe `impetus_retention_policy` com 5 perfis declarados (default, telemetry, operational, audit, workflow)
- Existe `impetus_storage_table_registry` com 11 tabelas registadas
- Existe `impetus_storage_tier` com 4 tiers (hot/warm/cold/archive)
- **PORÉM**: `purge_enabled = false` em TODAS as policies — **nenhum purge é executado**
- **PORÉM**: apenas 11 das ~45 tabelas relevantes estão no registry
- **PORÉM**: `industrial_lgpd_classification` existe mas está **vazia** (0 registos)
- **PORÉM**: o `dataLifecycleService.runRetentionCycle()` existe mas cobre apenas subset

**Diagnóstico LGPD:**
- 🔴 **CRITICAL**: `chat_messages`, `onboarding_conversations`, `user_activity_logs` — retenção indefinida, sem TTL, sem anonimização
- 🔴 **CRITICAL**: `sessions` — 984 sessões acumuladas sem cleanup (90 dias oldest)
- 🟠 **HIGH**: `ai_interaction_traces` (858 registos com `input_payload` / `output_response` em JSONB plaintext) — potencialmente contêm PII
- 🟠 **HIGH**: `audit_logs` (1043) — contêm `user_email`, `ip_address`, `user_agent` — sem TTL
- 🟡 **MEDIUM**: `dashboard_usage_events` (3001 registos) — tracking comportamental sem consent granular

---

## 1. Inventário de Tabelas com Relevância LGPD

### 1.1 Tabelas com PII Directo

| Tabela | Rows | PII | company_id | TTL/Expiry | Retention Policy | Risco |
|--------|------|-----|:----------:|:----------:|:----------------:|:-----:|
| `users` | 46 | cpf, email, phone, name | ✅ | expires_at (session only) | NENHUMA | 🟡 |
| `chat_messages` | 117 | content (texto livre) | ❌ (via join) | ❌ | NENHUMA | 🔴 |
| `internal_chat_messages` | 0 | text_content, client_ip | ✅ | ❌ | NENHUMA | 🟡 |
| `onboarding_conversations` | 110 | content (interações IA) | ✅ | ❌ | NENHUMA | 🔴 |
| `sessions` | 984 | ip_address, user_agent, token | ❌ (via user) | expires_at (existe) | NENHUMA activa | 🟠 |
| `consent_logs` | 0 | ip_address, user_agent | ✅ | ❌ | APPEND-ONLY (correcto) | ✅ |
| `lgpd_data_requests` | 0 | description, response | ✅ | deadline | NENHUMA | 🟡 |

### 1.2 Tabelas com PII Indirecto (Comportamental / Traces)

| Tabela | Rows | Dados sensíveis | company_id | TTL | Risco |
|--------|------|----------------|:----------:|:---:|:-----:|
| `ai_interaction_traces` | 858 | input_payload, output_response (JSONB com potencial PII) | ✅ | ❌ | 🟠 |
| `ai_legal_audit_logs` | 19 | decision_summary, data_classification | ✅ | archived flag | 🟡 |
| `ai_decision_logs` | 19 | Decisões IA com contexto | ✅ | ❌ | 🟡 |
| `audit_logs` | 1043 | user_email, ip_address, user_agent, metadata | ✅ | ❌ | 🟠 |
| `user_activity_logs` | 1765 | activity_type, entity_id, context (JSONB) | ✅ | ❌ | 🟠 |
| `dashboard_usage_events` | 3001 | event_type, entity_id, context (JSONB) | ✅ | ❌ | 🟡 |

### 1.3 Tabelas Operacionais com Potencial Cross-Tenant

| Tabela | Rows | Dados | company_id | TTL | Risco |
|--------|------|-------|:----------:|:---:|:-----:|
| `eventos_empresa` | 2 | descricao, metadata | ✅ | ❌ | 🟡 |
| `industrial_event_outbox` | 181 | envelope (JSONB), correlation_id | ✅ | ❌ | 🟡 |
| `industrial_event_dlq` | 1 | payload, last_error | ✅ | ❌ | 🟡 |
| `operational_memory` | 71 | content, summary, metadata | ✅ | expires_at ✅ | ✅ |
| `cognitive_event_backbone` | 0 | event payload | ✅ | ❌ | 🟡 |

### 1.4 Tabelas de Memória Conversacional (SZ5 Scope)

| Tabela | Rows | Dados | company_id | TTL | Risco |
|--------|------|-------|:----------:|:---:|:-----:|
| `z_conversation_message_index` | N/A (não existe) | — | — | — | ⚠️ Declarada em docs mas não no schema actual |
| `z_operational_memory_links` | N/A (não existe) | — | — | — | ⚠️ Declarada em docs mas não no schema actual |
| `operational_memory` | 71 | facts, summaries | ✅ | expires_at ✅ | ✅ |
| `enterprise_ai_memory` | 0 | — | — | — | 🟡 |
| `knowledge_memory` | 2 | knowledge facts | ✅ | ❌ | 🟡 |

---

## 2. Identificação de Riscos LGPD

### 2.1 Ausência de TTL (Retenção Indefinida)

| Severidade | Tabela | Impacto LGPD |
|:----------:|--------|--------------|
| 🔴 CRITICAL | `chat_messages` | Conteúdo textual de mensagens pessoais retido indefinidamente. Art. 15 LGPD (término do tratamento) e Art. 16 (eliminação). Sem company_id directo — necessita JOIN. |
| 🔴 CRITICAL | `onboarding_conversations` | Interações com IA durante onboarding retidas indefinidamente. Podem conter informações pessoais não-estruturadas. |
| 🔴 CRITICAL | `user_activity_logs` | 1765 registos de actividade comportamental sem política de expiração. Crescimento linear infinito. |
| 🟠 HIGH | `ai_interaction_traces` | Payloads de entrada/saída da IA podem conter dados pessoais contextuais. 858 registos em 26 dias = ~33/dia. |
| 🟠 HIGH | `audit_logs` | PII directo (email, IP). Necessário para compliance mas sem TTL = acumulação infinita. |
| 🟠 HIGH | `dashboard_usage_events` | 3001 registos em 73 dias = ~41/dia. Tracking comportamental sem consent granular. |
| 🟠 HIGH | `sessions` | 984 sessões (90 dias oldest). Token JWT + IP + User-Agent. `expires_at` existe mas **nenhum processo limpa sessões expiradas**. |
| 🟡 MEDIUM | `industrial_event_outbox` | JSONB envelope pode conter referências a operadores. Sem política de purge após delivery. |

### 2.2 Riscos de Anonimização

| Risco | Tabela | Descrição |
|:-----:|--------|-----------|
| 🔴 | `chat_messages` | `anonymizeUserData` **NÃO cobre** esta tabela. Se um utilizador solicitar erasure, as mensagens permanecem com `sender_id` (UUID que pode ser correlacionado). |
| 🔴 | `onboarding_conversations` | `anonymizeUserData` **NÃO cobre** esta tabela. Conteúdo conversacional retido. |
| 🟠 | `ai_interaction_traces` | `input_payload` e `output_response` podem conter PII não-sanitizado. Anonimização não cobre. |
| 🟠 | `user_activity_logs` | Referência directa a `user_id`. Erasure do utilizador não limpa estes registos. |
| 🟡 | `audit_logs` | Contém `user_email` como string — mesmo após delete do user, email permanece em plaintext. |

### 2.3 Vazamentos Cross-Tenant

| Risco | Tabela | Descrição |
|:-----:|--------|-----------|
| 🟠 | `chat_messages` | Tabela **NÃO tem `company_id` directo**. Isolamento depende de JOIN com `chat_conversations`. Sem RLS, query mal construída pode vazar cross-tenant. |
| 🟡 | `sessions` | Não tem `company_id` directo (herda do `user_id`). Correlação possível via token. |
| 🟡 | `message_reactions` / `chat_reactions` | Sem `company_id` — dependem de chain de JOINs para isolamento. |

### 2.4 Inconsistências de Tenant

| Inconsistência | Impacto |
|----------------|---------|
| `chat_messages` sem `company_id` | Impossível fazer purge/archive por tenant sem JOINs complexos |
| `sessions` sem `company_id` | Impossível listar sessões de um tenant directamente |
| `impetus_retention_policy.purge_enabled = false` em todas | Policies declaradas mas **NUNCA executadas** |
| `industrial_lgpd_classification` vazia | Framework de classificação existe mas não foi populado |

---

## 3. Matriz de Retenção Proposta

### 3.1 Classificação Legal por Tipo de Dado

| Classe | Descrição | Base Legal LGPD | Retenção Máxima | Anonimização |
|--------|-----------|-----------------|:---------------:|:------------:|
| **PII_DIRECT** | Nome, CPF, email, phone | Art. 7°, II (execução contrato) | Até revogação + 30 dias | Obrigatória |
| **PII_CONTENT** | Mensagens, interações, texto livre | Art. 7°, I (consentimento) | 365 dias | Obrigatória após TTL |
| **PII_BEHAVIORAL** | Activity logs, usage events, navegação | Art. 7°, IX (legítimo interesse) | 180 dias | Recomendada |
| **PII_OPERATIONAL** | Traces IA, decisões, payloads | Art. 7°, II + IX | 365 dias (audit: 7 anos) | Pseudonimização |
| **AUDIT_IMMUTABLE** | Audit logs, consent logs, compliance | Art. 37 (registro de operações) | 5–7 anos (regulatório) | Proibida |
| **OPERATIONAL** | Eventos, outbox, DLQ, workflows | Art. 7°, II | 180 dias (hot) + 730 dias (archive) | Não necessária |
| **TELEMETRY** | Métricas industriais, séries temporais | Art. 7°, II | 7 dias (hot) + 365 dias (archive) | Não necessária (não-PII) |

### 3.2 Matriz de Retenção por Tabela

| Tabela | Classe | Retenção Hot | Retenção Warm | Archive | Purge | Notas |
|--------|--------|:------------:|:-------------:|:-------:|:-----:|-------|
| `users` | PII_DIRECT | Indefinida | — | — | Sob DSR | Manter enquanto conta activa |
| `chat_messages` | PII_CONTENT | 90 dias | 180 dias | 365 dias | Sim | Soft-delete → anonymize → purge |
| `internal_chat_messages` | PII_CONTENT | 90 dias | 180 dias | 365 dias | Sim | Idem |
| `onboarding_conversations` | PII_CONTENT | 90 dias | — | — | Sim | Valor decai rapidamente após onboarding |
| `sessions` | PII_BEHAVIORAL | 30 dias | — | — | Sim (expiradas) | Já tem `expires_at` — só falta o worker |
| `user_activity_logs` | PII_BEHAVIORAL | 90 dias | 180 dias | — | Sim | Alta cardinalidade (~19/dia) |
| `dashboard_usage_events` | PII_BEHAVIORAL | 60 dias | 180 dias | — | Sim | Alta cardinalidade (~41/dia) |
| `ai_interaction_traces` | PII_OPERATIONAL | 90 dias | 365 dias | 7 anos | Pseudonimizar | Legal basis para IA |
| `ai_legal_audit_logs` | AUDIT_IMMUTABLE | 90 dias | 365 dias | 7 anos | **Proibido** | Já tem `archived` flag |
| `ai_decision_logs` | AUDIT_IMMUTABLE | 90 dias | 365 dias | 7 anos | **Proibido** | Idem |
| `audit_logs` | AUDIT_IMMUTABLE | 90 dias | 365 dias | 7 anos | **Proibido** | Necessário redactar email após TTL PII |
| `consent_logs` | AUDIT_IMMUTABLE | Indefinida | — | — | **Proibido** | Prova de consentimento — nunca apagar |
| `eventos_empresa` | OPERATIONAL | 30 dias | 180 dias | 730 dias | Sim | Scoped por company_id |
| `industrial_event_outbox` | OPERATIONAL | 14 dias | 90 dias | 365 dias | Sim (após delivery) | Já no storage registry |
| `industrial_event_dlq` | OPERATIONAL | 14 dias | 90 dias | 365 dias | Sim | Idem |
| `operational_memory` | OPERATIONAL | Indefinida* | — | — | Via `expires_at` | Já tem TTL nativo ✅ |
| `knowledge_memory` | OPERATIONAL | Indefinida | — | — | Sob DSR | Conhecimento estrutural |
| `enterprise_ai_memory` | OPERATIONAL | 90 dias | 365 dias | — | Sim | Memória IA empresa |

---

## 4. Classificação Legal (Art. 7° LGPD — Bases Legais)

| Base Legal | Tabelas Cobertas | Retenção Permitida |
|------------|------------------|--------------------|
| **Art. 7°, I — Consentimento** | `chat_messages`, `onboarding_conversations`, `ai_proactive_consent` | Até revogação + período de segurança |
| **Art. 7°, II — Execução contratual** | `users`, `sessions`, `operational_memory`, `eventos_empresa`, `industrial_*` | Duração do contrato + período legal |
| **Art. 7°, V — Exercício de direitos** | `audit_logs`, `consent_logs`, `ai_legal_audit_logs` | Prazo prescricional (5–10 anos) |
| **Art. 7°, IX — Legítimo interesse** | `user_activity_logs`, `dashboard_usage_events`, `ai_interaction_traces` | Até oposição + período razoável (180 dias) |
| **Art. 37 — Registro de operações** | `audit_logs`, `ai_legal_audit_logs`, `consent_logs`, `ai_decision_logs` | Regulatório (mínimo 5 anos LGPD, 7 anos fiscal) |

---

## 5. Classificação Operacional

| Prioridade | Tabela | Volume Actual | Crescimento/Dia | Impacto Performance |
|:----------:|--------|:-------------:|:---------------:|:-------------------:|
| P0 | `dashboard_usage_events` | 3001 | ~41 | Alto (query analytics) |
| P0 | `user_activity_logs` | 1765 | ~19 | Médio |
| P0 | `audit_logs` | 1043 | ~11 | Médio |
| P1 | `ai_interaction_traces` | 858 | ~33 | Alto (JSONB large) |
| P1 | `sessions` | 984 | ~11 | Médio |
| P1 | `industrial_event_outbox` | 181 | ~20 | Médio (workflow critical) |
| P2 | `chat_messages` | 117 | ~1.5 | Baixo (agora) |
| P2 | `onboarding_conversations` | 110 | ~1.3 | Baixo |

**Projecção 12 meses (sem purge):**
| Tabela | Projecção |
|--------|-----------|
| `dashboard_usage_events` | ~15.000 rows |
| `user_activity_logs` | ~7.000 rows |
| `ai_interaction_traces` | ~12.000 rows (com ~100MB JSONB) |
| `sessions` | ~4.000 rows (tokens expirados não limpos) |

---

## 6. Estratégia de Purge

### 6.1 Worker Cíclico (Retention Cycle)

```
Proposta: CRON diário 03:00 UTC
Pipeline: identify_expired → soft_mark → verify_no_dependency → hard_delete/anonymize
Flag: IMPETUS_RETENTION_PURGE_ENABLED=off|shadow|pilot|on
```

| Fase | Acção | Tabelas |
|------|-------|---------|
| 1 — Sessões expiradas | DELETE WHERE expires_at < NOW() | `sessions`, `refresh_tokens`, `password_reset_tokens` |
| 2 — Comportamental >TTL | DELETE WHERE created_at < (NOW() - interval) | `user_activity_logs`, `dashboard_usage_events` |
| 3 — Content >TTL | Anonymize content → DELETE após warm | `chat_messages`, `onboarding_conversations` |
| 4 — Traces >TTL | Pseudonimizar → mover para cold | `ai_interaction_traces` |
| 5 — Workflow delivered | DELETE WHERE status='delivered' AND delivered_at < TTL | `industrial_event_outbox` |

### 6.2 Regras de Segurança do Purge

1. **NUNCA** purge `consent_logs` — prova legal de consentimento
2. **NUNCA** purge `ai_legal_audit_logs` — trail regulatório
3. **NUNCA** purge com `purge_enabled=false` — respeitar policy declarada
4. **SEMPRE** verificar `company_id` scope antes de DELETE
5. **SEMPRE** logar operação em `audit_logs` antes de executar
6. **SEMPRE** permitir rollback 24h (soft-mark antes de hard-delete)

---

## 7. Estratégia de Arquivamento

### 7.1 Tiers de Storage

```
HOT (PostgreSQL) → WARM (PostgreSQL comprimido/particionado) → COLD (Object Storage/Parquet) → ARCHIVE (Encrypted, regulatório)
```

| Tabela | Hot → Warm | Warm → Cold | Cold → Archive |
|--------|:----------:|:-----------:|:--------------:|
| `ai_interaction_traces` | 90 dias | 365 dias | 7 anos |
| `audit_logs` | 90 dias | 365 dias | 7 anos |
| `ai_legal_audit_logs` | 90 dias | 365 dias | 7 anos (sem purge) |
| `industrial_event_outbox` | 14 dias | 90 dias | 365 dias |
| `eventos_empresa` | 30 dias | 180 dias | 730 dias |

### 7.2 Formato de Arquivo

- **Cold**: Parquet comprimido (sem PII ou com PII pseudonimizado)
- **Archive**: Parquet + AES-256 encryption (chave KMS rotativa)
- **Metadata**: Entry em `impetus_cold_storage_manifest` por batch arquivado

---

## 8. Estratégia de Anonimização

### 8.1 Tabelas que Requerem Anonimização em DSR (Direito ao Esquecimento)

| Tabela | Campo | Método |
|--------|-------|--------|
| `users` | name, cpf, email, phone | Hash determinístico (já implementado) |
| `chat_messages` | content, sender_id | Substituir content por `[REDACTED]`, manter sender_id=null |
| `onboarding_conversations` | content | Substituir por `[REDACTED_DSR_<date>]` |
| `ai_interaction_traces` | input_payload, output_response | Redactar campos PII do JSONB; manter estrutura para compliance |
| `user_activity_logs` | context (JSONB) | Redactar PII; manter activity_type para analytics agregados |
| `audit_logs` | user_email, ip_address | Pseudonimizar (hash); manter user_id como ref |
| `sessions` | ip_address, user_agent, token | DELETE (sessão já expirada é inútil) |

### 8.2 Campos que NUNCA Anonimizar

| Campo | Motivo |
|-------|--------|
| `consent_logs.*` | Prova legal de consentimento (Art. 8° LGPD) |
| `ai_legal_audit_logs.trace_id` | Rastreabilidade regulatória |
| `audit_logs.action`, `audit_logs.entity_type` | Necessário para forensics |
| `company_id` (em qualquer tabela) | Isolamento multi-tenant |

### 8.3 Pipeline DSR (Data Subject Request)

```
1. Recebe pedido → lgpd_data_requests (status='pending', deadline=NOW()+15 dias)
2. Verifica identidade do titular
3. Executa export (Art. 18, V — portabilidade):
   - users.* (PII)
   - chat_messages WHERE sender_id = user_id
   - onboarding_conversations WHERE user_id = X
   - consent_logs WHERE user_id = X
4. Gera package JSON + PDF
5. Se erasure (Art. 18, VI):
   - anonymizeUserData(user_id) [já existe]
   - ESTENDER para: chat_messages, onboarding_conversations, ai_interaction_traces
   - NÃO tocar: consent_logs, audit_logs (base legal Art. 7°, V)
6. Marca lgpd_data_requests.status = 'completed'
7. Audit log de toda operação
```

---

## 9. Gaps Críticos para Implementação (T1.6 + T1.7 + T1.8)

### 9.1 Gaps LGPD Directos (Bloqueiam Compliance)

| # | Gap | Impacto | Referência |
|---|-----|---------|------------|
| G1 | `anonymizeUserData` não cobre `chat_messages` | Direito ao esquecimento incompleto | C5 |
| G2 | `anonymizeUserData` não cobre `onboarding_conversations` | Idem | C5 |
| G3 | `anonymizeUserData` não cobre `ai_interaction_traces` | PII em traces IA persiste após erasure | C5 |
| G4 | Nenhum worker executa `sessions` cleanup | Tokens expirados acumulam indefinidamente | C2 |
| G5 | `purge_enabled=false` em todas as policies | Framework de retention declarado mas inerte | C2 |
| G6 | `chat_messages` sem `company_id` directo | Purge/archive por tenant requer JOINs complexos | — |
| G7 | `dashboard_usage_events` sem consent granular | Tracking comportamental sem base legal clara | C6 |
| G8 | `industrial_lgpd_classification` vazia | Framework de classificação não operacionalizado | — |

### 9.2 Gaps de Governança (Bloqueiam Enterprise)

| # | Gap | Impacto |
|---|-----|---------|
| G9 | Sem DSR workflow end-to-end (export + erase + SLA) | ANPD pode multar (prazo 15 dias) |
| G10 | Sem DPO formal designado | Obrigatório para controlador (Art. 41 LGPD) |
| G11 | Sem `impetus_retention_policy` activa (purge executado) | Crescimento infinito; custo + compliance |
| G12 | Sem column-level encryption para PII em `users` | Breach amplificado (Art. 46 LGPD) |

---

## 10. Priorização de Implementação (Wave A.2)

| Prioridade | Item | Esforço | Flag |
|:----------:|------|:-------:|------|
| P0 | Sessions cleanup worker (expiradas) | Baixo | `IMPETUS_SESSION_CLEANUP=off\|on` |
| P0 | Estender `anonymizeUserData` → chat_messages + onboarding | Médio | — (enhancement) |
| P1 | Retention cycle worker (behavioral tables) | Médio | `IMPETUS_RETENTION_PURGE_ENABLED=off\|shadow\|on` |
| P1 | DSR workflow (export + erase) | Alto | `IMPETUS_DSR_WORKFLOW=off\|on` |
| P1 | Popular `industrial_lgpd_classification` | Baixo | — |
| P2 | Archival pipeline (hot → warm → cold) | Alto | `IMPETUS_ARCHIVAL_PIPELINE=off\|on` |
| P2 | Add `company_id` a `chat_messages` (denormalize) | Médio | — |
| P3 | Column-level encryption para PII em `users` | Alto | `IMPETUS_COLUMN_ENCRYPTION=off\|on` |
| P3 | Consent granular por finalidade (IA, analytics) | Médio | — |

---

## 11. Validação de Compatibilidade

| Runtime | Impacto da Estratégia de Retention |
|---------|------------------------------------|
| Motor A | ✅ Zero impacto — não usa tabelas listadas directamente |
| Engine V2 | ✅ Zero impacto — consome payload em memória, não dados históricos |
| Runtime Z | ⚠️ `operational_memory` já tem `expires_at` — validar que purge respeita |
| SZ1–SZ5 | ⚠️ Se `z_conversation_message_index` for criada, deve nascer COM TTL |
| cognitiveRuntimeFacade | ✅ Zero impacto — observability/enrich stage |

---

## 12. Conclusão

O IMPETUS tem a **infraestrutura foundation** para retention (policies, tiers, registry) mas **não a executa**. Os gaps mais críticos são:

1. **Retention inerte** — `purge_enabled=false` universalmente
2. **Erasure incompleto** — `anonymizeUserData` cobre subset insuficiente
3. **Sessions zombie** — tokens expirados acumulam indefinidamente
4. **Tracking sem consent** — `dashboard_usage_events` sem base legal documentada

A implementação (fases subsequentes) deve seguir a ordem:
1. Sessions cleanup (P0, risco zero)
2. Estender anonymize (P0, fecha gap C5)
3. Retention worker behavioral (P1, controla crescimento)
4. DSR workflow completo (P1, compliance ANPD)
5. Archival pipeline (P2, cost optimization)

---

*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*
