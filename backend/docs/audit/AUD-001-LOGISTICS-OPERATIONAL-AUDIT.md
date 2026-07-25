# AUD-001 — Logistics Operational Completion Audit

**Classificação:** Operational Readiness Audit  
**Data:** 2026-07-17  
**Modo:** READ ONLY (exclusivamente diagnóstico)  
**Auditor:** Agent IMPETUS (consolidação INC-036→043 + varredura código)  
**Baseline referência:** BASELINE-SYSTEM v1.4 · BASELINE-LOGISTICS-v1.1 (LOCKED)

---

## Declaração de conformidade da auditoria

```
READ_ONLY_AUDIT                    = YES
CODE_MODIFIED                      = NO
DATABASE_MODIFIED                  = NO
API_MODIFIED                       = NO
UI_MODIFIED                        = NO
RUNTIME_MODIFIED                   = NO

LOGISTICS_MODULES_INVENTORIED      = YES
BACKEND_AUDITED                    = YES
FRONTEND_AUDITED                   = YES
DATABASE_AUDITED                   = YES
API_AUDITED                        = YES
RBAC_AUDITED                       = YES
FEATURE_FLAGS_AUDITED              = YES
DEPLOY_STATUS_IDENTIFIED           = YES
PRODUCTION_STATUS_IDENTIFIED       = YES
FINAL_CLASSIFICATION_EMITTED       = YES
```

---

## Sumário executivo

O domínio **Logistics** encontra-se em **dois estados simultâneos** irreconciliáveis numa única superfície:

1. **Runtime cognitivo `logistics_native`** — arquitecturalmente **completo e homologado** (INC-038→043, BASELINE-LOGISTICS-v1.1 LOCKED), porém **operacionalmente desligado** em produção via feature flags default OFF, rollout `shadow`, e binding tenant 0.385 (< gate promotion 0.50).

2. **Camada operacional WMS/TMS (workspace, picking, APIs operacionais)** — **implementação incompleta**: UI shells existem, rotas backend referenciadas pelo frontend **não existem**, mocks de KPI persistem, módulo picking sem schema.

### Classificação final (única)

## **`IMPLEMENTATION INCOMPLETE`**

**Justificação técnica:** Mesmo com activação total das flags de rollout, o utilizador encontraria **404** nas APIs operacionais, **KPIs sintéticos** no fallback do workspace, e **módulos WMS críticos ausentes** (picking, conferência, romaneio, inventário rotativo). A indisponibilidade **não é apenas** decisão arquitectural controlada — há **código e integrações em falta** documentados desde INC-036 e **não resolvidos** na cadeia INC-038→043 (que focou runtime cognitivo CC, não WMS operacional).

**Sub-classificação complementar (não substitutiva):**

| Sub-domínio | Estado |
|-------------|--------|
| Runtime cognitivo CC | ARCHITECTURALLY COMPLETE · OPERATIONALLY DISABLED |
| WMS operacional enterprise | IMPLEMENTATION INCOMPLETE |
| Legacy almoxarifado/TMS | PARTIAL (API path TMS quebrado) |

---

## Respostas às quatro perguntas obrigatórias

### 1. Os módulos operacionais de Logistics existem?

**Parcialmente.** Existem **19 módulos/superfícies identificados** (ver [LOGISTICS-FUNCTIONAL-INVENTORY.md](./LOGISTICS-FUNCTIONAL-INVENTORY.md)). O runtime cognitivo e 7 hubs CC **existem e estão homologados**. Módulos operacionais WMS (recebimento operacional, picking, expedição operacional, conferência, romaneio, inventário rotativo) estão **incompletos ou inexistentes**. Legacy almoxarifado e admin TMS **existem**.

### 2. Se existem, por que não estão disponíveis para o utilizador em produção?

**Cadeia de bloqueio (evidência objectiva):**

| Camada | Mecanismo | Ficheiro / evidência |
|--------|-----------|---------------------|
| Menu lateral | `shouldPublishMenu=false` | `logisticsVisibilityResolver.js` — flags VITE navigation+publication OFF + módulo |
| Workspace WMS | Shell retorna "runtime desligado" | `LogisticsOperationalShell.jsx` — `VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED` |
| Views individuais | Gate por flag governance/executive | `LogisticsOperationalWorkspace.jsx` viewGate |
| CC nativo | Cognitive flags OFF + binding < 0.50 | `phaseLogisticsNativeFeatureFlags.js` · INC-043 |
| Rollout | Estágio `shadow` documentado | RolloutView · activation engine |
| RBAC | Requer `logistics_intelligence` ∈ visibleModules | `useVisibleModules.js` · `structuralModuleResolver.js` |

