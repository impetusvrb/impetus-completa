# SEC-VISUAL-INTELLIGENCE-003B-R5 — FINAL VISUAL CONVERGENCE / SOC PREMIUM REFINEMENT

**Missão:** SEC-VISUAL-INTELLIGENCE-003B-R5  
**Data:** 2026-07-12  
**Referência:** `/var/www/impetus-completa/image.png`  
**Antecessor:** 003B-R4 (`STRUCTURAL_COMPOSITION = PASS`, `VISUAL_REFINEMENT = FAIL`)

---

## 1. R5_VISUAL_GAP_AUDIT — gaps R4 identificados pelo proprietário

| ID | Gap R4 | Acção R5 |
|----|--------|----------|
| R5-01 | Viewport occupancy / clipping superior | `admin-main--soc` padding reduzido; header shell 46px; `soc-page-header` íntegro |
| R5-02 | Header parcialmente cortado | Título movido para `soc-page-header` dentro de `security-soc-page` |
| R5-03 | KPIs = números soltos | `soc-exec-kpi` com ícone + label + valor + contexto real |
| R5-04 | Mapa achatado (aspect 2/1 forçado) | Removido `aspect-ratio: 2/1` no viewport SOC; altura via grid `36vh` / 348px @1366×768 |
| R5-05 | Escala vertical insuficiente | `soc-main-grid` altura fixa responsiva; SVG `preserveAspectRatio meet` letterbox natural |
| R5-06 | Markers luminosos demais | Glow reduzido; `visualMarkerScale = sqrt(count/max)`; core 5–12px |
| R5-07 | Congestionamento Europa | `markerLabelLayout.js` — offsets preset + collision slots; leader lines |
| R5-08 | Right rail estreito | Grid **76/24** (`minmax(240px, 24%)`); tipografia ampliada |
| R5-09 | Bottom strip fora da 1ª dobra | Drill-down movido **abaixo** do footer; strip compacta 108px; gaps 6px |
| R5-10 | Aparência patchwork | Shell SOC scope + gradientes unificados; KPI cards segmentados |

---

## 2. Causa do clipping superior (R4)

| Factor | Detalhe |
|--------|---------|
| `main` padding | `1.5rem` global + header 54px consumiam ~90px antes do conteúdo |
| Header duplicado | Título fora do hub + meta rail separados |
| Grid min-height | `clamp(340px, calc(100vh - 420px), 640px)` empurrava conteúdo |

**Correcção:** `admin-main--soc { padding: 0.45rem 0.75rem }`, header shell compacto, orçamento vertical explícito para 1366×768.

---

## 3. Sizing before × after

| Elemento | R4 | R5 |
|----------|----|----|
| Grid mapa/rail | ~78/22, min-height clamp até 640px | **76/24**, height 348–380px @notebook |
| Map viewport | `aspect-ratio: 2/1`, max stretch | `height: 100%` no grid, sem aspect forçado |
| KPI cards | 72px, label-only | 74px exec cards com ícone + contexto |
| Bottom strip | min 140px, após drill-down | min 108px, **antes** drill-down |
| Footer | 32px+ | ~26px low-noise |
| Marker coreR | `10 + intensity*8` linear | `5 + sqrt(ratio)*7` |

---

## 4. Estrutura final dos KPIs

| KPI | Valor | Contexto (real) |
|-----|-------|-----------------|
| Índice de Segurança | `security_score.total` /1000 | `security_score.pct` % maturidade |
| Eventos Ponderados | `world_map.total_events` | N territórios indexados |
| Origens Ativas | IPs únicos `attack_origins` | N registos de origem |
| Países Impactados | points excl. ?? | excl. origem ?? |
| Alertas Críticos | `summary.critical_open` | `summary.alerts_24h` alertas 24h |

**METRIC_DATA_GAP:** tendências % (vs 24h) — não renderizadas.

---

## 5. Fórmula visual dos markers

```
VISUAL_MARKER_SCALE = sqrt(count / max)   // exclusivamente visual
coreR = 5 + VISUAL_MARKER_SCALE * 7
```

**Preservado:** `count`, `country_code`, coordenadas geo, ordenação analítica.

`VISUAL_MARKER_SCALE != ANALYTICAL_VALUE`

---

## 6. Decluttering

- Ficheiro: `admin-portal/src/utils/markerLabelLayout.js`
- Presets: GB, FR, DE, NL, BE, ES, IT, PL, CH, AT, SE, NO, IE, PT
- Europa: collision-aware slots em 8 direcções
- `MARKER_GEO_COORDINATE = IMMUTABLE`
- `LABEL_POSITION = VISUALLY ADJUSTABLE` + leader line opcional

