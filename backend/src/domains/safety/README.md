# Domínio SAFETY (SST / EHS) — Enterprise Runtime

Bounded context industrial para Segurança do Trabalho, alinhado ao padrão QUALITY.

## Camadas

- `activation/` — rollout controlado, health, shadow preview
- `navigation/` — publication context (flags)
- `governance/` — matriz de risco, GHE
- `runtime/` — flags operacionais
- `rollout/`, `telemetry/`, `cognitive/` — runtimes enterprise

## APIs

Ver mounts em `backend/src/server.js` (`/api/safety-*`).

Documentação: `backend/docs/safety-enterprise-core.md`
