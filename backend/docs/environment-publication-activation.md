# ENVIRONMENT — Publication Activation (Shadow)

## Estado alvo

`activation_stage: shadow` — publicação assistiva, `auto_promotion: false`.

## Readiness

`environmentPublicationHealthService.runSafeActivationChecks` valida:

- operational runtime ON
- navigation + publication ON
- módulo `environment_intelligence` licenciado
- tenant presente

## Rollout

`environmentActivationRolloutEngine` — `allowsDefinitivePublication` retorna `false` quando `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true`.

## Verificação

```bash
npm run test:environment-publication-activation
```
