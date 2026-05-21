# Canonical Module Delivery (Z.14)

Matriz explícita domínio → módulos permitidos / negados.

## Domínios

| Domínio | Permite (ex.) | Nega (ex.) |
|---------|---------------|------------|
| RH | hr_intelligence, onboarding | safety_intelligence, emissions |
| Qualidade | quality_intelligence, spc, ncr | safety_intelligence, apr_pt_loto, esg |
| SST | safety_intelligence, ghe, epi | hr_intelligence, supplier_quality |
| Ambiental | emissions, environment_intelligence | apr_pt_loto, quality_intelligence |
| Executivo | audit, esg, governance | manuia, safety_intelligence, cockpit bruto |

## Módulos universais (nunca removidos)

`dashboard`, `settings`, `help`, `notifications`, `ai`, `chat`, `proaction`, etc.

## Pacote

`backend/src/canonicalModuleGovernance/`
