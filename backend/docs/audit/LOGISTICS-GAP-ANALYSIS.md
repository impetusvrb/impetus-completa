# LOGISTICS — Gap Analysis (AUD-001)

**Auditoria:** AUD-001  
**Data:** 2026-07-17  
**Modo:** READ ONLY  
**Referências:** INC-036 · INC-037 · INC-040 · INC-043 · BASELINE-LOGISTICS-v1.1

---

## 1. Gaps críticos (bloqueiam operação)

| ID | Gap | Evidência | Severidade | Tipo |
|----|-----|-----------|:----------:|------|
| G-LOG-001 | **APIs `/api/logistics-operational/*` inexistentes** — FE chama `/logistics-operational/operations/overview` e `/receiving/register`; `server.js` só regista `/api/logistics-operational-validation` | `LogisticsOperationalWorkspace.jsx` L48–55, L89; grep server.js | **P0** | Implementação incompleta |
| G-LOG-002 | **Mock KPIs no workspace operacional** quando API falha (OTIF 0.93, pending_receipts 12, etc.) | `LogisticsOperationalWorkspace.jsx` L53–55 | **P0** | Viola honestidade operacional; conflito com ZERO_FAKE_DATA do runtime cognitivo |
| G-LOG-003 | **Módulo picking NOT_IMPLEMENTED** — sem schema/tabela picking | INC-040 § bloco `logistics.picking_efficiency` | **P0** | Produto incompleto |
| G-LOG-004 | **`logistics_intelligence` ausente de `CONTEXTUAL_MODULE_CATALOG`** — referenciado em forbidden/critical lists mas sem entrada MODULE com paths | `moduleRegistry.js` (quality/safety têm entrada; logistics não); planeado INC-037 § INC-038 | **P1** | Registo incompleto |
| G-LOG-005 | **Desalinhamento API legacy Logística Inteligente** — FE `api.js` chama `/admin/logistics/intelligence/dashboard`; BE expõe `/api/logistics-intelligence/dashboard` | `api.js` L1501–1504 vs `server.js` L863 | **P1** | Integração quebrada |

---

## 2. Gaps de disponibilidade (configuração controlada)

| ID | Gap | Evidência | Severidade | Tipo |
|----|-----|-----------|:----------:|------|
| G-LOG-010 | Flags cognitivas default **OFF** | `phaseLogisticsNativeFeatureFlags.js` | P2 | Decisão rollout |
| G-LOG-011 | Flags navegação/publicação default **OFF** | `logisticsNavigationFlags.js` | P2 | Decisão rollout |
| G-LOG-012 | VITE operational default **OFF** — shell bloqueia render | `LogisticsOperationalShell.jsx` L34–41 | P2 | Decisão rollout |
| G-LOG-013 | Menu só publica se `visibleModules` inclui `logistics_intelligence` **e** flags VITE ON **e** server publication OK | `logisticsVisibilityResolver.js` L16–25 | P2 | RBAC + flags |
| G-LOG-014 | Binding 0.385 < gate promotion ~0.50 — CC promotion visual bloqueada | INC-040 · INC-043 | P2 | Dados + threshold |
| G-LOG-015 | Perfil `production` band → menu filtrado a `logistics_widgets_only` (max 1 item) | `logisticsVisibilityResolver.js` L57–59 | P3 | Audience design |

---

## 3. Gaps de dados / telemetria

| ID | Gap | Evidência | Classificação mensagem |
|----|-----|-----------|------------------------|
| G-LOG-020 | Tenant ref. sem registos WMS foundation (0 inventory/receipts/shipments) | INC-039 · INC-040 | **Esperado** — ausência de dados |
| G-LOG-021 | `logistics_points` / docas vazio → hub telemetria INSUFFICIENT_DATA | INC-040 `logistics.dock_flow` | **Esperado** — configuração cadastral |
| G-LOG-022 | PLC telemetria no dashboard live: "indisponível" / "0 equip." | `LiveDashboardUnifiedPanel.jsx` L418–427 | **Configuração** — ingest PLC global não ligado; **não é bug logistics** |
| G-LOG-023 | ERP integrações: contagem connectors pode ser 0 | mesmo painel L430–434 | **Configuração** |
| G-LOG-024 | 8 blocos cognitivos NO_RECORDS / NOT_IMPLEMENTED | INC-040 matriz 13 blocos | **Esperado** até dados + picking |

---

## 4. Gaps arquitecturais / consistência

