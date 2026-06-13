# AIOI-P1D.2 — Snapshot Retention Framework

**Data:** 2026-06-12  
**Serviço:** `backend/src/services/aioi/lifecycle/aioiSnapshotRetentionService.js`

---

## Configuração

```env
IMPETUS_AIOI_SNAPSHOT_RETENTION_COUNT=1000   # default: 1000
IMPETUS_AIOI_SNAPSHOT_RETENTION_EXECUTE=false
```

---

## Funções Implementadas

| Função | Descrição |
|---|---|
| `countSnapshotsPerTenant()` | Contagem por company_id |
| `estimateSnapshotGrowth()` | Excesso acima do limite + projeção bytes |
| `retentionDryRun()` | Simula purge mantendo N mais recentes |
| `purgeOldSnapshots({ confirm })` | Purge real via ROW_NUMBER partition |

---

## Algoritmo de Retenção

```sql
ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY generated_at DESC)
→ DELETE WHERE rn > retention_count
```

**Garantia:** Os N snapshots mais recentes por tenant são **sempre** preservados.

---

## Validação P1D

```json
{
  "retention_count": 1000,
  "total_snapshots": 11114,
  "total_excess": 10106,
  "table_bytes": "7.2 MB",
  "execute_enabled": false,
  "mode": "dry_run_only"
}
```

**Contexto:** Excesso acumulado de testes P1C (10.000 snapshots injetados). Dry-run identifica 10.106 registros elegíveis para purge.

---

## Veredito

```
AIOI_P1D_SNAPSHOT_RETENTION_READY
```
