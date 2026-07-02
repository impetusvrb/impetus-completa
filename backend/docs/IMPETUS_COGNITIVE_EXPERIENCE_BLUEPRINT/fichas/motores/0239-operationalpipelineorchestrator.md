# Etapa 239 — Motor: operationalPipelineOrchestrator

> ICEB v1.0 · Gerado automaticamente · Revisão humana pendente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 239 / 1060 |
| **ID** | `motor.runtime-z-operational-nervous-system-pipeline.operationalpipelineorchestrator` |
| **Tier** | T1 |
| **Classificação** | AB (ficheiro existe) |
| **Ficheiro** | `backend/src/runtime-z-operational-nervous-system/pipeline/operationalPipelineOrchestrator.js` |

## Propósito

Motor `operationalPipelineOrchestrator` — ver implementação no ficheiro fonte.

## Gatilho

- **Invocação:** rota HTTP, outro motor ou runtime interno (ver exports do módulo)
- **Quando:** conforme domínio (T1)

## Entradas

| Fonte | Obrigatório |
|-------|-------------|
| Base Estrutural / tenant | conforme motor |
| BD | conforme queries no ficheiro |
| Env flags | ver `process.env` no ficheiro |

## Processamento

Ver lógica em `backend/src/runtime-z-operational-nervous-system/pipeline/operationalPipelineOrchestrator.js`.

## Saídas

API response, evento interno ou persistência — conforme implementação.

## Regras de IA

Aplicável se o motor chama `cognitiveOrchestrator`, `chatAIService` ou facades de decisão.

## Adaptação Base Estrutural

Filtragem por `company_id`, cargo e `visible_modules` quando exposto à UI.

## Evidências

| Tipo | Referência |
|------|------------|
| Código | `backend/src/runtime-z-operational-nervous-system/pipeline/operationalPipelineOrchestrator.js` |

## Estado CERT

- [ ] Visual  - [ ] API  - [ ] BD  - [ ] Log  - [ ] Tenant  - [ ] Operacional

---
*Etapa 239 · ICEB auto-gen*