| ID | Gap | Evidência |
|----|-----|-----------|
| G-LOG-030 | **Dual stack WMS** — legacy `warehouse_*` vs foundation `logistics_*` não reconciliados | INC-036 · INC-040 |
| G-LOG-031 | Domínio registry status **`shadow`** | `backend/src/domains/logistics/README.md` |
| G-LOG-032 | Migration SQL foundation (`logistics_inventory`, etc.) **não encontrada** em `backend/migrations/` nem `src/models/` — existência confirmada em runtime homologação INC-039, rastreabilidade migration **gap** | grep repo · INC-039 |
| G-LOG-033 | Rotas legacy `/app/almoxarifado-inteligente` e `/app/logistica-inteligente` paralelas ao workspace enterprise — possível confusão operacional | `App.jsx` |
| G-LOG-034 | Conferência, romaneio, inventário rotativo, transferências — **sem módulo** | inventário funcional |
| G-LOG-035 | Jobs async "logistics intelligence" referenciados no manual — sem worker dedicado verificado no domínio | manual master |

---

## 5. RBAC — Gerente de Almoxarifado

**Perfil canónico homologado:** `manager_logistics` (INC-043), não literal "Gerente de Almoxarifado" no seed — mapeamento via cadastro estrutural (`functional_area: logistics`, eixos `eixo_logistica` / `eixo_estoque`).

| Verificação | Resultado |
|-------------|-----------|
| Deveria visualizar Logistics? | **SIM** — eixo + área logistics |
| CC com runtime ON | 7 hubs logistics_native (homologado) |
| CC com runtime OFF (prod default) | Widgets genéricos `logistica` / `estoque` via summary transversal |
| Menu logistics enterprise | **NÃO aparece** — G-LOG-011 + G-LOG-013 |
| Rota directa `/app/logistics/operational` | Registada App.jsx mas **shell bloqueado** (G-LOG-012) |
| Legacy almoxarifado | **Pode** aparecer se `logistics_intelligence` ∈ visibleModules |

**Por que não aparece em produção (cadeia):**

```
visibleModules ⊃ logistics_intelligence
  AND VITE_IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED = true
  AND VITE_IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED = true
  AND server publication_allowed ≠ false
→ shouldPublishMenu = true
```

Qualquer elo false → menu ausente. Defaults actuais: **todos OFF**.

---

## 6. Matriz API ↔ Frontend

| Endpoint | Método | BE | FE consumidor | Estado |
|----------|--------|:--:|---------------|--------|
| `/api/logistics/health` | GET | ✅ | — | Sem FE |
| `/api/logistics/inventory` | POST | ✅ | — | Sem FE |
| `/api/logistics/receipts` | POST | ✅ | — | Sem FE |
| `/api/logistics/shipments` | POST | ✅ | — | Sem FE |
| `/api/logistics/lots` | POST | ✅ | — | Sem FE |
| `/api/logistics-intelligence/dashboard` | GET | ✅ | ❌ FE usa path errado | **ORPHAN FE** |
| `/api/admin/logistics/intelligence/dashboard` | GET | ❌ | ✅ api.js | **404 FE** |
| `/logistics-operational/operations/overview` | GET | ❌ | ✅ workspace | **404** |
| `/logistics-operational/receiving/register` | POST | ❌ | ✅ workspace | **404** |
| `/api/logistics-navigation/context` | GET | ✅ | navigation resolver | Interno |
| `/api/logistics-activation/readiness` | GET | ✅ | — | Interno |
| `/api/logistics-operational-validation/pack` | POST | ✅ | validation tests | Interno |
| `/api/admin/logistics/vehicles` etc. | CRUD | ✅ | AdminLogistics | Admin |
| `/api/admin/warehouse/intelligence/dashboard` | GET | ✅ | AlmoxarifadoInteligente | Legacy OK |

---

## 7. Pendências antes de ARC-002 / GF-021

| # | Pendência | Recomendação |
|---|-----------|--------------|
| 1 | Implementar ou remover rotas `/api/logistics-operational/*` | **Concluir** antes de activar operational |
| 2 | Eliminar mock KPIs do workspace (fail-closed honesto) | **Concluir** — alinha ZERO_FAKE_DATA |
| 3 | Corrigir path API Logística Inteligente (FE ou alias BE) | **Concluir** — quick win |
| 4 | Entrada `moduleRegistry` para `logistics_intelligence` | **Concluir** — planeado INC-038 |
| 5 | Schema picking + bloco cognitivo | Roadmap incremental pós-baseline |
| 6 | Decisão explícita rollout: activar flags vs manter shadow | **Decisão humana** — não bloqueia ARC-002 se documentada |
| 7 | Migration SQL versionada foundation tables | **Recomendado** — rastreabilidade |

**Veredicto pendências:** Items **1–4** são dívidas de implementação real; **6–7** são governance. **Recomenda-se resolver 1–4** antes de GF-021; **ARC-002 pode iniciar** se acceptar que logistics operacional permanece gated + incompleto até INC dedicada.

---

## Critérios AUD-001

```
BACKEND_AUDITED          = YES
FRONTEND_AUDITED         = YES
DATABASE_AUDITED         = YES (schema via INC + código; query live indisponível)
API_AUDITED              = YES
RBAC_AUDITED             = YES
```
