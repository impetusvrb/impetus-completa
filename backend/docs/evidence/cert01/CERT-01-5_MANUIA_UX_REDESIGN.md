# CERT-01-5 — UX-MANUIA-001 Redesign Mobile ManuIA

**Data:** 2026-06-23  
**Tipo:** UX/UI (sem alteração de backend, APIs, IA ou WebRTC)  
**Escopo:** ManuIA hub (`/app/manutencao/manuia`) + embed Campo + Assistência ao Vivo

---

## 1. Auditoria UX — problemas (antes)

| # | Problema | Impacto |
|---|----------|---------|
| P1 | KPIs Runtime antes das ações | Técnico rola antes de agir |
| P2 | Cognitive Core alto no Layout | ~120px consumidos no topo |
| P3 | 6+ abas + toolbar com botões disabled | Ruído visual mobile |
| P4 | Câmera: área preta sem contexto | Incerteza do utilizador |
| P5 | Erros de câmera fragmentados | Mensagens duplicadas |
| P6 | Copiloto abaixo de muitos painéis | Scroll excessivo pós-câmera |
| P7 | Sem entrada rápida QR/upload/pesquisa | Fricção em campo |

**Estimativa scroll para «Iniciar assistência» (antes):** ~1400–2200 px (header + Cognitive + KPIs + abas + título + toolbar disabled + placeholder).

---

## 2. Componentes reorganizados

| Componente | Alteração |
|------------|-----------|
| `ManuiaActionCenter.jsx` | **NOVO** — Centro de Ação (4 tiles) |
| `ManuiaOperationalKpiStrip.jsx` | Painel recolhível «Runtime ManuIA ▼» |
| `CognitiveCompactPresence.jsx` | Variante `manuia` — banner compacto + Expandir |
| `Layout.jsx` | Passa `variant="manuia"` em rotas ManuIA |
| `ManuIA.jsx` | Ordem: Ação → abas mobile → Runtime; abas desktop preservadas |
| `LiveSessionStatus.jsx` | **NOVO** — status unificado + erro câmera |
| `LiveTechnicalAssistanceModule.jsx` | Fluxo progressivo; controles só após sessão |
| `ManuIA.css` | Centro de ação, runtime, tabs mobile/desktop |
| `LiveTechnicalAssistance.module.css` | Hero CTA, placeholder, ordem painéis mobile |

---

## 3. Antes × Depois

### Prioridade 1 — Centro de Ação
- **Antes:** Pesquisa só na aba «Pesquisa», live na aba «Assistência».
- **Depois:** 4 tiles imediatos após header: Pesquisa | Ao vivo | Upload | Código/QR.

### Prioridade 2 — Runtime
- **Antes:** 5 cards KPI sempre visíveis.
- **Depois:** Toggle «Runtime ManuIA ▼» recolhido no mobile (resumo inline).

### Prioridade 3 — Cognitive Core
- **Antes:** Faixa completa (identidade + resumo + link).
- **Depois:** `IMPETUS Cognitive Core · ● Dados reais · Abrir Ecossistema > · Expandir`.

### Prioridade 4–7 — Assistência ao Vivo
- **Antes:** 10+ botões na toolbar (muitos disabled).
- **Depois:** Hero «Iniciar assistência» → toolbar só quando `assistanceOn`; avançado em «Mais».

### Prioridade 5 — Placeholder câmera
- **Antes:** Caixa escura genérica.
- **Depois:** Ícone + «Câmera pronta» + instrução clara.

### Prioridade 6 — Erros
- **Antes:** `statusBar` + `errorBanner` + `speechError` separados.
- **Depois:** `LiveSessionStatus` único com retry + alterar câmera.

### Prioridade 8 — Ordem copiloto
- **Mobile:** Vídeo → Copiloto → Resultado → Fontes → Ações → Orientação (`order` CSS).

---

## 4. Evidências responsivas

Breakpoints auditados em CSS:

| Largura | Ficheiro | Verificação |
|---------|----------|-------------|
| 360 px | `ManuIA.css` @767, @390 | Tiles 2 col; abas «Mais» |
| 390 px | `ManuIA.css` @390 | Abas secundárias full-width |
| 412 px | `LiveTechnicalAssistance.module.css` @767 | Toolbar 2 col; chat compacto |
| Tablet 768+ | `min-width: 768px` | 4 tiles; abas desktop completas |
| Desktop | `manuia-tabs--desktop-only` | Layout original de abas |

**Estimativa scroll para «Iniciar assistência» (depois):** ~520–780 px (header compacto + 4 tiles + aba Ao vivo + hero CTA).

**Redução estimada:** ~55–65% menos scroll até ação principal.

---

## 5. Regressões funcionais

| Fluxo | Status |
|-------|--------|
| Pesquisa equipamento | Preservado |
| `research-equipment` API | Inalterado |
| Live `getUserMedia` | Inalterado (UX-MANUIA fix anterior) |
| `analyze-frame` / `chat` / `save-session` | Inalterado |
| Gestão Ativos / Gêmeo / Biblioteca | Abas secundárias «Mais» (desktop: abas completas) |
| QR/Código | Novo UX — dispara mesma `handleSearch` |

**Backend / APIs / IA:** zero alterações.

---

## 6. Matriz funcional

Entradas ManuIA em `FUNCTIONAL_MATRIX.json` anotadas com `UX-MANUIA-001` (2026-06-23).

---

## 7. Deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend
```

*Nota: build global pode exigir correção pré-existente `pulseCognitive` em `api.js`.*

---

## 8. Checklist aceitação UX-MANUIA-001

- [x] Centro de Ação visível sem scroll estatístico antes
- [x] Runtime recolhível no mobile
- [x] Cognitive Core compacto em rotas ManuIA
- [x] Live assistance progressiva (sem botões disabled pré-sessão)
- [x] Placeholder câmera contextual
- [x] Componente único de status/erro
- [x] Copiloto imediatamente abaixo do vídeo (mobile)
- [x] Responsividade 360–412 + tablet + desktop
- [x] Matriz funcional atualizada
- [x] Certificação CERT-01-5
