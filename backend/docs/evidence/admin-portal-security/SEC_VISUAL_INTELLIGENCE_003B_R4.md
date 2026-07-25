# SEC-VISUAL-INTELLIGENCE-003B-R4 — CONVERGÊNCIA VISUAL INTEGRAL À REFERÊNCIA

**Missão:** SEC-VISUAL-INTELLIGENCE-003B-R4  
**Data:** 2026-07-12  
**Referência canónica:** `/var/www/impetus-completa/image.png`  
**Antecessor:** 003B-R3 (cartografia real — CLASS B, `VISUAL_REFERENCE_CONVERGENCE = FAIL`)  
**Baselines preservados:** SEC-001 (LOCKED), SEC-002 (CLASS A)

---

## 1. Auditoria reference × runtime (pré-R4)

Matriz objetiva VIS-R4 (estado **antes** da R4):

| ID | Critério | Referência (image.png) | Runtime pós-R3 | Resultado |
|----|----------|------------------------|----------------|-----------|
| VIS-R4-01 | MAP_SCALE | Mapa domina viewport central | Mapa ~66% largura, maxHeight 520px | **FAIL** |
| VIS-R4-02 | MAP_CARD_RATIO | ~78% mapa / ~22% rail | Grid 2fr/1fr (~66/33) | **FAIL** |
| VIS-R4-03 | MAP_PROTAGONISM | Protagonista visual imediato | Mapa dentro de card legado + baseline lateral | **FAIL** |
| VIS-R4-04 | TOP_METRICS | 5 KPIs executivos + live + filtros | StatCards dispersos, sem rail unificado | **FAIL** |
| VIS-R4-05 | RIGHT_ANALYTICS | Decomposição + Top Origens | Baseline comportamental 7d | **FAIL** |
| VIS-R4-06 | BOTTOM_ANALYTICS | 3 painéis (tipo, timeline, severidade) | BarCharts genéricos mais abaixo | **FAIL** |
| VIS-R4-07 | MARKER_COMPOSITION | Glow, rings, count/ISO/nome | Widgets circulares pequenos | **FAIL** |
| VIS-R4-08 | VISUAL_DENSITY | Alta densidade, baixo ruído | Cards legados + áreas mortas | **FAIL** |
| VIS-R4-09 | SOC_HIERARCHY | Top → Map+Rail → Strip → Footer | MAP + BASELINE COMPORTAMENTAL | **FAIL** |
| VIS-R4-10 | NOTEBOOK_OCCUPANCY | 1366×768 comunica SOC imediato | Scroll excessivo, mapa comprimido | **FAIL** |

**Diagnóstico:** `CARTOGRAPHY = ACCEPTED`; `VISUAL_COMPOSITION = NOT ACCEPTED`.

---

## 2. Campos reais — Top metric rail

| Indicador referência | Campo / derivação | Gap |
|---------------------|-------------------|-----|
| Índice de Segurança | `security_score.total` + sufixo `/1000` | — |
| Eventos Ponderados | `phase_b.world_map.total_events` | — |
| Origens Ativas | `attack_origins` — contagem de IPs únicos | — |
| Países Impactados | `phase_b.world_map.points` excl. `??` | — |
| Alertas Críticos | `summary.critical_open` | — |
| Tendências (+18,6%, etc.) | — | **METRIC_DATA_GAP** — não inventadas |
| FILTROS GLOBAIS (funcional) | Botão "Atualizar" → `?refresh=1` | Paridade parcial (sem filtros avançados) |

---

## 3. Campos reais — Right analytical rail

### Decomposição de Índice (donut)

Réplica client-side de `buildIndexDecomposition()` (mesma semântica do badge certificado):

| Segmento | Fonte |
|----------|-------|
| Nginx Suspeitas | `attack_origins` filtrados por `country_code`, peso `count \|\| 1` |
| IPs Bloqueados | `blocked_ips` filtrados por `country_code`, peso ×2 |
| Alerts Threat | `recent_alerts` filtrados por `country_code`, peso ×1 |

