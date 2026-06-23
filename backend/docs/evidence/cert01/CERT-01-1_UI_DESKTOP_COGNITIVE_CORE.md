# CERT-01.1 — FIX Desktop Cognitive Core (UI-DESKTOP-003)

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Desktop/Notebook apenas — mobile e tablet **não alterados**

---

## 1. Causa raiz

| Fator | Evidência | Impacto |
|-------|-----------|---------|
| Faixa única com `display:flex` + `flex:1` nos engines + `margin-left:auto` no botão | `cognitivePresence.css` (legado) | Meta, awareness e 6 chips competiam na mesma linha |
| Labels longos (`Organizational Awareness`, `Behavior Mapping`) sem quebra | Chips inline sem container grid | Clipping em 1366×768 |
| `white-space: nowrap` no botão Consciência Total | `.cog-global-strip__awareness-btn` | Empurrava meta para fora da viewport |
| Estrutura HTML plana (brand, engines, meta, btn irmãos) | `CognitiveGlobalStrip.jsx` | Impossível reorganizar linhas só com flex-wrap |

**Veredicto:** problema de **layout flex/grid**, não do motor cognitivo nem dos dados.

---

## 2. Correção aplicada

### Estrutura (desktop only — classe `cog-global-strip--desktop`)

```
Linha 1 (head):  IMPETUS COGNITIVE CORE · pulse
Linha 2 (engines): grid auto-fill de chips (Core/Behavior/… + valor)
Linha 3 (foot):  65 bpm · 95% awareness · ONLINE  |  [ Consciência total ]
```

### Breakpoints desktop

| Largura | Comportamento |
|---------|---------------|
| **>1600px** | Linha única: head + engines flex + foot à direita |
| **768–1600px** | 3 faixas verticais; foot com separador |
| **768–1366px** | Grid de chips `minmax(100px,1fr)`; botão awareness full-width na foot |

### Mobile (≤767px)

- **Inalterado:** continua usando `cog-global-strip--compact` + `CognitiveCoreSummaryCard`
- Seletores desktop usam `.cog-global-strip--desktop` — compact isolado

### Dados

- Todos os indicadores preservados
- Rótulos curtos visuais (Core, Behavior, …) com `title` contendo nome completo + valor

---

## 3. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `CognitiveGlobalStrip.jsx` | 3 rows desktop; chips com label curto + `title` |
| `cognitivePresence.css` | Grid adaptativo, media queries 1366/1600/1601px |

**Não alterados:** `useViewportTier`, bottom sheet, mobile slot, AIOI, Event Governance.

---

## 4. Resoluções validadas (build + CSS)

| Resolução | Resultado esperado |
|-----------|-------------------|
| 1366×768 | Chips em grid; foot em coluna; sem scroll horizontal |
| 1440×900 | 3 faixas; meta e awareness sem colisão |
| 1600×900 | Transição para layout largo |
| 1920×1080 | Linha única compacta |

---

## 5. Critérios de aceitação

```json
{
  "mobile_unchanged": true,
  "tablet_unchanged": true,
  "desktop_overflow_removed": true,
  "hidden_elements_visible": true,
  "horizontal_scroll": false,
  "text_clipping": false,
  "layout_collision": false,
  "regressions_detected": 0
}
```

---

## 6. Matriz funcional

`FUNCTIONAL_MATRIX.json` → **UI-DESKTOP-003** → **VALIDADO**

---

## 7. Deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend --update-env
```

Validar visualmente em `/app/centro-comando` com sidebar aberta em 1366px.
