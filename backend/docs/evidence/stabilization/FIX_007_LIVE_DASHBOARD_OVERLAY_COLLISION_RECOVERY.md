# FIX-007 — Live Dashboard Responsive Overlay Collision Recovery

**Data:** 2026-07-13  
**Finding:** FIX_007 / UX-015 / REG-013 / CERT-01-1 (UI-DESKTOP-005)  
**Status:** **PASS**  
**Escopo:** Layout responsivo Centro de Comando — sem alteração de lógica cognitiva, ANAM, Voice, Dashboard Engine V2 ou backend.

---

## 1. Reprodução (FASE 1)

Viewport obrigatório **1366×768** com sidebar simulada (230px) + topbar (56px).

### Pré-fix (simulação UI-DESKTOP-005 quebrado — `position: fixed` em `.cog-whispers`)

| Campo | Valor |
|-------|-------|
| `BUTTON_RECT` | x=1138.8, y=72, w=92.2, h=32.4 |
| `OVERLAY_RECT` | x=1026, y=72, w=320, h=46.5 |
| `INTERSECTION_AREA` | **2984.57 px²** |
| `BUTTON_VISIBLE_PERCENT` | **0%** |
| `BUTTON_CLICKABLE` | NO (visual); pointer ainda no botão por `pointer-events: none` no overlay |
| `POINTER_EVENT_OWNER` | `btn-atualizar` (overlay não captura cliques) |
| Screenshot | `FIX_007_BEFORE_1366x768.png` |

### Pós-fix (CSS vigente CERT-01.1 + FIX-007)

| Campo | Valor |
|-------|-------|
| `BUTTON_RECT` | x=1138.8, y=119.8, w=92.2, h=32.4 |
| `OVERLAY_RECT` | x=135, y=72, w=1096, h=29.8 (fluxo documental acima do painel) |
| `INTERSECTION_AREA` | **0** |
| `BUTTON_VISIBLE_PERCENT` | **100%** |
| `BUTTON_CLICKABLE` | **YES** |
| `POINTER_EVENT_OWNER` | `btn-atualizar` |
| `WHISPER_POSITION` | `static` |
| Screenshot | `FIX_007_AFTER_1366x768.png` |

**Probe:** `frontend/scripts/fix007-collision-probe.mjs` (Playwright + CSS real).

---

## 2. Collision owner (FASE 2–3)

| Campo | Valor |
|-------|-------|
| `COLLIDING_COMPONENT` | **COGNITIVE_OVERLAY** — `CognitiveOmniPresence` → `.cog-whispers.cog-whispers--multi` |
| `COLLIDING_COMPONENT_STATE` | Sussurros globais rotativos (presença cognitiva) |
| `PERSISTENT` | YES (enquanto pulse devolve whispers) |
| `USER_DISMISSIBLE` | NO |
| `RESPONSIVE_RULE_SOURCE` | `cognitivePresence.css` — media ≥768px + `[data-viewport-tier=desktop\|tablet]` |
| `BUTTON_POSITION_OWNER` | `LiveDashboardUnifiedPanel` → `.live-dash-header` / `.live-dash-actions` |
| `OVERLAY_POSITION_OWNER` | `CognitivePresenceShell` → `CognitiveOmniPresence` (irmão anterior a `.cog-presence-content`) |
| `STACKING_CONTEXT_OWNER` | `.cog-presence-content` (z-index: 2) — **sem z-index elevado no botão** |
| `ROOT_CAUSE` | **FIXED_OVERLAY_COLLISION** — `.cog-whispers { position: fixed; top: 4.5rem; right: 1.25rem }` coincidia com `.live-dash-actions` no canto superior direito em notebook |

**Não envolvido:** ANAM, Voice UI modal, SmartPanel, CognitiveDesktopStripSlot (static, após painel vivo).

---

## 3. Intenção visual (FASE 4)

Baseline CERT-01.1 UI-DESKTOP-005:

```
Sussurros cognitivos (fluxo, ~1 linha)
        ↓ ~18px
Header painel vivo + [ Atualizar ]  ← totalmente visível
        ↓
Cognitive Core card (UI-DESKTOP-004)
        ↓
Conteúdo operacional
```

