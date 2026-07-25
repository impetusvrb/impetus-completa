# OPM-004 — Executive Summary

**Marco:** Fluxo operacional integrado até separação de pedidos

---

## Posição no WMS

Com OPM-004, o IMPETUS cobre:

```
✅ Recebimento (porta de entrada)
✅ Inventário (posição stock)
✅ Armazéns (estrutura física)
✅ Picking (order fulfillment — separação)
✅ Expedição (outbound logistics — OPM-005)
⏳ Transfer Management (OPM-006 — próximo)
```

---

## O que Picking representa

Não é apenas "separar itens". É a **primeira etapa do Order Fulfillment** — onde pedidos deixam de ser documentos e tornam-se execução operacional com ondas, rotas, operadores e SLA.

---

## Entrega OPM-004

- Módulo operacional completo reutilizando WMS-REF-001
- Integração inventário via movement `pick`
- Contratos preparados para Shipping (OPM-005)
- Zero alteração arquitectural congelada

---

## Próximo passo

**OPM-005 — Shipping Control & Outbound Logistics** — fechar ciclo outbound e conectar naturalmente ao Picking concluído.
