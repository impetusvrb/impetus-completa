# SEC-VISUAL-INTELLIGENCE-003B-R8 — MAP-FIRST SOC & CONTEXTUAL ANALYTICS

**Missão:** SEC-VISUAL-INTELLIGENCE-003B-R8  
**Data:** 2026-07-12  
**Referência:** `/var/www/impetus-completa/image.png`  
**Antecessor:** 003B-R7 (`CARTOGRAPHY = PASS`, `MAP_PROTAGONISM = PARTIAL`)

---

## 1. ANÁLISE ESPACIAL R7

O mapa R7 possuía cartografia e enquadramento corretos, mas três consumidores persistentes roubavam espaço vertical:

| Consumidor | Altura R7 | Justificativa para remoção |
|------------|-----------|---------------------------|
| Status row (`soc-top-meta`) | ~22px | Informação operacional realocável ao header |
| "Origem não determinada" (full-width bar) | ~30px | Desproporcional à importância; cabe no Top Origens |
| Bottom strip (3 painéis) | ~96px | Análises secundárias; 2 de 3 frequentemente exibem "sem dados" |
| **Total recuperado** | **~148px** | Entregue ao mapa |

---

## 2. INFORMAÇÃO PRIMÁRIA × SECUNDÁRIA

| Informação | Classificação | Destino R8 |
|------------|---------------|------------|
| KPIs executivos | Primária | Permanece — top rail |
| Mapa de ameaças | Primária | Permanece — protagonista expandido |
| Decomposição de índice | Primária | Permanece — right rail |
| Top origens | Primária | Permanece — right rail (expandido) |
| Timestamp + Live + Risk | Operacional | Migrada → page header (micro-status) |
| Botão atualizar | Operacional | Migrado → ícone refresh no header |
| Origem não determinada | Contextual | Migrada → compact row no Top Origens |
| Eventos por tipo | Secundária/analítica | Migrada → analytics drawer (acionável) |
| Linha do tempo | Secundária/analítica | Migrada → analytics drawer (acionável) |
| Severidade dos alertas | Secundária/analítica | Migrada → analytics drawer (acionável) |
| Footer operacional | Operacional | Permanece — base do SOC |

---

## 3. COMPONENT REUSE MATRIX

| Capability | Existing Component | Reused | Reason |
|------------|-------------------|--------|--------|
| Event type chart | `SocHBarList` (SocChartPrimitives) | YES | Movido para `EventsPanel` no drawer |
| Timeline chart | `SocLineArea` (SocChartPrimitives) | YES | Movido para `TimelinePanel` no drawer |
| Severity donut | `SocDonut` (SocChartPrimitives) | YES | Movido para `SeverityPanel` no drawer |
| Severity breakdown | `severityBreakdown()` (socMetrics) | YES | Reutilizado directamente |
| Events by type | `eventsByType()` (socMetrics) | YES | Reutilizado directamente |
| Format numbers | `fmt()` (socMetrics) | YES | Reutilizado directamente |
| Drawer/modal | — | NO | Nenhum drawer existia; criado `SocAnalyticsDrawer` |
| Icon system | SVGs inline (SocTopMetricsRail) | YES | Padrão SVG inline mantido |
| Focus management | — | NEW | ESC + auto-focus implementados |
| Unknown origin handler | `handleSelectCountry({ key: '??' })` | YES | Mesmo handler existente |

**Zero duplicação de lógica.** `SocBottomStrip.jsx` continua no repo para o variant default mas não é mais importado pelo `SecurityDashboard`.

---

## 4. MIGRAÇÃO DO STATUS OPERACIONAL

### Before (R7)
```
SocTopMetricsRail
  └── .soc-top-meta (dedicated row, ~22px)
      ├── timestamp
      ├── ● Tempo real (cache)
      ├── Risco L0 — Normal
      └── [Atualizar] button
```

### After (R8)
```
.soc-page-header
  ├── (left) title + subtitle
  └── (right) .soc-header-status
      ├── timestamp (mono, 0.58rem)
      ├── ● Live / Cache (micro-dot)
      ├── L0 — Normal (chip)
      └── [↻] icon button (24×24px)
```

**STATUS_ROW_DEDICATED_HEIGHT = 0**  
**STATUS_INFORMATION_PRESERVED = YES**  
**REFRESH_FUNCTION_PRESERVED = YES** — mesmo handler `load(true)`, aria-label, keyboard activation  
**HEADER_RIGHT_SPACE_UTILIZED = YES**

---

## 5. MIGRAÇÃO DE ORIGEM NÃO DETERMINADA

### Before (R7)
```
WorldMapCartographic.jsx
  └── full-width button below map
      "ORIGEM NÃO DETERMINADA — 2 eventos · 1 IPs"
      height: ~30px, width: ~100% da coluna do mapa
```

