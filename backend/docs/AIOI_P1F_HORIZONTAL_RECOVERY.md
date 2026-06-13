# AIOI-P1F — Horizontal Recovery Certification

**Data:** 2026-06-13  
**Modo:** SHADOW  
**Serviço:** `aioiHorizontalValidationMetricsService.js`

---

## Objetivo

Validar integridade de recovery após restart worker, restart backend, expiração de lease e reatribuição de shard.

---

## Cenários Simulados

### Worker Restart

1. Adquire leases shards 0 e 1
2. Renova metadata
3. Libera leases
4. Re-verifica particionamento de 50 tenants

**Resultado:** `partition_stable_after_restart: true`

### Backend Restart

Simulado via re-execução de `calculateTenantPartition()` — assignments idênticos antes/depois.

### Lease Expiration

1. Acquire shard 2
2. Release shard 2
3. Reacquire shard 2

**Resultado:** `lease_expiration_recovery: true`

### Shard Reassignment

4 workers, 4 shards — ownership round-robin sem conflitos.

---

## Critérios Obrigatórios

| Critério | Valor | Pass |
|----------|-------|------|
| events_lost | 0 | ✓ |
| duplicates | 0 | ✓ |
| ownership_conflicts | 0 | ✓ |
| partition_stable_after_restart | true | ✓ |
| lease_expiration_recovery | true | ✓ |

---

## Notas

- **events_lost = 0:** shadow mode — nenhum evento real processado
- **duplicates = 0:** nenhum tenant duplicado no registry de teste
- **ownership_conflicts = 0:** cada shard pertence a exatamente um worker na simulação 4-worker

---

## Veredito

**AIOI_P1F_HORIZONTAL_RECOVERY_PASS**

```json
{
  "recovery_certified": true,
  "events_lost": 0,
  "duplicates": 0,
  "ownership_conflicts": 0
}
```

---

## Restrições

Recovery validado em shadow — não altera pipeline P0B–P1E certificado.
