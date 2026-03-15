# Motor de Decisão Inteligente IMPETUS

## Objetivo

Garantir que todas as IAs do sistema não escolham apenas o caminho mais curto ou mais fácil, mas a decisão que gere o melhor resultado geral para a empresa, para as pessoas e para a operação.

## Princípio Fundamental

> **A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.**

## Critérios de Avaliação (ordem de prioridade)

1. **Segurança das Pessoas** – Prioridade máxima. Qualquer risco humano = priorizar segurança.
2. **Saúde Física e Mental** – Evitar sobrecarga, estresse, condições inseguras.
3. **Ética e Conformidade** – Leis, normas, boas práticas industriais.
4. **Proteção Financeira** – Reduzir desperdícios, evitar prejuízos e danos.
5. **Continuidade Operacional** – Manter produção funcionando.

## Arquitetura

### Política Central
- **Arquivo:** `backend/src/data/impetus-policy.md`
- Carregado automaticamente por `documentContext.getImpetusPolicy()` e `buildAIContext()`
- Todas as IAs que usam `buildAIContext` recebem o framework automaticamente

### Serviço
- **Arquivo:** `backend/src/services/intelligentDecisionEngine.js`
- `getDecisionFrameworkBlock()` – bloco de texto para injeção em prompts
- `evaluateDecision(opts)` – análise explícita de múltiplos caminhos
- `enrichWithTransparentExplanation(recommendation, situation)` – enriquece recomendação com explicação

### Integração
Serviços que já utilizam o Motor de Decisão:
- `ai.js` – generateDiagnosticReport (via docContext + regra de transparência)
- `plcAi.js` – análise de equipamentos (prompt + transparent_explanation no JSON)
- `aiOrchestrator.js` – analyzeDataViaClaude
- `operationalForecastingAI.js` – answerOperationalQuestion
- `executiveMode.js` – processExecutiveQuery
- `documentContext.buildAIContext()` – inclui impetus-policy para todos os que usam

## API

### POST /api/central-ai/evaluate-decision
Avaliação explícita de múltiplos caminhos (autenticação Bearer necessária).

**Body:**
```json
{
  "situation": "Queda de pressão no compressor. Sistema não recupera.",
  "candidatePaths": [
    "Ignorar e continuar",
    "Reduzir consumo temporariamente",
    "Parar máquinas e verificar",
    "Gerar alerta de manutenção"
  ],
  "context": { "equipment": "Compressor principal" }
}
```

**Resposta:**
```json
{
  "ok": true,
  "problem_detected": "...",
  "options_analyzed": [...],
  "chosen_path": "...",
  "reasoning": "...",
  "transparent_explanation": "Problema detectado... Opções analisadas... Decisão recomendada porque..."
}
```

## Transparência da Decisão

Toda sugestão da IA deve explicar:
1. **Qual problema foi detectado**
2. **Quais opções foram analisadas**
3. **Por que aquela decisão foi escolhida**
