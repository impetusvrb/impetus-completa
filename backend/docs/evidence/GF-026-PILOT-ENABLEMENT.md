# GF-026 — Pilot Enablement

**Programa:** GF-026  
**Governança:** REV-001 + WMS-003  
**Estado:** **ACTIVE** (flags default OFF)  
**Data:** 2026-07-18

---

## Objetivo

Estabelecer fronteira definitiva **Supply cognitivo ↔ Logística operacional** via Pilot Integration Layer — sem processos WMS, sem regras operacionais.

---

## Pilares consolidados

| Pilar | Origem | GF-026 |
|-------|--------|--------|
| Supply cognitivo | GF-021→025 | Promotion + CC consolidation |
| Logística operacional | WMS-001→003 | Consumo via APIs públicas + contratos |

---

## Fluxo arquitectural

```
Supply Runtime → Semantic Signals → Pilot Integration Layer
  → Canonical Contracts → Public APIs (WMS-003) → Logistics
```

---

## Componentes (`domains/supply/pilot/`)

| Módulo | Função |
|--------|--------|
| `supplyPilotIntegrationLayer.js` | Orquestração piloto |
| `supplyPilotContracts.js` | Contratos v0.3.0 |
| `supplyPilotPolicy.js` | Elegibilidade · bridge |
| `supplyPilotRegistry.js` | Tenants · compatibilidade |
| `supplyPilotObservability.js` | Rastreabilidade |
| `supplyPilotPublicApiClient.js` | HTTP APIs públicas |
| `supplyPilotFacadeAttachment.js` | Dashboard attachment |
| `supplyPilotCockpitConsolidation.js` | Z.23 pilot CC |

---

## Feature flags (default false)

- `IMPETUS_SUPPLY_PILOT_ENABLED`
- `IMPETUS_SUPPLY_CC_INBOUND`
- `IMPETUS_SUPPLY_LOGISTICS_BRIDGE`

---

## Testes

```bash
npm run test:supply-pilot
npm run test:pilot-contracts
npm run test:pilot-integration
```

---

*Integração:* [GF-026-PILOT-INTEGRATION-LAYER.md](./GF-026-PILOT-INTEGRATION-LAYER.md)
