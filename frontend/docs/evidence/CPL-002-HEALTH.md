# CPL-002 — Health Monitor

**Programa:** CPL-002  
**Fonte canónica:** `frontend/src/platform/cognitive/health/cognitiveHealthMonitor.js`  
**Tipo:** Read-only — **não executa regras cognitivas**

---

## Propósito

Monitor simples de saúde dos adapters registados no runtime. Fornece visibilidade operacional para consumidores da Cognitive Platform sem invadir domínios.

---

## Estados

| Estado | Significado |
|--------|-------------|
| `available` | Adapter registado, capabilities e providers presentes |
| `degraded` | Adapter presente mas sem capabilities ou providers completos |
| `offline` | Probe falhou ou adapter ausente |
| `unknown` | Sem health probe definido |

Constante: `COGNITIVE_HEALTH_STATES`.

---

## API

```javascript
import {
  probeAdapterHealth,
  monitorAllAdapters,
  getAdapterHealth,
  COGNITIVE_HEALTH_STATES
} from 'platform/cognitive/health/cognitiveHealthMonitor.js';
```

| Função | Descrição |
|--------|-----------|
| `probeAdapterHealth(adapter)` | Probe de um adapter (instância runtime) |
| `monitorAllAdapters()` | Agrega todos os adapters registados + summary |
| `getAdapterHealth(adapterId)` | Lookup por ID |

---

## Formato de resposta

```javascript
{
  status: 'available',
  adapterId: 'logistics_adapter',
  domain: 'logistics_wms',
  version: '1.0.0',
  capabilities: 6,
  capabilityList: ['insights', 'recommendations', ...],
  providers: ['domains/logistics-operational/...'],
  checkedAt: '2026-07-19T...'
}
```

Summary agregado:

```javascript
{
  summary: { total, available, degraded, offline, unknown, checkedAt },
  adapters: [ ... ]
}
```

---

## Integração

- Consumido por `getHealth()` na Discovery API
- Requer `bootstrapCognitivePlatformAdapters()` para 4 adapters activos
- Cada adapter pode definir `healthProbe()` customizado (delegação a metadados domínio)

---

## Limitações (by design)

- Não chama APIs HTTP de domínio em produção (probe estrutural)
- Não altera estado operacional
- Não substitui observabilidade domínio (OPM-GOV-001, COGNITIVE_* events)

---

## Testes

```bash
npm run test:cpl002-adapter-health   # 3/3
```
