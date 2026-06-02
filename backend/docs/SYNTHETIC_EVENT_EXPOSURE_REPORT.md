# SYNTHETIC_EVENT_EXPOSURE_REPORT — FASE 34 (mapeamento only)

**Data:** 2026-06-01  
**Restrição:** nenhum código removido; feature não desligada.

---

## 1. Origem

| Ficheiro | Função |
|----------|--------|
| `cognitiveRuntime/simulation/syntheticOperationalEventGenerator.js` | Gera eventos com `verification_state: 'synthetic'`, `source_runtime: 'synthetic_operational'` |
| `cognitiveRuntime/config/phaseC2FeatureFlags.js` | `syntheticEventsWhenSparse()` ← `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` (**default true**) |

---

## 2. Condições de activação

`cognitiveConvergenceFacade.applyCognitiveConvergence`:

```text
c2.isEventDensityEngineEnabled()
AND c2.syntheticEventsWhenSparse()
AND getOperationalTimeline(user).length < 5
AND (ctx.force_synthetic_events OR payload.profile_code includes 'quality')
→ generateSyntheticOperationalEvents(user, payload, { count: 10 })
```

---

## 3. Onde entra no pipeline

```text
GET /dashboard/me
  → cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard
  → (cadeia Z17/Z18) pode incluir convergência C2
  → buildOperationalContextRuntime({ synthetic_events })
  → operationalContextEngine.appendOperationalContext
  → cognitive_convergence_runtime.synthetic_memory_ratio
  → payload JSON ao frontend (cockpits / widgets)
```

| Destino | Tipo exposição |
|---------|----------------|
| **Payload dashboard** | `operational_convergence_report`, `cognitive_convergence_runtime` (métricas, ratios) |
| **Memória operacional C2** | Eventos misturados em timeline interna (`operationalContextEngine`) |
| **LLM** | Indirecto se contexto de conselho/chat injectar eventos do pack — **não** via synthetic generator directamente no `runCognitiveCouncil` grep |
| **Painéis Smart Panel** | **Não** referencia generator |
| **Snapshots PostgreSQL** | **Não** — synthetic não persiste em PLC/quality tables pelo generator |
| **Cockpits Z23–Z26** | Podem consumir métricas derivadas de `cognitive_convergence_runtime` no `/dashboard/me` |

---

## 4. Filtros existentes

| Componente | Comportamento |
|------------|---------------|
| `operationalDensityAnalyzer.js` | Separa `real` vs `synthetic` por `verification_state` |
| `causalCorrelationEngine.js` | `synthetic_blocked: true` em certos ramos |
| `operationalMemoryValidator.js` | Expõe `synthetic_memory_ratio` |
| `governedKpiAlignment.js` | `hasRealData` ignora `k._synthetic` |

**Gap:** UI pode ainda mostrar agregados sem filtrar `synthetic_memory_ratio` se widget não verificar.

---

## 5. Risco ao utilizador

| Cenário | Risco |
|---------|-------|
| Widget mostra "eventos" sem filtrar `verification_state` | **MEDIUM** — labels podem parecer reais |
| Ratio synthetic em JSON técnico | **LOW** — se UI não renderizar |
| LLM citar evento synthetic | **LOW-MEDIUM** — depende de inject em context pack |

**Não classificado como TRUTH VIOLATION automática** se UI rotular `synthetic`; **sim** se apresentado como facto PLC/produção real.

---

## 6. Recomendações (futuro — fora F34)

1. Badge `SYNTHETIC` em widgets que leem `cognitive_convergence_runtime`.
2. Excluir `verification_state=synthetic` de `retrieveContextualData`.
3. Telemetria: `emitC2('EVENT_DENSITY')` já regista `synthetic_count` — alertar se ratio &gt; 0 em tenant produção.

---

## 7. Conclusão

Eventos synthetic **podem** entrar no payload de dashboard/cockpit via C2 quando timeline esparsa. **Não** passam por `industrialTruthEnforcementService`. Mapeamento completo; **sem alteração** nesta fase.
