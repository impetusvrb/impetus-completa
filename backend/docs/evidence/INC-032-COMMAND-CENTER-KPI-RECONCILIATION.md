# INC-032 — Reconciliação dos KPIs do Centro de Comando com quality_inspections

**Data:** 2026-07-16  
**Tipo:** reconciliação de origem de dados (KPIs CC Qualidade)  
**Tenant:** `511f4819-fc48-479e-b11e-49ba4fb9c81b`  
**Perfil:** `manager_quality` (`ricardo.souza@impetus.com.br`)  
**Pré-requisitos:** INC-028 → INC-031 concluídas

---

## Critérios de encerramento

| Flag | Valor |
|------|-------|
| `COMMAND_CENTER_KPIS_RECONCILED` | **YES** |
| `QUALITY_INSPECTIONS_PRIMARY_SOURCE` | **YES** |
| `PROPOSALS_DEPENDENCY_REMOVED` | **YES** (NC/CC quality) |
| `NO_FAKE_ZERO_VALUES` | **YES** |
| `NO_PLACEHOLDERS` | **YES** |
| `NO_LAYOUT_CHANGED` | **YES** |
| `NO_CSS_CHANGED` | **YES** |
| `NO_RUNTIME_CHANGED` | **YES** |
| `NO_ENGINE_CHANGED` | **YES** |
| `BASELINE_UI_v1.0` | **PRESERVED** |
| `QUALITY_BASELINE_v1.0` | **PRESERVED** |

---

## Etapa 1 — Auditoria KPIs Centro de Comando

| Superfície | Componente | Adapter / Service | Endpoint | Dataset (antes) |
|------------|------------|-------------------|----------|-------------------|
| Hero KPIs | `CentroComandoHeroKpis.jsx` | `dashboard.getSummary()` | `/api/dashboard/summary` | `proposals.total` |
| Hero KPIs | idem | `dashboard.getKPIs()` | `/api/dashboard/kpis` | `open_nc` via proposals |
| Widget grid | `WidgetKpiCards.jsx` | `dashboard.getSummary()` | `/api/dashboard/summary` | `proposals.total` (slot 4) |
| KPIs perfil | `dashboardKPIs.getQualityKpis` | backend service | `/api/dashboard/kpis` | `proposals` (proxy NC) |
| Summary | `getDashboardSummary` | backend service | `/api/dashboard/summary` | `proposals` only |
| **Referência** | `QualityGovernanceHub` | `qualityIntelligence.getNcrCapaSummary` | `/api/quality-intelligence/nc-capa-summary` | **`quality_inspections`** ✅ |

### Divergência documentada (pré-INC-032)

| Superfície | NC exibido |
|------------|------------|
| QualityGovernanceHub | **9** (`inspections_non_conforming`) |
| CentroComando Hero / Widgets | **0** (`proposals.total`) |

---

## Etapa 2 — Fontes reais inventariadas

| Fonte | Campo | Uso KPI |
|-------|-------|---------|
| `quality_inspections` | `COUNT(result='non_conforming')` | **NC abertas (primária)** |
| `impetus_quality_workflow_instance` | NCR/CAPA states | CAPA / NCR workflows (governance) |
| `quality_operational_metrics` | drift, deterioration | runtime (não alterado nesta INC) |
| `quality_insights` | insights Z.21 | insights IA (mantido) |
| `communications` | interações | interações CC (mantido) |
| `proposals` | total | **removido para NC quality** |

---

## Etapa 3 — Correções aplicadas

### Backend (camada dashboard — fora Z.20–Z.23)

**`qualityIntelligenceService.js`**
- Nova função exportada: `countNonConformingInspections(companyId)`
- `getNcrCapaSummary` reutiliza a mesma contagem

**`dashboardKPIs.js`**
- `getQualityKpis()` → `open_nc` de `quality_inspections` (`source: quality_inspections`)
- Perfil quality level 2 (`manager_quality`) → branch dedicado **sem** KPIs `Propostas pendentes` / NC via proposals
- `getDashboardSummary()` → bloco `quality_inspections.non_conforming` para perfis quality

### Frontend (adapter único)

**`qualityCommandCenterKpiAdapter.js`**
```
nc-capa-summary (GovernanceHub)
  +
/dashboard/summary.quality_inspections
  ↓
buildQualityCommandCenterKpiView()
  ↓
CentroComandoHeroKpis / WidgetKpiCards
```

**`CentroComandoHeroKpis.jsx`**
- Slot "TAREFAS CRÍTICAS" → **"NC ABERTAS"** com valor de `quality_inspections` quando perfil quality
- Sem dados → `—` (não zero artificial)

**`WidgetKpiCards.jsx`**
- Slot 4 "Propostas" → **"NC inspeções"** com mesma origem quando perfil quality

### O que **não** foi alterado

- Runtime Z.20–Z.23, signal loader, CognitiveHub, hubs, layout, CSS, widgets structure
- `qualityKpiAdapter.js` (Z.21) — intacto
- KPIs de outros domínios (executive, production, etc.)

---

## Etapa 4 — Comparação lado a lado (homologação)

**Validação live pós-PM2 restart** (`manager_quality`):

| Superfície | NC |
|------------|-----|
| QualityGovernanceHub (`nc-capa-summary`) | **9** |
| CC `/dashboard/summary` (`quality_inspections`) | **9** |
| CC `/dashboard/kpis` (`open_nc`, source=`quality_inspections`) | **9** |
| **Consistente** | **YES** |

`proposals` permanece disponível no summary com `source: proposals` (0) — **não usado** para NC em perfis quality.

---

## Etapa 5 — Payload antes / depois

### Antes

```json
{
  "summary": { "proposals": { "total": 0 } },
  "kpis": [
    { "id": "quality_open_nc", "value": 0 },
    { "id": "k4", "title": "Não conformidades", "value": 0 }
  ],
  "governance": { "inspections_non_conforming": 9 }
}
```

### Depois

```json
{
  "summary": {
    "proposals": { "total": 0, "source": "proposals" },
    "quality_inspections": { "non_conforming": 9, "source": "quality_inspections", "data_available": true }
  },
  "kpis": [
    { "id": "open_nc", "value": 9, "source": "quality_inspections" }
  ],
  "governance": { "inspections_non_conforming": 9 }
}
```

---

## Etapa 6 — Testes

| Suite | Resultado |
|-------|-----------|
| `runQualityCommandCenterKpiReconciliationTests.js` | **9/9 PASS** |
| `qualityCommandCenterKpiAdapterScenarios.mjs` | **9/9 PASS** |
| Regressão executive/production/maintenance/hr/safety/environment | **105/105 PASS** |

---

## Diagrama pós-INC-032

```mermaid
flowchart TD
  A[quality_inspections BD] --> B[countNonConformingInspections]
  B --> C[getNcrCapaSummary]
  B --> D[getQualityKpis]
  B --> E[getDashboardSummary.quality_inspections]
  C --> F[QualityGovernanceHub]
  C --> G[qualityCommandCenterKpiAdapter]
  D --> H[/dashboard/kpis]
  E --> I[/dashboard/summary]
  G --> J[CentroComandoHeroKpis]
  G --> K[WidgetKpiCards]
  H --> G
  I --> G
```

---

## Resumo executivo

A maior inconsistência visível pós-INC-031 — GovernanceHub com 9 NC vs Centro de Comando com 0 — foi eliminada. O CC passa a consumir a mesma base `quality_inspections` homologada na INC-028, via adapter único no frontend e serviços dashboard no backend, sem alterar runtime cognitivo, layout ou baseline UI.

**Próximo passo natural:** INC-033 — SPC com séries temporais reais.
