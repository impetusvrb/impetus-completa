# GF-025 — Supply Promotion Runtime

**Programa:** GF-025  
**Runtime:** `supply_native`  
**Governança:** REV-001 (primeira Greenfield pós-revisão)  
**Estado:** **ACTIVE**  
**Data:** 2026-07-18

---

## Objetivo

Camada **Promotion Runtime** (Z.22) exclusivamente cognitiva — consome **blocos cognitivos promovíveis**, nunca entidades de domínio.

---

## Fluxo

```
supplyCoreSemantics (SSOT)
        ↓
supplyTenantSignalLoader (GF-024)
        ↓
supplyBlockBridge
        ↓
supplyCognitiveBlockResolver
        ↓
supplyPromotionPolicy
        ↓
supplyPromotionRuntime
        ↓
supplyCommandCenterRuntime (Foundation)
```

---

## Componentes

| Módulo | Responsabilidade |
|--------|------------------|
| `supplyPromotionRuntime.js` | Orquestração Z.22 |
| `supplyPromotionPolicy.js` | Elegibilidade · rejeição · explainability |
| `supplyCognitiveBlockResolver.js` | Integridade · deduplicação |
| `supplyPromotionMetrics.js` | Success/failure rate · duração |
| `supplyPromotionLogger.js` | Observabilidade sem PII |

---

## Restrições REV-001

| Proibido | Estado |
|----------|:------:|
| BD / SQL | ✅ |
| HTTP / APIs | ✅ |
| WMS / OCL / logistics-operational | ✅ |
| Domain services como fonte | ✅ |
| Event publication | ✅ |
| Alterar runtimes homologados | ✅ |
| Alterar dashboards existentes | ✅ |

---

## Métricas

Ver [SUPPLY-PROMOTION-METRICS.md](./SUPPLY-PROMOTION-METRICS.md)

---

## Testes

```bash
npm run test:supply-promotion
```

---

*Conformidade:* [GF-025-ARCHITECTURE-CONFORMANCE.md](./GF-025-ARCHITECTURE-CONFORMANCE.md)
