# Phase Z.11 — Runtime Scaling Readiness

## Objectivo

Validar readiness contínuo para scaling supervisionado: safety, rollout stability, governance sustainability.

## Regras

- `auto_expand: false` sempre
- `execute` + `approved_by` obrigatórios em qualquer expansão real (fases anteriores)
- Sem activação autónoma de novos canais

## Flag

`IMPETUS_RUNTIME_SCALING_READINESS` — OFF por defeito.

## API

`/api/internal/runtime-scaling-readiness/*`

## Integração

`GET /dashboard/me` → `runtime_scaling_readiness`

## Testes

```bash
npm run test:runtime-scaling-readiness
```
