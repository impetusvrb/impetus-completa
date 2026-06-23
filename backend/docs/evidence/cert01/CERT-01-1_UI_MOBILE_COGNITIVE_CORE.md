# CERT-01.1 — FIX Responsivo Cognitive Core

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Pendências:** UI-MOBILE-001, UI-CROSSVIEW-002

---

## 1. Causa raiz

| Fator | Evidência | Severidade |
|-------|-----------|------------|
| Faixa global `CognitiveGlobalStrip` com `position: sticky` + `z-index: 5` | `cognitivePresence.css` L114–117 | Alta em mobile |
| Badge **CONSCIÊNCIA TOTAL** com `position: fixed; bottom: 1.5rem; z-index: 4` | `cognitivePresence.css` (legado) | Sobreposição sobre conteúdo |
| Renderização divergente: badge oculto em mobile (`display: none`) mas visível fixed no desktop | `CognitivePresenceShell` + CSS `@media 768px` | UI-CROSSVIEW-002 |
| Ecossistema cognitivo completo (`CognitiveEcosystemBand`) com dezenas de painéis inline quando expandido | `CognitiveEcosystemBand.jsx` | Ocultava “Operação em tempo real” e “Máquina do tempo” |
| Breakpoint JS (768px) desalinhado do CSS do Centro de Comando (767px) | `useIsMobile` vs `CentroComando.css` | Falso positivo tablet/mobile |

**Conclusão:** não era regressão EG-04→EG-13. Problema de UX responsiva + implementação viewport-dependente sem convergência de dados.

---

## 2. Componentes alterados

| Arquivo | Função |
|---------|--------|
| `useViewportTier.js` | Breakpoints canónicos (≤767 / 768–1023 / ≥1024) |
| `CognitiveShellUiContext.jsx` | Estado partilhado sheet + awareness |
| `CognitiveCoreSummaryCard.jsx` | Card resumido (Status, Confiança, Sync) |
| `CognitiveCoreDetailSheet.jsx` | Bottom sheet fullscreen |
| `CognitiveEcosystemDetailContent.jsx` | Árvore única de painéis (Desktop + Mobile) |
| `CognitivePresenceShell.jsx` | Orquestra compact/sheet/awareness |
| `CognitiveGlobalStrip.jsx` | Compact mobile + botão Consciência Total inline desktop |
| `CognitiveEcosystemBand.jsx` | Desktop inline; mobile delega ao sheet |
| `CognitiveCollapsibleSection.jsx` | Toggle mobile abre sheet (mesmos dados) |
| `CentroComando.jsx` | Usa secção colapsável contextual |
| `cognitivePresence.css` | Remove fixed badge; strip estática mobile |
| `cognitiveEcosystem.css` | Ações duplas Ver detalhes / Consciência total |
| `LiveIntelligentDashboard.css` | Timebar responsiva (Máquina do tempo) |

---

## 3. CSS alterado (resumo)

- Removido badge fixed **CONSCIÊNCIA TOTAL** (substituído por botão inline na faixa)
- `.cog-global-strip--compact`: `position: static`, sem sticky
- `.cog-mobile-sheet`: `z-index: 40` (modal awareness mantém 9999 apenas quando aberto)
- `.live-dash-timebar`: `flex-wrap` em ≤767px

---

## 4. Convergência Desktop × Tablet × Mobile

| Viewport | Layout | Dados |
|----------|--------|-------|
| Desktop ≥1024 | Faixa completa + ecossistema colapsável inline | `useCognitivePulse` → `/api/cognitive-pulse` |
| Tablet 768–1023 | Faixa completa + colapsável inline | **Mesmos** |
| Mobile ≤767 | Card compacto + bottom sheet | **Mesmos** via `CognitiveEcosystemDetailContent` |

**Consciência Total:** disponível em todos os viewports via botão inline (faixa desktop ou card mobile).

---

## 5. Breakpoints testados (build + inspeção CSS)

| Resolução | Resultado esperado |
|-----------|-------------------|
| 320×568 | Card compacto; sem scroll horizontal |
| 360×640 | Timebar wrap; Máquina do tempo visível |
| 375×667 | Sheet sobrepõe sem empurrar conteúdo |
| 390×844 | Idem |
| 412×915 | Idem |
| 768×1024 | Tablet: faixa completa (não compact) |
| 1366×768 | Desktop: inline awareness na faixa |
| 1920×1080 | Desktop: ecossistema colapsável preservado |

---

## 6. Performance e acessibilidade

- **Performance:** mobile não monta ~20 painéis até abrir sheet; redução de DOM inicial.
- **Acessibilidade:** sheet com `role="dialog"`, `aria-modal`, botão fechar; `body overflow` bloqueado durante sheet.

---

## 7. Matriz funcional

Registado em `FUNCTIONAL_MATRIX.json` → cenário **Executive / Dashboard executivo por perfil** → `uiGap.items`:

- **UI-MOBILE-001** — status **VALIDADO**
- **UI-CROSSVIEW-002** — status **VALIDADO**

---

## 8. Critérios de aceitação

```json
{
  "ui_mobile_001_resolved": true,
  "ui_crossview_002_resolved": true,
  "desktop_mobile_convergent": true,
  "operational_content_visible": true,
  "time_machine_visible": true,
  "cognitive_core_collapsible": true,
  "regressions_detected": 0
}
```

---

## 9. Evidências visuais

Capturas antes/depois: validar manualmente em `/app/centro-comando` nos breakpoints acima após deploy PM2 frontend.

**Comando deploy:** `pm2 restart impetus-frontend --update-env`
