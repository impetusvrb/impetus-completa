# FIN-EVOLVE-2.3 — Certification

## Critérios de aceite

| Critério | Evidência |
|----------|-----------|
| Cenários hipotéticos sem alterar estado operacional | `baselineUntouched` + clone + discard |
| Só contratos/motores certificados | Engine 2.1 + Twin 2.2 + READY |
| Impactos comparados com estado actual | `compareEconomicImpact` |
| Explainability + rastreabilidade | obrigatórias em cada comparação |
| Isolamento `scenarioId` | registry Map independente |
| Testes verdes | `test:fin-evolve-2.3` + regressões |

## Fora de escopo (confirmado)

Predição · IA generativa · optimização automática · recomendações autónomas · ML · persistência obrigatória

## Regressões

`test:fin-evolve-2.3` · `test:fin-val-001` · `test:fin-evolve-2.2` · `test:platform-2026` · `build`
