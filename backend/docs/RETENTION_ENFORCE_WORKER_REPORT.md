# Retention Enforce Worker — Relatório Final

**PROMPT:** T1.7.4  
**Data:** 2026-05-26  
**Status:** CONCLUÍDO  
**Mode actual:** `shadow` (enforce disponível para ativação)

---

## 1. Resumo Executivo

Implementado o worker de retenção global (**enforce mode**) que executa purge/anonymize em todas as tabelas com TTL definido, para todos os tenants, com:
- **Idempotência** total (re-run seguro, filtra registos já processados)
- **Retry seguro** (estado parcial OK, abort inteligente após N erros consecutivos)
- **Audit trail** (cada run gravada em `audit_logs` + structured logs)
- **Rate-limit** (150ms entre batches)
- **Kill switch** instantâneo (mudar flag + restart)

### Resultado do primeiro enforce run:
- **824 sessões expiradas** eliminadas (TTL 30d)
- **10 tabelas** processadas, **0 erros**, **0 aborts**
- Tempo: **835ms**
- Re-run: **0 rows** (idempotência confirmada)

---

## 2. Pipeline Completo de Retention

```
┌────────┐    ┌────────┐    ┌────────┐    ┌─────────┐
│  OFF   │ →  │ SHADOW │ →  │ PILOT  │ →  │ ENFORCE │
│  (0)   │    │ scan   │    │ allow- │    │ global  │
│        │    │ only   │    │ listed │    │ all     │
└────────┘    └────────┘    └────────┘    └─────────┘
  noop         metrics       mutations      mutations
               only          controlled     global
                             rate-limited   idempotent
                             abort-on-err   retry-safe
                                            audit-trail
```

| Stage | File | Interval | Mutations |
|-------|------|----------|-----------|
| shadow | `retentionShadowWorker.js` | 6h | 0 (scan) |
| pilot | `retentionPilotWorker.js` | 12h | allowlist only |
| enforce | `retentionEnforceWorker.js` | 24h | global |

---

## 3. Arquivos

| Arquivo | Ação |
|---------|------|
| `backend/src/workers/retentionEnforceWorker.js` | NOVO |
| `backend/src/workers/retentionShadowWorker.js` | MODIFICADO (reconhece `enforce`) |
| `backend/src/server.js` | MODIFICADO (boot enforce) |
| `backend/src/routes/admin/runtimeFlags.js` | MODIFICADO (+2 endpoints) |
| `backend/docs/RETENTION_ENFORCE_WORKER_REPORT.md` | NOVO |

---

## 4. Tabelas Alvo (Enforce)

| Tabela | TTL | Ação | Idempotência |
|--------|:---:|------|:---:|
| `industrial_event_outbox` | 14d | purge (DELETE) | ✓ (não re-deleta) |
| `industrial_event_dlq` | 90d | purge (DELETE) | ✓ |
| `app_impetus_outbox` | 14d | purge (DELETE) | ✓ |
| `sessions` | 30d | purge (DELETE) | ✓ |
| `notifications` | 90d | purge (DELETE) | ✓ |
| `operational_memory` | 365d | anonymize | ✓ (filtra `!= ANONYMIZED`) |
| `chat_messages` | 730d | anonymize | ✓ (filtra `!= ANONYMIZED`) |
| `internal_chat_messages` | 730d | anonymize | ✓ (filtra `!= ANONYMIZED`) |
| `user_activity_logs` | 180d | purge (DELETE) | ✓ |
| `dashboard_usage_events` | 180d | purge (DELETE) | ✓ |

---

## 5. Garantias

### Idempotência
- DELETE: Rows eliminadas não existem para re-processar
- ANONYMIZE: Filtra `content != '[RETENTION_ANONYMIZED]'` — nunca re-processa
- Re-run seguro: **0 mutations** confirmado em teste

### Retry Seguro
- Estado parcial OK: cada tabela é processada independentemente
- Erros isolados: falha numa tabela não afecta as outras
- Abort inteligente: 3 erros consecutivos na mesma tabela → abort dessa tabela, continua nas restantes
- Run seguinte retoma onde parou

