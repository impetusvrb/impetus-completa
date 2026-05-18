# Environment Governance Runtime — Runtime ESG

## Âmbito

Camada **estratégica** SGA/EHS: ESG, compliance, carbono, energia, sustentabilidade, inteligência executiva assistiva.

## API

| Endpoint | Função |
|----------|--------|
| `GET /api/environment-governance/health` | Flags e estado |
| `POST /api/environment-governance/intelligence/pack` | Pack completo |
| `POST .../esg/evaluate` | ESG scoring |
| `POST .../compliance/screen` | Licenças e alertas |
| `POST .../carbon/inventory` | GHG 1–3 |
| `POST .../energy/efficiency` | Eficiência energética |
| `POST .../sustainability/maturity` | Maturidade |
| `POST .../validation/governance` | Validação shadow |

## Flags

`IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED` (mestre) + sub-flags ESG/COMPLIANCE/CARBON/ENERGY/SUSTAINABILITY/EXECUTIVE_INTELLIGENCE.

## Princípios

- **Assistive-only** — sem autuação, bloqueio ou promoção automática
- **Shadow-first** — permanece em SHADOW
- Reutiliza Enterprise Runtime Validation e correlação Q/S/L

## Testes

```bash
npm run test:environment-governance-runtime
npm run test:environment-governance-validation
```
