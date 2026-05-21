# Phase Z.3 — Underdelivery Protection

Underdelivery é agora **risco crítico**: utilizador sem módulos mínimos, cockpit incompleto, executivo sem visão estratégica, operador sem toolkit.

## API

`/api/internal/underdelivery-protection/underdelivery`, `/report`

## Comportamento

- Detecta risco via `TIER_MINIMUMS`
- **Não** auto-remedia — injecta mínimos apenas quando flag ON no pipeline piloto
- Evento: `UNDERDELIVERY_RISK_DETECTED`

## Testes

```bash
npm run test:underdelivery-protection
```
