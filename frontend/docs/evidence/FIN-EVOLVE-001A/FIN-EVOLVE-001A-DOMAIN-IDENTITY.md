# FIN-EVOLVE-001A — Domain Identity

**Fase:** FIN-EVOLVE-001A · Domain Experience Consolidation  
**Princípio:** ONE DOMAIN · ONE IDENTITY

## Identidade oficial

| Campo | Valor |
|-------|-------|
| `id` | `finance` |
| `displayName` | **Finance** |
| `shortName` | **Finance** |
| `icon` | `DollarSign` |
| `color` | `var(--cyan)` |
| `landingRoute` | `/app/finance` |
| `workspaceName` | Finance Hub |

## Problema resolvido

Durante o bootstrap o domínio aparecia como **Finance**; após resolução contextual como **Inteligência Financeira**. Duas fontes de nomenclatura violavam a coesão percebida.

## Solução

Ponto único: `frontend/src/domains/finance/metadata/financeDomainMetadata.js`

Todos os consumidores (EOX, menu, workspace, domainRegistry, contextual modules) importam `FINANCE_DOMAIN_IDENTITY`.

## Fora de escopo

Nenhuma alteração de capacidades de negócio, engines ou APIs.
