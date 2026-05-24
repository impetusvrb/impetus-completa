# SZ3 — Runtime Z Cognitive Maturation Layer

`Tipo: additive-only · shadow-first · assistive-only · rollback-safe`

## Objectivo

Amadurecer o Runtime Z cognitivo (SZ2): aprender padrões operacionais
recorrentes, calibrar inferências reduzindo ruído, amadurecer a linguagem
industrial, adaptar a ergonomia ao perfil do utilizador e identificar
cenários industriais com comportamentos esperados curados.

## O que esta fase NÃO implementa

- ML externo / treinamento de modelo
- Chamadas a APIs externas de IA
- Auto-enforcement, auto-execution, auto-promotion
- Substituição do Motor A, Engine V2 ou SZ1/SZ2

## Módulos

```
backend/src/runtime-z-maturation/
├── config/sz3FeatureFlags.js            — flags + invariantes
├── patterns/
│   ├── zPatternObservationRuntime.js    — acumula padrões por tenant (stats)
│   ├── zPatternLibraryRuntime.js        — 11 padrões industriais curados
│   └── zPatternMatchRuntime.js          — funde biblioteca + observação
├── calibration/
│   ├── zNoiseReductionRuntime.js        — filtra inferências ruidosas
│   └── zInferenceCalibrationRuntime.js  — calibra scores SZ2 com padrões
├── language/
│   ├── zOperationalVocabulary.js        — 19 abreviações + templates maduros
│   └── zLanguageMaturationRuntime.js    — narrativa industrial contextual
├── ergonomics/
│   ├── zCognitiveErgonomicsRuntime.js   — adapta resposta ao perfil/pressão
│   └── zResponseShapingRuntime.js       — filtra/prioriza blocos de resposta
├── industrial/
│   ├── zIndustrialBehaviorLibrary.js    — 6 comportamentos de cenário
│   └── zIndustrialScenarioMatcher.js    — identifica cenário activo
├── prioritization/
│   └── zPrioritizationMaturationRuntime.js — uplift de prioridade maduro
├── observability/
│   └── zMaturationObservability.js     — métricas + eventos SZ3
└── facade/zMaturationFacade.js         — orquestra toda a SZ3 sobre SZ2
```

## Stages (sempre manuais, nunca auto-promote)

| Stage                  | Comportamento                                                     |
| ---------------------- | ----------------------------------------------------------------- |
| `OBSERVATION_ONLY` (def) | Observa, acumula padrões; não altera resposta                    |
| `LANGUAGE_MATURE`      | Usa narrativa madura nas respostas; vocabulário industrial        |
| `CALIBRATION_ACTIVE`   | Calibra scores SZ2 com padrões; reduz ruído                      |
| `ERGONOMICS_ACTIVE`    | Adapta formato ao perfil e ao estado de saturação                |
| `MATURATION_SOVEREIGN` | Linguagem industrial completa + ergonomia + calibração           |

## Biblioteca de Padrões Industriais (11 entradas)

| ID | Cenário | Domínio | Criticidade |
|----|---------|---------|-------------|
| `nr12_training` | Treinamento NR-12 | safety | high |
| `nr10_training` | Treinamento NR-10 | safety | critical |
| `capa_quality` | CAPA / NC | quality | high |
| `oee_drop` | Queda de OEE | production | high |
| `preventive_maintenance` | Manutenção Preventiva | maintenance | medium |
| `predictive_maintenance` | Manutenção Preditiva | maintenance | medium |
| `safety_incident` | Incidente de Segurança | safety | critical |
| `environmental_spill` | Vazamento Ambiental | environmental | critical |
| `shift_handover` | Passagem de Turno | production | low |
| `audit_preparation` | Preparação de Auditoria | quality | high |
| `turnover_alert` | Alerta Turnover/RH | hr | medium |

## API — `/api/runtime-z-maturation/*`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Stage + invariantes |
| GET | `/patterns` | Padrões aprendidos + tamanho biblioteca |
| GET | `/calibration?message=…` | Calibração para mensagem |
| GET | `/scenario?message=…` | Cenário industrial identificado |
| GET | `/observability` | Métricas SZ3 |
| POST | `/apply` | Aplica maturação sobre payload SZ2 |

## Integração `/dashboard/me`

Após SZ2, o `dashboard.js` invoca `applyMaturation` e anexa
`legacyResponse.runtime_z_maturation`. Nenhuma fase anterior é afectada.

## Variáveis de ambiente

```
IMPETUS_SZ3_MATURATION=on
IMPETUS_SZ3_PATTERNS=on
IMPETUS_SZ3_CALIBRATION=on
IMPETUS_SZ3_LANGUAGE=on
IMPETUS_SZ3_ERGONOMICS=on
IMPETUS_SZ3_INDUSTRIAL=on
IMPETUS_SZ3_PRIORITIZATION=on
IMPETUS_SZ3_OBSERVABILITY=on
IMPETUS_SZ3_API=on
IMPETUS_SZ3_DEFAULT_STAGE=OBSERVATION_ONLY
IMPETUS_SZ3_NOISE_THRESHOLD=0.35
IMPETUS_SZ3_PATTERN_MIN_FREQ=2
IMPETUS_SZ3_PATTERN_MAX=200
```

## Testes — 87/87 PASS

```
npm run test:runtime-z-maturation
```

## Rollback

`IMPETUS_SZ3_MATURATION=off` desactiva completamente.
SZ1, SZ2, Motor A e Engine V2 não são tocados.

## Stack cognitivo completo IMPETUS

```
Motor A (Bootstrap / Resilience) ─────────────────► legacyResponse
Engine V2 (Composition / Identity) ──────────────► enriquece payload
C0–C6 (Cognitive Runtime) ────────────────────────► runtime_* blocks
SZ1 (Sovereign Structural) ──────────────────────► runtime_z_sovereign
SZ2 (Cognitive OS) ──────────────────────────────► runtime_z_cognitive_os
SZ3 (Cognitive Maturation) ──────────────────────► runtime_z_maturation
```

Cada camada é additive-only, shadow-first e rollback-safe.
