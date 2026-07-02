# CERT-PULSE-04 — Calibração Cognitiva, Validação Operacional e Certificação

**Data:** 2026-06-27  
**Status:** Certificado (validação científica e operacional)  
**Pré-requisitos:** CERT-PULSE-02 (arquitetura), CERT-PULSE-03 (integração)

## Objetivo

Certificar que o Pulse Cognitivo representa corretamente a realidade organizacional **antes** de receber novas funcionalidades. Esta etapa **não altera** a arquitetura, **não modifica pesos** automaticamente e **não cria novos módulos funcionais** — apenas validação, calibração documentada e confiabilidade.

---

## Perguntas respondidas por esta certificação

| Pergunta | Mecanismo |
|----------|-----------|
| O índice representa o estado humano? | Simulações de 8 cenários + alinhamento com eventos reais |
| Existem falsos positivos? | `GET /hr/calibration/false-positives` |
| Existem falsos negativos? | `GET /hr/calibration/false-negatives` |
| Os pesos estão coerentes? | `GET /hr/calibration/audit` + `simulations` (pesos congelados) |
| O RH pode confiar nas inferências? | Dashboard de confiabilidade + HITL |
| As recomendações são úteis? | Validação RH (confirmed/partial/rejected) |
| O índice acompanha eventos reais? | `GET /hr/calibration/event-alignment` |

---

## FASE 1 — Auditoria dos índices (9 dimensões)

Serviço: `calibration/dimensionAudit.js`

Matriz documentada para cada dimensão:

- Fonte dos dados
- Peso utilizado (soma = 1.0)
- Justificativa técnica
- Impacto no índice final
- Intervalo esperado
- Sensibilidade

Cadeia **Sinal → Peso → Contribuição → Impacto → Confiança** em `signal_matrix`.

---

## FASE 2 — Calibração dos pesos (simulação)

Serviço: `calibration/weightSimulation.js`

Cenários simulados (sem alterar pesos):

| Cenário | Expectativa |
|---------|-------------|
| Equipe altamente produtiva | Índice ≥ 65 |
| Equipe em crise | Índice < 55 |
| Equipe recém-formada | Moderado, integração baixa |
| Empresa pequena/média/grande | Sem extremos incoerentes |
| Poucos registros | Confiança reduzida |
| Altamente digitalizada | Índice elevado |

Distorções documentadas em `distortions[]` por cenário.

---

## FASE 3 — Validação das inferências

Serviço: `calibration/calibrationAnalysis.js` → `enrichInsightEvidence()`

Cada insight inclui `validation_bundle`:

- `signals_used`
- `rules_used`
- `correlations_used`
- `confidence`
- `hypothesis`
- `justification`
- `evidence_complete` / `emit_allowed`

**Nenhum insight é emitido de forma assertiva sem evidências explícitas** (`confidence ≥ 0.35` + sinais/evidências).

---

## FASE 4 — Falsos positivos

Detecção de:

- Alto risco com poucos sinais
- Padrão de desengajamento com índice elevado
- Estado `at_risk` sem evidências
- Alertas recorrentes sem fundamento

Classificação: `false_positive_candidate` | `watch`

---

## FASE 5 — Falsos negativos

Detecção de:

- Alertas operacionais elevados com Pulse estável
- Absenteísmo alto sem queda do índice
- Incidentes SST/qualidade sem deterioração perceptível

Classificação: `false_negative_candidate`

---

## FASE 6 — Consistência temporal

Validação de oscilações abruptas do índice sem eventos correlacionados na mesma semana. Integração com `temporalLearning`.

---

## FASE 7 — Comparação com eventos reais

Cruzamento com proxies de:

- Absenteísmo, acidentes/alertas, TPM, Pró-Ação, produtividade

Resultado: `alignments[]` com status `aligned` | `divergent`

---

## FASE 8 — Explainability avançada

Serviço: `calibration/advancedExplainability.js`

Endpoint: `GET /hr/calibration/explainability/:userId`

Inclui:

- Fatores positivos e negativos
- Tendências dimensionais
- Eventos recentes
- `chart_series` para visualização RH

---

## FASE 9 — Dashboard de confiabilidade

Serviço: `calibration/reliabilityDashboard.js`

Endpoint: `GET /hr/calibration/reliability`

Métricas:

- Qualidade dos dados (score 0–100)
- Cobertura por colaborador e setor
- Colaboradores com baixa confiança
- Equipes sem dados suficientes
- % insights com evidência completa
- Mensagem **"não tenho dados suficientes"** quando `insufficient_data_warning`

UI: aba **Confiabilidade** em `PulseCognitiveRh.jsx`

---

## FASE 10 — Human-in-the-Loop

Tabela: `pulse_cognitive_insight_validation`

Endpoint: `POST /hr/calibration/insights/:id/validate`

Status: `confirmed` | `partial` | `rejected`

**Alimenta apenas métricas de qualidade — não altera pesos do modelo.**

---

## FASE 11 — Observabilidade

Métricas adicionadas:

- `pulse_confidence_average`
- `pulse_false_positive_rate`
- `pulse_false_negative_rate`
- `pulse_data_coverage`
- `pulse_signal_quality`
- `pulse_human_validation_rate`
- `pulse_confirmed_insights`
- `pulse_rejected_insights`

---

## FASE 12 — Certificação E2E

```bash
npm run test:pulse-cognitive-regression   # CERT-02
npm run test:pulse-cognitive-cert03       # CERT-03
npm run test:pulse-cognitive-cert04       # CERT-04
```

Cenários sintéticos: empresa abundante, poucos dados, crise, produtiva, dados contraditórios.

---

## Relatório completo

`GET /api/pulse/cognitive/hr/calibration/report` consolida:

- Auditoria de dimensões
- Simulações de peso
- Dashboard de confiabilidade
- Falsos positivos/negativos
- Consistência temporal
- Alinhamento com eventos
- Amostra de insights validados

---

## Governança (critérios obrigatórios)

- [x] Arquitetura CERT-02/03 preservada
- [x] APIs legadas inalteradas
- [x] Sem novos módulos funcionais de negócio
- [x] Permissões inalteradas (`requireRhManagementAccess`)
- [x] Pesos **não** modificados automaticamente
- [x] Inferências explicáveis, rastreáveis e auditáveis
- [x] Human-in-the-loop e LGPD

---

## Deploy

1. Aplicar migration: `backend/src/models/pulse_cognitive_cert04_migration.sql`
2. Reiniciar PM2 se necessário

---

## Próximas evoluções

Após CERT-PULSE-04, evoluções do Pulse devem surgir do ecossistema (novos sinais, ERP/MES, Gêmeo Digital) via `eventIngestion` existente — **sem alterar o núcleo cognitivo**.
