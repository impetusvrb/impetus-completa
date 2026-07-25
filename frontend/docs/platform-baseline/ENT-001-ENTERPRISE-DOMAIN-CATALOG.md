# ENT-001 — Enterprise Domain Catalog

**Fase:** ENT-001 · Enterprise Platform Knowledge Baseline  
**Princípio:** CONSOLIDATE BEFORE EVOLVE  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001DomainCatalog.js`

---

## Objetivo

Catálogo único de domínios IMPETUS, consolidando EOX, `domainRegistry`, FIN-AUD-001 e extensões de plataforma. **Não é nova auditoria** — reutiliza evidências de CPL, FIN-AUD e REG.

---

## Domínios catalogados (20)

| Domínio | Label | Activo | Maturidade | Runtime / Certificação |
|---------|-------|--------|------------|------------------------|
| audit | Auditoria | sim | partial | audit_services |
| cognitive_center | Centro Cognitivo | sim | mature | cognitiveRuntime |
| command_center | Centro de Comando | sim | mature | dashboard_profiles |
| compliance | Compliance | sim | partial | cross_domain |
| environment | Meio Ambiente | sim | mature | GF-027 |
| executive | Executivo / AIOI | sim | partial | executive_aioi |
| finance | Finance | não | partial | GREENFIELD (FIN-AUD) |
| hr | Recursos Humanos | não | not_started | — |
| ishikawa | Ishikawa | não | discovered | ishikawa_cockpit_runtime |
| logistics_wms | Logística WMS | sim | **certified** | WMS Enterprise Baseline (OPM-003–008) |
| maintenance | Manutenção | não | not_started | — |
| msa | MSA | não | discovered | msa_cockpit_runtime |
| nexus_ia | Nexus IA | sim | mature | nexus_billing_engine_v4 |
| operational | Operacional | sim | mature | ops-core |
| ppap | PPAP | não | discovered | ppap_cockpit_runtime |
| production | Produção | não | not_started | PLANNED |
| purchasing | Compras | não | discovered | supply |
| quality | Qualidade | sim | mature | GF-027 |
| safety | Segurança | sim | mature | GF-027 |
| supply | Supply | não | partial | OPM-008 consumidor |

---

## Fontes consolidadas

- `frontend/src/presentation/eox/eoxRegistry.js` — EOX_DOMAIN_REGISTRY + OPERATIONAL_DOMAIN_REGISTRY
- `frontend/src/domains/domainRegistry.js` — DOMAIN_ROUTES (Wave 6)
- `frontend/src/platform/audit/finance/finAud001DiscoveryIndex.js` — FINANCE_DOMAIN_STATUS
- `frontend/src/platform/cognitive/registry/cognitivePlatformRegistry.js` — WMS_ENTERPRISE_BASELINE

---

## Notas

1. **logistics_hub** foi deduplicado em favor de **logistics_wms** (baseline certificada).
2. **finance** permanece `active: false` em EOX — capacidades reais são operacionais (custos, leakage, Nexus).
3. **ppap / msa / ishikawa** têm cockpits nativos no Centro de Comando — padrão REG (desconectados de EOX activo).

---

## Consulta programática

```javascript
import { getDomainCatalog, getDomainEntry } from '../src/platform/knowledge/index.js';
```
