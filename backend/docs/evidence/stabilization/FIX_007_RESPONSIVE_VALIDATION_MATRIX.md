# FIX-007 — Responsive Validation Matrix

**Data:** 2026-07-13  
**Método:** Playwright headless + fixture DOM (CSS tokens + `cognitivePresence.css` + `LiveIntelligentDashboard.css`)  
**Script:** `frontend/scripts/fix007-collision-probe.mjs`

---

## Matriz obrigatória

| Viewport | Tier | Botão visível | Botão clicável | Overlay íntegro | Scroll duplo | Colisão (px²) | Screenshot |
|----------|------|---------------|----------------|-----------------|--------------|---------------|------------|
| **1366×768** | desktop | ✅ 100% | ✅ YES | ✅ static flow | ✅ 0 | **0** | `FIX_007_AFTER_1366x768.png` |
| **1440×900** | desktop | ✅ 100% | ✅ YES | ✅ static flow | ✅ 0 | **0** | `FIX_007_AFTER_1440x900.png` |
| **1920×1080** | desktop | ✅ 100% | ✅ YES | ✅ static flow | ✅ 0 | **0** | `FIX_007_AFTER_1920x1080.png` |
| **360×800** | mobile | ✅ (coluna) | ✅ YES | ✅ fixed bottom | ✅ 0 | **0*** | `FIX_007_AFTER_360x800.png` |
| **390×844** | mobile | ✅ (coluna) | ✅ YES | ✅ fixed bottom | ✅ 0 | **0*** | `FIX_007_AFTER_390x844.png` |

\* Mobile: header em coluna (`flex-direction: column` ≤767px); sussurros fixos no rodapé — sem interseção com botão Atualizar no probe de elemento `.cog-whispers__item` vs botão (container fixed esticado por top+bottom é artefacto de medição do wrapper; comportamento mobile **inalterado** vs baseline CERT-01.1).

---

## Baseline pré-fix (1366×768 simulação fixed)

| Métrica | Valor |
|---------|-------|
| Colisão | **2984.57 px²** |
| Visibilidade botão | **0%** |
| Whisper position | `fixed` |
| Screenshot | `FIX_007_BEFORE_1366x768.png` |

---

## Critérios

```
BUTTON_OVERLAY_COLLISION = 0
DOUBLE_SCROLL_REGRESSION = 0
MOBILE_REGRESSION = 0
```

---

## Storage observation (missão)

```
DISK_USAGE ≈ 95%
DISK_AVAILABLE ≈ 5.4G
journalctl --disk-usage ≈ 1000.3M
DISK_VARIATION_EXPLAINED = PARTIAL
```

Sem cleanup / vacuum / rm executados.

---

*Screenshots em `backend/docs/evidence/stabilization/`.*
