# CERT-01.1 — UI-DESKTOP-005

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Desktop ≥1024px — correção visual exclusiva

---

## 1. Componente identificado (auditoria DOM)

| Item | Detalhe |
|------|---------|
| **Elemento oculto** | Botão **Atualizar** (`RefreshCw` + label) |
| **Arquivo** | `frontend/src/features/dashboard/components/LiveDashboardUnifiedPanel.jsx` |
| **Classe CSS** | `.live-dash-actions` → `.live-dash-btn` |
| **Handler** | `onClick={() => loadLive()}` — **não alterado** |

| Item | Detalhe |
|------|---------|
| **Elemento sobrepositor** | Faixa de sussurros cognitivos rotativos |
| **Componente React** | `CognitiveOmniPresence` |
| **Arquivo** | `cognitiveEcosystem/CognitiveOmniPresence.jsx` |
| **Classe CSS** | `.cog-whispers.cog-whispers--multi` |
| **Mensagens** | Origem: `backend/src/services/organizationalPresenceEngine.js` — ex.: "Neural correlation em tempo real…", "Cognitive Core observando operação…" |

---

## 2. Causa raiz

```css
.cog-whispers {
  position: fixed;
  top: 4.5rem;
  right: 1.25rem;
  z-index: 3;
}
```

A faixa fixa no canto superior direito **coincide** com `.live-dash-actions` (também à direita no header do painel vivo). Resultado: botão Atualizar parcialmente encoberto e difícil de clicar em **1366×768**.

Não é regressão do Cognitive Core (UI-DESKTOP-004). É colisão entre overlay fixo de presença cognitiva e toolbar operacional.

---

## 3. Correção aplicada

**Estrutural (sem `transform`, margin negativa, z-index elevado ou novo `fixed`):**

Em `@media (min-width: 1024px)` + `[data-viewport-tier='desktop']`:

1. `.cog-whispers` → `position: static` (fluxo documental acima de `.cog-presence-content`)
2. `margin-bottom: 1.125rem` (~18px) entre faixa cognitiva e conteúdo operacional
3. `padding: 0 1.25rem` alinhado ao grid do Centro de Comando
4. `.live-dash-actions` com `flex-shrink: 0` — botão preserva área clicável

**Inalterado:**

- UI-DESKTOP-004 (Cognitive Core card)
- Mobile ≤767px (whispers fixos no rodapé)
- Tablet 768–1023px (whispers fixos no topo)
- Lógica React, APIs, handlers

---

## 4. Fluxo visual resultante (desktop)

```
Sussurros cognitivos (fluxo, ~1 linha)
        ↓ 18px
Header painel vivo + [ Atualizar ]  ← totalmente visível
        ↓
Cognitive Core card (UI-DESKTOP-004)
        ↓
Conteúdo operacional
```

---

## 5. Critérios de aceitação

```json
{
  "id": "UI-DESKTOP-005",
  "status": "VALIDADO",
  "mobile_unchanged": true,
  "tablet_unchanged": true,
  "cognitive_core_ui_004_preserved": true,
  "element_fully_visible": true,
  "element_clickable": true,
  "horizontal_scroll": false,
  "regressions_detected": 0
}
```

---

## 6. Validação

| Resolução | Esperado |
|-----------|----------|
| 1366×768 | Atualizar visível e clicável; sussurros acima sem overlap |
| 1920×1080 | Mesmo fluxo; espaçamento consistente |

Rota: `/app/centro-comando`

---

## 7. Arquivo alterado

- `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css`
