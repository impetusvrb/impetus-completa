# SEC-VISUAL-INTELLIGENCE-003B — R8B FINAL BASELINE
## Security Center Visual Baseline — FROZEN

**Data de congelamento:** 2026-07-12  
**Classificação:** A — FINAL VISUAL AND RUNTIME CONVERGENCE CERTIFIED  
**Status:** `SECURITY_CENTER_VISUAL_BASELINE = R8B`  
**SEC_RUNTIME_01:** PASS (Playwright 1.61.1 + Chrome 1228 — 0 hook errors, auth guard funcional)

---

## 1. DECISÃO DE GOVERNANÇA

```
R8B_VISUAL_DIRECTION         = APPROVED
CARTOGRAPHIC_ART_DIRECTION   = FROZEN
MAP_FIRST_LAYOUT             = FROZEN
```

Qualquer alteração futura ao visual do Security Center deve ser aprovada por uma decisão arquitetural explícita e documentada. Esta baseline substitui todos os estados R4–R8A como referência de produção.

---

## 2. ARQUITECTURA MAP-FIRST (R8 — Preservada)

```
SecurityDashboard
├── soc-page-header          ← micro-status integrado (ts, live, risk, refresh)
└── soc-intelligence-hub
    ├── SocTopMetricsRail    ← 4 KPI executivos (condensados, sem meta)
    ├── soc-workspace-row
    │   ├── soc-main-grid
    │   │   ├── soc-map-column
    │   │   │   └── WorldMapCartographic [variant="soc"]  ← PROTAGONISTA
    │   │   └── SocRightRail             ← donut + top origens + unknown
    │   └── SocToolRail                  ← 3 ferramentas (vertical, discreto)
    ├── SocOperationalFooter
    └── SocAnalyticsDrawer   ← contextual, position:fixed right
```

**Coluna grid:** `minmax(0, 1fr) minmax(210px, 22%)`  
**Sidebar SOC:** 185px (compacta, non-intrusive)

---

## 3. CÂMERA CARTOGRÁFICA FINAL

### WorldMapCartographic.jsx — SOC_VIEWBOX

```javascript
const SOC_VIEWBOX = '0 10 1000 415';
```

| Parâmetro | Valor | Efeito geográfico |
|-----------|-------|-------------------|
| x_start   | 0     | Meridiano -180° (margem oceânica Pacífico) |
| y_start   | 10    | lat ≈ 86°N (respiração árctica acima da Rússia) |
| width     | 1000  | Extensão completa equirretangular |
| height    | 415   | lat_bottom ≈ -62.7°S (Península Antárctica fora do frame) |

**Rationale do ajuste R8B:**
- `y_start 35 → 10`: elimina colisão Rússia/topo. Russia (80°N, y=28) passa de 7px para 18px de margem.
- `height 400 → 415`: compensa levemente o shift superior, mantém o palco.
- Antártida principal (66°S+) não visível no frame normal.

### preserveAspectRatio
```
xMidYMid meet
```

---

## 4. TRATAMENTO DA ANTÁRTIDA

```javascript
const ANTARCTICA_ID = 10; // ISO M49 — world-atlas countries-110m

// Separação do rendering:
const antarcticaPath = all.find((f) => f.id == ANTARCTICA_ID) || null;
const countryPaths   = all.filter((f) => f.id != ANTARCTICA_ID);
```

**Styling Antártida (SOC):**
```javascript
fill:   '#0a1a2c'                    // mais escuro/frio que continentes (#112844)
stroke: 'rgba(0,160,220,0.15)'      // costeira muito discreta
strokeWidth: '0.35'
```

**Resultado:** `ANTARCTICA_PRESENT = YES`, `ANTARCTICA_VISUAL_DOMINANCE = LOW`

---

## 5. MODELO VISUAL DO OCEANO

### Gradiente principal (`ocean-vignette`)
```xml
<radialGradient cx="50%" cy="40%" r="72%">
  stop 0%   : #0d2038  (centro — navy médio)
  stop 28%  : #091528
  stop 58%  : #050d1a
  stop 85%  : #030710
  stop 100% : #010408  (periferia — quase preto)
</radialGradient>
```

### Vignette periférica adicional (`ocean-peripheral`)
```xml
<radialGradient cx="50%" cy="50%" r="55%">
  stop 0%   : transparent
  stop 100% : rgba(1,3,8,0.55)
</radialGradient>
```

**Efeito:** DEEP DIGITAL SPACE — não FLAT BLUE PANEL

### Dot grid
```xml
<circle r="0.55" fill="rgba(0,190,255,0.10)" />  ← SOC mode
```

### Land glow filter
```xml
<feGaussianBlur stdDeviation="1.8" />  ← SOC (era 1.4)
```

---

## 6. SEPARAÇÃO TERRITORIAL

