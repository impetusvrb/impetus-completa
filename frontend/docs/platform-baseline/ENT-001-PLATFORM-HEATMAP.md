# ENT-001 — Platform Heatmap

**Fase:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001PlatformHeatmap.js`

---

## Classificação corporativa

| Nível | Significado |
|-------|-------------|
| certified | Certificado / congelado — evolução só com escopo explícito |
| mature | Maduro — operacional e cognitivo activos |
| partial | Parcial — capacidades existem, integração incompleta |
| discovered | Descoberto — implementação oculta ou desconectada |
| not_started | Não iniciado — GREENFIELD confirmado |
| experimental | Experimental — pilot / audit utility |
| in_evolution | Em evolução — programa activo |

---

## Distribuição (20 domínios)

| Maturidade | Count | Domínios |
|------------|-------|----------|
| **certified** | 1 | logistics_wms |
| **mature** | 7 | quality, safety, environment, command_center, cognitive_center, nexus_ia, operational |
| **partial** | 5 | finance, supply, executive, audit, compliance |
| **discovered** | 4 | ppap, msa, ishikawa, purchasing |
| **not_started** | 3 | production, maintenance, hr |

---

## Destaques

### Certificado
**Logística WMS** — único domínio congelado pós OPM-GOV-001 e WMS-REF-001. Referência para novos domínios operacionais.

### Maduro
Q/S/E com GF-027 + adapters CPL activos. Centro Comando e Centro Cognitivo como hubs transversais.

### Parcial — Finance
FIN-AUD-001 provou: **não existe finance_native**, mas existem custos industriais, leakage, Nexus billing e widgets CC. REG-002 recuperou cadeias críticas.

### Descoberto — PPAP/MSA/Ishikawa
Cockpits nativos no CC — padrão idêntico ao que REG-001 encontrou em Finance/Industrial.

### Não iniciado
Produção, Manutenção, RH — sem runtime dedicado na baseline.

---

## Consulta

```javascript
import { getPlatformHeatmap, getHeatmapSummary } from '../src/platform/knowledge/index.js';
getHeatmapSummary();
```
