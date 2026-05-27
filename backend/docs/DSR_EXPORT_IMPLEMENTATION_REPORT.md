# DSR Export — Relatório de Implementação (T1.6.4)

**Data:** 2026-05-26  
**Classificação:** ENTERPRISE / LGPD Art. 18, II — Direito de Acesso e Portabilidade  
**Flag:** `IMPETUS_DSR_EXPORT=off|on`  
**Default Produção:** `off` (deny-first)  
**Versão:** `3.0.0`

---

## 1. RESUMO EXECUTIVO

Implementação enterprise-grade do direito de acesso e portabilidade (Art. 18, II LGPD) com:
- **Approval flow assíncrono**: SUBMIT → PENDING → APPROVED → EXECUTED
- **SLA tracking**: 21 dias corridos (~15 dias úteis)
- **Multi-tenant isolation estrita**: todas as queries scoped por `company_id`
- **Audit trail completo** em todas as fases
- **CorrelationId obrigatório** em toda operação
- **Zero mutations**: apenas leitura (SELECT)
- **Deny-first**: não executa se não aprovado
- **Formato estruturado**: JSON + manifest + metadata + export_version
- **Backward compatible**: `executeExport()` directo mantido para compat

---

## 2. ARQUITECTURA DO FLUXO

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   TITULAR   │    │   PENDING   │    │  APPROVED   │    │  COMPLETED  │
│   submete   │───▶│ (aguarda    │───▶│ (DPO        │───▶│ (dados      │
│   request   │    │  aprovação) │    │  aprovou)   │    │  exportados)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
    GET /export     SLA tracking     POST /approve      POST /execute
       │                  │                  │                  │
   correlationId     21 dias max       hierarchy ≤ 1      JSON package
       │                  │                  │                  │
   audit_log         deadline         audit_log            audit_log
                                                         + data_access
```

---

## 3. ENDPOINTS

| Método | Rota | Descrição | Auth | Hierarquia |
|--------|------|-----------|------|------------|
| GET | `/api/lgpd/subject/me/export` | Submete pedido de exportação | ✅ | Qualquer |
| GET | `/api/lgpd/subject/me/export/status` | Consulta status do pedido | ✅ | Qualquer |
| POST | `/api/lgpd/subject/export/:id/approve` | Aprova pedido (DPO) | ✅ | ≤ 1 |
| POST | `/api/lgpd/subject/export/:id/execute` | Executa exportação aprovada | ✅ | ≤ 1 |

---

## 4. DADOS EXPORTADOS (21 secções, tenant-scoped)

### 4.1 Tabelas INCLUÍDAS

| # | Tabela | Descrição | Base Legal | PII |
|---|--------|-----------|-----------|:---:|
| 1 | `users` | Dados cadastrais do titular | Art. 18, II LGPD | ✅ |
| 2 | `memoria_usuario` | Perfis cognitivos e respostas onboarding | Art. 18, II + Art. 20 | ✅ |
| 3 | `chat_messages` | Mensagens de chat (scope titular) | Art. 18, II LGPD | ✅ |
| 4 | `ai_interaction_traces` | Traces IA (input/output) | Art. 20 LGPD | ✅ |
| 5 | `session_context` | Contexto de sessão activo | Art. 18, II LGPD | ✅ |
| 6 | `strategic_user_behavior` | Comportamento estratégico | Art. 18, II LGPD | ✅ |
| 7 | `consent_logs` | Histórico de consentimentos | Art. 8°, §2 LGPD | ❌ |
| 8 | `lgpd_data_requests` | Histórico requests LGPD | Art. 18, II LGPD | ❌ |
| 9 | `internal_chat_messages` | Mensagens internas | Art. 18, II LGPD | ✅ |
| 10 | `onboarding_conversations` | Conversas de onboarding | Art. 18, II LGPD | ✅ |
| 11 | `communications` | Comunicações enviadas/recebidas | Art. 18, II LGPD | ✅ |
| 12 | `user_activity_logs` | Logs de actividade | Art. 18, II LGPD | ✅ |
| 13 | `dashboard_usage_events` | Eventos de uso do dashboard | Art. 18, II LGPD | ✅ |
| 14 | `user_dashboard_preferences` | Preferências de dashboard | Art. 18, II LGPD | ❌ |
| 15 | `voice_preferences` | Preferências de voz | Art. 18, II LGPD | ❌ |
| 16 | `manuia_notification_preferences` | Preferências notificação | Art. 18, II LGPD | ❌ |
| 17 | `notifications` | Notificações | Art. 18, II LGPD | ❌ |
| 18 | `operational_memory` | Memória operacional | Art. 18, II LGPD | ✅ |
| 19 | `token_usage` | Consumo de tokens IA | Art. 18, II LGPD | ❌ |
| 20 | `ai_decision_logs` | Decisões IA (explicabilidade) | Art. 20 LGPD | ❌ |
| 21 | `sessions` | Sessões activas | Art. 18, II LGPD | ✅ |

### 4.2 Tabelas EXCLUÍDAS (com justificativa legal)

| Tabela | Razão Legal | Imutável |
|--------|------------|:---:|
| `audit_logs` | Art. 37 LGPD — Registro de operações do controlador (retido 5+ anos) | ✅ |
| `ai_legal_audit_logs` | Art. 37 LGPD — Trail regulatório IA | ✅ |
| `ai_audit_logs` | Art. 37 LGPD — Auditoria interna do sistema | ✅ |
| `ai_outbound_audit` | Art. 37 LGPD — Comunicações externas auditáveis | ✅ |
| `companies` | Dados de terceiro (controlador) | ❌ |
| `manuals` | Propriedade intelectual da empresa | ❌ |
| `manual_chunks` | Dados operacionais da empresa (embeddings) | ❌ |

---

## 5. FORMATO DE EXPORTAÇÃO

```json
{
  "ok": true,
  "request_id": "uuid",
  "status": "completed",
  "export": {
    "manifest": {
      "schema_version": "lgpd_dsr_export_v3",
      "export_version": "3.0.0",
      "export_type": "dsr_portability",
      "legal_basis": "Art. 18, II LGPD",
      "subject": { "user_id": "...", "company_id": "...", "name": "...", "email": "..." },
      "metadata": {
        "correlation_id": "...",
        "generated_at": "ISO8601",
        "duration_ms": 188,
        "total_records": 802,
        "sections_count": 21,
        "max_rows_per_table": 10000,
        "format": "json",
        "prepared_for_zip": true
      },
      "tables_included": [...],
      "tables_excluded": [...],
      "sections_summary": { "identity": { "count": 1, "has_data": true }, ... },
      "legal_notes": { ... }
    },
    "sections": {
      "identity": { "data": {...}, "count": 1, "table": "users" },
      "cognitive_profile": { "data": [...], "count": N, "table": "memoria_usuario" },
      ...
    }
  }
}
```

---

## 6. GOVERNANÇA

### 6.1 Approval Flow

| Stage | Quem | Acção | Audit |
|-------|------|-------|-------|
| SUBMIT | Titular | `GET /subject/me/export` | `dsr_export_submitted` |
| APPROVE | DPO (hierarchy ≤ 1) | `POST /subject/export/:id/approve` | `dsr_export_approved` |
| EXECUTE | DPO (hierarchy ≤ 1) | `POST /subject/export/:id/execute` | `dsr_export_executed` + `data_access` |

### 6.2 SLA Tracking

- **Deadline**: 21 dias corridos (~15 dias úteis) a partir do SUBMIT
- **Armazenado em**: `lgpd_data_requests.deadline`
- **Monitorável via**: `GET /subject/me/export/status`

### 6.3 Segurança

| Garantia | Implementação |
|----------|--------------|
| Multi-tenant isolation | Todas as queries com `WHERE company_id = $N` |
| Deny-first | Não executa sem status `approved` |
| Duplicate protection | Bloqueia submit se existe request pending/approved/executing |
| Auth | `requireAuth` em todos endpoints |
| Hierarchy | `requireHierarchy(1)` para approve/execute |
| Correlation | CorrelationId propagado em toda cadeia |

---

## 7. TESTES DE VALIDAÇÃO

```
=== DSR EXPORT v3 FLOW TEST ===
Subject: Pedro Henrrique Gullar | ID: 7c2be36b

