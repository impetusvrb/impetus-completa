# CERT-UX-MANUIA-002A — Lista Vertical de Ferramentas (Mobile)

**Data:** 2026-07-01  
**Escopo:** Apenas apresentação CSS/JSX do grupo de ferramentas no smartphone. **Nenhuma alteração de backend, APIs, rotas, IA ou WebRTC.**

---

## 1. Ajuste aplicado

No mobile (`max-width: 767px`), as cinco ferramentas principais passam a aparecer numa **lista vertical empilhada**, após o Runtime e antes do conteúdo.

| # | Ferramenta | `activeTab` | Handler |
|---|---|---|---|
| 1 | Pesquisa | `search` | `goSearch()` (inalterado) |
| 2 | Assistência Técnica ao Vivo | `vision3d` | `goLive()` (inalterado) |
| 3 | Gestão de Ativos | `asset-management` | `setActiveTab` (inalterado) |
| 4 | Análise Foto/Vídeo | `field-analysis` | `setActiveTab` (inalterado) |
| 5 | Gêmeo Digital | `digital-twin` | `setActiveTab` (inalterado) |

Cada item: cartão horizontal, ícone + nome, área inteira clicável, altura uniforme (`min-height: 44px`), largura 100%, gap vertical 6px.

---

## 2. O que NÃO foi alterado

- Centro de Ação (4 tiles)
- Runtime recolhível
- Cognitive Core compacto
- Pesquisa / Assistência Técnica (módulos e lógica)
- Desktop tabs (`≥768px`)
- Backend / APIs / WebRTC

---

## 3. Ficheiros alterados

```
frontend/src/pages/ManuIA.jsx      — nav manuia-tools-stack--mobile
frontend/src/pages/ManuIA.css    — estilos .manuia-tools-stack*
```

Removido no mobile: bloco colapsável «Ferramentas avançadas» no rodapé (redundante — as 3 ferramentas secundárias estão na lista vertical).

---

## 4. Desktop / tablet

`manuia-tools-stack--mobile { display: none }` — barra horizontal de tabs desktop preservada em `≥768px`.

---

## 5. Deploy

```
npm run build  → ✓
pm2 restart impetus-frontend → ✓
```

---

## 6. Validação visual (utilizador)

- [ ] 360×800 — 5 cartões empilhados, sem scroll horizontal
- [ ] 390×844 — idem
- [ ] Toque em cada item abre o mesmo módulo de antes
- [ ] Desktop inalterado

---

## 7. Confirmação

**Apenas layout alterado.** Mesmos componentes (`LiveTechnicalAssistanceModule`, `AssetManagementModule`, etc.) e mesmas funções de navegação (`goSearch`, `goLive`, `setActiveTab`).
