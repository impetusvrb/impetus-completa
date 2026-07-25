# REG-001 — Registry Audit

**Fonte:** `frontend/src/platform/audit/regression/reg001RegistryAudit.js`

---

## Comparação de registries

| Registry | Impacto nos suspeitos | Inconsistência |
|----------|----------------------|----------------|
| EOX_DOMAIN_REGISTRY | Nenhum directo (hubs domínio) | finance `active: false` — separado |
| contextualModules.moduleRegistry | Paths sidebar correctos | losses_map OK; gap é API |
| domainAuthority.domainRegistry | Metadata | budget/cashflow sem runtime |
| CPL Cognitive Registry | Nenhum | Não monta HTTP dashboard |
| useVisibleModules | Menu CEO mostra os 4 | OK — falha a jusante |
| CenterWidget.ROUTES | Deep-links | Falta `cerebro_operacional`, `insights` |
| Layout vs App guard | **Alto** | Critérios divergentes |

---

## Conclusão registry

CPL/EOX/OPM **não são a causa directa** da desmontagem HTTP de leakage/industrial.  
A inconsistência mais danosa para “click sem destino” é:

```
Layout.canAccessIndustrialCoreModules ≠ App.canAccessIndustrialCore
```

CenterWidget incompleto explica dead clicks no Centro de Comando.
