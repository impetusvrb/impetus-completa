# Quality — CAPA Intelligence (assistivo)

## Princípio

Correlação, pontuação e estruturas de análise **sem** fechar CAPA, aprovar workflow ou alterar políticas.

## Módulos

- `qualityCapaIntelligence.js` — recorrência, ligações NCR/lote, janela de eficácia.
- `qualityRootCauseEngine.js` — template Ishikawa, cadeia 5 Porquês.
- `qualityRiskPropagation.js` — grafo de propagação (adjacência).
- `qualityCorrectiveActionAnalytics.js` — scoring composto **advisory_only**.

## Flag

`IMPETUS_QUALITY_CAPA_INTELLIGENCE_ENABLED`

## Eventos

`quality.capa.risk_escalated` registado no catálogo para integração futura com NCR/CAPA; publicação apenas por orquestrações explícitas (não auto-escalação nesta etapa).

## Extensão industrial

Ligação a inspeções inbound, laboratório e logística permanece **future-ready** via payloads e `correlation_id` — sem alterar serviços existentes.