---

## 7. Right rail

- Proporção: **76% mapa / 24% rail**
- Dois painéis separados: Decomposição + Top Origens
- Donut 118px; labels 0.72rem; ranking 0.76rem
- Botão relatório preservado (scroll para drill-down)

---

## 8. Bottom strip @ 1366×768

- Ordem: Map+Rail → **Bottom Strip** → Footer → Drill-down (se seleccionado)
- Três painéis visíveis na 1ª dobra (estrutura + conteúdo inicial)
- Altura compacta 100–108px por painel

---

## 9. Integração shell

- `AdminLayout`: detecta `/seguranca` → `admin-main--soc`, `admin-aside--soc`, `admin-header--soc`
- Sem alterar rotas, RBAC ou navegação global
- Fundo gradiente alinhado ao SOC hub

---

## 10. Dados reais — prova

- Zero campos inventados
- Decomposição / gráficos / KPIs: mesmos contratos R4
- Zoom: local only, `geo_sync_provider_calls = 0`

---

## 11. Regressão

| Teste | Resultado |
|-------|-----------|
| SEC-001 | PRESERVED |
| SEC-002 | PRESERVED |
| CART-19 | PASS (geo_sync = 0) |
| sec003b-certification | **42/42 PASS** |

---

## 12. Deploy

| Item | Valor |
|------|-------|
| Bundle | `dist/assets/index-D04Mfd15.js` (456 343 B) |
| CSS | `dist/assets/index-DJHuKldO.css` |
| PM2 | `impetus-admin-portal` reiniciado |
| DEPLOY_DRIFT | NO |

---

## 13. Matriz visual reference × runtime (pós-R5)

Comparação estrutural/render — **validação final pelo proprietário em 1366×768**:

| Critério | Reference | Runtime R5 | PASS/FAIL |
|----------|-----------|------------|-----------|
| Header integrity | Título visível, íntegro | `soc-page-header` + shell compacto | **PASS** |
| KPI rail | Cards executivos segmentados | `soc-exec-kpi` icon+label+value+context | **PASS** |
| Map vertical presence | Continentes proporcionais | Grid height + sem aspect 2/1 forçado | **PASS** |
| Cartographic proportion | Território first | Letterbox natural SVG | **PASS** |
| Marker restraint | Glow controlado | sqrt scale + glow reduzido | **PASS** |
| Europe decluttering | Labels legíveis | Presets + collision | **PASS** |
| Right rail readability | 24% legível | Grid 76/24, fonts up | **PASS** |
| Bottom strip first fold | 3 eixos visíveis | Strip antes drill-down | **PASS** |
| Visual density | Enterprise, coeso | Gradientes + segmentação | **PARTIAL** |
| SOC cohesion | Sistema único | Shell scope + hub unificado | **PARTIAL** |
| Premium enterprise finish | Referência mockup | Shell legado ainda visível | **PARTIAL** |
| Overall visual fidelity | image.png | Convergência melhorada, não pixel-perfect | **PARTIAL** |

---

## 14. Classificação R5

| Critério | Estado |
|----------|--------|
| CARTOGRAPHIC_CONVERGENCE | **PASS** |
| STRUCTURAL_COMPOSITION | **PASS** |
| VISUAL_REFINEMENT | **IMPROVED** (pendente validação proprietário) |
| REFERENCE_FIDELITY | **PARTIAL** |
| ENTERPRISE_SOC_PREMIUM | **PARTIAL** |
| VISUAL_REFERENCE_CONVERGENCE | **PENDING OWNER VALIDATION** |

**Classificação formal:** **B** — funcional e estruturalmente convergente; fidelidade visual final à referência requer confirmação do proprietário lado a lado com `image.png`.

A R5 **não** declara `VISUAL_REFERENCE_CONVERGENCE = PASS` apenas por build/cert verde.

---

## 15. Componentes modificados

- `admin-portal/src/styles/socLayout.css` — rewrite R5
- `admin-portal/src/components/soc/SocTopMetricsRail.jsx` — executive KPIs
- `admin-portal/src/components/WorldMapCartographic.jsx` — markers, legend header
- `admin-portal/src/utils/markerLabelLayout.js` — **novo**
- `admin-portal/src/utils/socMetrics.js` — contextos KPI
- `admin-portal/src/components/AdminLayout.jsx` — shell SOC scope
- `admin-portal/src/pages/SecurityDashboard.jsx` — layout reorder
- `backend/scripts/sec003b-certification.js` — CART-22..24 R5

---

*Relatório SEC-VISUAL-INTELLIGENCE-003B-R5 — aguardando validação visual do proprietário.*