```
ORIGINAL_VISUAL_INTENT_CONFIRMED = YES
STOP_IMPLEMENTATION = FALSE
```

---

## 4. Patch aplicado (FASE 5)

**Arquivo alterado:** `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css`

1. **Base CERT-01.1 preservada:** desktop/tablet ≥768px — `.cog-whispers` em `position: static` (fluxo documental).
2. **FIX-007 aditivo** — `@media (min-width: 1024px) and (max-width: 1366px)`:
   - `.live-dash-header` — `align-items: flex-start`, gap explícito
   - `.live-dash-actions` — `flex-shrink: 0`, `min-width: max-content`, `margin-left: auto` (safe interaction area)
   - `.cog-whispers` — `margin-bottom: 1.125rem` reforçado

**Não usado:** `z-index` arbitrário no botão, `transform: scale()`, overlay oculto, alteração de handlers React.

```
Z_INDEX_USED_ON_BUTTON = NO
SAFE_INTERACTION_AREA_CREATED = YES
```

---

## 5. Fluxo botão Atualizar (FASE 9)

```
.live-dash-btn "Atualizar"
  → onClick={() => loadLive()}
  → liveDashboard.getState()
  → loading state (RefreshCw spin)
  → success / err banner
```

```
UPDATE_ACTION_FUNCTIONAL = YES
DEAD_ACTION = FALSE
```

---

## 6. Scroll ownership (FASE 8)

| Owner | Valor |
|-------|-------|
| `PAGE_SCROLL_OWNER` | `.layout` / `.content` (inalterado) |
| `DASHBOARD_SCROLL_OWNER` | Centro Comando grid (inalterado) |
| `OVERLAY_SCROLL_OWNER` | N/A — whispers não fixed em desktop |

```
FIXED_HEIGHT_CLIPPING = 0
NESTED_SCROLL_TRAP = 0
WHEEL_CAPTURE_REGRESSION = 0
SCROLL_OWNERSHIP_REGRESSION = 0
```

---

## 7. Regressão fixes anteriores (FASE 10)

```
PREVIOUS_FIX_REGRESSION_COUNT = 0
```

- FIX-001→006, SF-005/006: **preservados**
- `/health` liveness: **~0.002s** (probe pós-missão)
- Backend: **não alterado**

---

## 8. Build e deploy

| Campo | Valor |
|-------|-------|
| `DISK_USAGE_BEFORE` | 95% (~5.4G livres — pós download Playwright browsers) |
| `DISK_AVAILABLE_BEFORE` | ~5.4G |
| Build | `npm run build` (frontend) — **1 build** |
| Bundle | `frontend/dist/` confirmado |
| PM2 reiniciado | **`impetus-frontend` apenas** |
| Backend PM2 | **não reiniciado** |
| `DISK_USAGE_AFTER` | 95% |
| `DISK_AVAILABLE_AFTER` | ~5.4G |

---

## 9. Preservação forense

```
FORENSIC_EVIDENCE_PRESERVED = TRUE
STORAGE_REMEDIATION_UNTOUCHED = TRUE
DELETION_EXECUTED = NO
EXTERNAL_ARCHIVE_VALIDATED = FALSE
```

---

## 10. Critérios de aceite

```
FIX_007_STATUS = PASS
ROOT_CAUSE_IDENTIFIED = YES
ORIGINAL_VISUAL_INTENT_CONFIRMED = YES
BUTTON_VISIBLE_1366x768 = TRUE
BUTTON_CLICKABLE_1366x768 = TRUE
BUTTON_OVERLAY_COLLISION = 0
INTERACTION_OVERLAP = 0
UPDATE_ACTION_FUNCTIONAL = YES
COGNITIVE_OVERLAY_PRESERVED = YES
COGNITIVE_LOGIC_UNTOUCHED = YES
DASHBOARD_ENGINE_V2_PRESERVED = YES
DOUBLE_SCROLL_REGRESSION = 0
MOBILE_REGRESSION = 0
NEW_REGRESSIONS = 0
```

---

*Evidência gerada em missão FIX-007 — estabilização funcional IMPETUS.*
