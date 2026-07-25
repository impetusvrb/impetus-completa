# ARC-003 — Presentation Architecture

**Entrega:** EOX — Enterprise Operational Experience Standard  
**Data:** 2026-07-19

---

## Camadas

```
┌─────────────────────────────────────────────────────────┐
│  App.jsx — rotas certificadas (NAV-001 sidebar intacta) │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  *OperationalLayout — feature flag + PublicationGate      │
│  (Quality / Safety / Environment / Logistics — certificado)│
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  *OperationalShell — tenant context + Outlet            │
│  (certificado — não alterado)                           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  *OperationalNavLayout — adapter fino ARC-003 (NOVO)    │
│  EoxModuleShell + use*OperationalNavigation()           │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼────────┐              ┌──────────▼──────────┐
│  EoxHeader      │              │  Page / Hub / Module │
│  (breadcrumb,   │              │  (conteúdo funcional │
│   retornos,     │              │   certificado)       │
│   acções)       │              └─────────────────────┘
└─────────────────┘
         │
┌────────▼────────────────────────────────────────┐
│  OPM-001A IndustrialModuleLayout (WMS)          │
│  suppressModuleHeader via EoxNavigationContext  │
└─────────────────────────────────────────────────┘
```

---

## Adapters por domínio

| Adapter | Rota base | Hook |
|---------|-----------|------|
| `WmsOperationalNavLayout` | `/app/logistics/*` | `useLogisticsOperationalNavigation` |
| `LogisticsOperationalNavLayout` | `/app/logistics/operational` | `useLogisticsHubNavigation` |
| `QualityOperationalNavLayout` | `/app/quality/operational/*` | `useQualityOperationalNavigation` |
| `SafetyOperationalNavLayout` | `/app/safety/operational/*` | `useSafetyOperationalNavigation` |
| `EnvironmentOperationalNavLayout` | `/app/environment/operational/*` | `useEnvironmentOperationalNavigation` |

Padrão idêntico ao certificado WMS-007A + NAV-002:

```jsx
export default function QualityOperationalNavLayout() {
  const navConfig = useQualityOperationalNavigation();
  return (
    <EoxModuleShell config={navConfig}>
      <Outlet />
    </EoxModuleShell>
  );
}
```

---

## Supressão de headers duplicados

`EoxNavigationContext` expõe:

| Flag | Efeito |
|------|--------|
| `suppressModuleHeader` | Oculta `IndustrialModuleHeader` (OPM-001A) |
| `suppressHubHeader` | Oculta `<header>` inline dos hubs Q/S/E/Logistics |

Hook utilitário: `useEoxHubHeaderVisible()` — usado nos hubs operacionais.

---

## Ordem de layout operacional (OPM-001A + EOX)

Após `EoxHeader`:

1. KPIs (`IndustrialKpiPanel`)
2. Toolbar (`IndustrialToolbar`)
3. Pesquisa (`IndustrialSearchBar`)
4. Filtros (`IndustrialFilterBar`)
5. Grid (`IndustrialDataGrid` / children)
6. Painel lateral (details)
7. Timeline (`IndustrialTimeline`)
8. Alertas / Insights (cognitivos)
9. Acções de negócio (`IndustrialActionBar`)

EOX adiciona barra de acções de navegação/contexto no header (`EoxActionBar`).

---

## O que não foi alterado

- `*OperationalShell.jsx` — runtime tenant
- `*RuntimePublicationGate.jsx` — RBAC/publicação
- Páginas WMS standalone certificadas
- `IndustrialModuleLayout` internals (OPM-001A)
- `domainNavigationResolver.js` (NAV-001)
- Backend / APIs / contratos REST

---

## Extensão futura

Novos domínios (Produção, Supply, Finance):

1. Entrada em `EOX_DOMAIN_REGISTRY` (`active: true`)
2. Resolver `resolve*OperationalNavigation`
3. Hook `use*OperationalNavigation`
4. Adapter `*OperationalNavLayout`
5. Rota wrapper em `App.jsx`

Sem alterar componentes certificados existentes.
