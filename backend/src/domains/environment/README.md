# ENVIRONMENT — Enterprise Environmental Intelligence Runtime

SGA/EHS · shadow-first · multi-domínio (QUALITY · SAFETY · LOGISTICS).

## Ativação (manual)

```bash
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true   # só após validação
```

Módulo tenant: `environment_intelligence`.

## Estrutura

- `runtime/` — foundation runtimes (operations + governance)
- `analytics/` — validation pack + correlação cross-domain
- `navigation/` · `activation/` — publication pipeline

Ver `backend/docs/environment-enterprise-runtime-alignment.md`.
