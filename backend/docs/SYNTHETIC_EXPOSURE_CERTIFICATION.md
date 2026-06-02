# SYNTHETIC_EXPOSURE_CERTIFICATION — FASE 35E

**Data:** 2026-06-01  
**Flag:** `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` — default **true** (`phaseC2FeatureFlags.js`)  
**Gerador:** `syntheticOperationalEventGenerator.js` → `verification_state: 'synthetic'`

---

## Cadeia mapeada

```text
syntheticOperationalEventGenerator
  ↓ (se timeline < 5 eventos + flag + perfil quality)
cognitiveConvergenceFacade.applyCognitiveConvergence
  ↓
operationalContextEngine (synthetic_events inject)
  ↓
cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard
  ↓
GET /api/dashboard/me
  ↓
cockpits / widgets / feed (conforme consumo frontend)
```

---

## Evidência de execução (tenant Fresh & Fit vazio PLC)

`GET /dashboard/me` (utilizador supervisor):

| Campo | Valor observado |
|-------|-----------------|
| `cognitive_convergence_runtime` | **presente** |
| `synthetic_memory_ratio` | **0.909** (~91% memória sintética) |
| `operational_event_density` | presente no runtime C2 |

Isto confirma que eventos **synthetic** entram no payload de dashboard mesmo sem PLC.

---

## Questionário obrigatório

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Eventos synthetic chegam ao utilizador? | **Potencialmente SIM** — métricas C2 no `/dashboard/me`; feed se items tiverem `synthetic: true` |
| 2 | Onde chegam? | Payload `cognitive_convergence_runtime`; possível feed cognitivo (`LiveOperationalFeed` suporta classe CSS `--syn`) |
| 3 | Estão identificados? | **PARCIAL** — generator marca `verification_state: 'synthetic'`; UI só distingue se `ev.synthetic === true` no item do feed |
| 4 | Confundir com reais? | **SIM** — risco se widget mostrar eventos sem label SYNTHETIC |
| 5 | Widget renderiza synthetic como facto? | **PARCIAL** — `LiveOperationalFeed.jsx` aplica estilo `cog-feed__item--syn` mas **não** obriga label «SYNTHETIC» no texto |

---

## Análise por camada

| Camada | Exposição | Identificação |
|--------|-----------|---------------|
| PostgreSQL industrial | Não (generator não persiste PLC) | N/A |
| LLM chat (texto) | Baixa (não inject directo do generator no council grep) | N/A |
| Dashboard JSON | **Alta** (`synthetic_memory_ratio`) | Ratio técnico, não user-facing claro |
| Cockpit widgets | Depende renderização | Variável |
| Feed operacional | Se items propagarem `synthetic` | Classe CSS apenas |

---

## Classificação global

| Nível | **PARTIAL** (entre SAFE e UNSAFE) |
|-------|-----------------------------------|
| Racional | Dados synthetic **não** são PLC reais, mas **ratio 0.91** em tenant vazio indica domínio cognitivo dominado por sintético — risco de interpretação errada por gestores |

**Não alterado código nesta fase.**

---

## Critério desejado (produto)

Cada evento deve exibir:

- **REAL** — `verification_state !== 'synthetic'`
- **SYNTHETIC** — explícito na UI

Ou exclusão de synthetic do payload user-facing quando `synthetic_memory_ratio > threshold`.