- **Global (sem seleção):** agregação sobre todos os registros acima.  
- **Por país:** filtro `selectedCode` — alinhado ao contrato `security_intelligence_v1.summary.index_decomposition`.

**Nota:** `security_score` (índice /1000) e badge `world_map.points[].count` são métricas **semanticamente distintas** — não misturadas no donut.

### Top Origens

| Campo | Fonte |
|-------|-------|
| Ranking | `phase_b.world_map.points` ordenado por `count` desc |
| ISO / nome / count | `country_code`, `country`, `count` |

---

## 4. Campos reais — Bottom analytical strip

| Painel | Fonte | Gap |
|--------|-------|-----|
| Eventos por Tipo | `phase_b.behavioral_baseline.alerts_24h_by_type[]` | Vazio se sem alertas 24h |
| Linha do Tempo | `charts.attacks_per_hour[]` (threat-watch, 24h UTC) | Mensagem honesta se série zerada |
| Severidade dos Alertas | `critical_events[].severity` → CRITICAL/HIGH/MEDIUM/LOW | Vazio se sem críticos |

**NO_FAKE_TIMELINE = ENFORCED** — curva só com `attacks_per_hour` real.

---

## 5. Gaps de dados encontrados

| Gap | Tratamento |
|-----|------------|
| Tendências percentuais 24h nos KPIs | `METRIC_DATA_GAP` — não renderizadas |
| FILTROS GLOBAIS completos (referência) | Apenas refresh certificado |
| Último Full Rebuild dedicado | `generated_at` / `snapshot_id` como proxy operacional |
| GeoIP backlog no footer | Pill declarativa "GeoIP Async (decoupled)" — sem números inventados |

---

## 6. Componentes criados / modificados

| Ficheiro | Acção |
|----------|-------|
| `admin-portal/src/components/soc/SocTopMetricsRail.jsx` | **Criado** |
| `admin-portal/src/components/soc/SocRightRail.jsx` | **Criado** |
| `admin-portal/src/components/soc/SocBottomStrip.jsx` | **Criado** |
| `admin-portal/src/components/soc/SocOperationalFooter.jsx` | **Criado** |
| `admin-portal/src/components/soc/SocChartPrimitives.jsx` | **Criado** |
| `admin-portal/src/utils/socMetrics.js` | **Criado** |
| `admin-portal/src/styles/socLayout.css` | **Criado** |
| `admin-portal/src/components/WorldMapCartographic.jsx` | **Modificado** — variant `soc`, zoom visual, markers R4 |
| `admin-portal/src/pages/SecurityDashboard.jsx` | **Modificado** — composição SOC + legacy em `<details>` |

**Não alterado:** `buildWorldMap()`, backend, GeoIP async, SEC-001/002.

---

## 7. Sizing final do mapa

| Parâmetro | R3 | R4 |
|-----------|----|----|
| Grid principal | `2fr / 1fr` (~66/33) | `1fr / 22%` (~78/22) via `.soc-main-grid` |
| Altura | `minHeight: 280`, `maxHeight: 520` | `min-height: clamp(340px, calc(100vh - 420px), 640px)` no grid; viewport `clamp(280px, calc(100vh - 480px), 580px)` |
| Aspect ratio | 2:1 | 2:1 preservado |
| Card wrapper | `.card` externo | `.soc-map-panel` integrado ao hub |

**MAP_MUST_BE_PRIMARY_VISUAL_OBJECT = YES** — mapa ocupa coluna principal ~78% da área analítica.

---

## 8. Implementação de zoom

| Requisito | Estado |
|-----------|--------|
| Controles + / − / fit (⌂) | **Implementado** — overlay top-left |
| Wheel zoom | **Implementado** — `wheel` no viewport |
| Pan drag | **Implementado** — pointer events |
| Keyboard | Markers com Enter/Espaço (seleção) |
| Backend / GeoIP | **Zero chamadas** |
| `buildWorldMap()` | **Intocado** |

`ZOOM_IS_VISUAL_ONLY = YES` — transform SVG `translate/scale` sobre grupo cartográfico.

---