### 3. Decisão arquitectural, configuração, ou implementação incompleta?

| Factor | Peso | Evidência |
|--------|------|-----------|
| **Decisão arquitectural (rollout controlado)** | **Alto** para runtime cognitivo | INC-043 homologação com flags OFF intencional; baseline LOCKED |
| **Restrição configuração (RBAC/flags)** | **Alto** para visibilidade menu/CC | Defaults OFF backend + Vite |
| **Implementação incompleta** | **Alto** para WMS operacional | APIs `/logistics-operational/*` missing; mocks L53–55; picking NOT_IMPLEMENTED |
| **Ausência de dados operacionais** | **Médio** | 0 registos foundation tenant ref.; mensagens hub INSUFFICIENT_DATA **esperadas** |

**Conclusão:** É **combinado**. Runtime cognitivo = decisão controlada. **WMS operacional = implementação incompleta** (não resolvível só com flags).

### 4. Existe pendência a concluir antes de ARC-002 e GF-021?

**SIM — pendências selectivas.**

| Bloqueia ARC-002? | Bloqueia GF-021? | Pendência |
|:-----------------:|:----------------:|-----------|
| Não* | Sim (se GF-021 tocar Supply/Logistics) | APIs operacionais + mocks + API path TMS |
| Não | Recomendado | moduleRegistry `logistics_intelligence` |
| Não | Não | Activar flags logistics (decisão rollout) |
| Não | Não | Dados operacionais / PLC (configuração tenant) |

\*ARC-002 (Greenfield Delivery Standard) é **documental/processual** — pode iniciar com logistics operacional incompleto **desde que** a incompletude fique registada (este AUD-001).

**Recomendação:** Resolver **G-LOG-001 a G-LOG-005** (gap analysis) **ou** abrir INC operacional WMS **antes** de GF-021 Discovery em Supply. Prosseguir roadmap BASELINE v1.4 → ARC-002 → Platform Stabilization **é adequado** se acceptarem logistics cognitivo gated + WMS operacional como dívida explícita.

---

## 1. Inventário funcional

Ver documento dedicado: [LOGISTICS-FUNCTIONAL-INVENTORY.md](./LOGISTICS-FUNCTIONAL-INVENTORY.md)

---

## 2. Backend

| Componente | Estado | Notas |
|------------|--------|-------|
| Domain `backend/src/domains/logistics/` | **EXISTS · ACTIVE · shadow** | 17 ficheiros |
| Cognitive runtime `cognitiveRuntime/domains/logistics/` | **EXISTS · ACTIVE · LOCKED** | Z.19–Z.23 homologados |
| Services foundation | **EXISTS · ACTIVE** | `logisticsFoundationService.js` |
| Controllers/routes foundation | **EXISTS · ACTIVE** | `/api/logistics/*` |
| Routes enterprise | **EXISTS · ACTIVE** | navigation, activation, validation |
| Routes operational WMS | **MISSING** | Planeado INC-037 § INC-042 |
| Legacy `logisticsIntelligenceService` | **EXISTS · LEGACY** | `/api/logistics-intelligence` |
| Admin CRUD TMS | **EXISTS · ACTIVE** | `/api/admin/logistics` |
| Workflows picking/receiving | **MISSING** | — |
| Validators/schemas | **EXISTS · ACTIVE** | foundation only |
| Jobs dedicados | **UNUSED** | Referência manual; sem worker logistics isolado |
| Runtime descriptor | **EXISTS · ACTIVE** | `logisticsRuntimeDescriptor.js` |

---

## 3. Banco de dados

