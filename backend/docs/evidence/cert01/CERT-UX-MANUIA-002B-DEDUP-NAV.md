# CERT-UX-MANUIA-002B — Eliminação de Duplicidade de Navegação (Mobile)

**Data:** 2026-07-01  
**Tipo:** Correção da UX-MANUIA-002A (não é nova funcionalidade)

---

## Problema (002A)

Duas árvores React coexistiam no mobile:

1. `manuia-tools-stack--mobile` (lista vertical)
2. `manuia-tabs--desktop-only` (barra horizontal — **ainda montada no DOM**, oculta via CSS)

Resultado: duplicação de handlers, scroll extra, dois `.map()` sobre as mesmas ferramentas.

---

## Correção

**Uma única renderização condicional** em `ManuIA.jsx`:

```jsx
{isMobileNav ? (
  <nav className="manuia-tools-stack">…MODULE_TABS…</nav>
) : (
  <div className="manuia-tabs">…moduleTabs…</div>
)}
```

| Critério | Estado |
|---|---|
| Uma instância de navegação no mobile | ✅ |
| Barra horizontal não montada no mobile | ✅ (não CSS hide) |
| Sem `handleMobileToolNav` extra | ✅ (inline: `goSearch` / `goLive` / `setActiveTab`) |
| Sem `MOBILE_TOOLS_NAV` + `DESKTOP_TABS` duplicados | ✅ → `MODULE_TABS` único |
| Desktop inalterado | ✅ (`setActiveTab` + tabs horizontais) |
| Centro de Ação / Runtime / Cognitive | ✅ inalterados |

---

## Fonte de dados única

`MODULE_TABS` — 5 ferramentas com `label` (mobile) e `labelDesktop` (desktop onde diferente).

Admin: `technical-library` apenas no ramo desktop (`moduleTabs`).

---

## Auditoria React

- [x] Mobile: 1× `<nav class="manuia-tools-stack">` com 5 botões
- [x] Mobile: 0× `<div class="manuia-tabs">` no DOM
- [x] Desktop: 1× `manuia-tabs`, 0× `manuia-tools-stack`
- [x] Nenhum componente oculto por `display: none` para substituir remoção
- [x] Removidos: `manuia-tabs--desktop-only`, `manuia-tools-stack--mobile`, `handleMobileToolNav`

---

## Deploy

```
npm run build  → ✓
pm2 restart impetus-frontend → ✓
```

---

## Validação (utilizador)

Hard refresh `/app/manutencao/manuia` em 360×800 / 390×844:

- Lista vertical única (5 itens)
- Sem barra horizontal abaixo
- Scroll reduzido vs 002A
- Toques funcionais