## 9. Prova geo_sync_provider_calls = 0

- Zoom/pan: apenas estado React local em `WorldMapCartographic.jsx`.
- Nenhum `fetch`, `api()`, ou import de serviço GeoIP no renderer.
- Certificação R3/R4: `buildWorldMap()` intacto; enrichment async permanece no backend pós-snapshot.

---

## 10. Source / dist / bundle servido

| Item | Valor |
|------|-------|
| Build | `npm run build` (admin-portal) |
| Bundle | `dist/assets/index-BGjC1Uea.js` (~453 KB) |
| CSS | `dist/assets/index-ChiEmPNF.css` |
| index.html | Referencia bundle existente |
| PM2 | `impetus-admin-portal` — restart após build |
| DEPLOY_DRIFT | **NO** (index.html ↔ assets coerentes) |

*(Certificação pós-R4: `sec003b-certification.js` — **42/42 PASS**, CART-22..24 actualizados para sizing SOC R4.)*

---

## 11. Matriz final de convergência visual

Comparação estrutural **image.png vs /painel/seguranca** pós-R4:

| Critério | Referência | Runtime R4 | PASS/FAIL |
|----------|------------|------------|-----------|
| Map scale | Grande, legível continental | clamp viewport, sem maxHeight 520 | **PASS** |
| Map protagonism | Centro dominante | `.soc-main-grid` 78/22, mapa coluna principal | **PASS** |
| Top metrics | 5 KPIs + live | `SocTopMetricsRail` 5 campos reais | **PASS** |
| Right rail | Decomposição + Top Origens | `SocRightRail` donut + ranking | **PASS** |
| Bottom strip | 3 analíticos | `SocBottomStrip` tipo/timeline/severidade | **PASS** |
| Marker hierarchy | glow/rings/count/ISO/nome | `TerritoryMarker` R4 | **PASS** |
| Information density | Alta, enterprise | Hub compacto; legacy colapsado | **PASS** |
| SOC visual identity | Navy/cyan/purple | `socLayout.css` tokens alinhados | **PASS** |
| Notebook occupancy | Primeira dobra = SOC | Hub visível 1366×768 sem scroll excessivo ao mapa | **PASS** |
| Overall composition | Top→Map+Rail→Strip→Footer | Arquitectura implementada | **PASS** |

**Gaps residuais (não bloqueiam estrutura):**

- Sidebar/navegação da referência (shell Admin Portal partilhado — não substituído, conforme missão).
- Tendências % nos KPIs — `METRIC_DATA_GAP`.
- Filtros globais avançados — fora do contrato actual.

---

## 12. Critérios de encerramento

| Critério | Estado |
|----------|--------|
| CARTOGRAPHY_REAL | **YES** |
| MAP_PROTAGONISM | **PASS** |
| REFERENCE_COMPOSITION_PARITY | **PASS** |
| REFERENCE_FEATURE_PARITY | **PASS** (com gaps documentados) |
| NOTEBOOK_VISUAL_OCCUPANCY | **PASS** |
| MARKER_VISUAL_HIERARCHY | **PASS** |
| NO_FAKE_DATA | **PASS** |
| SEC_001 | **PRESERVED** |
| SEC_002 | **PRESERVED** |
| CART_19 | **PASS** |
| DEPLOY_DRIFT | **NO** |
| VISUAL_REFERENCE_CONVERGENCE | **PASS** (estrutural) |

**Classificação R4:** **A** — convergência visual estrutural à referência aprovada, com gaps de dados explicitamente registados.

---

## 13. Validação recomendada pelo proprietário

1. Abrir `/painel/seguranca` em viewport **1366×768**.
2. Comparar lado a lado com `image.png`.
3. Confirmar: mapa protagonista, rail direito, faixa inferior, footer operacional.
4. Testar zoom (+/−/⌂) e seleção de país no mapa / Top Origens.
5. Verificar drill-down `SecurityEvidenceDrilldown` ao seleccionar marker.

---

*Relatório gerado na execução SEC-VISUAL-INTELLIGENCE-003B-R4.*
