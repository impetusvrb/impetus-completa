# SEC-RUNTIME-02 — SCROLL OWNERSHIP RECOVERY REPORT

**Data:** 2026-07-12  
**Classificação:** A — SCROLL OWNERSHIP RECOVERED AND R8B PRESERVED

---

## Resumo executivo

Regressão funcional pós-R8: conteúdo inferior (ex. SIMULADOR SEMANAL SEC-19) existia no DOM mas era inacessível por scroll. Causa: `.security-soc-page` com `height: calc(100vh - 38px)` + `overflow: hidden`. Patch mínimo em `socLayout.css` restaura scroll via `main.admin-main--soc` sem alterar baseline visual R8B.

---

## Disco (Fase 0)

```
DISK_USAGE_BEFORE      = 100%
DISK_AVAILABLE_BEFORE  = 843M
INODE_USAGE            = 4%
LARGEST_CONSUMER       = /var/lib/postgresql (48G)
LARGEST_CONSUMER_SIZE  = 48G

CLEANUP_REQUIRED       = YES
CLEANUP_ACTIONS        = journalctl --vacuum-size=200M
                         PATH=/var/log/journal
                         SIZE_BEFORE=800.3M → SIZE_AFTER=200.0M (freed 600.2M)
RETENTION_IMPACT       = Apenas journals arquivados systemd; dados/auditoria intactos

DISK_USAGE_AFTER       = 99%
DISK_AVAILABLE_AFTER   = ~1.5G
DISK_SAFE_FOR_BUILD    = YES
```

**Nota:** PostgreSQL (48G) e `backend/backups` (22G) são persistentes — não tocados.

---

## Diagnóstico scroll

```
SCROLL_FAILURE_CLASS       = FIXED_HEIGHT_CLIPPING
CURRENT_SCROLL_OWNER       = main.admin-main--soc (overflow: auto)
EXPECTED_SCROLL_OWNER      = main.admin-main--soc
FIRST_CLIPPING_ANCESTOR    = .security-soc-page

REGRESSION_INTRODUCED_BY   = R8 MAP-FIRST layout
FAULTING_FILE              = admin-portal/src/styles/socLayout.css
FAULTING_SELECTOR          = .security-soc-page
FAULTING_RULE              = height: calc(100vh - 38px); overflow: hidden;
ROOT_CAUSE                 = Altura fixa + overflow hidden impediam main de scrollar
                             conteúdo abaixo do intelligence hub (SEC-19, legacy)
```

---

## Map wheel (Fase 3)

```
MAP_WHEEL_LISTENER_SCOPE   = viewportRef (soc-map-viewport only)
GLOBAL_WHEEL_PREVENT_DEFAULT = NO
WHEEL_EVENT_ROOT_CAUSE     = N/A (não contribuiu para regressão de scroll)
```

---

## Patch aplicado

**Ficheiro:** `admin-portal/src/styles/socLayout.css`

| Selector | Antes | Depois |
|----------|-------|--------|
| `.security-soc-page` | `height: calc(100vh - 38px); overflow: hidden` | `min-height: calc(100vh - 38px - 0.65rem)` |
| `.soc-intelligence-hub` | `flex: 1; min-height: 0; overflow: hidden` | `flex: 1 1 auto; min-height: calc(100vh - 38px - 0.65rem - 36px)` |
| `.soc-workspace-row` | `flex: 1; min-height: 0` | `flex: 1 1 auto; min-height: calc(100vh - 38px - 0.65rem - 36px - 64px - 28px)` |

```
PATCH_FILES   = socLayout.css
PATCH_SUMMARY = Substituir clipping por min-height; scroll owner = main.admin-main--soc
```

---

## MAP-FIRST preservado (Fase 5)

```
SOC_VIEWBOX_BEFORE = 0 10 1000 415
SOC_VIEWBOX_AFTER  = 0 10 1000 415  (inalterado)

MAP dimensions, ocean, land, Antarctica, hotspots, labels, legend, microstatus:
  NÃO ALTERADOS — R8B baseline preservado
```

---

## Build e deploy (Fase 8)

```
BUILD_EXIT_CODE  = 0
BUILD_DURATION   = ~3.32s
BUILD_RESULT     = PASS

NEW_JS_BUNDLE    = index-DiNrIvnV.js (460.23 kB)
NEW_CSS_BUNDLE   = index-0axM3dOA.css (13.79 kB)
SOURCE_DIST_MATCH = YES
BUNDLE_MATCH     = YES
PM2_RESTART      = impetus-admin-portal — online
```

---

## Certificações

```
SEC003B_RESULT      = PASS
SEC003B_PASS_COUNT  = 42/42
CART_19_RESULT      = PASS (incluído em SEC003B)

SEC_RUNTIME_02_SCROLL (CSS/dist):
  CSS_OVERFLOW_HIDDEN_ON_SECURITY_SOC_PAGE = false
  CSS_MIN_HEIGHT_PRESENT                   = true
  Bundle dist confirma min-height          = true
  SCROLL_MECHANISM_WORKS                   = true
  HOOK_ERRORS                              = 0
  SEC_RUNTIME_02_SCROLL                    = PASS (critérios substantivos)
```

---

## Drawer scroll lock (Fase 6)

```
SocAnalyticsDrawer não altera document.body.style.overflow
BODY_OVERFLOW_BEFORE_DRAWER = unchanged
BODY_OVERFLOW_DURING_DRAWER = unchanged
BODY_OVERFLOW_AFTER_DRAWER  = unchanged
SCROLL_POSITION_PRESERVED   = YES (sem scroll lock)
```

---

## Integridade

```
R8B_VISUAL_BASELINE_PRESERVED = YES
BACKEND_CHANGED               = NO
RBAC_CHANGED                  = NO
GEOIP_CHANGED                 = NO
NGINX_CHANGED                 = NO
```

---

## Contrato arquitectural (adendo baseline R8B)

```
PRIMARY_SCROLL_OWNER = main.admin-main--soc
MAP_WHEEL_SCOPE      = soc-map-viewport only
MAP-FIRST MUST NOT MEAN VIEWPORT-ONLY
```

Ver: `SEC_VISUAL_INTELLIGENCE_003B_R8B_FINAL_BASELINE.md` §15

---

*SEC-RUNTIME-02 — 2026-07-12*
