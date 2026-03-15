# Motor de Decisão Inteligente IMPETUS

## Objetivo

Garantir que **todas as IAs** do sistema não escolham apenas o caminho mais curto ou mais fácil, mas a decisão que gere o melhor resultado geral para a empresa, para as pessoas, para segurança e para a operação.

## Princípio Fundamental

> **A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.**

## Critérios (ordem obrigatória)

1. **Segurança das Pessoas** (35%) – Prioridade máxima
2. **Saúde Física e Mental** (20%)
3. **Ética e Conformidade** (15%)
4. **Proteção Financeira** (15%)
5. **Continuidade Operacional** (15%)

## Onde está integrado

| Serviço | Integração |
|---------|------------|
| `ai.js` `generateDiagnosticReport` | Bloco do Motor no prompt |
| `plcAi.js` | Motor + Política Impetus |
| `proacao.js` `aiEvaluateProposal` | Motor no prompt |
| `multimodalChatService.js` | Motor no system content |
| `executiveMode.js` | `getDecisionFrameworkBlock()` |
| `documentContext.buildAIContext` | Política Impetus (impetus-policy.md) |

## API do Motor de Decisão

- **GET** `/api/decision-engine/criteria` – Critérios, pesos e princípio
- **POST** `/api/decision-engine/analyze` – Analisa situação e retorna decisão
- **POST** `/api/decision-engine/collaborative` – Decisão colaborativa entre múltiplas IAs

### Exemplo POST /analyze

```json
{
  "situation": "Queda de pressão no compressor",
  "candidate_paths": [
    "Ignorar problema",
    "Reduzir consumo",
    "Parar máquinas",
    "Gerar alerta manutenção"
  ],
  "context": { "companyId": "..." }
}
```

## Uso programático

```javascript
const intelligentDecisionEngine = require('./services/intelligentDecisionEngine');

// Bloco para injeção em prompts
const block = intelligentDecisionEngine.getDecisionFrameworkBlock();

// Avaliar decisão com múltiplos caminhos
const result = await intelligentDecisionEngine.evaluateDecision({
  situation: 'Queda de pressão no compressor',
  candidatePaths: ['ignorar', 'alerta manutenção', 'parar máquinas'],
  context: { companyId: '...' }
});

// Decisão colaborativa (múltiplas IAs)
const collab = await intelligentDecisionEngine.collaborativeEvaluate({
  situation: '...',
  perspectives: [
    { source: 'manutenção', analysis: '...', recommendation: '...' },
    { source: 'produção', analysis: '...', recommendation: '...' }
  ]
});
```

## Transparência

Toda recomendação deve explicar:
1. **Problema detectado**
2. **Opções analisadas**
3. **Por que aquela decisão foi escolhida**