| Objecto | Criada | Utilizada | Estado |
|---------|:------:|:---------:|--------|
| `logistics_vehicles`, `points`, `routes`, `drivers`, `expeditions`, `alerts`, `telemetry`, `snapshots` | ✅ migration SQL | ⚠️ Admin/TMS | Legacy intelligence |
| `logistics_inventory`, `receipts`, `shipments`, `lot_tracking` | ✅ runtime (INC-039) | ⚠️ 0 rows tenant ref. | Foundation — migration file **não versionada** no repo |
| `warehouse_*` (8 tabelas) | ✅ | ❌ 0 rows | Legacy WMS paralelo |
| Views logistics | — | — | Não identificadas |
| Índices | ✅ | — | Em migration intelligence |

---

## 4. APIs

Inventário completo: [LOGISTICS-GAP-ANALYSIS.md §6](./LOGISTICS-GAP-ANALYSIS.md)

**APIs nunca chamadas por FE productivo:** foundation POSTs, navigation context (parcial), validation pack.

**APIs depreciadas/orfãs:** `/api/logistics-intelligence/*` órfã do FE actual (path errado).

**APIs sem frontend:** foundation health/inventory/receipts/shipments/lots.

---

## 5. Frontend

| Item | Estado |
|------|--------|
| Páginas legacy | **Exist · Registrada · Renderiza** (RBAC) |
| Workspace operational | **Exist · Registrada · Oculta** (flag OFF) |
| 7 hubs CC | **Exist · Lazy · Oculta** (promotion OFF) |
| Componentes cockpit | **Exist · Registrada** |
| Rotas App.jsx | `/app/logistics/operational`, `/app/logistica-inteligente`, `/app/almoxarifado-inteligente` |
| Lazy loading | ✅ operational layout + hubs |
| Registries | `logisticsNativeCockpitRegistry.js` ✅; `moduleRegistry` logistics ❌ |

---

## 6. Navegação

**Utilizador autenticado consegue navegar para Logistics enterprise?** **NÃO** (default prod).

**Motivo exacto:** `resolveLogisticsVisibilityContext` → `flagsOn=false` porque `VITE_IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED` e `VITE_IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED` não truthy **ou** `visibleModules` não inclui `logistics_intelligence`.

Menu merge: `Layout.jsx` → `safeMergeLogisticsPublicationIntoMenu` — no-op quando `shouldPublishMenu=false`.

Rotas directas URL: `/app/logistics/operational` carrega mas **shell bloqueia** conteúdo.

---

## 7. Permissões (RBAC)

| Mecanismo | Logistics |
|-----------|-----------|
| Módulo contextual | `logistics_intelligence` |
| Eixos | `eixo_logistica`, `eixo_estoque` |
| Resolver estrutural | `structuralModuleResolver.js` |
| Perfil homologado | `manager_logistics`, `coordinator_logistics`, `supervisor_logistics` |
| Capabilities | `view:operational` (via safety pattern); logistics sem entrada MODULE dedicada |
| Executive forbidden | `logistics_intelligence` em listas governança exec |

**Gerente de Almoxarifado:** mapeia para perfil logistics se cadastro correcto; **não vê menu** por flags; **pode ver** widgets genéricos CC; **legacy almoxarifado** se módulo activo.

---

## 8. Feature flags

Inventário completo: [LOGISTICS-DEPLOYMENT-STATUS.md §2](./LOGISTICS-DEPLOYMENT-STATUS.md)

**Resumo:** 10 flags backend + 8 flags Vite identificadas; **default efectivo = desligado** excepto `IMPETUS_LOGISTICS_RUNTIME_FOUNDATION=true`.

---

## 9. Runtime

| Pergunta | Resposta |
|----------|----------|
| Existe runtime Logistics? | **SIM** — `logistics_native` |
| Estado | **LOCKED** homologado; **inactivo** prod |
| Promotion | Z.22 implementado; **bloqueado** binding < 0.50 |
| Cockpit | `LogisticsNativeCockpitPromotion` — 7 hubs |
| Binding | **0.385** (5/13 blocos) tenant ref. |
| Pilot | Perfis logistics; flags OFF → skipped |
| Homologation | INC-043 PASS |

Arquitectura utilizada: cadastro → `/dashboard/me` → Z.19 pilot → Z.20 signal loader → Z.22 promotion → Z.23 consolidation → CC promotion → hubs (ver BASELINE-LOGISTICS-v1.1 § cadeia).

---

## 10. Integrações

