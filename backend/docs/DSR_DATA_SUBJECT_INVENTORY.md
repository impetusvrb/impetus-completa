# IMPETUS — INVENTÁRIO DSR (Data Subject Request)

**Data:** 2026-05-26
**Fase:** T1.6.1 — Inventário completo de dados do titular
**Tipo:** Auditoria não-implementadora (READ-ONLY)
**Base:** `TECHNICAL_DEBT_MASTER_REPORT.md`, `ENTERPRISE_COMPLIANCE_AUDIT.md`, `LGPD_RETENTION_DSR_AUDIT.md`

---

## 0. Sumário Executivo

O IMPETUS armazena dados pessoais (diretos e indiretos) em **84 tabelas** vinculadas a `user_id`, `sender_id` ou campos equivalentes. Deste universo:

- **12 tabelas** contêm **PII direto** (nome, CPF, email, telefone, conteúdo de mensagens)
- **18 tabelas** contêm **PII indireto** (comportamento, preferências, traces)
- **8 tabelas** contêm **dados derivados por IA** (classificações, decisões, memória)
- **22 tabelas** contêm **dados operacionais** vinculados ao titular
- **10 tabelas** contêm **logs e trilhas de auditoria**
- **14 tabelas** são de **suporte** (tokens, sessões, verificações temporárias)

**Scopeado ao titular (data subject):** um pedido DSR deve abranger no mínimo as 12 tabelas PII direto + 18 indireto + 8 derivados IA = **38 tabelas**.

---

## 1. DATA MAP — Dados Pessoais Directos

### 1.1 Identidade e Conta

| Tabela | Campos PII | Rows | Classificação | Base Legal | DSR Action |
|--------|-----------|:----:|:-------------:|:----------:|:----------:|
| `users` | name, email, cpf, phone, avatar_url, cargo, setor | 46 | **PII_DIRECT** | Art. 7°, II | EXPORT + ANONYMIZE |
| `memoria_usuario` | respostas_raw, perfil_tecnico, perfil_comportamental, resumo_estrategico | 6 | **PII_DIRECT** | Art. 7°, II | EXPORT + DELETE |
| `user_activation_profiles` | (perfil de ativação) | 0 | **PII_DIRECT** | Art. 7°, II | DELETE |
| `user_activation_pins` | (PIN de ativação) | 0 | **PII_DIRECT** | Art. 7°, II | DELETE |

### 1.2 Conteúdo Conversacional

| Tabela | Campos PII | Rows | Classificação | Base Legal | DSR Action |
|--------|-----------|:----:|:-------------:|:----------:|:----------:|
| `chat_messages` | content (texto livre), file_url, file_name | 117 | **PII_CONTENT** | Art. 7°, I | EXPORT + ANONYMIZE |
| `internal_chat_messages` | text_content, media_url, client_ip | 0 | **PII_CONTENT** | Art. 7°, I | EXPORT + ANONYMIZE |
| `onboarding_conversations` | content (interações com IA) | 110 | **PII_CONTENT** | Art. 7°, I | EXPORT + DELETE |
| `onboarding_conversa` | (legado, interações iniciais) | — | **PII_CONTENT** | Art. 7°, I | EXPORT + DELETE |
| `communications` | text_content, sender_name, sender_phone, media_url | 0 | **PII_CONTENT** | Art. 7°, II | EXPORT + ANONYMIZE |

### 1.3 Comunicação e Contacto

| Tabela | Campos PII | Rows | Classificação | Base Legal | DSR Action |
|--------|-----------|:----:|:-------------:|:----------:|:----------:|
| `chat_participants` | (vincula user a conversas) | — | **PII_RELATIONAL** | Art. 7°, II | EXPORT |
| `chat_push_subscriptions` | (endpoint push notification) | — | **PII_TECHNICAL** | Art. 7°, II | DELETE |
| `manuia_mobile_devices` | (device info do utilizador) | — | **PII_TECHNICAL** | Art. 7°, II | DELETE |

---

## 2. DATA MAP — Dados Pessoais Indirectos (Comportamentais)

### 2.1 Actividade e Comportamento

