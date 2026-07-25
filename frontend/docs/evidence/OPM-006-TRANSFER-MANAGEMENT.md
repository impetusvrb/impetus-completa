# OPM-006 — Transfer Management & Internal Logistics

**Fase:** OPM-006  
**Papel:** Camada transversal de logística interna — **não** novo fluxo de negócio  
**Pré-requisitos:** OPM-GOV-001 ✅ · WMS-REF-001 ✅ · OPM-E2E-001 ✅  
**Data:** 2026-07-19

---

## Princípio arquitectural

Transfer Management **conecta e optimiza** fluxos certificados (Receiving, Inventory, Picking, Shipping) **sem**:

- alterar posse do estoque;
- criar entradas (`receipt`) ou saídas (`issue`);
- substituir responsabilidades de Warehouse, Picking ou Inventory.

---

## Tipos movimentação interna (OPM-GOV-001 activados)

| Tipo | Descrição |
|------|-----------|
| `transfer` | Entre armazéns |
| `relocation` | Entre posições (bins) |
| `replenishment` | Reposição picking |
| `crossDock` | Recebimento → expedição directo |

API: `movement_type: transfer` + `metadata.internal_movement_type`

---

## Componentes WMS-REF-001

Dashboard · Metrics · Search · Filters · Grid · Timeline · Export (adapt/direct)

---

## Estados operacionais

Planejada → Liberada → Em execução → Pausada (opc.) → Concluída · Cancelada

---

## APIs WMS-003

- `GET /transfers`
- `POST /transfers`
- `GET /transfers/:id`
- `POST /transfers/:id/complete`
- `POST /inventory/movements` (movement_type: `transfer` only)

---

## Observabilidade

`TRANSFER_LOADED` · `TRANSFER_CREATED` · `TRANSFER_STARTED` · `TRANSFER_PAUSED` · `TRANSFER_COMPLETED` · `TRANSFER_RELOCATION` · `TRANSFER_REPLENISHMENT` · `TRANSFER_CROSSDOCK` · `TRANSFER_DIVERGENCE` · `TRANSFER_TIMELINE` · `TRANSFER_EXPORT`

---

## Localização

```
frontend/src/domains/logistics-operational/modules/transfers/
```

---

## Testes

```bash
npm run test:opm006
npm run test:opm-logistics   # platform + OPM-006
```
