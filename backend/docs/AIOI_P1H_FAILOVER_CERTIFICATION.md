# AIOI-P1H — Failover Certification

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1H_FAILOVER_PASS`

---

## Cenários Simulados

| Cenário | lease_recovered |
|---------|-----------------|
| Worker crash | ✓ |
| Worker stop | ✓ |
| Lease expiration | ✓ |

---

## Critérios

```json
{
  "lease_recovered": true,
  "shard_reassigned": true,
  "events_lost": 0
}
```

---

## Shard Reassignment

Com 2 workers e 4 shards: união de ownership cobre todos os shards (0–3).

Failover via `acquire → release → reacquire` em advisory locks P1E (`8820202610+`).

Lock P1A (`8820202607`) **preservado**.

---

## Critério

```json
{
  "failover_certified": true
}
```
