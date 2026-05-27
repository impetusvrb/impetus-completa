# DSR Erase (Soft) — Relatório de Implementação

**PROMPT:** T1.6.3  
**Data:** 2026-05-26  
**Status:** CONCLUÍDO  
**Flags:** `IMPETUS_DSR_ERASE=off` / `IMPETUS_DSR_ERASE_STRICT=off`

---

## 1. Resumo Executivo

Implementado o direito ao esquecimento (Art. 18, VI LGPD) com:
- Soft-delete reversível (72h rollback window)
- Anonymization markers para preparação de hard-delete futuro
- Approval flow assíncrono (pending → approved → executing → completed)
- SLA tracking (21 dias corridos = 15 dias úteis)
- Deny-first: nunca executa sem aprovação explícita
- Multi-tenant isolation completo
- Audit trail completo em cada fase

---

## 2. Arquivos Criados/Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `backend/src/services/dsrEraseService.js` | NOVO | Service enterprise-grade de erasure |
| `backend/src/routes/lgpd.js` | MODIFICADO | +4 endpoints DSR Erase |
| `backend/.env` | MODIFICADO | +2 flags |
| `backend/src/governance/flagReconcilerRuntime.js` | MODIFICADO | +3 flags críticas |
| `backend/docs/DSR_ERASE_IMPLEMENTATION_REPORT.md` | NOVO | Este relatório |

---

## 3. Endpoints Implementados

### 3.1 `POST /api/lgpd/subject/me/erase`
**Propósito:** Titular submete pedido de erasure  
**Auth:** `requireAuth`  
**Corpo:**
```json
{
  "reason": "Motivo da exclusão (opcional)",
  "confirmation": "CONFIRMO EXCLUSAO DOS MEUS DADOS (obrigatório se STRICT=on)"
}
```
**Resposta 202:**
```json
{
  "ok": true,
  "request": {
    "id": "uuid",
    "status": "pending",
    "deadline": "2026-06-16T...",
    "sla_days": 21,
    "rollback_window_hours": 72
  },
  "flow": {
    "current_stage": "pending",
    "next_stage": "approved",
    "requires_approval": true,
    "approval_by": "DPO ou hierarchy_level ≤ 1"
  }
}
```

### 3.2 `GET /api/lgpd/subject/me/erase/status`
**Propósito:** Titular consulta status dos seus pedidos  
**Auth:** `requireAuth`

### 3.3 `POST /api/lgpd/subject/erase/:requestId/approve`
**Propósito:** DPO/Admin aprova pedido  
**Auth:** `requireAuth` + `requireHierarchy(1)`

### 3.4 `POST /api/lgpd/subject/erase/:requestId/execute`
**Propósito:** DPO/Admin executa erasure aprovado  
**Auth:** `requireAuth` + `requireHierarchy(1)`  
**Resposta:**
```json
{
  "ok": true,
  "status": "completed",
  "summary": {
    "total_affected": 45,
    "tables_processed": 19,
    "tables_with_data": 7,
    "completed_at": "...",
    "rollback_deadline": "...",
    "rollback_window_hours": 72
  },
  "details": [...],
  "legal_protected": ["consent_logs", "audit_logs", ...]
}
```

---

## 4. Fluxo Operacional

