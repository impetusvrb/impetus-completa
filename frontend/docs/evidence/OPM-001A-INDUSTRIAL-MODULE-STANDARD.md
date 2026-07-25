# OPM-001A — Industrial Operational Module Standard

**Programa:** Operational Product Maturity (OPM)  
**Entrega:** OPM-001A — Industrial Operational Module Standard  
**Camada:** Presentation only  
**Data:** 2026-07-19  
**Normas:** BASELINE-SYSTEM v1.4 · Política de Segurança Arquitectural · WMS-007A · NAV-001

---

## Declaração de conformidade

```
PRESENTATION_ONLY                  = YES
BACKEND_MODIFIED                   = NO
API_MODIFIED                       = NO
RUNTIME_MODIFIED                   = NO
RBAC_MODIFIED                      = NO
FEATURE_FLAGS_MODIFIED             = NO
ROUTES_CERTIFIED_MODIFIED          = NO
NAVIGATION_MODIFIED                = NO
CC_MODIFIED                        = NO
CERTIFIED_CODE_REMOVED             = NO
```

---

## Objectivo

Definir e implementar o **framework funcional e visual** reutilizável para todos os módulos operacionais do IMPETUS (Warehouse, Inventory, Receiving, Picking, Shipping, Transfers, Supply e futuros domínios).

Esta entrega **não** implementa funcionalidades de negócio, CRUD, integrações ou regras logísticas.

---

## Posicionamento arquitectural

```
OPM-000 (auditoria produto)
        ↓
OPM-001A (framework presentation)  ← esta entrega
        ↓
OPM-001 Warehouse · OPM-002 Inventory · …
```

Analogia: **ARC-002 da camada de produto** — base única antes da especialização por domínio.

---

## Estrutura canónica do módulo

| Camada | Componente |
|--------|------------|
| Header | `IndustrialModuleHeader` |
| Contexto operacional | prop `contextLabel` no header |
| KPIs | `IndustrialKpiPanel` (4/6/8 colunas) |
| Toolbar | `IndustrialToolbar` |
| Filtros | `IndustrialFilterBar` |
| Pesquisa | `IndustrialSearchBar` |
| Grid principal | `IndustrialDataGrid` |
| Painel lateral | `IndustrialDetailsPanel` |
| Timeline | `IndustrialTimeline` |
| Alertas IA | `IndustrialAlertPanel` (placeholder) |
| Insights | `IndustrialInsightPanel` (placeholder) |
| Acções | `IndustrialActionBar` |

Composição: `IndustrialModuleLayout` · Adaptador listagem: `IndustrialOperationalModule`.

---

## Localização do código

```
frontend/src/presentation/industrial-module/
├── index.js
├── industrialModuleTokens.js
├── industrial-module.css
├── IndustrialModuleLayout.jsx
├── IndustrialModuleHeader.jsx
├── IndustrialKpiPanel.jsx
├── IndustrialToolbar.jsx
├── IndustrialSearchBar.jsx
├── IndustrialFilterBar.jsx
├── IndustrialDataGrid.jsx
├── IndustrialDetailsPanel.jsx
├── IndustrialTimeline.jsx
├── IndustrialAlertPanel.jsx
├── IndustrialInsightPanel.jsx
├── IndustrialActionBar.jsx
├── IndustrialModuleStates.jsx
└── IndustrialOperationalModule.jsx
```

Integração WMS (adapter fino, certificado WMS-007A preservado):

```
frontend/src/domains/logistics-operational/components/WmsStandaloneModuleFrame.jsx
```

---

## Estados operacionais suportados

| Estado | Token |
|--------|-------|
| Loading | `loading` |
| Sem dados | `empty` |
| Erro operacional | `error` |
| Sem permissão | `permission_denied` |
| Offline | `offline` |
| Somente leitura | `read_only` |
| Sincronizando | `syncing` |
| Actualizando | `updating` |
| Dados parciais | `partial_data` |
| Integração indisponível | `integration_unavailable` |
| Dados carregados | `data_loaded` |

Implementação: `IndustrialModuleStates.jsx` + `IndustrialModuleStateView`.

---

## Parecer

**OPM-001A — COMPLETED**

Framework de módulos operacionais industriais disponível na camada Presentation, integrado aos 6 módulos WMS standalone via adapter sem regressão certificada.