| Tabela | Dados | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|-------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `user_activity_logs` | activity_type, entity_type, context (JSONB) | 1765 | **PII_BEHAVIORAL** | Art. 7°, IX | EXPORT + DELETE | 🟠 |
| `dashboard_usage_events` | event_type, entity_id, context (JSONB) | 3001 | **PII_BEHAVIORAL** | Art. 7°, IX | EXPORT + DELETE | 🟡 |
| `dashboard_acessos` | (registos de acesso) | — | **PII_BEHAVIORAL** | Art. 7°, IX | EXPORT + DELETE | 🟡 |
| `strategic_user_behavior` | intent, followup_used, satisfaction_signal | 0 | **PII_BEHAVIORAL** | Art. 7°, IX | EXPORT + DELETE | 🟡 |
| `user_dashboard_onboarding` | (progresso onboarding) | 14 | **PII_BEHAVIORAL** | Art. 7°, II | EXPORT | 🟢 |
| `user_dashboard_preferences` | (preferências UI) | 4 | **PII_PREFERENCE** | Art. 7°, II | EXPORT + DELETE | 🟢 |
| `voice_preferences` | alerts_enabled, voice_id, speed | 3 | **PII_PREFERENCE** | Art. 7°, II | EXPORT + DELETE | 🟢 |

### 2.2 Sessões e Autenticação

| Tabela | Dados | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|-------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `sessions` | token, ip_address, user_agent | 984 | **PII_TECHNICAL** | Art. 7°, II | DELETE | 🟠 |
| `session_context` | (contexto de sessão activa) | 3 | **PII_TECHNICAL** | Art. 7°, II | DELETE | 🟡 |
| `refresh_tokens` | (tokens de refresh) | — | **PII_TECHNICAL** | Art. 7°, II | DELETE | 🟡 |
| `password_reset_tokens` | (tokens de reset) | — | **PII_TECHNICAL** | Art. 7°, II | DELETE | 🟢 |
| `user_security_verification_codes` | (códigos de verificação) | 0 | **PII_TECHNICAL** | Art. 7°, II | DELETE | 🟢 |
| `user_rate_limits` | (limites de rate por user) | 4 | **PII_TECHNICAL** | Art. 7°, IX | DELETE | 🟢 |

### 2.3 Notificações e Alertas

| Tabela | Dados | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|-------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `notifications` | title, message, action_url | 0 | **PII_CONTENT** | Art. 7°, II | EXPORT + DELETE | 🟡 |
| `manuia_inbox_notifications` | (alertas ManuIA) | 0 | **PII_CONTENT** | Art. 7°, II | EXPORT + DELETE | 🟡 |
| `manuia_notification_preferences` | (preferências de alerta) | 2 | **PII_PREFERENCE** | Art. 7°, II | EXPORT + DELETE | 🟢 |
| `smart_reminders` | title, description, ai_help_text | 0 | **PII_CONTENT** | Art. 7°, II | EXPORT + DELETE | 🟡 |

---

## 3. DATA MAP — Dados Derivados por IA

| Tabela | Dados Derivados | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|----------------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `ai_interaction_traces` | input_payload, output_response, model_info | 858 | **PII_AI_DERIVED** | Art. 7°, IX | EXPORT + PSEUDONIMIZAR | 🟠 |
| `ai_decision_logs` | decisões IA com contexto | 19 | **PII_AI_DERIVED** | Art. 7°, IX | EXPORT (somente) | 🟡 |
| `ai_proactive_consent` | granted, granted_at, revoked_at | 0 | **PII_AI_CONSENT** | Art. 7°, I | EXPORT | 🟢 |
| `cognitive_hitl_feedback` | feedback do user sobre IA | 0 | **PII_AI_DERIVED** | Art. 7°, IX | EXPORT + DELETE | 🟡 |
| `orchestration_outcomes` | resultados de orquestração IA | 0 | **PII_AI_DERIVED** | Art. 7°, IX | EXPORT | 🟡 |
| `token_usage` | servico, quantidade, custo_real | 427 | **PII_BILLING** | Art. 7°, II | EXPORT | 🟢 |
| `empresa_ai_memory` / `enterprise_ai_memory` | memória IA contextual | 0 | **PII_AI_DERIVED** | Art. 7°, IX | PSEUDONIMIZAR | 🟡 |
| `knowledge_memory` | facts de conhecimento | 2 | **PII_AI_DERIVED** | Art. 7°, IX | PSEUDONIMIZAR | 🟡 |

---

