# AIOI-P1D.1 — Outbox Retention Framework

**Data:** 2026-06-12  
**Serviço:** `backend/src/services/aioi/lifecycle/aioiOutboxRetentionService.js`

---

## Configuração

```env
IMPETUS_AIOI_OUTBOX_RETENTION_DAYS=90        # default: 90
IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE=false  # dry-run por padrão
```

---

## Funções Implementadas

| Função | Descrição |
|---|---|
| `estimateRetentionImpact()` | Estima bytes recuperáveis e percentual da tabela |
| `countEligibleDeliveredRecords()` | Conta delivered elegíveis (> retention_days) |
| `retentionDryRun()` | Simula purge sem DELETE |
| `purgeDeliveredRecords({ confirm })` | Purge real — requer confirm + EXECUTE=true |

---

## Regras de Segurança

| Status | Ação |
|---|---|
| `delivered` | ✓ Elegível após retention_days |
| `pending` | ✗ NUNCA removido |
| `processing` | ✗ NUNCA removido |
| `failed` | ✗ NUNCA removido |

Critério temporal: `COALESCE(processed_at, updated_at, created_at) < cutoff`

---

## Validação P1D

```json
{
  "eligible_for_purge": 0,
  "total_delivered": 13155,
  "retention_days": 90,
  "execute_enabled": false,
  "mode": "dry_run_only"
}
```

**Nota:** Nenhum registro delivered excede 90 dias — purge não necessário no momento.

---

## Veredito

```
AIOI_P1D_OUTBOX_RETENTION_READY
```
