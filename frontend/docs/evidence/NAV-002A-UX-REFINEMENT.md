# NAV-002A — Navigation UX Refinement

**Programa:** Presentation Evolution  
**Entrega:** NAV-002A (refinamento de NAV-002)  
**Data:** 2026-07-19

---

## Problema corrigido

1. Botão «Voltar» dominava hierarquia visual (estilo `btn-ghost` grande)
2. Destino apontava para workspace legacy (`/app/logistics-operational/workspace`)
3. Cabeçalho duplicado (ONX + OPM-001A IndustrialModuleHeader)
4. Breadcrumb pouco legível como navegação

---

## Correções

| Item | Antes | Depois |
|------|-------|--------|
| Botão retorno | `btn-ghost` proeminente | Link secundário 10px, canto superior direito |
| Destino domínio | Workspace legacy | `/app/logistics/operational` (landing Logística) |
| Destino global | — | `/app` (Centro Cognitivo / Dashboard) |
| Cabeçalho | Duplicado | Unificado — ONX suprime `IndustrialModuleHeader` |
| Breadcrumb | Texto estático | Links clicáveis com hover/focus |

---

## Layout unificado

```
IMPETUS › Logística › Armazéns          ← Logística  ← Centro Cognitivo
ARMAZÉNS
Gestão operacional de armazéns · WMS-003 v1
OPM-001C
[KPIs…]
```

---

## Implementação

- `OnxNavigationContext` — `suppressModuleHeader: true` nos filhos
- `IndustrialModuleLayout` — lê contexto ONX (prop aditiva, default inalterado)
- `operationalNavigationRegistry` — `domainLandingPath`

---

## Parecer

**NAV-002A — COMPLETED**

Arquitectura NAV-002 preservada · apenas UX refinada.