## 4. DATA MAP — Dados Operacionais Vinculados ao Titular

| Tabela | Vínculo | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|---------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `proposals` / `proposal_actions` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `tasks` / `task_watchers` | assigned_to, user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `work_orders` | assigned_to, created_by | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `pulse_evaluations` | user_id (avaliação pulse) | — | OPERATIONAL | Art. 7°, II | EXPORT + ANONYMIZE* | 🟡 |
| `time_clock_records` | user_id (registos de ponto) | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟡 |
| `turn_technical_records` | user_id (registos técnicos) | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `operational_team_member_events` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `intelligent_registrations` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `manuia_on_call_slots` | user_id (escalas) | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `activation_conversa` | user_id | — | OPERATIONAL | Art. 7°, II | DELETE | 🟢 |
| `company_operation_memory` | user_id | 1 | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `warehouse_movements` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `action_plans_5w2h` | created_by | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `pops` | created_by, approved_by | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `role_verification_requests` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |
| `role_verification_documents` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT + DELETE** | 🟡 |
| `logistics_drivers` | user_id | — | OPERATIONAL | Art. 7°, II | EXPORT | 🟢 |

> \* Pulse evaluations: anonimizar se respondente, reter se avaliador (compliance HR)
> \** Documentos de verificação: deletar ficheiros + metadados após período legal

---

## 5. DATA MAP — Logs e Trilhas de Auditoria

| Tabela | Dados | Rows | Classificação | Base Legal | DSR Action | Risco |
|--------|-------|:----:|:-------------:|:----------:|:----------:|:-----:|
| `audit_logs` | user_email, ip_address, user_agent, action, metadata | 1043 | **AUDIT_IMMUTABLE** | Art. 37 | RETER (pseudonimizar PII após 2 anos) | 🟠 |
| `ai_legal_audit_logs` | decision_summary, data_classification, user_id | 19 | **AUDIT_IMMUTABLE** | Art. 37 | RETER (obrigatório) | 🟡 |
| `consent_logs` | consent_type, ip_address, user_agent, user_id | 0 | **AUDIT_IMMUTABLE** | Art. 8° + 37 | **NUNCA APAGAR** | ✅ |
| `admin_logs` | (acções administrativas) | 17 | **AUDIT_IMMUTABLE** | Art. 37 | RETER | 🟡 |
| `executive_audit_logs` | user_id, acções executivas | 0 | **AUDIT_IMMUTABLE** | Art. 37 | RETER | 🟡 |
| `memory_audit_log` | user_id, alterações memória | 0 | **AUDIT_IMMUTABLE** | Art. 37 | RETER | 🟡 |
| `technical_library_audit_logs` | user_id, acções biblioteca | 0 | **AUDIT_IMMUTABLE** | Art. 37 | RETER | 🟡 |
| `workflow_permission_audit_log` | acções de permissão | 0 | **AUDIT_IMMUTABLE** | Art. 37 | RETER | 🟡 |
| `user_identification_audit` | ip_address, user_agent, event_type | 0 | **AUDIT_IMMUTABLE** | Art. 37 | RETER (pseudonimizar PII) | 🟡 |
| `impetus_migration_audit_log` | (migrações sistema) | 15 | **SYSTEM_AUDIT** | — | IGNORAR (não-PII) | 🟢 |

---

## 6. Classificação DSR — Acções por Tipo

### 6.1 EXPORTÁVEL (Art. 18, V LGPD — Portabilidade)

O titular tem direito a receber **todos os dados pessoais** em formato estruturado.

| Categoria | Tabelas | Formato Export |
|-----------|---------|:-------------:|
| Identidade | `users` | JSON |
| Perfil cognitivo | `memoria_usuario` | JSON |
| Mensagens | `chat_messages`, `internal_chat_messages`, `onboarding_conversations` | JSON + texto |
| Comunicações | `communications` | JSON |
| Actividade | `user_activity_logs`, `dashboard_usage_events` | JSON (truncado a 12 meses) |
| Preferências | `user_dashboard_preferences`, `voice_preferences`, `manuia_notification_preferences` | JSON |
| Dados operacionais | `tasks`, `work_orders`, `proposals`, `pulse_evaluations` | JSON |
| Uso de IA | `ai_interaction_traces`, `token_usage` | JSON (pseudonimizado onde necessário) |
| Consentimentos | `consent_logs`, `ai_proactive_consent`, `lgpd_consents` | JSON |
| Sessões | `sessions` (activas apenas) | JSON |
| Notificações | `notifications`, `smart_reminders` | JSON |

