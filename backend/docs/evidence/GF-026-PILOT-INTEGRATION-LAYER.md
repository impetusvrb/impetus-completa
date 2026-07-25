# GF-026 — Pilot Integration Layer

**Módulo:** `supplyPilotIntegrationLayer.js`

---

## Responsabilidades

- Consumir **semantic signals** (SSOT Supply)
- Validar **contratos canónicos** v0.3.0
- Orquestrar bridge via **APIs públicas WMS-003** (HTTP)
- Aplicar **supplyPilotPolicy**
- Registar observabilidade (sem PII)

---

## Proibido

| Import / accesso | Estado |
|------------------|:------:|
| `logistics-operational/` | ❌ |
| OCL / Legacy Adapter / Repos | ❌ |
| Entidades internas WMS | ❌ |
| Supply domain services como bridge | ❌ |

---

## Modos

| Modo | Condição |
|------|----------|
| Semantic only | Pilot ON, bridge OFF |
| Full bridge | `IMPETUS_SUPPLY_LOGISTICS_BRIDGE=true` + mock/HTTP |
| Skipped | Pilot OFF (fail-closed) |

---

## Saída

```javascript
{
  ok, contract_version, semantic_signals_consumed,
  logistics_bridge: { active, snapshot },
  read_only: true, operational_rules: false
}
```

---

*Facade:* `supplyPilotFacadeAttachment.js` → `cognitiveRuntimeFacade.js`