| Propriedade | Continentes | Antártida |
|-------------|-------------|-----------|
| fill        | `#112844`   | `#0a1a2c` |
| stroke      | `rgba(0,212,255,0.38)` | `rgba(0,160,220,0.15)` |
| strokeWidth | `0.55`      | `0.35`    |

**Princípio:** `COASTLINE > INTERNAL_BOUNDARIES`, land chromatically separated from ocean.

---

## 7. HIERARQUIA DE HOTSPOTS (TerritoryMarker)

### Dimensionamento core
```javascript
coreR = 7 + vis * 9   // SOC: range 7–16px (vis = sqrt normalizado)
```

### Camadas atmosféricas por tier

| Layer | Condição | Radius | Opacidade |
|-------|----------|--------|-----------|
| L3 bloom   | vis > 0.65 | coreR + 18 + 24 | `(vis-0.65)*0.09` |
| L4 halo    | vis > 0.35 | coreR + 18 + 10 | `0.04+(vis-0.35)*0.12` |
| L5 atmosphere | sempre | coreR + 18   | `0.08 + vis*0.12` |
| Ring1 static | sempre | coreR + 6    | `0.28 + vis*0.30` |
| Ring2 static | vis > 0.4 | coreR + 14  | `(vis-0.4)*0.28` |
| Pulse p1   | animado  | coreR       | animação |
| Pulse p2   | animado  | coreR       | animação |

### Escala visual perceptiva

```
LOW (vis<0.25):      core pequeno, ring1 único, atmosfera mínima
MEDIUM (vis 0.25–0.5): core+ring1+ring2 tênue, halo L4 aparece
HIGH (vis 0.5–0.75): + bloom L3, ring2 visível, contagem imediata
VERY HIGH (vis>0.75): dominância total, multi-layer, gravidade visual máxima
```

**CA e BR** permanecem primeiros na leitura visual.

### ANIM_CSS (R8B)
```css
@keyframes imap-pulse1 { 0%: r=6,opacity=0.55; 100%: r=26,opacity=0 }  /* 2.4s */
@keyframes imap-pulse2 { 0%: r=9,opacity=0.32; 100%: r=36,opacity=0 }  /* 3.0s, delay 0.65s */
```

---

## 8. HIERARQUIA DE LABELS

```
COUNT > ISO > COUNTRY_NAME
```

| Elemento | Font size | Cor | Stroke |
|----------|-----------|-----|--------|
| COUNT    | `11 + vis*6` (11–17px) | `#ffffff` | `3px #010408` paintOrder:stroke |
| ISO      | 8.5px | color do marker, opacity 0.90 | — |
| country  | 7px | `rgba(180,210,235,0.52)` | — |

**Decluttering:** `computeMarkerLabelLayouts()` de `markerLabelLayout.js` (inalterado)

---

## 9. LEGENDA (header do mapa)

```javascript
// Labels correctos alinhados com markerTierLabel()
{ color: '#ff4040', label: 'Muito alto' }
{ color: '#ff8800', label: 'Alto' }
{ color: '#b44dff', label: 'Médio' }
{ color: '#00d4ff', label: 'Baixo' }
// + boxShadow: `0 0 5px ${color}88` em cada dot
```

**CSS refinado:**
```css
.soc-map-header-legend       { gap: 8px; flex-wrap: nowrap; padding-right: 4px; }
.soc-map-header-legend-title { font-size: 0.52rem; border-right: 1px solid rgba(0,212,255,0.12); }
.soc-map-header-legend-item  { gap: 4px; font-size: 0.52rem; }
.soc-map-legend-dot          { width: 7px; height: 7px; }
```

---

## 10. MICROSTATUS (header superior direito)

```css
.soc-header-status {
  gap: 10px;           /* era 8px */
  font-size: 0.60rem;  /* era 0.58rem */
  padding-right: 2px;
}
```

Elementos preservados: timestamp, live/cache dot, risk chip (L0–L5), refresh button.

---

## 11. REGRESSÃO R8A — REQUISITO OBRIGATÓRIO

### Violação corrigida (R8A)
```
FIRST_FATAL_ERROR = "Rendered fewer hooks than expected"
ROOT_CAUSE        = useCallback hooks definidos após conditional early returns
```

### Posição obrigatória em SecurityDashboard.jsx
```javascript
// CORRECTO — hooks ANTES de qualquer early return:
const handleToolClick = useCallback((toolId) => {
  setActiveTool((prev) => (prev === toolId ? null : toolId));
}, []);

const handleCloseDrawer = useCallback(() => {
  setActiveTool(null);
}, []);

// ... conditional early returns seguem DEPOIS
if (loading && !data) return <LoadingState />;
```