**Total mínimo: 28 tabelas no export package.**

### 6.2 ANONIMIZAR (Art. 18, VI — Eliminação)

Dados que devem ser anonimizados (não deletados) para preservar integridade referencial:

| Tabela | Campo | Método de Anonimização |
|--------|-------|------------------------|
| `users` | name, email, cpf, phone | SHA-256 hash determinístico + prefixo `[ANON]` |
| `chat_messages` | content | Substituir por `[REDACTED_DSR]` |
| `chat_messages` | sender_id | SET NULL |
| `internal_chat_messages` | text_content, client_ip | Substituir por `[REDACTED_DSR]` |
| `communications` | sender_name, sender_phone, text_content | `[REDACTED_DSR]` |
| `ai_interaction_traces` | input_payload → campos PII | JSONB path-level redaction |
| `ai_interaction_traces` | output_response → campos PII | JSONB path-level redaction |
| `audit_logs` | user_email | SHA-256 hash |
| `audit_logs` | ip_address | Truncar para /24 (ex: `192.168.1.0/24`) |
| `pulse_evaluations` | (se respondente anónimo) | Dissociar user_id |
| `user_identification_audit` | ip_address, user_agent | Redactar |

### 6.3 EXCLUIR (Hard Delete)

Dados que podem ser eliminados fisicamente sem impacto:

| Tabela | Condição |
|--------|----------|
| `sessions` | WHERE user_id = X (todas) |
| `session_context` | WHERE user_id = X |
| `refresh_tokens` | WHERE user_id = X |
| `password_reset_tokens` | WHERE user_id = X |
| `user_security_verification_codes` | WHERE user_id = X |
| `user_activation_pins` | WHERE user_id = X |
| `user_activation_profiles` | WHERE user_id = X |
| `user_rate_limits` | WHERE user_id = X |
| `chat_push_subscriptions` | WHERE user_id = X |
| `manuia_mobile_devices` | WHERE user_id = X |
| `onboarding_conversations` | WHERE user_id = X |
| `onboarding_conversa` | WHERE user_id = X |
| `activation_conversa` | WHERE user_id = X |
| `memoria_usuario` | WHERE user_id = X |
| `strategic_user_behavior` | WHERE user_id = X |
| `dashboard_acessos` | WHERE user_id = X |
| `user_dashboard_onboarding` | WHERE user_id = X |
| `user_dashboard_preferences` | WHERE user_id = X |
| `voice_preferences` | WHERE user_id = X |
| `manuia_notification_preferences` | WHERE user_id = X |
| `smart_reminders` | WHERE created_by = X (e sem dependências) |
| `notifications` | WHERE user_id = X |
| `chat_message_deleted_for_user` | WHERE user_id = X |
| `chat_reactions` | WHERE user_id = X |

### 6.4 RETER POR OBRIGAÇÃO LEGAL (Art. 16, I LGPD)

Dados que **NÃO podem ser eliminados** mesmo sob DSR, por base legal autónoma:

| Tabela | Base Legal | Prazo Mínimo | Acção Permitida |
|--------|-----------|:------------:|-----------------|
| `consent_logs` | Art. 8°, §2 + Art. 37 LGPD | **Indefinido** | Nenhuma — prova de consentimento |
| `ai_legal_audit_logs` | Art. 37 LGPD + ISO 42001 | **7 anos** | Archive apenas |
| `audit_logs` | Art. 37 LGPD + Art. 43 CDC | **5 anos** | Pseudonimizar PII (email→hash) após 2 anos |
| `ai_decision_logs` | Art. 20 LGPD (decisão automatizada) | **5 anos** | Reter para contestação do titular |
| `token_usage` | Art. 7°, II (contratual/billing) | **5 anos** (fiscal) | Reter para facturação/auditoria |
| `executive_audit_logs` | Art. 37 LGPD | **5 anos** | Archive |
| `workflow_permission_audit_log` | Art. 37 LGPD | **5 anos** | Archive |
| `time_clock_records` | CLT Art. 74 + Portaria 671/2021 | **5 anos** | Reter (obrigação trabalhista) |
| `work_orders` | Art. 7°, II + regulatório industrial | **Contrato + 2 anos** | Reter |

