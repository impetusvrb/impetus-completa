# Arquitetura Tríade de IAs - IMPETUS

## Visão Geral

O IMPETUS utiliza três IAs especializadas trabalhando de forma integrada:

| IA | API | Função Principal |
|----|-----|------------------|
| **Claude** | ANTHROPIC_API_KEY | Análise de dados (produção, manutenção, custos, KPIs) |
| **Gemini** | GEMINI_API_KEY | Supervisão multimodal (imagens, vídeos, sensores IoT) |
| **ChatGPT** | OPENAI_API_KEY | Conversação com usuários (interface central) |

## Fluxo Principal

```
Usuário pergunta
       ↓
ChatGPT (classifica tipo de pergunta)
       ↓
   ┌───┴───┐
   ↓       ↓
Claude   Gemini
(dados)  (imagem/sensores)
   ↓       ↓
   └───┬───┘
       ↓
ChatGPT sintetiza resposta
       ↓
Usuário recebe resposta
```

## Variáveis de Ambiente

```env
# Obrigatórias para IA
OPENAI_API_KEY=sk-proj-...      # ChatGPT - conversação
ANTHROPIC_API_KEY=sk-ant-...    # Claude - análise de dados
GEMINI_API_KEY=...              # Gemini - multimodal (imagens, sensores)
GEMINI_MODEL=gemini-1.5-pro     # Modelo (opcional)

# Ativar orquestrador (tríade)
AI_ORCHESTRATOR_ENABLED=true
```

## APIs Disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/ai/claude/analyze` | Análise de dados estruturados |
| POST | `/api/ai/gemini/analyze` | Análise de imagem (base64) |
| POST | `/api/ai/gemini/analyze-sensor` | Análise de dados de sensores IoT |
| POST | `/api/ai/chat/query` | Chat orquestrado (mensagem + imagem opcional) |
| POST | `/api/cadastrar-com-ia` | Cadastro com IA (texto, imagem, documento, áudio) |

## Tabelas de Memória

- **enterprise_ai_memory**: insights, eventos, alertas das 3 IAs
- **industry_intelligence_memory**: padrões operacionais, soluções históricas
- **company_operation_memory**: dados cadastrados via "Cadastrar com IA"
- **ai_knowledge_exchange**: troca de descobertas entre IAs

## Módulo Cadastrar com IA

Permite cadastrar informações do setor utilizando IA:
- **Texto**: descrição livre → IA extrai dados estruturados
- **Imagem**: foto de máquina, painel → Gemini extrai equipamento, leituras
- **Documento**: PDF, DOC → extração de texto + ChatGPT interpreta
- **Áudio**: gravação de voz → Whisper transcreve + ChatGPT interpreta

## Integração com Chat

Quando `AI_ORCHESTRATOR_ENABLED=true`, o chat interno (@ImpetusIA) usa o orquestrador:
- Perguntas sobre dados → consulta Claude
- Perguntas sobre máquinas/imagens → consulta Gemini
- ChatGPT sempre sintetiza a resposta final

## Validação Cruzada

O sistema pode cruzar informações entre fontes (dados + sensores + imagens) para validar afirmações operacionais. Função `crossValidate` no aiOrchestratorService.
