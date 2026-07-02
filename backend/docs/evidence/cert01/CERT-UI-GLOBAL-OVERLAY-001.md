# CERT-UI-GLOBAL-OVERLAY-001 — Correção Global dos Popovers do Cabeçalho

**Data:** 2026-07-01  
**Escopo:** Popovers do header (Notificações, Perfil, Ajuda) — correção global via componente reutilizável.

---

## Causa raiz

Os painéis `.header-dropdown` usavam `position: absolute` **dentro** de `.main-content` / `.layout`, ambos com `overflow: hidden`.

| Sintoma | Causa |
|---|---|
| Conteúdo inferior inacessível | Dropdown cortado pelo overflow do layout |
| Sem scroll útil | `max-height: 360px` fixo na lista, sem adaptação à viewport |
| Painel parcial no mobile | Sem reposicionamento; âncora no topo com pouco espaço abaixo |
| Afeta todos os perfis/páginas | Implementação única em `Layout.jsx` |

---

## Solução implementada

### Novo componente base

| Ficheiro | Função |
|---|---|
| `frontend/src/components/HeaderPopover.jsx` | Portal (`createPortal` → `document.body`), posicionamento viewport-aware, flip acima/abaixo |
| `frontend/src/components/HeaderPopover.css` | Flex column, scroll interno em `.header-popover__body`, z-index 6500, safe-area |

### Comportamentos

1. **Portal** — escapa de `overflow: hidden` do layout  
2. **max-height dinâmico** — calculado a partir do espaço disponível abaixo/acima do ícone (`visualViewport` quando disponível)  
3. **Scroll interno** — `.header-popover__body` com `overflow-y: auto`; fundo `.content` bloqueado via `html.impetus-header-popover-open`  
4. **Reposicionamento** — flip automático para cima quando há mais espaço acima; realinhamento horizontal nas margens  
5. **Safe area** — `env(safe-area-inset-*)` no CSS + buffer de 12px no cálculo JS  
6. **Z-index 6500** — acima de sidebar (1000), abaixo de banners críticos (5000 wake banner)

### Integração

`Layout.jsx` — Notificações, Perfil e Ajuda migrados para `HeaderPopover` com `anchorRef` nos botões.

### CSS legado

`Layout.css` — removido `position: absolute` de `.header-dropdown`; removidos `max-height` fixos da lista e filtros (scroll no corpo do popover).

---

## Componentes corrigidos

- Notificações (`header-dropdown--notifications`)
- Perfil
- Ajuda
- Base reutilizável para futuros menus do header

---

## Validação

| Viewport | Estado |
|---|---|
| 360×800 | Pendente captura manual pós-deploy |
| 390×844 | Pendente captura manual |
| 768×1024 | Pendente captura manual |
| ≥1366px | Pendente captura manual |

**Build:** `npm run build` ✓ (2026-07-01)  
**PM2:** `impetus-frontend` reiniciado ✓  
**Bundle:** `Layout-0BvdTldG.js`

### Checklist funcional (auditoria estática)

| Item | ✓ |
|---|---|
| Portal renderiza em `document.body` | ✅ |
| Três popovers usam `HeaderPopover` | ✅ |
| Click outside inclui `.header-popover` | ✅ |
| Escape fecha popovers | ✅ |
| Handlers de notificação/perfil/ajuda inalterados | ✅ |

---

## Antes / depois

| Antes | Depois |
|---|---|
| `position: absolute` cortado por overflow | `position: fixed` via portal |
| Altura fixa 360px na lista | `max-height` = espaço viewport disponível |
| Sem flip vertical | Abre acima ou abaixo conforme espaço |
| Fundo podia rolar com painel aberto | `.content` com overflow bloqueado |

---

## Confirmação global

Correção no componente compartilhado `HeaderPopover` aplicada a todos os menus do cabeçalho em `Layout.jsx` — **todos os perfis e rotas** que usam o layout principal beneficiam automaticamente.

---

## Próximo passo (utilizador)

Hard refresh e validar em smartphone Android (retrato/paisagem): Notificações, Perfil, Ajuda — confirmar scroll interno e conteúdo completo visível.