---

## 7. Risco por Tipo de Dado

### 7.1 Matriz de Risco

| Tipo de Dado | Volume | Sensibilidade | Exposição Breach | Risco LGPD | Prioridade DSR |
|:------------:|:------:|:-------------:|:----------------:|:----------:|:--------------:|
| CPF / Email / Phone | 46 users | 🔴 Muito Alta | 🔴 Multa ANPD | 🔴 CRITICAL | P0 |
| Conteúdo de mensagens | 227 msgs | 🔴 Alta | 🟠 Reputacional | 🟠 HIGH | P0 |
| Perfil cognitivo (IA) | 6 perfis | 🟠 Alta | 🟠 Discriminação | 🟠 HIGH | P1 |
| Traces IA (payloads) | 858 traces | 🟠 Média-Alta | 🟠 Dados derivados | 🟠 HIGH | P1 |
| Activity logs | 4766 logs | 🟡 Média | 🟡 Perfilamento | 🟡 MEDIUM | P1 |
| Sessões / tokens | 984 sessions | 🟡 Média | 🟠 Acesso ilícito | 🟡 MEDIUM | P0 (auto-cleanup) |
| Preferências | ~23 regs | 🟢 Baixa | 🟢 Mínimo | 🟢 LOW | P2 |
| Dados operacionais | variável | 🟢 Baixa | 🟢 Mínimo | 🟢 LOW | P2 |
| Audit trails | ~1100 logs | 🟡 Média | 🟡 Forense | ✅ LEGAL | Reter |
| Consent logs | 0 logs | 🟢 Baixa | 🟢 Prova legal | ✅ LEGAL | Reter |

### 7.2 Risco por Cenário de Breach

| Cenário | Tabelas Expostas | Impacto | Mitigação Existente | Gap |
|---------|-----------------|---------|--------------------:|-----|
| SQL injection | `users`, `chat_messages` | 🔴 PII completo | Input sanitization, parameterized queries | Column-level encryption ausente |
| Backup leak | Todas | 🔴 Dump completo | AES-256 para traces IA | `users.cpf/email` em plaintext |
| Token theft | `sessions` | 🟠 Impersonation | JWT expiry, bcrypt | Sessões expiradas não limpas |
| Cross-tenant query | `chat_messages` (sem company_id) | 🟠 Leakage | JOIN com `chat_conversations` | Sem RLS, sem denormalization |
| IA prompt leak | `ai_interaction_traces` | 🟡 Contexto operacional | LGPD protocol in prompt | Payloads não-encriptados |
| Insider access | `audit_logs` | 🟡 Forense | RBAC, middleware auth | Email em plaintext no log |

---

## 8. Pipeline DSR Recomendado

### 8.1 Fases do Pedido DSR

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INTAKE         → lgpd_data_requests.status = 'pending'       │
│    Deadline: NOW() + 15 dias (Art. 18, §5 LGPD)                │
│    Verify: identidade do titular (email + segundo factor)        │
├─────────────────────────────────────────────────────────────────┤
│ 2. SCOPE          → Determinar tipo: EXPORT | ERASE | BOTH     │
│    Export: 28 tabelas (Seção 6.1)                               │
│    Erase: 24 tabelas DELETE + 11 tabelas ANONYMIZE              │
├─────────────────────────────────────────────────────────────────┤
│ 3. EXECUTE EXPORT → Gerar package JSON + PDF                    │
│    Incluir: users.*, messages, traces, activity, preferences    │
│    Excluir: audit_logs, consent_logs (base legal retém)         │
│    Formato: JSON Lines + PDF summary                            │
├─────────────────────────────────────────────────────────────────┤
│ 4. EXECUTE ERASE  → Pipeline seguro                             │
│    4a. Hard delete: tokens, sessões, preferências, pins         │
│    4b. Anonymize: users, messages, traces                       │
│    4c. Verify: 0 registos recuperáveis por user_id              │
│    4d. NÃO tocar: consent_logs, audit_logs, token_usage         │
├─────────────────────────────────────────────────────────────────┤
│ 5. AUDIT          → Log completo da operação em audit_logs      │
│    Registar: tabelas tocadas, rows afectadas, timestamp         │
├─────────────────────────────────────────────────────────────────┤
│ 6. COMPLETE       → lgpd_data_requests.status = 'completed'     │
│    Notificar titular via email                                  │
│    Reter lgpd_data_requests (prova de cumprimento)              │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Dependências de Implementação

