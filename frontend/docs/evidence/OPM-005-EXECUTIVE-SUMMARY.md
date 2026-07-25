# OPM-005 — Executive Summary

**Marco:** Primeiro ciclo logístico inbound/outbound completo

---

## Posição no WMS

Com OPM-005, o IMPETUS cobre:

```
✅ Recebimento (porta de entrada)
✅ Inventário (posição stock)
✅ Armazéns (estrutura física)
✅ Picking (order fulfillment — separação)
✅ Expedição (outbound logistics — conclusão)
⏳ Transfer Management (OPM-006 — próximo)
```

---

## O que Shipping representa

Não é apenas "enviar pedidos". É a **conclusão do Order Fulfillment** — consolidação de carga, conferência final, carregamento em doca e expedição com movimentação de saída no inventário.

---

## Entrega OPM-005

- Módulo operacional completo reutilizando WMS-REF-001
- Integração picking (handoff) + inventário via movement `issue`
- Contratos preparados para TMS/Yard (futuro)
- Observabilidade completa SHIPPING_*
- Zero alteração arquitectural congelada

---

## Gate recomendado antes de OPM-006

**OPM-E2E-001 — End-to-End Operational Certification** ✅

Certificação formal do ciclo Recebimento → Inventário → Picking → Expedição (4 cenários, 22 testes).

```bash
npm run test:opm-e2e-001
npm run test:opm-flow   # suite completa OPM
```

---

## Próximo passo

**OPM-006 — Transfer Management** — movimentações internas entre armazéns/locações, após consolidação do ciclo outbound.
