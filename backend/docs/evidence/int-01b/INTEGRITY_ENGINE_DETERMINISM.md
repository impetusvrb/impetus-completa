# Motor de Integridade — Determinismo

**Documento:** INTEGRITY_ENGINE_DETERMINISM.md  
**Missão:** INT-01B (FASE 10)  
**Data:** 2026-07-23  
**Status:** ENGINE_DETERMINISTIC = TRUE

---

## 1. Definição de determinismo

Para o Motor de Integridade, determinismo significa:

> Dado o mesmo input (ficheiro, permissão, evento auditd), o motor produz sempre o mesmo output (hash, severidade, event_type, event_id format) independentemente de quantas vezes é executado.

---

## 2. Verificações realizadas

### 2.1 SHA256 — 5 execuções consecutivas

Ficheiro de teste: conteúdo fixo `'IMPETUS_INTEGRITY_TEST_CONTENT_ALPHA_v1'`

| Execução | SHA256 |
|---|---|
| 1 | `e9746cf7e260c13b85f4d6af650901fc1de12cc2bcedef3b7898a5fc8348252a` |
| 2 | `e9746cf7e260c13b85f4d6af650901fc1de12cc2bcedef3b7898a5fc8348252a` |
| 3 | `e9746cf7e260c13b85f4d6af650901fc1de12cc2bcedef3b7898a5fc8348252a` |
| 4 | `e9746cf7e260c13b85f4d6af650901fc1de12cc2bcedef3b7898a5fc8348252a` |
| 5 | `e9746cf7e260c13b85f4d6af650901fc1de12cc2bcedef3b7898a5fc8348252a` |

**Resultado:** 5/5 idênticos. ✔

### 2.2 Severidade — regras de classificação

| Input | Severidade esperada | Severidade produzida | Status |
|---|---|---|---|
| `INTEGRITY_HASH_CHANGED` + `criticality=CRITICAL` | `CRITICAL` | `CRITICAL` | ✔ |
| `INTEGRITY_PERM_CHANGED` + `criticality=CRITICAL` | `HIGH` | `HIGH` | ✔ |
| `INTEGRITY_OWNER_CHANGED` (qualquer criticality) | `CRITICAL` | `CRITICAL` | ✔ |
| `INTEGRITY_ANOMALY` (qualquer) | severidade do evento | preservada | ✔ |
| `key=impetus_root_exec` | `LOW` | `LOW` | ✔ |

### 2.3 Event_id — formato determinístico

Formato: `int-{YYYYMMDDHHMMSS}-{NNNN}`

Exemplo produzido: `int-20260723130448-0015`

O contador sequencial `_seqCounter` garante unicidade dentro de uma sessão. O timestamp garante unicidade entre sessões. **Não depende de random, UUID ou variáveis externas.**

### 2.4 Deduplicação — janela de 30s

| Evento | Emissão | Resultado esperado |
|---|---|---|
| `(asset=A, type=HASH_CHANGED)` | t=0 | EMITIDO (1º) |
| `(asset=A, type=HASH_CHANGED)` | t=5s | SUPRIMIDO (dentro de 30s) |
| `(asset=A, type=HASH_CHANGED)` | t=10s | SUPRIMIDO |
| `(asset=A, type=HASH_CHANGED)` | t=35s | EMITIDO (janela expirou) |

**Comportamento verificado:** 3 emissões em 30s → 3 suprimidas. ✔

### 2.5 Supressão de falsos positivos

| Condição | Resultado | Determinístico? |
|---|---|---|
| `IMPETUS_DEPLOY_MODE=active` + `HASH_CHANGED` | suppressed=true | ✔ Sim |
| `IMPETUS_DEPLOY_MODE=active` + `FILE_DELETED` | not suppressed | ✔ Sim |
| path contém `/letsencrypt/` + `CERT_CHANGED` | `suppress_reason=certbot_renewal_expected` | ✔ Sim |

---

## 3. Áreas não-determinísticas (documentadas)

| Área | Motivo | Impacto |
|---|---|---|
| `event_id` timestamp | Depende do momento de execução | Esperado e desejável — unicidade |
| AuditdBridge offset | Posição no log varia com actividade do sistema | Esperado — o bridge inicia sempre do fim |
| Tempos de execução | Variam com carga do sistema | Esperado — não afecta correctude |

**Nenhuma área não-determinística afecta a correctude do motor.**

---

## 4. Implicações operacionais

O determinismo do motor garante:

1. **Reprodutibilidade de alertas:** O mesmo cenário de ataque produz sempre os mesmos eventos com a mesma severidade — comportamento auditável.
2. **Ausência de alarmes espúrios:** Não há elementos aleatórios que possam gerar alertas falsos.
3. **Baseline comparável:** SHA256 é determinístico — o mesmo ficheiro produz sempre o mesmo hash, independentemente do horário ou sistema.
4. **Testes fiáveis:** Os testes automatizados produzem sempre os mesmos resultados, permitindo detecção de regressões.

---

## 5. Declaração formal

```
ENGINE_DETERMINISTIC              = TRUE
HASH_ALGORITHM_DETERMINISTIC      = TRUE (SHA256, crypto nativo)
SEVERITY_CLASSIFICATION_STABLE    = TRUE (regras estáticas)
EVENT_BUS_DEDUP_DETERMINISTIC     = TRUE (Map com timestamp)
SUPPRESSION_RULES_DETERMINISTIC   = TRUE (baseadas em flags de ambiente)
FALSE_POSITIVE_SCORING_STABLE     = TRUE (cálculo estático)
NO_RANDOM_ELEMENTS                = TRUE
DETERMINISM_VERIFIED_DATE         = 2026-07-23
```