| Componente | Estado | Bloqueio |
|------------|:------:|----------|
| `lgpd_data_requests` (tabela) | ✅ Existe | — |
| `anonymizeUserData` (função) | ⚠️ Parcial | Não cobre chat_messages, onboarding, traces |
| `/api/lgpd/subject/me/export` | ❌ Ausente | Precisa implementação |
| `/api/lgpd/subject/me/erase` | ❌ Ausente | Precisa implementação |
| Worker de execução DSR | ❌ Ausente | Precisa implementação |
| UI de pedido DSR | ❌ Ausente | Precisa implementação |
| Verificação de identidade 2FA | ❌ Ausente | Precisa implementação |
| Notification email | ✅ Existe (via unifiedMessaging) | — |
| Audit log | ✅ Existe (middleware) | — |

---

## 9. Classificação Consolidada por Artigo LGPD

| Artigo | Obrigação | Tabelas Impactadas | Estado |
|--------|-----------|--------------------:|:------:|
| **Art. 6° (Finalidade)** | Dados tratados apenas para fim declarado | Todas | ✅ OK (LGPD protocol) |
| **Art. 7°, I (Consentimento)** | Base legal para tratamento | `chat_messages`, `onboarding_conversations` | ⚠️ Consent genérico |
| **Art. 7°, II (Contrato)** | Base legal para execução | `users`, `sessions`, operacionais | ✅ OK |
| **Art. 7°, IX (Legítimo interesse)** | Base legal para analytics | `user_activity_logs`, `dashboard_usage_events`, `ai_interaction_traces` | ⚠️ Sem LIA documentado |
| **Art. 8° (Consentimento)** | Prova de consent | `consent_logs` | ✅ OK (append-only) |
| **Art. 15 (Término)** | Dados eliminados ao fim do tratamento | `chat_messages`, `sessions` | 🔴 Não implementado |
| **Art. 16 (Eliminação)** | Dados eliminados sob pedido | 38 tabelas | 🔴 Parcial (`anonymizeUserData` incompleto) |
| **Art. 18, V (Portabilidade)** | Export em formato estruturado | 28 tabelas | 🔴 Não implementado |
| **Art. 18, VI (Eliminação)** | Erasure de dados desnecessários | 24+11 tabelas | 🔴 Parcial |
| **Art. 20 (Decisão automatizada)** | Revisão de decisão IA | `ai_decision_logs`, `ai_interaction_traces` | ⚠️ Sem UI de revisão |
| **Art. 37 (Registro)** | Manter trilha de operações | `audit_logs`, `ai_legal_audit_logs`, `consent_logs` | ✅ OK |
| **Art. 41 (DPO)** | Encarregado designado | — | 🔴 Não designado |
| **Art. 46 (Segurança)** | Medidas técnicas de proteção | `users` (cpf/email plaintext) | ⚠️ Encryption parcial |

---

## 10. Conclusão e Próximos Passos

### Resumo quantitativo

| Métrica | Valor |
|---------|:-----:|
| Total tabelas com dados pessoais | 84 |
| Tabelas no scope mínimo DSR | 38 |
| Tabelas para DELETE em erasure | 24 |
| Tabelas para ANONYMIZE em erasure | 11 |
| Tabelas RETER (obrigação legal) | 9 |
| Gaps bloqueantes para compliance | 4 (export, erase, anonymize scope, DPO) |

### Pré-requisitos para implementação (T1.6.2+)

1. **P0**: Estender `anonymizeUserData` para cobrir 11 tabelas adicionais
2. **P0**: Implementar `GET /api/lgpd/subject/me/export` (28 tabelas)
3. **P0**: Implementar `POST /api/lgpd/subject/me/erase` (24+11 tabelas)
4. **P1**: Worker assíncrono de execução DSR (background job com SLA tracking)
5. **P1**: UI no perfil do utilizador para solicitar export/erase
6. **P2**: LIA (Legitimate Interest Assessment) documentado para Art. 7°, IX
7. **P2**: Column-level encryption para `users.cpf`, `users.email`

---

*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*
