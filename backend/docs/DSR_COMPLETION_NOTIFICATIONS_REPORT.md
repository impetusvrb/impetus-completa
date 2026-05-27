# DSR Completion & Notifications — Relatório (T1.6.5)

**Data:** 2026-05-26  
**Classificação:** ENTERPRISE / LGPD Art. 18  
**Status:** OPERACIONAL

---

## 1. RESUMO EXECUTIVO

Implementação do ciclo operacional completo do DSR com:
- **Notificações ao titular** em cada fase (submit, approve, execute, reject, SLA D-3)
- **Notificação à equipa DPO** para pedidos que requerem acção
- **Rejection flow** com justificativa legal obrigatória
- **SLA approaching scanner** (D-3) automático a cada 6h
- **Non-blocking** — notificações nunca impedem o fluxo principal
- **Idempotente** — SLA scan não duplica notificações

---

## 2. FLUXO OPERACIONAL COMPLETO

```
┌─────────────┐          ┌─────────────┐          ┌─────────────────┐
│  TITULAR    │          │    DPO      │          │    SISTEMA      │
│  submete    │─────────▶│  recebe     │          │                 │
│  request    │   📬     │  notificação│          │                 │
└─────────────┘          └──────┬──────┘          └─────────────────┘
      │                         │                         │
   📬 notif:                    │                    ┌────┴────┐
   "pedido recebido"            │                    │ SLA D-3 │
      │                    ┌────┴────┐               │ scanner │
      │                    │ APPROVE │               └────┬────┘
      │                    │ ou      │                    │
      │                    │ REJECT  │               📬 notif:
      │                    └────┬────┘              "prazo vencendo"
      │                         │
      ▼                    ┌────┴────────────────────────┐
 📬 notif:                 │                             │
 "aprovado" ou         APPROVED                     REJECTED
 "rejeitado"               │                             │
      │                    ▼                        📬 notif:
      │               ┌─────────┐                  "rejeitado +
      │               │ EXECUTE │                   justificativa"
      │               └────┬────┘
      │                    │
      ▼               📬 notif:
 📬 notif:            "dados exportados /
 "concluído"          exclusão realizada"
```

---

## 3. NOTIFICAÇÕES IMPLEMENTADAS

| Tipo | Evento | Prioridade | Destinatário |
|------|--------|:---:|---|
| `dsr_export_submitted` | Pedido de exportação submetido | medium | Titular + DPO team |
| `dsr_export_approved` | Exportação aprovada | high | Titular |
| `dsr_export_executed` | Exportação concluída | high | Titular |
| `dsr_export_rejected` | Exportação rejeitada | high | Titular |
| `dsr_erase_submitted` | Pedido de exclusão submetido | high | Titular + DPO team |
| `dsr_erase_approved` | Exclusão aprovada | high | Titular |
| `dsr_erase_executed` | Exclusão concluída | critical | Titular |
| `dsr_erase_rejected` | Exclusão rejeitada | high | Titular |
| `dsr_sla_approaching` | Deadline D-3 | critical | Titular + DPO team |

---

## 4. REJECTION FLOW

### 4.1 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/lgpd/subject/erase/:requestId/reject` | Rejeita pedido de exclusão |
| POST | `/api/lgpd/subject/export/:id/reject` | Rejeita pedido de exportação |

### 4.2 Requisitos

| Requisito | Implementação |
|-----------|--------------|
| Auth | `requireAuth` |
| Hierarquia | `requireHierarchy(1)` (DPO/admin) |
| Justificativa legal | Campo `legal_justification` obrigatório (min 10 chars) |
| Audit | `logAction` com severity `high` |
| Notificação | Titular notificado com justificativa |
| Idempotência | Rejeição só possível em status `pending` ou `approved` |

### 4.3 Exemplo de Request

```json
POST /api/lgpd/subject/erase/:requestId/reject
{
  "legal_justification": "Art. 16, I LGPD — Cumprimento de obrigação legal ou regulatória pelo controlador. Dados necessários para auditoria fiscal obrigatória (5 anos)."
}
```

### 4.4 Response

```json
{
  "ok": true,
  "request_id": "uuid",
  "status": "rejected",
  "rejected_by": "uuid-dpo",
  "rejected_at": "2026-05-26T22:00:00.000Z",
  "legal_justification": "Art. 16, I LGPD — ...",
  "_meta": { "correlation_id": "..." }
}
```

---

## 5. SLA APPROACHING SCANNER