### Audit Trail
- Cada run gravada em `audit_logs` com detalhes completos
- Structured logs `[RETENTION_ENFORCE]` com JSON parseável
- Campos: tables_processed, total_rows_mutated, elapsed_ms, errors
- Compatível com `universalAuditMiddleware` e observabilidade v2

---

## 6. Configuração

| Flag | Default | Descrição |
|------|---------|-----------|
| `IMPETUS_RETENTION_MODE` | `shadow` | `off` / `shadow` / `pilot` / `enforce` |
| `IMPETUS_RETENTION_BATCH_SIZE` | `200` | Rows por batch (cap: 2000) |
| `IMPETUS_RETENTION_MAX_PER_RUN` | `2000` | Max rows por tabela (cap: 10000) |

---

## 7. Endpoints Admin

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/admin/runtime/retention-enforce` | GET | Stats do enforce |
| `/api/admin/runtime/retention-enforce/run` | POST | Trigger manual |
| `/api/admin/runtime/retention-pilot` | GET | Stats pilot |
| `/api/admin/runtime/retention-pilot/run` | POST | Trigger pilot |
| `/api/admin/runtime/retention-shadow` | GET | Stats shadow |
| `/api/admin/runtime/retention-shadow/scan` | POST | Trigger shadow |
| `/api/admin/runtime/retention-registry` | GET | Registry policies |

---

## 8. Activação

```bash
# Modo enforce global (produção)
IMPETUS_RETENTION_MODE=enforce
pm2 restart impetus-backend --update-env

# Logs de confirmação:
# [RETENTION_ENFORCE_BOOT] {"enabled":true,"scheduler":true,...}
# Primeira execução: ~5 min após boot
# Intervalo: 24h
```

---

## 9. Rollback

| Cenário | Acção |
|---------|-------|
| Parar enforce | `IMPETUS_RETENTION_MODE=shadow` + restart |
| Parar tudo | `IMPETUS_RETENTION_MODE=off` + restart |
| Reverter para pilot | `IMPETUS_RETENTION_MODE=pilot` + restart |
| Dados purged | Backup BD (janela 72h se configurado) |
| Dados anonymized | Irreversível (design intencional LGPD) |
| Kill switch emergência | `IMPETUS_RETENTION_MODE=off` + restart imediato |

---

## 10. Resultado do Primeiro Run

```json
{
  "run_number": 1,
  "mode": "enforce",
  "tables_processed": 10,
  "tables_skipped": 0,
  "tables_aborted": 0,
  "total_rows_mutated": 824,
  "total_errors": 0,
  "elapsed_ms": 835,
  "completed_at": "2026-05-26T20:40:42.393Z"
}
```

Detalhe:
- `sessions`: 824 rows purged (984 → 160, apenas sessões < 30 dias preservadas)
- Todas restantes: 0 affected (dados ainda dentro do TTL)
- Re-run: 0 rows (idempotência confirmada)

---

## 11. Compatibilidade

- ✅ Motor A / Engine V2: sem impacto
- ✅ Runtime Z / Pilotos: sem impacto (retain enforcement não toca config)
- ✅ Tabelas AUDIT_IMMUTABLE: NUNCA tocadas
- ✅ DSR Erase: operação independente (complementar)
- ✅ `retentionPolicyRegistry`: source-of-truth para TTLs
- ✅ `flagReconcilerRuntime`: flags registadas
- ✅ `universalAuditMiddleware`: compatível
- ✅ Shadow worker: continua ativo (métricas) em qualquer mode

---

## 12. Sumário do Pipeline Retention (T1.7.1–T1.7.4)

| Prompt | Entrega | Estado |
|--------|---------|--------|
| T1.7.1 | Registry central (153 tabelas) | ✅ CONCLUÍDO |
| T1.7.2 | Shadow workers (scan-only) | ✅ ACTIVO |
| T1.7.3 | Pilot workers (allowlist mutations) | ✅ DISPONÍVEL |
| T1.7.4 | Enforce workers (global) | ✅ DISPONÍVEL |

**Pipeline completo e operacional.** Progressão segura: `off → shadow → pilot → enforce`.