### Invariante obrigatório
```
R8A_HOOK_RELOCATION_PRESERVED = YES
HOOK_AFTER_EARLY_RETURN       = NO   (proibido)
NEW_HOOK_INTRODUCED           = requere revisão de posição
```

---

## 12. REGRA DE GOVERNANÇA FUTURA

```
FUTURE SECURITY CENTER VISUAL CHANGES MUST PRESERVE R8B BASELINE
UNLESS SUPERSEDED BY AN APPROVED ARCHITECTURAL DECISION.
```

### O que está FROZEN
- `SOC_VIEWBOX = '0 10 1000 415'`
- Antártida render separado (`ANTARCTICA_ID = 10`)
- Modelo oceânico 5-stop + vignette periférica
- Land fill `#112844`, coastline `rgba(0,212,255,0.38)`
- Hierarquia 4-layer de markers
- Label hierarchy COUNT > ISO > country
- Legenda com dots glowing
- MAP-FIRST layout architecture
- Right rail structure
- Analytics tool rail + drawer
- Unknown origin em Top Origens

### O que pode evoluir sem nova aprovação
- Dados reais (API, GeoIP, buildWorldMap) — nunca frozen
- Conteúdo analítico do drawer
- KPI metrics calculados
- Thresholds de risk levels

---

## 13. ARTEFACTO DE PRODUÇÃO (R8C)

```
BUILD_EXIT_CODE   = 0
BUILD_DURATION    = 2.70s (vite)
NEW_JS_BUNDLE     = index-CTGkQfdy.js  (460.23 kB / gzip 143.66 kB)
NEW_CSS_BUNDLE    = index-Bwk2Rgbn.css (13.79 kB / gzip 3.28 kB)
DIST_INDEX_HASH   = 7f2b69875ad3b7a0ef685563c9af0a7c
SOURCE_DIST_MATCH = YES
BUNDLE_MATCH      = YES
SEC003B           = 42/42 PASS
```

---

## 14. NOTA OPERACIONAL — DISCO

```
DISK_USAGE = 99% (1.5 GB livres)
```

Acção recomendada antes do próximo build:
```bash
# Limpeza de logs antigos (não PM2, não backend)
journalctl --vacuum-size=500M
find /var/log -name "*.gz" -mtime +7 -delete
npm cache clean --force  # em admin-portal
```

---

## 15. SEC-RUNTIME-02 — SCROLL OWNERSHIP CONTRACT (Adendo)

**Data:** 2026-07-12  
**Status:** Obrigatório — complementa R8B sem alterar baseline visual

### Regra arquitectural

```
THE SECURITY CENTER MUST PRESERVE ACCESS TO ALL CONTENT BELOW THE MAP-FIRST
VIEWPORT THROUGH THE OFFICIAL PRIMARY VERTICAL SCROLL OWNER.

MAP-FIRST MUST NOT MEAN FIRST-VIEWPORT-ONLY.
```

### Primary scroll owner

```
PRIMARY_SCROLL_OWNER = main.admin-main--soc
  (AdminLayout.jsx — overflow: auto, flex: 1)
```

### Patch SEC-RUNTIME-02 (socLayout.css)

| Selector | Antes (R8) | Depois (SEC-RUNTIME-02) |
|----------|------------|-------------------------|
| `.security-soc-page` | `height: calc(100vh - 38px); overflow: hidden` | `min-height: calc(100vh - 38px - 0.65rem)` |
| `.soc-intelligence-hub` | `flex: 1; min-height: 0; overflow: hidden` | `flex: 1 1 auto; min-height: calc(...)` |
| `.soc-workspace-row` | `flex: 1; min-height: 0` | `flex: 1 1 auto; min-height: calc(...)` |

**Root cause:** R8 MAP-FIRST introduziu clipping em `.security-soc-page` que impedia scroll até SEC-19 e blocos inferiores.

### Map wheel scope

```
MAP_WHEEL_SCOPE = viewportRef (soc-map-viewport only)
GLOBAL_WHEEL_PREVENT_DEFAULT = NO
WHEEL fora do mapa → scroll da página via main
WHEEL sobre o mapa → zoom cartográfico (baseline R8B)
```

### Drawer scroll lock

```
DRAWER_SCROLL_LOCK_BEHAVIOR = NONE
SocAnalyticsDrawer não altera document.body.style.overflow
ESC / close button → sem scroll lock residual
```

### Conteúdo inferior preservado

- SIMULADOR SEMANAL SEC-19 (`.soc-legacy-section`)
- Governança SEC e operações avançadas
- Todos os blocos existentes — **não removidos, não movidos**

---

*Documento gerado automaticamente — SEC-VISUAL-INTELLIGENCE-003B-R8C*  
*Adendo SEC-RUNTIME-02 — 2026-07-12*  
*Não modificar documentação histórica R4–R8A.*
