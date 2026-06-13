# AIOI — Pilot Governance Contract

**Camada:** P2.5 — Pilot Governance & Stability  
**Modo:** Ativação explícita · rollback seguro · zero cross-tenant leakage  

---

## 1. Princípios

1. **Máximo 3 tenants piloto** — `IMPETUS_AIOI_PILOT_TENANTS` (comma-separated UUIDs).
2. **Flags controladas** — nenhuma capacidade AIOI ativa por default.
3. **Ativação explícita** — cada flag requer configuração deliberada em produção.
4. **Isolamento tenant** — RLS + processamento scoped por `company_id`.
5. **Sem cross-tenant leakage** — worker itera tenants individualmente com RLS.

---

## 2. Flags oficiais

| Flag | Default | Efeito |
|------|---------|--------|
| `IMPETUS_AIOI_ENABLED` | `false` | Master switch ingestão/processamento AIOI |
| `IMPETUS_AIOI_QUEUE_ACTIVE` | `false` | Fila CEO AIOI como fonte autoritativa (ORG-1 Q-05) |
| `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED` | `false` | Worker outbox operacional |
| `IMPETUS_AIOI_PILOT_TENANTS` | — | Tenants autorizados (máx. 3 UUIDs) |
| `IMPETUS_AIOI_AUTO_EXECUTE_BAND` | `none` | Sem auto-execução (P0 restrição) |

---

## 3. Regras PG-*

| ID | Regra |
|----|-------|
| PG-01 | Máximo 3 tenants em `IMPETUS_AIOI_PILOT_TENANTS` |
| PG-02 | UUID inválido rejeitado em `validatePilotConfig()` |
| PG-03 | Worker requer ≥1 pilot tenant quando enabled |
| PG-04 | Rollback: desativar flags → worker para no próximo shutdown |
| PG-05 | Desativação segura: `stopWorker()` limpa interval |
| PG-06 | Migração segura: additive-only migrations; sem DROP de soberanos |
| PG-07 | Sem processamento de tenant fora da lista piloto |
| PG-08 | Runtime cognitivo permanece `false` durante piloto |

---

## 4. Sequência de ativação recomendada

```
1. Aplicar migrations AIOI (G-01)
2. Configurar IMPETUS_AIOI_PILOT_TENANTS=<uuid>
3. IMPETUS_AIOI_ENABLED=true (shadow)
4. Smoke tests ingestão + outbox
5. IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true
6. Validar GET /api/aioi/health → HEALTHY
7. IMPETUS_AIOI_QUEUE_ACTIVE=true (após ORG-1 smoke)
```

---

## 5. Rollback

| Passo | Ação |
|-------|------|
| 1 | `IMPETUS_AIOI_QUEUE_ACTIVE=false` |
| 2 | `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=false` |
| 3 | Reiniciar PM2 / graceful shutdown |
| 4 | F47 queue retoma como fallback CEO (Q-05) |

---

## 6. Referências

- `AIOI_P0_AUTHORIZATION.md` (R3, R-Q1)
- `AIOI_QUEUE_PRECEDENCE_CONTRACT.md` (Q-05)
- `AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md`

---

## 7. Token

**PILOT_GOVERNANCE_CERTIFIED**
