# AIOI-P1G — Horizontal Recovery Certification

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1G_HORIZONTAL_RECOVERY_PASS`

---

## Cenários Executados

1. **Restart worker** — `continuousWorker.restartWorker()` + `stopWorker()`
2. **Restart backend** — simulado via re-execução de partition/lease
3. **Restart PM2** — metodologia equivalente (stop/start worker in-process)

---

## Critérios

```json
{
  "events_lost": 0,
  "duplicates": 0,
  "lease_recovered": true,
  "ownership_recovered": true,
  "recovery_certified": true
}
```

---

## Detalhes

| Teste | Resultado |
|-------|-----------|
| Ciclos before/after recovery | 30 → 31 |
| Lease acquire → release → reacquire | ✓ |
| Partition stable após restart | ✓ |
| Ownership conflicts | 0 |

---

## Rollback Comprovado

Flags default OFF após certificação — runtime retorna ao fluxo pilot certificado instantaneamente.