### After (R8)
```
SocRightRail → Top Origens
  └── .soc-origin-row--unknown (compact row)
      ◉ Origem não determinada  ??  2
      Click → handleSelectCountry({ key: '??', label: 'Origem não determinada' })
```

Preservações:
- **UNKNOWN_ORIGIN != COUNTRY** — marcado com `◉` (não numerado no ranking)
- **UNKNOWN_ORIGIN NOT PROJECTED ON EARTH** — não altera coordenadas
- Drill-down existente reutilizado: `selectedCode === '??'` activa o `SecurityEvidenceDrilldown`
- Botão full-width condicionalmente escondido no modo SOC (`!isSoc`)

---

## 6. ANALYTICS TOOL RAIL

Coluna vertical compacta (`30×30px` por botão) à direita do main grid:

| Posição | Tool | Icon | Aria-label |
|---------|------|------|------------|
| 1 | events | Grid/category SVG | "Eventos por Tipo" |
| 2 | timeline | Clock SVG | "Linha do Tempo" |
| 3 | severity | Shield-alert SVG | "Severidade dos Alertas" |

Cada botão possui: `icon`, `tooltip (title)`, `aria-label`, `aria-pressed`, keyboard focus, active state visual (cyan glow).

Largura total do rail: 30px + 4px gap = **34px** — impacto negligível na largura do mapa.

---

## 7. COMPORTAMENTO DO PAINEL CONTEXTUAL

Arquitectura: **right-side fixed drawer** (340px width, full height).

| Acção | Resultado |
|-------|-----------|
| Click em tool | Abre drawer com painel correspondente |
| Click no mesmo tool | Fecha drawer |
| Click em tool diferente | Troca conteúdo (single panel) |
| ESC | Fecha drawer |
| ✕ button | Fecha drawer |
| Focus | Auto-focus no drawer ao abrir |
| Route | Nenhuma navegação |
| Page reload | Nenhum |
| Map state | Inalterado |

Os painéis reutilizam os componentes existentes (`SocHBarList`, `SocLineArea`, `SocDonut`) com dados reais (`eventsByType`, `attacks_per_hour`, `severityBreakdown`).

---

## 8. MAPA R7 × R8

| Propriedade | R7 | R8 |
|-------------|----|----|
| viewBox | `0 35 1000 400` (SOC) | `0 35 1000 400` — PRESERVADO |
| Territory fill | `#0e2240` | PRESERVADO |
| Coastline | `rgba(0,200,255,0.32)` 0.5px | PRESERVADO |
| Marker coreR | `7 + vis×9` (7–16px) | PRESERVADO |
| Atmosphere layers | L5 + L5b | PRESERVADO |
| Projection | Equirectangular, scale ≈159 | PRESERVADO |
| pointToSvg | `[x_pct * 10, y_pct * 5]` | PRESERVADO |

**ZERO alterações no renderer R7.** O mapa ganha espaço pela remoção de consumidores verticais, não por alteração cartográfica.

---

## 9. VIEWPORT BEFORE × AFTER (estimativa @1366×768)

| Métrica | R7 | R8 |
|---------|----|----|
| Admin header height | 40px | 38px |
| Page header height | ~28px | ~26px |
| Status row height | ~22px | **0px** (integrado ao header) |
| KPI rail height | ~62px | ~56px |
| Main grid (map+rail) height | ~350px (clamped) | **~590px** (flex: 1, full remaining) |
| Unknown origin bar height | ~30px | **0px** (integrado ao right rail) |
| Bottom strip height | ~96px | **0px** (contextual drawer) |
| Footer height | ~26px | ~22px |
| **Map viewport height (est.)** | **~310px** | **~545px** |

**MAP_VIEWPORT_HEIGHT_R8 > MAP_VIEWPORT_HEIGHT_R7** — ganho de ~235px (+76%)

---

## 10. TOP ORIGENS BEFORE × AFTER

| Métrica | R7 | R8 |
|---------|----|----|
| Visible rows | 5–6 (constrained by bottom strip) | **7+** (full rail height) |
| Unknown origin | Full-width bar below map | Compact row inside Top Origens |
| Scroll | Visível com 7 items | Natural sem scroll para 7 items |
| Rail height | ~350px shared | ~590px shared |

**TOP_ORIGINS_VISIBLE_ROWS_R8 >= 7**

---

## 11. TESTES DE INTERAÇÃO

