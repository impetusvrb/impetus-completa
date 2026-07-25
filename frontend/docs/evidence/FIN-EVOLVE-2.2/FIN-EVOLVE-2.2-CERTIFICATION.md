# FIN-EVOLVE-2.2 — Certification

## Critérios de aceite

| Critério | Evidência |
|----------|-----------|
| Perspectiva financeira do Twin | `/app/finance/twin` + overlay |
| Sem Twin paralelo | `parallelTwin: false`; sem FinancialDigitalTwinEngine |
| Dados só de motores/contratos | Engine 2.1 + READY-001 + costs/leakage |
| Hub disponibiliza acesso | FinanceTwinHubCard + módulo twin |
| Testes verdes | `test:fin-evolve-2.2` + regressões |

## Partial gaps (composição)

| Gap | Implementação |
|-----|---------------|
| Overlay $ | composeFinancialTwinOverlay |
| Join ordem↔finance | work_order_ref quando presente no payload ops |
| Qty live | liveQty no state quando drivers disponíveis |
| Risco | compose alertas leakage |

## Fora de escopo (confirmado)

What-if · Simulações · IA · Predição · CAPEX · Consolidação gerencial
