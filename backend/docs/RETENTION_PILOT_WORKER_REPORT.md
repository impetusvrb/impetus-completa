# Retention Pilot Worker — Relatório de Implementação

**PROMPT:** T1.7.3  
**Data:** 2026-05-26  
**Status:** CONCLUÍDO  
**Mode actual:** `shadow` (pilot inactivo até activação explícita)

---

## 1. Resumo Executivo

Implementado worker de retention com **mutations reais controladas**, protegido por:
- Tenant allowlist obrigatória
- Rate-limit entre batches (200ms)
- Batch size máximo (100 default, cap 1000)
- Max rows por run (500 default, cap 5000)
- Abort automático ao primeiro erro
- Tabelas AUDIT_IMMUTABLE nunca tocadas

---

## 2. Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `backend/src/workers/retentionPilotWorker.js` | NOVO | Worker pilot com mutations reais |
| `backend/src/workers/retentionShadowWorker.js` | MODIFICADO | Reconhece mode `pilot` |
| `backend/src/server.js` | MODIFICADO | Boot integration pilot |
| `backend/src/routes/admin/runtimeFlags.js` | MODIFICADO | +2 endpoints pilot |
| `backend/.env` | MODIFICADO | +3 flags pilot |
| `backend/src/governance/flagReconcilerRuntime.js` | MODIFICADO | +1 flag crítica |

---

## 3. Flags

| Flag | Default | Descrição |
|------|---------|-----------|
| `IMPETUS_RETENTION_MODE` | `shadow` | `off` / `shadow` / `pilot` / `audit` |
| `IMPETUS_RETENTION_PILOT_TENANTS` | `37f4af98-...` | CSV de UUIDs allowlisted |
| `IMPETUS_RETENTION_BATCH_SIZE` | `100` | Rows por batch (cap: 1000) |
| `IMPETUS_RETENTION_MAX_PER_RUN` | `500` | Total rows por run (cap: 5000) |

---

## 4. Tabelas Alvo

| Tabela | TTL | Ação Pilot | SQL |
|--------|:---:|------------|-----|
| `industrial_event_outbox` | 14d | **DELETE** real | `WHERE company_id=$1 AND created_at<$2 LIMIT $3` |
| `operational_memory` | 365d | **UPDATE** (anonymize) | SET content='[RETENTION_ANONYMIZED]' |
| `chat_messages` | 730d | **UPDATE** (anonymize) | SET content='[RETENTION_ANONYMIZED]' via JOIN |

---

## 5. Proteções de Segurança

| Proteção | Implementação |
|----------|---------------|
| **Tenant allowlist** | Só executa para UUIDs em `IMPETUS_RETENTION_PILOT_TENANTS` |
| **Rate-limit** | 200ms pausa entre cada batch |
| **Batch size** | Max 100 rows por iteração (configurável, cap 1000) |
| **Max per run** | Max 500 rows total por ciclo (configurável, cap 5000) |
| **Abort on error** | Qualquer erro cancela toda a run |
| **AUDIT_IMMUTABLE** | Tabelas com `data_class=audit_immutable` NUNCA tocadas |
| **Mode gate** | Só executa se `IMPETUS_RETENTION_MODE=pilot` exactamente |
| **No tenants = no run** | Lista vazia → rejeita execução |

---

## 6. Rollback Safety

| Cenário | Mecanismo |
|---------|-----------|
| Purge acidental | Flag `IMPETUS_RETENTION_MODE=shadow` → zero mutations |
| Tenant errado | Allowlist vazia → worker não executa |
| Volume excessivo | `MAX_PER_RUN=500` cap → nunca excede |
| Erro em batch | Abort imediato, restantes batches cancelados |
| Rollback completo | Mudar flag para `shadow` + reiniciar PM2 |
| Dados anonymized | Content = `[RETENTION_ANONYMIZED]` — idempotente, não re-processa |
| Kill switch total | `IMPETUS_RETENTION_MODE=off` → nenhum worker executa |

---

## 7. Fluxo de Ativação

```
┌───────────────────────────────────────────────────────────────┐
│  ESTADO ACTUAL: IMPETUS_RETENTION_MODE=shadow                  │
│  Shadow workers activos — scan-only, zero mutations            │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼ (quando DPO/Architect decidir)
┌───────────────────────────────────────────────────────────────┐
│  ACTIVAÇÃO PILOT:                                              │
│  1. Definir tenants: IMPETUS_RETENTION_PILOT_TENANTS=uuid      │
│  2. Mudar mode: IMPETUS_RETENTION_MODE=pilot                   │
│  3. pm2 restart impetus-backend --update-env                   │
│  4. Verificar logs: [RETENTION_PILOT_BOOT] enabled:true        │
│  5. Primeiro scan em ~3 min                                    │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  MONITORIZAÇÃO:                                                │
│  GET /api/admin/runtime/retention-pilot (stats)                │
│  POST /api/admin/runtime/retention-pilot/run (trigger manual)  │
│  Logs: [RETENTION_PILOT] batch_executed / pilot_run_completed  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼ (se problemas)
┌───────────────────────────────────────────────────────────────┐
│  ROLLBACK:                                                     │
│  IMPETUS_RETENTION_MODE=shadow (ou off)                        │
│  pm2 restart impetus-backend --update-env                      │
│  → Zero mutations, apenas scan                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. Endpoints Admin

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/admin/runtime/retention-pilot` | GET | Stats do worker |
| `/api/admin/runtime/retention-pilot/run` | POST | Trigger manual de pilot run |
| `/api/admin/runtime/retention-shadow` | GET | Stats shadow (mantido) |
| `/api/admin/runtime/retention-shadow/scan` | POST | Trigger shadow scan (mantido) |

---

## 9. Testes Validados

| Teste | Resultado |
|-------|-----------|
| Mode off → rejeita | ✅ PASS (code: NOT_PILOT) |
| Mode shadow → rejeita | ✅ PASS (code: NOT_PILOT) |
| No tenants → rejeita | ✅ PASS (code: NO_TENANTS) |
| Batch overflow → cap 1000 | ✅ PASS |
| Max overflow → cap 5000 | ✅ PASS |
| Pilot run (0 expired) → OK | ✅ PASS (affected=0) |
| Safety struct completa | ✅ PASS |
| PM2 boot pilot disabled | ✅ PASS |
| PM2 boot shadow active | ✅ PASS |

---

## 10. Compatibilidade

- ✅ Motor A / Engine V2: sem impacto
- ✅ Runtime Z / Pilotos: sem impacto
- ✅ Shadow worker: continua funcional (mode pilot inclui shadow scan)
- ✅ `retentionPolicyRegistry`: consumido para TTL lookup
- ✅ `flagReconcilerRuntime`: flag registada
- ✅ DSR Erase: independente (operações paralelas)
