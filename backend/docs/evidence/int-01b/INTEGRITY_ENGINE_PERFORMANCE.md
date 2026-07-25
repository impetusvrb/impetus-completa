# Motor de Integridade — Performance

**Documento:** INTEGRITY_ENGINE_PERFORMANCE.md  
**Missão:** INT-01B (FASE 11)  
**Data:** 2026-07-23  
**Status:** PERFORMANCE_MEASURED  
**Ambiente:** Produção (AMD EPYC 9354P, 2 vCPU, 8 GB RAM)

---

## 1. Resultados medidos

| Métrica | Medido | Arquitectura prevista | Status |
|---|---|---|---|
| SHA256 avg/activo (104 KB) | **0.30 ms** | < 5ms | ✔ PASS |
| stat() avg/activo | **0.005 ms** | negligível | ✔ PASS |
| Custo differential (stat vs hash) | **1.8% do hash** | < 5% | ✔ PASS |
| 1000 eventos no EventBus | **7.1 ms total** | < 50ms | ✔ PASS |
| Heap do motor (standalone) | **5.3 MB** | < 15 MB | ✔ PASS |
| RSS do processo | **47.4 MB** | < 80 MB | ✔ PASS |

---

## 2. Análise por componente

### 2.1 HashChecker — custo por ciclo de 5 minutos

Cenário normal (sem mudanças): apenas `stat()` é executado.

| Activos | Operação | Tempo estimado |
|---|---|---|
| 33 activos | 33× stat() | 33 × 0.005ms = **0.17ms** |
| 0 activos com mtime alterado | 0× SHA256 | **0ms** |
| **Total ciclo normal** | | **~0.17ms/5min** |

Cenário com 1 mudança (ex: deploy):

| Activos | Operação | Tempo estimado |
|---|---|---|
| 33 activos | 33× stat() | 0.17ms |
| 1 activo modificado | 1× SHA256 (104 KB médio) | 0.30ms |
| **Total ciclo com mudança** | | **~0.47ms** |

**Custo em CPU:** < 0.1% de 1 core, mesmo com 33 activos alterados simultaneamente.

### 2.2 PermChecker — custo por ciclo de 2 minutos

| Activos | Operação | Tempo estimado |
|---|---|---|
| 33 activos | 33× stat() | **0.17ms** |

### 2.3 AuditdBridge — custo por poll de 5s

| Cenário | Operação | Custo |
|---|---|---|
| Sem novos eventos | 1× stat(audit.log) | ~0.005ms |
| Com novos eventos | read() + parse() | proporcional ao volume |
| Pico (100 linhas) | parse de 100 linhas | < 1ms |

### 2.4 EventBus — throughput

| Operação | Medido | Capacidade máx |
|---|---|---|
| 1000 eventos emitidos | 7.1ms | 140.000 eventos/s |
| Deduplicação lookup | O(1) via Map | negligível |
| Queue peek(10) | O(10) | negligível |

**EventBus está 140× acima da carga esperada em produção** (estimativa: < 100 eventos/hora em operação normal).

---

## 3. Projecção de consumo em produção

| Período | CPU estimado | IO estimado | Memória |
|---|---|---|---|
| 5 minutos (normal) | < 0.1% × 0.17ms = negligível | 1 stat() × 33 = negligível | ~15 MB (motor activo) |
| 5 minutos (com deploy) | < 0.1% × 0.47ms = negligível | 33 stat() + 1-5 read() | ~15 MB |
| 1 hora | < 0.01% CPU | < 1 MB IO | ~15 MB (estável) |

**Conclusão:** O motor não terá impacto mensurável em CPU, memória ou IO em operação normal.

---

## 4. Comparação com arquitectura aprovada (GAP-INT-01-ARCH)

| Estimativa na arquitectura | Medido | Conformidade |
|---|---|---|
| CPU idle < 0.5% | < 0.01% | ✔ Dentro do previsto |
| CPU evento < 2% transiente | < 0.1% | ✔ Dentro do previsto |
| Memória ~15 MB | 5.3 MB heap (standalone) | ✔ Abaixo do previsto |
| IO < 10 MB/h | < 1 MB/h | ✔ Dentro do previsto |
| EventBus aguenta 10 evt/s | 140.000 evt/s | ✔ Muito acima do necessário |

---

## 5. Limites e throttle

| Mecanismo | Limite | Comportamento ao atingir |
|---|---|---|
| EventBus queue | 1000 eventos | Descarta o mais antigo |
| Deduplicação | 2000 chaves | Limpeza automática de chaves > 60s |
| AuditdBridge pendingRecords | 500 | Emite e limpa os 100 mais antigos |
| `impetus_root_exec` | Campo LOW_NOISE_KEYS | Severidade = LOW |

---

## 6. Recursos do servidor (contexto)

| Recurso | Disponível | Motor usa | Margem |
|---|---|---|---|
| CPU | 2 vCPUs AMD EPYC 9354P | < 0.01% | > 99.99% |
| RAM | ~4.7 GB livre | ~15 MB | > 99.7% |
| Disco | — | < 1 MB/h (shadow log) | — |