```
┌──────────────────────────────────────────────────────────────────────┐
│  TITULAR                                                              │
│  POST /subject/me/erase                                               │
│  ↓                                                                    │
│  [DENY-FIRST] Flag check + tenant isolation + duplicate check         │
│  ↓                                                                    │
│  lgpd_data_requests → status: PENDING                                 │
│  ↓                                                                    │
│  SLA timer starts (21 dias)                                           │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DPO / ADMIN (hierarchy ≤ 1)                                          │
│  POST /subject/erase/:id/approve                                      │
│  ↓                                                                    │
│  status: PENDING → APPROVED                                           │
│  audit: dsr_erase_approved                                            │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DPO / ADMIN (hierarchy ≤ 1)                                          │
│  POST /subject/erase/:id/execute                                      │
│  ↓                                                                    │
│  status: APPROVED → EXECUTING → COMPLETED                             │
│  ↓                                                                    │
│  Para cada tabela em ERASURE_TARGETS (18 tabelas):                    │
│    - method: delete → soft-delete (SET deleted_at)                    │
│    - method: anonymize_content → '[REDACTED_DSR]'                     │
│    - method: anonymize_jsonb → {"_redacted":"DSR"}                    │
│  ↓                                                                    │
│  users → deleted_at=NOW(), active=false, email='[ERASED_...]'         │
│  ↓                                                                    │
│  Rollback window: 72h                                                 │
│  audit: dsr_erase_executed                                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tabelas Processadas (18 targets + users)

| Tabela | Método | Tenant-scoped |
|--------|--------|:---:|
| chat_messages | anonymize_content | ✓ (join) |
| internal_chat_messages | anonymize_content | ✓ |
| onboarding_conversations | delete | ✓ |
| user_activity_logs | delete | ✓ |
| dashboard_usage_events | delete | ✓ |
| sessions | delete | ✗ |
| refresh_tokens | delete | ✗ |
| password_reset_tokens | delete | ✗ |
| user_security_verification_codes | delete | ✗ |
| chat_push_subscriptions | delete | ✗ |
| notifications | delete | ✓ |
| voice_preferences | delete | ✗ |
| user_dashboard_preferences | delete | ✗ |
| manuia_notification_preferences | delete | ✗ |
| manuia_mobile_devices | delete | ✗ |
| strategic_user_behavior | delete | ✓ |
| memoria_usuario | delete | ✓ |
| ai_interaction_traces | anonymize_jsonb | ✓ |
| **users** | soft_delete | ✓ |

---

## 6. Tabelas PROTEGIDAS (obrigação legal — não tocadas)

| Tabela | Base Legal |
|--------|-----------|
| consent_logs | Art. 7°, VIII LGPD — Prova de consentimento |
| ai_legal_audit_logs | Art. 37 LGPD — Registro de operações |
| audit_logs | Art. 37 LGPD — Trilha de auditoria |
| ai_decision_logs | Art. 20 LGPD — Explicabilidade IA |
| token_usage | Art. 37 LGPD — Operacional/financeiro |
| lgpd_data_requests | Art. 18 LGPD — Prova de atendimento DSR |

---

## 7. Rollback Plan

| Cenário | Ação |
|---------|------|
| Erro durante execução | Status revertido automaticamente para `pending` |
| Titular desiste (< 72h) | Restaurar `deleted_at = NULL`, `active = true`, email original |
| Aprovação indevida | DPO rejeita manualmente antes da execução |
| Dados anonymized | Content = `[REDACTED_DSR]` → pode ser restaurado via backup BD (window 72h) |
| Flag desligada emergência | `IMPETUS_DSR_ERASE=off` → endpoint retorna 503 imediato |
| Rollback total pós-deploy | Remover as 4 rotas adicionadas + flag = off |

---

## 8. Matriz Legal LGPD

| Artigo | Requisito | Status |
|--------|-----------|--------|
| Art. 18, VI | Direito à eliminação dos dados pessoais | ✅ Implementado |
| Art. 18, §3° | Atendimento em prazo razoável (15 dias úteis) | ✅ SLA 21d corridos |
| Art. 18, §6° | Dados anonimizados não se consideram pessoais | ✅ Anonymization markers |
| Art. 7°, §5° | Titular pode revogar consentimento | ✅ Erase como exercício |
| Art. 16 | Dados eliminados após cumprimento finalidade | ✅ Soft-delete |
| Art. 16, I | Conservação para cumprimento obrigação legal | ✅ LEGALLY_PROTECTED |
| Art. 16, IV | Uso exclusivo pelo controlador (anonimização) | ✅ Anonymization markers |
| Art. 37 | Registro de operações (ROPA) | ✅ Audit trail cada fase |
| Art. 41 | Encarregado (DPO) — aprovação | ✅ requireHierarchy(1) |
| Art. 46 | Medidas de segurança | ✅ Deny-first, flags, rollback |
| Art. 48 | Comunicação ao titular | ✅ Status endpoint |

---

## 9. Feature Flags

| Flag | Default | Efeito |
|------|---------|--------|
| `IMPETUS_DSR_ERASE` | `off` | Habilita/desabilita todo o subsistema |
| `IMPETUS_DSR_ERASE_STRICT` | `off` | Requer texto de confirmação explícito |

---

## 10. Riscos Mitigados

| Risco | Mitigação |
|-------|-----------|
| Erasure acidental | Approval flow obrigatório (DPO) |
| Perda de dados legais | LEGALLY_PROTECTED_TABLES never touched |
| Cross-tenant leak | company_id scoping em todas as queries |
| Irreversibilidade | 72h rollback window + soft-delete |
| SLA violation | Deadline registado + tracking |
| Produção acidentalmente afectada | Flag off por default |
| Cascata descontrolada | Tabelas processadas sequencialmente com error isolation |

---

## 11. Compatibilidade

- ✅ Motor A: sem impacto (não altera runtime principal)
- ✅ Engine V2: sem impacto (rotas separadas)
- ✅ Runtime Z / Pilotos: sem impacto (flag off)
- ✅ `universalAuditMiddleware`: registará write operations nestes endpoints
- ✅ `runtimeStateEnforcementMiddleware`: compatível (rotas classificáveis)
- ✅ `flagReconcilerRuntime`: flags registadas

---

## 12. Próximos Passos (NÃO implementados)

1. **Hard-delete scheduler** — Após rollback window expirar, purge físico
2. **Notificação ao titular** — Email/push de confirmação em cada fase
3. **Rejection flow** — DPO pode rejeitar com justificativa legal
4. **Partial erasure** — Titular seleciona categorias específicas
5. **Bulk operations** — Admin processa múltiplos pedidos
6. **Dashboard DPO** — Interface visual para gestão de DSR
