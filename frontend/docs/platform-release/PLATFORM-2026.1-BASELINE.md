# PLATFORM-2026.1 — Baseline Oficial

**Release:** PLATFORM-2026.1  
**Princípio:** FREEZE BEFORE EVOLVE  
**Data:** 2026-07-20  
**Estado:** CERTIFIED · Pronta para evolução vertical por domínio  
**Fonte canónica:** `frontend/src/platform/release/platformRelease2026Baseline.js`

---

## Declaração

A plataforma IMPETUS encontra-se **oficialmente certificada e congelada** na release **PLATFORM-2026.1**, constituída pelos programas estruturantes, de auditoria, recuperação, consolidação e planejamento concluídos até esta data.

A infraestrutura deixa de ser o foco principal de desenvolvimento. O ciclo seguinte é **evolução funcional por domínio**, seguindo o ARCH-PLAN-001.

---

## Arquitetura vigente

| Camada | Estado |
|--------|--------|
| Apresentação | EOX + NAV-002A — certificada |
| Domínios operacionais | Q/S/E + WMS — maduros/certificados |
| Plataforma cognitiva | CPL-003 — congelada |
| Centro de Comando | ARC/UX — certificado |
| Audit layer | FIN-AUD + REG — read-only artefactos |
| Knowledge layer | ENT-001 — baseline oficial |
| Planning layer | ARCH-PLAN-001 — roadmap aprovado |

---

## Infraestrutura vigente

- **Frontend:** React · `domainRegistry` · EOX · `cognitiveRuntime`
- **Backend:** Express · dashboard routes · contextualModules · cognitiveRuntime
- **Registries congelados:** eoxRegistry, domainRegistry, wmsModuleRegistry, cognitivePlatformRegistry, contextualModules

---

## Inventário consolidado (ENT-001)

| Dimensão | Count |
|----------|-------|
| Domínios | 20 |
| Módulos | 33 |
| Runtimes | 27 |
| Capacidades cognitivas | 54 |
| Integrações | 35 |

---

## Contratos congelados

- movement_lifecycle (OPM-GOV-001)
- handoff_baseline (OPM-GOV-001)
- cognitive_contract_descriptors (CPL-001)
- eox_navigation_config (EOX/NAV)
- wms_module_registry (WMS-REF-001)
- dashboard_profiles (ARC/UX)
- view_financial_rbac (FIN-AUD-001)

---

## Pipeline pós-release

```
Build Platform → Stabilize → Audit → Recover → Consolidate → Plan → Freeze Baseline → Only Then → Evolve Domains
```

---

## Consulta

```javascript
import { getReleaseBaseline } from '../src/platform/release/index.js';
```
