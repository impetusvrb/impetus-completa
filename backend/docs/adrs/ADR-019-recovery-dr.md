# ADR-019 — Recovery e Disaster Recovery

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-018, ADR-014

---

## Contexto

Restore BD documentado manualmente. AIOI P1I certifica failover worker, não restore PG. Lacuna identificada em FORENSICS-01.

---

## Problema

Definir DR Enterprise com objectivos mensuráveis sem implementar scripts.

---

## Decisão

| Métrica | Target |
|---------|--------|
| **RPO** | ≤ 24h (backup diário); ≤ 1h se WAL archiving (DATA-01 opcional) |
| **RTO** | ≤ 4h restore manual documentado |

**Cenários DR:**

1. **BD corrupta** — pg_restore último dump
2. **Host perdido** — novo host + restore volumes + DNS
3. **Update falhado** — rollback app/ + restore BD se migration
4. **Uploads/data perdidos** — restore tar from backups/

**Ordem restore:** PG → config → licenses → data → uploads → start PM2 → smoke

Teste DR: anual recomendado (VALIDATION-01).

---

## Consequências

- DATA-01 entrega `impetus-restore.sh` e runbook
- Cliente responsável off-site backup

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Multi-region active-active | Fora scope fábrica única |
| RPO zero sem WAL | Custo/complexidade excessivos day-1 |

---

## Referências

- `backend/docs/AIOI_P1I_DISASTER_RECOVERY.md`
- CERT-ONPREM-INFRA-01 Parte 9
