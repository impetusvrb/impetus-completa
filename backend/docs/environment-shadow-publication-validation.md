# ENVIRONMENT Shadow — Publication Validation

**Data:** 2026-05-18T15:25:09Z  
**Modo:** SHADOW (`IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true`)

## Publication context

- `publication_allowed: true` (flags + tenant em validação local)
- `rollout_shadow: true`
- `definitive_publication: false`
- `auto_promotion: false`

## Pipeline multi-domínio

Ordem: **quality → safety → logistics → environment**

- `safeMergeEnvironmentPublicationIntoMenu` após logistics
- Core preservado: Dashboard, IA, Chat
- `recursive_publication_risk: false` (testes frontend)

## Audiência (manifest IDs)

| Perfil | Itens principais |
|--------|------------------|
| Operador | effluent, water, field, operational, telemetry |
| Técnico | waste, compliance, emissions, field, operational |
| Coordenador | esg, emissions, sustainability, telemetry, intelligence, cognitive |
| Diretoria | sustainability, carbon, executive, intelligence, governance, rollout |

## Capability governance (shadow)

Em shadow, `environment_executive` e `environment_cognitive` no **frontend** permanecem bloqueados para publicação de menu quando `rollout_shadow` — alinhado a publication-safe.

## Coexistência

| Módulo | Preservado |
|--------|------------|
| Dashboard | ✅ |
| Impetus IA | ✅ |
| Impetus Chat | ✅ |
| QUALITY / SAFETY / LOGISTICS publication | ✅ |

**Validação manual recomendada:** login com tenant com `environment_intelligence` em `visible_modules`; confirmar itens ambientais no menu e rota `/app/environment/operational`.
