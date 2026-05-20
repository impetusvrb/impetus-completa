# Semantic Runtime Alignment — Auditoria Completa (Fase K)

**Gerado:** 2026-05-19  
**Contexto:** Pós-bootstrap shadow/runtime (E→J + bootstrap operacional)

## Resumo executivo

| Severidade | Quantidade | Tema principal |
|------------|------------|----------------|
| CRITICAL | 2 | Publication leakage cross-domain |
| HIGH | 6 | Legacy enrichers / orphan pipelines |
| MEDIUM | 8 | Widget semantic mismatch |
| LOW | 5 | Fallback heurístico residual |

---

## CRITICAL

### K-CRIT-01 — Qualidade visível em perfil SST

| Campo | Valor |
|-------|--------|
| **Sintoma** | Módulos `quality` / `qualidade` aparecem em eixo `safety` |
| **Causa raiz** | Herança de menu sem semantic authority; Motor A `visible_modules` + contextual modules superset |
| **Risco operacional** | Operador SST exposto a fluxos de qualidade não aplicáveis |
| **Risco cognitivo** | IA e KPIs inferem domínio errado |
| **Risco governance** | Bypass de domain inheritance parcial |
| **Risco ISO 42001** | Decisão automatizada sem boundary documentado |

**Mitigação Fase K:** `semanticModuleInheritanceGuard` + `semanticPublicationIsolation` (shadow-first).

---

### K-CRIT-02 — Ambiental/ESG em perfis operacionais

| Campo | Valor |
|-------|--------|
| **Sintoma** | `environment_intelligence`, `esg` em menus não-ambientais |
| **Causa raiz** | Shared module excessivo; falta governed shared model |
| **Risco operacional** | Publicação de telemetria/ESG fora de escopo |
| **Risco cognitivo** | Context pack poluído |
| **Risco governance** | Cross-domain leakage |
| **Risco ISO 42001** | Traceability insuficiente de exclusão |

---

## HIGH

### K-HIGH-01 — smartSummary legacy enricher

- **Pipeline:** `services/smartSummary.js` sem governed channel obrigatório
- **Risco:** Summaries com agregação corporativa mascarada
- **Fase K:** `orphanEnricherDetector`, `governedSummaryAlignment`

### K-HIGH-02 — KPI corporate aggregator

- **Pipeline:** `dashboardKPIs` + `dashboardComposerService` paralelos a `secureKpiExposureResolver`
- **Risco:** KPI suppression / corporate metrics em perfil operacional
- **Fase K:** `governedKpiAlignment`, dependency map

### K-HIGH-03 — Duplicated chat context builders

- **Pipelines:** `secureChatContextBuilder`, `governChatRequest`, `openaiVozService`
- **Risco:** Divergência shadow vs runtime
- **Fase K:** `duplicatedPipelineDetector`

### K-HIGH-04 — cadastrarComIA / voz / tts routes

- **Classificação:** ungoverned entrypoints (bootstrap scan)
- **Risco:** IA runtime híbrida fora de envelope
- **Fase K:** orphan pipeline registry + observability

### K-HIGH-05 — executiveCompositionService

- **Pipeline:** enricher corporativo em perfis não-executive
- **Risco:** Cards/widgets assumem contexto executive
- **Fase K:** `governedDashboardCardResolver`

### K-HIGH-06 — personalizedInsightsService

- **Pipeline:** insights sem semantic scope
- **Risco:** Inferência cross-domain
- **Fase K:** `governedInsightAlignment`

---

## MEDIUM

### K-MED-01 — Widget/card semantic mismatch

- Envelope cognitivo parcialmente correcto; tiles não alinhados
- **Fase K:** `contextualCardCompositionEngine`

### K-MED-02 — Runtime truth exposure

- "sem dados", "indisponível" — **não mascarar**; explicar via `contextual_insufficiency`
- **Fase K:** KPI/summary alignment scores

### K-MED-03 — contextual_modules superset

- Phase 6 enrich pode expandir `visible_modules` além de semantic authority
- **Fase K:** publication resolver pós-composição

### K-MED-04 — Engine V2 widgets

- `engine_v2.payload.layout.widgets` sem governance scope por defeito
- **Fase K:** governed card orchestration (shadow)

### K-MED-05 — ManuIA routes

- `manutencao-ia` classificação unknown
- **Fase K:** entrypoint map expansion

### K-MED-06 — Reports/analytics shared

- `shared_governed` sem axis check em alguns perfis
- **Fase K:** `governedSharedModules`

### K-MED-07 — Fallback corporativo em KPI vazio

- Heurística preenche com métricas globais
- **Fase K:** `contextualFallbackSanitizer`

### K-MED-08 — Explainability overhead

- Trace em todos os canais — monitorizar latência
- **Fase K:** semantic telemetry

---

## LOW

- Heurísticas residuais em `diagnostic.js`
- `operationalAssistanceRuntime` sem semantic authority documentada
- Duplicação `userContext` vs `secureChatContextBuilder`
- Logs runtime JSON bruto (Fase D parcial)
- Tenant optional modules sem audit trail por tenant

---

## Classificação por tipo

| Tipo | Itens |
|------|-------|
| Publication leakage | K-CRIT-01, K-CRIT-02, K-MED-03 |
| Orphan pipelines | K-HIGH-01..04 |
| Legacy enrichers | K-HIGH-01, K-HIGH-05, K-HIGH-06 |
| Widget mismatch | K-MED-01, K-MED-04 |
| Runtime gaps | K-MED-02 |
| Fallback heuristics | K-MED-07 |

---

## Próximos passos (sem enforcement automático)

1. Manter `IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY=on`
2. Activar flags K individualmente em staging após 7d shadow
3. Revisar `GET /api/internal/governance/runtime-alignment/report`
4. Priorizar K-CRIT-01/02 antes de soft KPI enforcement
