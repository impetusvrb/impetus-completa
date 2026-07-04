# SEC-12 — Rollback Validation

## Critérios por acção

| Campo | Validação |
|-------|-----------|
| `rollbackDocumented` | Obrigatório |
| `rollbackTested` | HIGH_RISK se false |
| `rollbackAutomatic` | CRITICAL manual → HIGH_RISK |

## Verdictos

- **VALID** — rollback documentado e risco aceitável
- **HIGH_RISK** — rollback não testado em staging
- **INVALID** — rollback ausente

---

Cada acção no registry inclui `estimatedDurationMinutes` para rollback plan.
