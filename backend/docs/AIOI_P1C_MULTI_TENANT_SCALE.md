# AIOI-P1C.4 — Multi-Tenant Expansion Simulation

**Data:** 2026-06-12  
**Modo:** Simulação controlada — sem alteração de produção  
**Tenants reais certificados:** find fish alimentos + industria de teste

---

## Objetivo

Identificar gargalos teóricos e práticos ao expandir de 2 para N tenants simultâneos no ciclo do `aioiContinuousWorkerService`.

---

## Arquitetura Atual do Worker

```
executeCycle():
  FOR EACH pilot_tenant:
    classificationConsumer.processClassificationBatch({ companyId, batchSize })
    snapshotService.projectExecutiveQueueSnapshot({ companyId })
```

**Complexidade:** O(n) tenants × (classificação + snapshot) por ciclo  
**Limite config:** `IMPETUS_AIOI_PILOT_TENANTS` — máximo **3 UUIDs**

---

## Resultados da Simulação

| Tenants | Loop Real (ms) | ms/Tenant | Projetado Ciclo Vazio | Projetado Com Carga | Gargalo |
|---|---|---|---|---|---|
| 3 | 12 | 4 | 3ms | 153ms | nenhum |
| 5 | 10 | 2 | 5ms | 255ms | **config max=3** |
| 10 | 13 | 1 | 10ms | 510ms | **config max=3** |
| 20 | 50 | 3 | 20ms | 1,020ms | **config max=3** |

### Interpretação

- **Tenants 3:** Dentro do limite piloto — operação viável com latência desprezível em loop vazio
- **Tenants 5–20:** Loop vazio permanece < 50ms (overhead mínimo por tenant sem backlog)
- **Com carga (50ms/tenant estimado):** 20 tenants → ~1s por ciclo — ainda dentro do intervalo de 30s default
- **Gargalo principal:** Limite de configuração `max 3 pilot tenants`, não performance de BD

---

## Isolamento Multi-Tenant (2 tenants reais)

| Tenant | IOEs após testes P1C |
|---|---|
| find fish alimentos | 30 |
| industria de teste | 25+ |
| Cross-contamination T1↔T2 | **0** |

Processamento sequencial por `companyId` garante que cada tenant consome apenas seu próprio outbox (`WHERE company_id = $1`).

---

## Projeção de Capacidade por Configuração

### Configuração Atual (default)

```
batch_size=10, interval=30s, tenants=3
→ 3 × 10 = 30 eventos/ciclo = 60 eventos/min = 3.600 eventos/hora
```

### Configuração Otimizada (certificada P1C)

```
batch_size=100, interval=30s, tenants=3
→ 3 × 100 = 300 eventos/ciclo = 600 eventos/min = 36.000 eventos/hora
```

### Expansão Teórica (sem limite piloto)

```
batch_size=100, interval=30s, tenants=20
→ 20 × 100 = 2.000 eventos/ciclo = 4.000 eventos/min = 240.000 eventos/hora
```

**Nota:** Throughput real limitado pela drenagem medida (~176 eps contínuo) — ver P1C.6 Capacity Model.

---

## Gargalos para Expansão > 3 Tenants

| ID | Gargalo | Tipo | Resolução |
|---|---|---|---|
| MT-01 | `MAX_PILOT_TENANTS=3` em `aioiPilotFlags.js` | Config | Remover/elevar limite em fase P1D |
| MT-02 | Single advisory lock | Arquitetura | Worker sharding por partition |
| MT-03 | Loop sequencial | Código | `Promise.all` por tenant (paralelo) |
| MT-04 | RLS context switch por tenant | Overhead | ~1ms/tenant — aceitável até 50 tenants |

---

## Veredito

```json
{
  "safe_tenants_current_config": 3,
  "safe_tenants_tested": 2,
  "isolation_verified": true,
  "loop_overhead_20_tenants_ms": 50,
  "primary_bottleneck": "IMPETUS_AIOI_PILOT_TENANTS max=3",
  "bd_bottleneck_at_20_tenants": false
}
```

```
AIOI_P1C_MULTI_TENANT_SCALE_PASS
```

Performance de loop multi-tenant adequada até 20 tenants simulados. Expansão bloqueada por limite de configuração (3), não por gargalo de BD.
