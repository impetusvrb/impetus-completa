# OPM-GOV-001 — Movement Baseline

## Business Movements (activos)

| Tipo | Direcção | Módulo | Referência |
|------|----------|--------|------------|
| `receipt` | inbound | OPM-003 | receiving |
| `issue` | outbound | OPM-005 | shipping |

Representam mudança de posse operacional do estoque.

## Fulfillment Movements (activos)

| Tipo | Módulo | Referência |
|------|--------|------------|
| `pick` | OPM-004 | picking |

Reserva e preparação para expedição.

## Sequência certificada E2E

```
receipt → pick → issue
```

## Internal Movements (reservados OPM-006)

| Tipo | Status |
|------|--------|
| `transfer` | reserved |
| `relocation` | reserved |
| `replenishment` | reserved |
| `crossDock` | reserved |

Sem implementação nesta fase.