─── 1. SUBMIT ───
✅ Request created: status=pending, SLA=21 dias

─── 1b. DUPLICATE CHECK ───
✅ Bloqueado: code=DUPLICATE_REQUEST

─── 2. STATUS ───
✅ Active request found: status=pending

─── 3. APPROVE ───
✅ Approved: status=approved

─── 3b. RE-APPROVE ───
✅ Bloqueado: code=INVALID_STATUS

─── 4. EXECUTE ───
✅ Completed: 802 registos, 21 secções, 188ms

─── 5. DISABLED ───
✅ Bloqueado: code=DSR_DISABLED
```

---

## 8. MATRIZ LGPD Art. 18, II

| Requisito Art. 18, II | Implementação | Status |
|------------------------|--------------|--------|
| Confirmação da existência de tratamento | `sections_summary` no manifest | ✅ |
| Acesso aos dados | Todas as 21 secções exportadas | ✅ |
| Portabilidade a outro fornecedor | JSON estruturado, versionado, preparado para ZIP | ✅ |
| Formato claro e adequado | Schema version + metadata + manifest | ✅ |
| Prazo de resposta (Art. 18, §4) | SLA 21 dias com deadline tracking | ✅ |
| Decisões automatizadas (Art. 20) | `ai_interaction_traces` + `ai_decision_logs` incluídos | ✅ |

---

## 9. FLAGS E CONFIGURAÇÃO

| Flag | Valor | Descrição |
|------|-------|-----------|
| `IMPETUS_DSR_EXPORT` | `off\|on` | Activar/desactivar DSR Export |

- **Registada no Flag Reconciler**: ✅ (`CRITICAL_FLAGS`)
- **Default `.env`**: `off`
- **Rollback instantâneo**: `IMPETUS_DSR_EXPORT=off` + PM2 restart

---

## 10. ROLLBACK PLAN

1. Setar `IMPETUS_DSR_EXPORT=off`
2. `pm2 restart impetus-backend --update-env`
3. Todos endpoints retornam 503 `DSR_DISABLED`
4. Nenhum dado é alterado (operação read-only)
5. Requests pendentes ficam congelados (podem ser processados depois)

---

## 11. ARTEFACTOS

| Ficheiro | Descrição |
|----------|-----------|
| `backend/src/services/dsrExportService.js` | Serviço principal (approval flow + data collection) |
| `backend/src/routes/lgpd.js` | 4 endpoints REST |
| `backend/.env` | Flag `IMPETUS_DSR_EXPORT=off` |
| `backend/src/governance/flagReconcilerRuntime.js` | Flag registada |
| `backend/docs/DSR_EXPORT_IMPLEMENTATION_REPORT.md` | Este relatório |

---

**STATUS: CONCLUÍDO — DSR EXPORT v3 OPERACIONAL**  
**COMPLIANCE: Art. 18, II + Art. 18, V + Art. 20 LGPD**
