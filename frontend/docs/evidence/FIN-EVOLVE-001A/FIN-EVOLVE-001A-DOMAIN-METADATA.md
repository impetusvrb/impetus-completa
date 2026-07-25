# FIN-EVOLVE-001A — Domain Metadata Registry

**Registry:** `FINANCE_DOMAIN_METADATA_REGISTRY` em `financeDomainMetadata.js`

## Conteúdo

| Secção | Descrição |
|--------|-----------|
| `identity` | Nome, ícone, cor, descrição, landing |
| `eox` | Entrada EOX (`FINANCE_EOX_DOMAIN_ENTRY`) |
| `strategy` | `integrate_then_develop` |
| `owner` | `finance_domain` |
| `phases` | FIN-EVOLVE-001, FIN-EVOLVE-001A |
| `capabilities` | Referência ao registry FIN-EVOLVE-001 |
| `contextualModuleKeys` | financial_intelligence, cost_center, losses_map |

## Estrutura de ficheiros

```
frontend/src/domains/finance/
├── metadata/
│   ├── financeDomainMetadata.js
│   └── financeNavigationMetadata.js
├── experience/
│   └── financeWorkspaceResolver.js
├── compatibility/
│   └── financeLegacyCompatibility.js
├── registry/          (FIN-EVOLVE-001 — intocado)
├── integration/       (FIN-EVOLVE-001 — paths via metadata)
├── navigation/        (re-exports metadata)
└── workspace/         (hub reorganizado)
```

## Consumidores

- `eoxRegistry.js` — entrada finance
- `domainRegistry.js` — label e routePrefix
- `Layout.jsx` — menu
- `App.jsx` — redirects legacy
- Testes `test:fin-evolve-001a`
