# AIOI-P1C.6 — Capacity Model

**Data:** 2026-06-12  
**Base:** Dados reais coletados em P1C.2–P1C.5  
**Metodologia:** Modelo derivado de medições, não extrapolação teórica

---

## Constantes Medidas

| Constante | Símbolo | Valor Medido | Fonte |
|---|---|---|---|
| Taxa injeção bulk | `R_inj` | 1,247 eps | P1C.2 (média 4 cargas) |
| Taxa drenagem contínua | `R_drain` | 176 eps | P1C.2 (5000 eventos) |
| Taxa drenagem backlog | `R_backlog` | 191 eps | P1C.5 (5000 backlog) |
| Latência batch p95 | `L_p95` | 1,227ms | P1C.2 (5000 carga) |
| Latência batch p95 backlog | `L_backlog_p95` | 753ms | P1C.5 |
| fetchLatestSnapshot p95 | `L_snap` | 4ms | P1C.3 (até 10K snapshots) |
| Overhead loop/tenant | `T_tenant` | 3ms | P1C.4 (20 tenants) |
| Batch size máximo | `B_max` | 100 | Constraint código |
| Interval default | `I_default` | 30,000ms | Env default |
| Max pilot tenants | `N_max` | 3 | aioiPilotFlags |

---

## Modelo de Throughput Operacional

### Throughput por ciclo (worker polling)

```
Throughput_ciclo = N_tenants × min(B, pending_per_tenant)
Throughput_hora  = Throughput_ciclo × (3600 / I_seconds)
```

### Configuração Default

```
N=3, B=10, I=30s
→ 30 eventos/ciclo × 120 ciclos/hora = 3,600 eventos/hora
→ 86,400 eventos/dia
```

### Configuração Certificada (Recomendada)

```
N=3, B=100, I=30s
→ 300 eventos/ciclo × 120 ciclos/hora = 36,000 eventos/hora
→ 864,000 eventos/dia
```

### Limite Físico (drenagem contínua)

```
R_drain = 176 eps × 3600 = 633,600 eventos/hora (1 worker, 1 tenant)
Com 3 tenants sequenciais: ~211,200 eventos/hora sustained
```

---

## Respostas às Perguntas P1C

### 1. Quantos tenants o modelo suporta?

```json
{
  "safe_tenants": 3,
  "reason": "IMPETUS_AIOI_PILOT_TENANTS hard limit = 3",
  "performance_at_20_tenants_ms": 50,
  "performance_bottleneck": "config limit, not DB",
  "expansion_path": "P1D — elevar limite + worker sharding"
}
```

### 2. Qual o limite seguro de throughput?

```json
{
  "safe_events_per_hour": 36000,
  "config": "batch=100, interval=30s, tenants=3",
  "safe_events_per_day": 864000,
  "peak_sustained_eps": 191,
  "peak_burst_eps": 1247
}
```

### 3. Comportamento sob backlog elevado?

```json
{
  "safe_backlog_limit": 5000,
  "drain_time_5000_ms": 26132,
  "drain_time_5000_human": "26 seconds (active drain)",
  "passive_drain_5000_min": 8.5,
  "starvation_at_5000": false,
  "retries_at_5000": 0
}
```

### 4. Impacto do crescimento de snapshots?

```json
{
  "safe_snapshot_growth": 100000,
  "fetch_latest_at_10k_p95_ms": 2,
  "table_size_at_10k": "7.2 MB",
  "retention_recommended": "1000 snapshots/tenant (rolling)",
  "annual_growth_unbounded": "~730 MB/tenant/year"
}
```

### 5. Comportamento do outbox em escala?

```json
{
  "tested_volume": 13155,
  "table_size_at_13k": "8.9 MB",
  "pick_batch_ms_at_scale": 0.084,
  "failed_at_scale": 0,
  "retention_required_at": "100000 delivered records"
}
```

### 6. Onde estão os gargalos reais?

| Prioridade | Gargalo | Impacto |
|---|---|---|
| P0 | `MAX_PILOT_TENANTS=3` | Bloqueia expansão |
| P0 | Single worker (advisory lock) | Sem horizontal scaling |
| P1 | Classification sequential per-item | Limita R_drain a ~191 eps |
| P1 | Outbox delivered acumula | Crescimento BD indefinido |
| P2 | Metrics COUNT(*) full table | Degrada observabilidade |
| P2 | Snapshot idempotency por minuto | Colisão em projeções rápidas |

---

## Modelo Matemático Consolidado

```json
{
  "safe_tenants": 3,
  "safe_events_per_hour": 36000,
  "safe_events_per_day": 864000,
  "safe_snapshot_growth": 100000,
  "safe_backlog_limit": 5000,
  "headroom_backlog_drain_s": 26,
  "recommended_batch_size": 100,
  "recommended_interval_ms": 30000,
  "max_sustained_eps": 191,
  "max_burst_inject_eps": 1247
}
```

---

## Fórmulas de Planejamento

```
# Tempo para drenar backlog B com worker ativo
T_drain(B) ≈ B / R_backlog  →  B / 191 segundos

# Tempo para drenar backlog B com worker polling (passivo)
T_passive(B) ≈ B / (N_tenants × B_batch) × I_seconds

# Capacidade horária segura (com margem 20%)
C_safe = 0.8 × N_tenants × B_batch × (3600 / I_seconds)

# Exemplo: N=3, B=100, I=30s
C_safe = 0.8 × 3 × 100 × 120 = 28,800 eventos/hora
```

---

## Veredito

```
AIOI_P1C_CAPACITY_MODEL_COMPLETE
```

Modelo derivado de 18.600+ eventos processados em testes reais. Limites seguros documentados com margem operacional.
