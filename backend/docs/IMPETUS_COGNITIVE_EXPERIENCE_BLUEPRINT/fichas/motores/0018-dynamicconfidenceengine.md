# Etapa 18 — Motor: dynamicConfidenceEngine

> ICEB v1.0 · Gerado automaticamente · Revisão humana pendente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 18 / 1060 |
| **ID** | `motor.cognitiveoperations.dynamicconfidenceengine` |
| **Tier** | T5 |
| **Classificação** | AB (ficheiro existe) |
| **Ficheiro** | `backend/src/cognitiveOperations/dynamicConfidenceEngine.js` |

## Propósito

Motor `dynamicConfidenceEngine` — ver implementação no ficheiro fonte.

## Gatilho

- **Invocação:** rota HTTP, outro motor ou runtime interno (ver exports do módulo)
- **Quando:** conforme domínio (T5)

## Entradas

| Fonte | Obrigatório |
|-------|-------------|
| Base Estrutural / tenant | conforme motor |
| BD | conforme queries no ficheiro |
| Env flags | ver `process.env` no ficheiro |

## Processamento

Ver lógica em `backend/src/cognitiveOperations/dynamicConfidenceEngine.js`.

## Saídas

API response, evento interno ou persistência — conforme implementação.

## Regras de IA

Aplicável se o motor chama `cognitiveOrchestrator`, `chatAIService` ou facades de decisão.

## Adaptação Base Estrutural

Filtragem por `company_id`, cargo e `visible_modules` quando exposto à UI.

## Evidências

| Tipo | Referência |
|------|------------|
| Código | `backend/src/cognitiveOperations/dynamicConfidenceEngine.js` |

## Estado CERT

- [ ] Visual  - [ ] API  - [ ] BD  - [ ] Log  - [ ] Tenant  - [ ] Operacional

---
*Etapa 18 · ICEB auto-gen*
