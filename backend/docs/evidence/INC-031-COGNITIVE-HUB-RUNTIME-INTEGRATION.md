# INC-031 — Integração do CognitiveQualityHub com Sinais Reais (Z.23)

**Data:** 2026-07-16  
**Tipo:** consumo runtime no hub cognitivo (frontend only)  
**Tenant:** `511f4819-fc48-479e-b11e-49ba4fb9c81b`  
**Perfil:** `manager_quality` (`ricardo.souza@impetus.com.br`)  
**Pré-requisito:** INC-030 (cadeia runtime reconciliada)

---

## Critérios de encerramento

| Flag | Valor |
|------|-------|
| `COGNITIVE_RUNTIME_CONNECTED` | **YES** |
| `PLACEHOLDER_SIGNALS` | **NO** |
| `MOCK_SIGNALS` | **NO** |
| `REAL_RUNTIME_CONSUMPTION` | **YES** |
| `NO_NEW_WIDGETS` | **YES** |
| `NO_LAYOUT_CHANGED` | **YES** |
| `NO_CSS_CHANGED` | **YES** |
| `NO_ENGINE_CHANGED` | **YES** |
| `BASELINE_UI_v1.0` | **PRESERVED** |
| `QUALITY_BASELINE_v1.0` | **PRESERVED** |

---

## Pré-check — QualityNativeCockpitPromotion monta (INC-030)

Antes de alterar o hub, confirmou-se que a promoção Z.23 está activa na cadeia oficial:

| Verificação | Resultado |
|-------------|-----------|
| `/api/dashboard/me` → `specialized_cockpit_runtime.consolidation_applied` | **true** |
| `cockpit_mode` | **quality_native** |
| `quality_cognitive_centers` | **6** |
| Payload raiz ↔ report | **consistente** |
| `CentroComando.jsx` gate `qualityNativeActive` | **satifeito** (L352-359) |
| `resolvePromotedQualityHubs` inclui hub `cognitive` | **YES** |
| Atributo render `data-quality-native-hub="cognitive"` | **presente** em `QualityNativeCockpitPromotion.jsx` |

**Conclusão:** INC-031 prosseguiu — o componente entra na árvore de renderização via promoção Z.23.

---

## Etapa 1 — Fontes artificiais removidas

| Local | Antes | Depois |
|-------|-------|--------|
| `CognitiveQualityHub.jsx` → `buildSignals()` | Arrays hardcoded (`process_values`, `defect_rates`, `default-supplier`, `recurrence_records` demo) | **Removido** |
| Chamada API | `runInsights({ signals: buildSignals() })` | `fetchDashboardMeShared` → adapter runtime |
| `mockSignals` / `demoSignals` / `placeholderSignals` | N/A noutros ficheiros quality cognitive | **Não existiam** |

Única fonte artificial identificada: **`buildSignals()` local** no hub cognitivo.

---

## Etapa 2 — Inventário sinais runtime (`/dashboard/me`)

| Sinal / campo | Disponível no runtime | Usado pelo hub | Estado |
|---------------|----------------------|----------------|--------|
| `specialized_cockpit_runtime` | ✅ | Gate conexão | **REAL** |
| `quality_cognitive_centers` (6) | ✅ | Drift, risco, governança | **REAL** |
| `quality_telemetry_spc.metrics` | ✅ | Drift card | **REAL** (drift high, conf 100%) |
| `quality_operational_metrics` | ✅ | Risco preditivo | **REAL** (deterioration_score 0.7) |
| `quality_insights` (7) | ✅ | Recomendações | **REAL** (Z.21 engine bridge) |
| `quality_decision_support.questions` | ✅ | Recomendações assistivas | **REAL** (6 perguntas) |
| `quality_governance.metrics.supplier_*` | ⚠️ parcial | Fornecedor | **INDISPONÍVEL** (score null, risk unknown) |
| `quality_narrative` | ⚠️ | Narrativa executiva | **INDISPONÍVEL** (`ok: false`, sem parágrafos) |
| `process_values` (série temporal) | ❌ no payload raiz | runInsights drift engine | **NÃO EXPUESTO** — sem inventar |
| `supplier_rows` | ❌ | runInsights supplier engine | **NÃO EXPUESTO** |
| `recurrence_records` (array) | ⚠️ parcial | runInsights recurrence | **1 registo** derivado de `recurrence_key` real (insuficiente para motor) |
| Telemetria SPC séries | ❌ (INC-033) | — | **Fora de scope** |
| KPIs CC | ❌ (INC-032) | — | **Fora de scope** |

