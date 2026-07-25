# OPM-001D — Domain Certification Checklist

**Data:** 2026-07-19

Legenda: ✅ Certificado | ⚠️ UX-002 (não bloqueador)

---

## Logística WMS

| Módulo | Render | KPIs | Toolbar | Widgets | Context | Breadcrumb | Nav | Status |
|--------|--------|------|---------|---------|---------|------------|-----|--------|
| Warehouse | ✅ | ✅ OPM-001B | ✅ | ✅ Details/Timeline | ✅ | ✅ OPM-001C | ✅ | **CERTIFIED** |
| Inventory | ✅ | ✅ OPM-001A | ✅ | ✅ Grid | ✅ | ✅ WMS-007A | ✅ | **CERTIFIED** |
| Receiving | ✅ | ✅ | ✅ | ✅ Grid | ✅ | ✅ | ✅ | **CERTIFIED** |
| Picking | ✅ | ✅ | ✅ | ✅ Grid | ✅ | ✅ | ✅ | **CERTIFIED** |
| Shipping | ✅ | ✅ | ✅ | ✅ Grid | ✅ | ✅ | ✅ | **CERTIFIED** |
| Transfers | ✅ | ✅ | ✅ | ✅ Grid | ✅ | ✅ | ✅ | **CERTIFIED** |

**Visual polish:** ⚠️ UX-002-01, UX-002-02 (header spacing — não bloqueia)

---

## Qualidade

| Módulo | Render | KPIs | Widgets específicos | Context | Breadcrumb | Status |
|--------|--------|------|---------------------|---------|------------|--------|
| Operational Hub | ✅ | — | ✅ Atalhos/cards | ✅ | ✅ | **CERTIFIED** |
| Inspections | ✅ | — | ✅ QualityInspectionRuntime | ✅ | ✅ | **CERTIFIED** |
| SPC | ✅ | ✅ SpcPanel | ✅ Gráficos SPC | ✅ | ✅ governance | **CERTIFIED** |
| NCR / CAPA | ✅ | ✅ KpiCard | ✅ Workflow NCR/CAPA | ✅ | ✅ | **CERTIFIED** |
| Supplier Quality | ✅ | — | ✅ Fornecedores (governance) | ✅ | ✅ | **CERTIFIED** |
| Telemetry | ✅ | ✅ | ✅ QualityTelemetryHub | ✅ | ✅ | **CERTIFIED** |

**Preservado:** `QualityRealtimeStatusBar` acima do EOX shell.

---

## Meio Ambiente

| Módulo | Render | Formulário operacional | Context | Breadcrumb | Status |
|--------|--------|------------------------|---------|------------|--------|
| Waste | ✅ | ✅ MTR / Resíduos | ✅ | ✅ | **CERTIFIED** |
| Water | ✅ | ✅ EnvironmentOperationalHubBase | ✅ | ✅ | **CERTIFIED** |
| Emissions | ✅ | ✅ Amostras/chaminés | ✅ | ✅ | **CERTIFIED** |
| Compliance | ✅ | ✅ EnvironmentComplianceHub | ✅ | ✅ compliance | **CERTIFIED** |

---

## Segurança (SST)

| Módulo | Render | KPIs | Formulário | Context | Breadcrumb | Status |
|--------|--------|------|------------|---------|------------|--------|
| Incidents | ✅ | ✅ KpiCard | ✅ Registro | ✅ | ✅ incident | **CERTIFIED** |
| Near Miss | ✅ | ✅ near_miss KPI | ✅ kind near_miss | ✅ | ✅ (incident) | **CERTIFIED** |
| Training | ✅ | ✅ training_alerts | ✅ training_expired | ✅ | ✅ (incident) | **CERTIFIED** |
| PTW | ✅ | — | ✅ SafetyGovernanceHub APR/PT/LOTO | ✅ | ✅ ptw | **CERTIFIED** |
| EPI | ✅ | — | ✅ SafetyGovernanceHub EPI/EPC | ✅ | ✅ epi | **CERTIFIED** |

**Nota:** Near Miss e Training integrados no `SafetyIncidentPanel` — comportamento original preservado.

---

## Checklist transversal (todos os domínios)

| Item | Status |
|------|--------|
| Providers / Outlet context preservados | ✅ ARC-003A |
| Nenhum placeholder inesperado em rotas certificadas | ✅ |
| Nenhum componente de domínio removido | ✅ |
| EOX adapters certificados (6) | ✅ |
| Navegação corporativa consistente | ✅ |
| Pendências UX registadas sem bloquear | ✅ UX-002 |

---

## Parecer

**Todos os domínios APROVADOS para OPM-001D.**