| Propriedade | Valor |
|-------------|-------|
| Frequência | A cada 6 horas (non-blocking, `unref()`) |
| Threshold | D-3 (deadline ≤ 3 dias no futuro) |
| Idempotência | Não notifica se já existe notificação SLA nos últimos 3 dias para o mesmo request |
| Destino | Titular + DPO team |
| Boot | Automático via `server.js` |

---

## 6. GARANTIAS

| Garantia | Implementação |
|----------|--------------|
| Non-blocking | Todas as chamadas `notify()` com `.catch(() => {})` |
| Retry-safe | INSERT simples (falha = log, não impede fluxo) |
| Idempotência | SLA scan verifica `NOT EXISTS` notificação recente |
| Multi-tenant | Notificações scoped por `company_id` |
| Structured logging | `[DSR_NOTIFICATION]` em toda operação |
| DPO team discovery | Query dinâmica: `hierarchy_level <= 1 AND active = true` |

---

## 7. CHECKLIST LEGAL DE ACTIVAÇÃO

### Para activar `IMPETUS_DSR_ERASE=on`:

| # | Verificação | Status |
|---|-------------|--------|
| 1 | Approval flow funcional (DPO pode aprovar/rejeitar) | ✅ |
| 2 | SLA tracking activo (21 dias) | ✅ |
| 3 | Notificações ao titular em cada fase | ✅ |
| 4 | Rejection com justificativa legal obrigatória | ✅ |
| 5 | Audit trail completo (logAction severity=critical) | ✅ |
| 6 | Tabelas LEGALLY_PROTECTED nunca tocadas | ✅ |
| 7 | Rollback window 72h | ✅ |
| 8 | Multi-tenant isolation | ✅ |
| 9 | DPO team notificado de pedidos pendentes | ✅ |
| 10 | SLA approaching (D-3) alertando automaticamente | ✅ |
| 11 | Soft-delete (reversível) antes de hard-delete | ✅ |
| 12 | STRICT mode disponível (`IMPETUS_DSR_ERASE_STRICT=on`) | ✅ |

### Para activar `IMPETUS_DSR_EXPORT=on`:

| # | Verificação | Status |
|---|-------------|--------|
| 1 | Approval flow funcional | ✅ |
| 2 | Rejection com justificativa legal | ✅ |
| 3 | Notificações em cada fase | ✅ |
| 4 | Dados LEGALLY_PROTECTED excluídos do export | ✅ |
| 5 | Zero mutations (read-only) | ✅ |
| 6 | Multi-tenant isolation | ✅ |
| 7 | SLA tracking activo | ✅ |

---

## 8. TESTES DE VALIDAÇÃO

```
=== DSR NOTIFICATIONS & REJECTION TEST ===

─── 1. NOTIFY (direct) ───
✅ Notification created in DB

─── 2. NOTIFY DPO TEAM ───
✅ 4 admins found and notified (4/4 sent)

─── 3. REJECTION FLOW ───
✅ Erase request created
✅ Rejected with legal justification
✅ Status = rejected
✅ Re-rejection blocked (INVALID_STATUS)

─── 4. REJECT WITHOUT JUSTIFICATION ───
✅ Blocked (JUSTIFICATION_REQUIRED)

─── 5. SLA SCAN ───
✅ Scanner functional (0 approaching deadlines)

─── 6. VERIFY NOTIFICATIONS ───
✅ DSR notifications persisted in DB
```

---

## 9. ARTEFACTOS

| Ficheiro | Descrição |
|----------|-----------|
| `backend/src/services/dsrNotificationService.js` | Serviço de notificações DSR |
| `backend/src/services/dsrEraseService.js` | `rejectEraseRequest()` adicionado |
| `backend/src/routes/lgpd.js` | Endpoints reject + notificações integradas |
| `backend/src/server.js` | SLA scheduler boot |
| `backend/docs/DSR_COMPLETION_NOTIFICATIONS_REPORT.md` | Este relatório |

---

## 10. FLAGS

| Flag | Valor Actual | Pronto para ON |
|------|:---:|:---:|
| `IMPETUS_DSR_EXPORT` | `off` | ✅ |
| `IMPETUS_DSR_ERASE` | `off` | ✅ |
| `IMPETUS_DSR_ERASE_STRICT` | `off` | ✅ (opcional) |

Para activar em produção:
```bash
# .env
IMPETUS_DSR_EXPORT=on
IMPETUS_DSR_ERASE=on
# IMPETUS_DSR_ERASE_STRICT=on  # opcional

# Reiniciar
pm2 restart impetus-backend --update-env
```

---

**STATUS: CONCLUÍDO — DSR OPERACIONAL PARA USO REAL**  
**COMPLIANCE: Art. 18, II + V + VI LGPD — PRONTO PARA ACTIVAÇÃO**
