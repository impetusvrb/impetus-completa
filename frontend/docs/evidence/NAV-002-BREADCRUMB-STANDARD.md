# NAV-002 — Breadcrumb Standard

**Data:** 2026-07-19

## Estrutura canónica

```
IMPETUS  ›  Logística  ›  Armazéns
```

## Regras

1. Raiz sempre **IMPETUS** → `/app`
2. Domínio → workspace oficial do domínio
3. Módulo → rota standalone actual (aria-current="page")
4. Separador visual `›`
5. Links via `react-router-dom` **Link** — proibido `history.back()`

## Exemplo Supply (preparado)

```
IMPETUS  ›  Supply  ›  Promoções
```

Configuração via `buildOperationalNavigationConfig()` — zero hardcode nos consumidores.

## Acessibilidade

- `<nav aria-label="Breadcrumb">`
- `<ol>` semântico
- Foco visível em links (`:focus-visible`)