---

## Etapa 3 — Correção aplicada

### Novo adapter (consumidor único)

**Ficheiro:** `frontend/src/domains/quality/cognitive/qualityCognitiveRuntimeSignalAdapter.js`

```
/dashboard/me
  ↓
resolveQualityRuntimeContext()
  ↓
buildRuntimeInsightPack()     → cards UI (drift, risco, recomendações)
buildCognitiveSignalsFromRuntime() → POST insights/run (só se séries reais ≥ limiar)
mergeRuntimeAndApiPacks()     → runtime prioritário; API só quando ok
```

### Hub actualizado

**Ficheiro:** `frontend/src/domains/quality/cognitive/CognitiveQualityHub.jsx`

- Remove `buildSignals()` e imports `safeUUID` demo
- Carrega `/dashboard/me` via `fetchDashboardMeShared({ force: true })`
- Exige `consolidation_applied` (runtime Z.23)
- **Não chama** `runInsights` quando séries temporais insuficientes (evita re-processar mocks)
- Estados vazios: **"Sem dados suficientes"** (mono, DS existente)

### O que **não** foi alterado

- Layout, CSS, grids, cards structure
- `QualityNativeCockpitPromotion`, `CentroComando`, WidgetQualidade
- Backend Z.20–Z.23, signal loader, KPIs, SPC, motores cognitivos

---

## Etapa 4 — Comportamento por secção (manager_quality live)

| Secção UI | Fonte runtime | Render |
|-----------|---------------|--------|
| Risco Preditivo | `quality_operational_metrics.deterioration_score` | **0.7 (70%)** |
| Drift Preditivo | `quality_telemetry_spc` center | **high · conf 100%** |
| Fornecedor | `quality_governance.supplier_score` | **Sem dados suficientes** |
| Recomendações | `quality_insights` + `quality_decision_support` | **7+ insights reais** |
| Narrativa | `quality_narrative` center | **Sem dados suficientes** |

---

## Etapa 5 — Validação

### Testes frontend

| Suite | Resultado |
|-------|-----------|
| `qualityCognitiveRuntimeAdapterScenarios.mjs` | **17/17 PASS** |
| `qualityCognitiveRuntimeScenarios.mjs` | **PASS** |
| `qualityNativeCockpitPromotionScenarios.mjs` | **10/10 PASS** |

### Regressão backend (domínios)

| Domínio | Resultado |
|---------|-----------|
| Executive | 14/14 |
| HR | 11/11 |
| Safety | 15/15 |
| Production | 21/21 |
| Environment | 15/15 |
| Maintenance | 29/29 |
| INC-030 chain | 11/11 |

---

## Diagrama pós-INC-031

```mermaid
flowchart TD
  A[/dashboard/me quality_native] --> B[fetchDashboardMeShared]
  B --> C[qualityCognitiveRuntimeSignalAdapter]
  C --> D[buildRuntimeInsightPack]
  C --> E{hasSufficientSignalsForRunInsights?}
  E -->|sim| F[POST /quality-cognitive/insights/run]
  E -->|não| G[Sem chamada API]
  F --> H[mergeRuntimeAndApiPacks]
  G --> H
  D --> H
  H --> I[CognitiveQualityHub cards]
  J[QualityNativeCockpitPromotion] --> I
```

---

## Sinais ainda indisponíveis (INCs futuras)

| Gap | INC prevista |
|-----|--------------|
| KPIs CC usam proposals (0) vs inspections (9) | **INC-032** |
| SPC séries temporais na UI | **INC-033** |
| `quality_narrative` center (`ok: false`) | Dados narrativos reais / motor narrative |
| `supplier_intelligence` (`bound_empty`) | Binding fornecedor (INC-028 bloqueio documentado) |

---

## Resumo executivo

O `CognitiveQualityHub` deixou de sintetizar sinais locais via `buildSignals()` e passou a consumir exclusivamente o runtime `quality_native` já entregue pelo `/dashboard/me` após INC-030. Drift, risco e recomendações reflectem dados reais do tenant; secções sem sinal suficiente mostram estado técnico honesto — **sem IA fictícia**. A UI baseline v1.0 permanece intacta.

**Próximo passo natural:** INC-032 (KPIs CC → `quality_inspections`).
