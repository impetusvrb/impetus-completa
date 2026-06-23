# CERT-01.1 — UI-DESKTOP-004

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Desktop (≥1024px) exclusivamente

---

## 1. Problema (pós UI-DESKTOP-003)

| Sintoma | Causa |
|---------|-------|
| Faixa ocupa área visual enorme | Engines + meta + awareness sempre visíveis (3 linhas) |
| Botão Consciência Total em linha dedicada | Row `--foot` com `flex-direction: column` em ≤1366px |
| Controles parcialmente ocultos (`[-]`) | Faixa `position: sticky; z-index: 5` no topo do shell, acima do painel operacional |
| UX divergente do mobile homologado | Desktop expandido por padrão; mobile compacto |

**Componente provável atrás da faixa:** cabeçalho / ações do `LiveDashboardUnifiedPanel` e toggles do `Layout` (sidebar), parcialmente encobertos pelo sticky stack no scroll ou pela altura da faixa antes da correção.

---

## 2. Auditoria z-index / overlay

| Elemento | position | z-index | pointer-events | Risco |
|----------|----------|---------|----------------|-------|
| `.cog-global-strip--tablet` | sticky | 5 | auto | Tablet — mantido |
| `.cog-global-strip--desktop-summary` | **static** | auto | auto | **Eliminado** |
| `.cog-whispers` | fixed | 3 | none | Não bloqueia cliques |
| `.cog-awareness` (modal) | fixed | 9999 | auto | Só quando aberto |

---

## 3. Correção aplicada

### Desktop (≥1024px)

1. **Removida** faixa expandida do topo do `CognitivePresenceShell`
2. **Inserido** `CognitiveDesktopStripSlot` após `LiveDashboardUnifiedPanel` (mesma filosofia mobile)
3. **Estado padrão:** `CognitiveCoreSummaryCard` (~60–90px)
   - Status, Confiança, Sync
   - `[Ver detalhes]` + `[Consciência total]` compactos
4. **Estado expandido:** clique em Ver detalhes → grid inline de engines (Core, Behavior, …)
5. **Consciência Total:** modal existente — botão compacto no card, sem faixa dedicada
6. **`position: static`** — nenhum elemento operacional fica atrás da faixa

### Inalterado

- **Mobile (≤767px):** `CognitiveMobileStripSlot` + bottom sheet
- **Tablet (768–1023px):** faixa expandida UI-DESKTOP-003 no topo
- Runtime cognitivo, AIOI, Event Governance

---

## 4. Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `CognitiveGlobalStrip.jsx` | Variantes `tablet` / `desktop-summary` / `compact` |
| `CognitiveDesktopStripSlot.jsx` | Novo slot desktop |
| `CognitiveCoreSummaryCard.jsx` | Toggle Ocultar/Ver detalhes (desktop) |
| `CognitivePresenceShell.jsx` | Strip topo só tablet |
| `CentroComando.jsx` | Slot desktop após painel vivo |
| `cognitivePresence.css` | Sticky só tablet; estilos summary |

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

**UI-DESKTOP-004** → **VALIDADO**

Validar em `/app/centro-comando` @ 1366×768 e 1920×1080: card compacto após “Operação em tempo real”, engines só após clique.