| Integração | Estado |
|------------|--------|
| ERP REST | Infra global dashboard; **0 connectors** típico tenant |
| PLC / sensores | **Não ligado** logistics hub; dashboard live mostra indisponível — **configuração** |
| MQTT / filas | Infra plataforma; **inactivo** logistics dedicado |
| Coletores / RF | Flags `VITE_IMPETUS_LOGISTICS_RF_*` — **não implementado** |
| Balanças / etiquetadoras | **Não encontrado** |
| Webhooks logistics | **Não encontrado** |
| TMS GPS (view telemetria) | **Simulado/copy** — "Integração GPS/TMS activa" sem dados |

---

## 11. Produção

Ver [LOGISTICS-DEPLOYMENT-STATUS.md](./LOGISTICS-DEPLOYMENT-STATUS.md)

**Síntese:** Código **implantado**; funcionalidade logistics enterprise **oculta/desligada**; legacy **parcialmente acessível**.

---

## 12. Telemetria — validação avisos dashboard

| Aviso observado | Confirmação técnica | Classificação |
|-----------------|---------------------|---------------|
| Telemetria PLC sem equipamentos | `plc_telemetry.ok === false` ou `equipments_tracked === 0` | **Configuração** — ingest PLC global |
| Contagem indisponível | Hub `INSUFFICIENT_DATA`; foundation counts 0 | **Ausência de dados** — esperado |
| Leituras ausentes | Signal loader NO_RECORDS em 8/13 blocos | **Esperado** fail-closed |
| Integrações pendentes | ERP connectors 0 | **Configuração** |

Mensagens **não são erro de runtime logistics homologado** — reflectem tenant sem dados + PLC não configurado.

---

## 13. Consistência arquitectural

| Verificação | Resultado |
|-------------|-----------|
| Duplicação WMS legacy vs foundation | ⚠️ **SIM** — dual stack |
| Módulo órfão | ⚠️ `/api/logistics-intelligence` vs FE path |
| Rota morta | ⚠️ `/logistics-operational/*` FE-only |
| Componente inacessível | ✅ Esperado (flags) — workspace/hubs |
| Migration abandonada | ⚠️ Foundation tables sem ficheiro migration repo |
| Runtime parcialmente removido | ✅ **NÃO** — runtime intacto LOCKED |

---

## 14. Evidências cruzadas (INC chain)

| INC | Contribuição AUD-001 |
|-----|---------------------|
| INC-036 | Gaps originais APIs operacionais, moduleRegistry — **persistem** |
| INC-037 | Plano runtime — operacional WMS adiado |
| INC-038–041 | Runtime foundation → CC promotion — **concluído** |
| INC-040 | Picking NOT_IMPLEMENTED; binding 0.385 |
| INC-043 | Homologação LOCKED; flags OFF prod |
| INC-047 | Logistics no SYSTEM v1.4 inventory |

---

## Artefactos gerados

| Ficheiro | Conteúdo |
|----------|----------|
| [AUD-001-LOGISTICS-OPERATIONAL-AUDIT.md](./AUD-001-LOGISTICS-OPERATIONAL-AUDIT.md) | Este documento |
| [LOGISTICS-FUNCTIONAL-INVENTORY.md](./LOGISTICS-FUNCTIONAL-INVENTORY.md) | Inventário 19 módulos |
| [LOGISTICS-GAP-ANALYSIS.md](./LOGISTICS-GAP-ANALYSIS.md) | Gaps P0–P3 + matriz API |
| [LOGISTICS-DEPLOYMENT-STATUS.md](./LOGISTICS-DEPLOYMENT-STATUS.md) | Flags, deploy, produção |

---

## Recomendação de sequência roadmap

```
AUD-001 ✅ (este documento)
    ↓
Decisão humana: INC operacional WMS (G-LOG-001..005) OU acceptar dívida
    ↓
BASELINE-SYSTEM v1.4 (INC-047 ✅)
    ↓
ARC-002 — Greenfield Delivery Standard  ← pode iniciar
    ↓
Platform Stabilization Review
    ↓
GF-021 Discovery (Finance ou Supply)  ← preferível após WMS gaps ou INC explícita
```

---

*Auditoria encerrada em modo READ ONLY. Nenhum código, BD, API, UI, runtime ou flag foi alterado.*