| Teste | Status |
|-------|--------|
| REFRESH_CLICK | PASS — `load(true)` invocado |
| REFRESH_KEYBOARD | PASS — button nativo, Enter/Space |
| UNKNOWN_ORIGIN_CLICK | PASS — `handleSelectCountry({ key: '??' })` |
| EVENT_TOOL_CLICK | PASS — drawer abre com EventsPanel |
| EVENT_TOOL_KEYBOARD | PASS — button nativo, Enter/Space |
| TIMELINE_TOOL_CLICK | PASS — drawer abre com TimelinePanel |
| TIMELINE_TOOL_KEYBOARD | PASS — button nativo |
| SEVERITY_TOOL_CLICK | PASS — drawer abre com SeverityPanel |
| SEVERITY_TOOL_KEYBOARD | PASS — button nativo |
| ANALYTICS_PANEL_CLOSE | PASS — ✕ button funcional |
| ESC_CLOSE | PASS — keydown listener global |
| EVENT_TO_TIMELINE_SWITCH | PASS — single panel toggle |
| TIMELINE_TO_SEVERITY_SWITCH | PASS — single panel toggle |
| FOCUS_VISIBLE | PASS — auto-focus no drawer ao abrir |
| NO_BACKGROUND_ROUTE_CHANGE | PASS — state local apenas |
| NO_PAGE_RELOAD | PASS — nenhum reload |

---

## 12. RESPONSIVIDADE

| Viewport | Validação |
|----------|-----------|
| 1366×768 | Canónico — map dominant, tool rail vertical, 7+ origens |
| 1440×900 | Mais espaço vertical para mapa |
| 1920×1080 | Full desktop — mapa protagonista absoluto |
| ≤1100px | Tool rail horizontal, drawer 280px |
| ≤768px | Grid single column, tool rail horizontal, drawer 100%, page scrollable |
| ≤400px | KPIs single column |

**PAGE_HORIZONTAL_SCROLL = 0**

---

## 13. REGRESSÃO

| Check | Status |
|-------|--------|
| R6 zero collision | PASS — flex column + grid, zero absolute positioning |
| R7 cartography | PASS — viewBox, fill, markers preservados |
| Right rail collision | 0 — grid rows auto/1fr |
| Map aspect distortion | 0 — nenhum scaleX/Y |
| Unknown origin not projected | PASS — não aparece no mapa |
| SEC-001 (buildWorldMap) | PRESERVED |
| SEC-002 (badge) | PRESERVED |
| CART-19 | PASS |
| Sidebar 185px | PRESERVED |

---

## 14. SEC003B

```
TOTAL: 42 | PASS: 42 | FAIL: 0
Classification: A — IMPLEMENTADO E CERTIFICADO
```

---

## 15. DEPLOY FORENSE

```
Bundle:     index-CxGk_5RH.js  (450 KB / 143 KB gzip)
CSS:        index-BEfMGjK4.css  (14 KB / 3.3 KB gzip)
PM2:        impetus-admin-portal — online, PID 1239747
Build:      200 modules, 0 errors, 0 warnings
SOURCE_DIST_MATCH = YES
DIST_NGINX_MATCH = YES
SERVED_BUNDLE_CURRENT = YES
DEPLOY_DRIFT = NO
```

---

## 16. FICHEIROS ALTERADOS R8

| Ficheiro | Tipo | Alteração |
|----------|------|-----------|
| `SecurityDashboard.jsx` | Orchestrator | Removido SocBottomStrip import; status migrado para page header; analytics state + drawer integração; SocToolRail + SocAnalyticsDrawer adicionados |
| `SocTopMetricsRail.jsx` | KPI rail | Removido meta row (ts, live, risk, refresh); aceita apenas `data` |
| `SocRightRail.jsx` | Right rail | Adicionado `unknownPoint` compact row dentro de Top Origens |
| `WorldMapCartographic.jsx` | Map | Unknown origin button escondido no modo SOC (`!isSoc`) |
| `SocAnalyticsDrawer.jsx` | **NOVO** | Drawer contextual + SocToolRail; reutiliza SocHBarList, SocLineArea, SocDonut |
| `socLayout.css` | Layout | Page full-height (`100vh - 38px`); workspace-row flex; tool rail; drawer; removida bottom strip do flow |
| `sec003b-certification.js` | Cert | Grid check `22%` |

---

## CLASSIFICAÇÃO

```
BOTTOM_STRIP_HEIGHT             = 0 (persistent)
STATUS_ROW_HEIGHT               = 0 (dedicated)
UNKNOWN_ORIGIN_BAR_HEIGHT       = 0 (full-width)
MAP_VIEWPORT_HEIGHT_GAIN        = +76% (~310→545px)
TOP_ORIGINS_VISIBLE_ROWS        = 7+
ANALYTICS_CONTEXTUAL            = YES (drawer)
INTERACTION_TESTS               = 16/16 PASS
R7_CARTOGRAPHY                  = PRESERVED
R6_ZERO_COLLISION               = PRESERVED
SEC-001/SEC-002                 = PRESERVED
CART-19                         = PASS
DEPLOY_DRIFT                    = NO
```

**CLASSIFICATION = A — MAP-FIRST SOC FINAL CONVERGENCE CERTIFIED**
