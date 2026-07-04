# SEC-19 — Resultados de Stress Operacional

**Modo:** Simulação determinística (`SECURITY_OPERATIONAL_STRESS_SIMULATED=true`)

## Tiers

| Tier | Requests virtuais | Janela |
|------|-------------------|--------|
| S1 | 5 000 | distribuída |
| S2 | 10 000 | distribuída |
| S3 | 20 000 | distribuída |
| S4 | 50 000 | distribuída |

## Métricas avaliadas

- **CPU** — `process.cpuUsage()` antes/depois
- **Memória** — heap RSS (limite estável: heap < 2048 MB)
- **Latência** — tempo de batch virtual (ns → ms)
- **Buckets** — ok / simulated404 / simulated403
- **Incidentes** — buckets derivados (`virtualCount / 5000`)
- **Notificações** — buckets derivados (`virtualCount / 10000`)
- **Tempo de resposta** — estimativa moduleLoad

## Critério de estabilidade

Cada tier marca `stable: true` quando:

- `heapUsedMb < 2048`
- `rssMb < 4096`
- latência de batch dentro de limites proporcionais

## Implementação

`backend/src/securityOperationalCertification/simulations/stressTestRunner.js`

## Nota

Stress **não** envia requests HTTP reais ao servidor — evita impacto em produção e cumpre directriz de simulação controlada.
