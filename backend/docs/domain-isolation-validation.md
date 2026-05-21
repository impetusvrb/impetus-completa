# Domain Isolation Validation (Z.17)

## Perfis

| Perfil | Não pode receber |
|--------|------------------|
| RH | SST, Ambiental, ESG |
| Qualidade | SST, Ambiental |
| Operador | ESG executivo |
| Executivo | Cockpit operacional bruto |
| SST | RH intelligence |

Valida menu, KPI, summary, cockpit, contextual.

Endpoint: `GET /api/internal/operational-validation/domains?profile=quality`
