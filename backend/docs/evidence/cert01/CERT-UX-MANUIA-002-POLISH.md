# CERT-UX-MANUIA-002 — Polimento Final da Experiência (Mobile-First)

**Data:** 2026-07-01  
**Escopo:** Frontend / CSS / Layout / Responsividade — **sem alteração de backend, APIs, IA, WebRTC ou lógica operacional**

---

## 1. Resumo executivo

Fase de refinamento visual sobre a base UX-MANUIA-001/001A. Eliminação de navegação duplicada, unificação da pesquisa, Runtime ultra-compacto, Cognitive Core menos intrusivo no mobile, compactação de espaçamento e consistência visual do Centro de Ação.

---

## 2. Componentes refinados

| Componente | Ficheiro | Alteração |
|---|---|---|
| ManuIA (página) | `frontend/src/pages/ManuIA.jsx` | Remoção tabs mobile duplicadas; hierarquia Título→Centro→Runtime→Conteúdo→Ferramentas avançadas |
| Centro de Ação | `frontend/src/features/manutencao-ia/ManuiaActionCenter.jsx` | Labels unificados; estado activo; feedback táctil |
| Runtime KPI | `frontend/src/features/manutencao-ia/ManuiaOperationalKpiStrip.jsx` | Linha única recolhida (● Online · N máquinas · N sessões) |
| Cognitive Core | `CognitiveCompactPresence.jsx` + `.css` | Banner 1 linha no mobile; tap para expandir |
| Estilos ManuIA | `frontend/src/pages/ManuIA.css` | Espaçamento, tiles, runtime, ferramentas avançadas |

---

## 3. ETAPAs implementadas

### ETAPA 1 — Navegação duplicada eliminada
- **Removido:** barra mobile `Pesquisa | Ao vivo | Mais` (duplicava o Centro de Ação).
- **Mantido:** Centro de Ação como **único ponto de entrada** para Pesquisa, Ao vivo, Upload e QR.
- **Desktop:** barra de tabs completa preservada (`manuia-tabs--desktop-only`).

### ETAPA 2 — Pesquisa unificada
- Tile: `Pesquisa` (antes: «Pesquisa por texto»).
- **Mobile:** título «Pesquisar equipamento» e descrição ocultos — apenas campo + botão.
- **Desktop:** título e descrição mantidos.

### ETAPA 3 — Runtime extremamente compacto
- Recolhido: `● Online · 10 máquinas · 4 sessões` numa linha (~32px altura).
- Expandido: KPIs completos inalterados.

### ETAPA 4 — Cognitive Core menos intrusivo
- Mobile: uma linha (`● Cognitive Core · Ecossistema >`).
- Detalhes só ao toque (expandir).
- Link ao Ecossistema Cognitivo preservado.

### ETAPA 5 — Hierarquia visual
```
ManuIA (título)
  → Centro de Ação
  → Runtime
  → Área principal (pesquisa / ao vivo / módulo)
  → Resultados
  → Atalhos
  → Ferramentas avançadas (mobile, colapsável)
```

### ETAPA 6 — Compactação de espaçamento
| Token | Antes (mobile) | Depois (mobile) |
|---|---|---|
| `.manuia` gap | 12–24px | 8–10px |
| `.manuia-block` padding | 20px | 12px |
| `.manuia-block--search` padding | 24px | 12px |
| Action tile min-height | 88px | 76px |
| Runtime toggle padding | 10px 12px | 6px 10px |
| Search input min-height | 56px | 48px |

### ETAPA 7 — Centro de Ação
- Grid 2×2 uniforme; mesma altura (`min-height: 76px`); gap 6px.
- Estados: hover, active (`--active`), `:active` scale(0.98).

### ETAPA 8 — Consistência visual
- Bordas 4–6px; tokens `--cyan`, `--green`, `--border-subtle`.
- Tipografia Rajdhani (títulos) + Share Tech Mono (runtime, labels).

### ETAPA 9/10 — Mobile / Desktop
- Breakpoints: 767px (mobile), 768px+ (desktop tabs + grid 4 colunas).
- Ferramentas avançadas: só mobile; desktop usa tabs.

---

## 4. Redução estimada de scroll (viewport 390×844)

| Secção | Altura aprox. antes | Depois | Δ |
|---|---|---|---|
| Tabs mobile (Pesquisa/Ao vivo/Mais) | ~88px | 0px | **−88px** |
| Lead «O que fazer agora?» | ~28px | 0px | **−28px** |
| Runtime recolhido | ~44px | ~32px | **−12px** |
| Cognitive Core | ~52px | ~28px | **−24px** |
| Título pesquisa + desc (mobile) | ~72px | 0px | **−72px** |
| Gaps/padding global | — | — | **~−40px** |
| **Total estimado** | | | **~−264px (~31% menos scroll inicial)** |

---

## 5. Confirmação — nenhuma funcionalidade alterada

| Área | Alterado? |
|---|---|
| Backend / APIs | ❌ Não |
| `manutencaoIa.*` | ❌ Não |
| WebRTC / Live Assistance | ❌ Não |
| Pesquisa / diagnóstico / sessões | ❌ Não (mesmos handlers) |
| Gestão Ativos, Gêmeo Digital, Biblioteca | ❌ Não (mesmos módulos) |
| IA / Copiloto | ❌ Não |
| Rotas / permissões | ❌ Não |

Apenas: ordem visual, CSS, labels de UI, remoção de **controles redundantes** (não de capacidades).

---

## 6. Deploy

```
npm run build   → ✓ 2026-07-01 ~15:07 UTC
pm2 restart impetus-frontend → ✓
Bundle: ManuIA-D1lDAdou.js, ManuIA-OpYVeP1i.css, Layout-CgnvkEIC.js
```

---

## 7. Validação pendente (utilizador)

- [ ] Hard refresh smartphone em `/app/manutencao/manuia`
- [ ] Confirmar: sem tabs duplicadas; pesquisa com entrada única
- [ ] Runtime uma linha recolhida
- [ ] Cognitive Core discreto
- [ ] Desktop: tabs e funcionalidades intactas
- [ ] Screenshots antes/depois no dispositivo real

---

## 8. Ficheiros tocados

```
frontend/src/pages/ManuIA.jsx
frontend/src/pages/ManuIA.css
frontend/src/features/manutencao-ia/ManuiaActionCenter.jsx
frontend/src/features/manutencao-ia/ManuiaOperationalKpiStrip.jsx
frontend/src/features/dashboard/centroComando/cognitiveEcosystem/CognitiveCompactPresence.jsx
frontend/src/features/dashboard/centroComando/cognitiveEcosystem/cognitiveCompactPresence.css
```
