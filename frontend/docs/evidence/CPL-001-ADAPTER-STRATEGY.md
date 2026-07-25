# CPL-001 — Cognitive Adapter Strategy

**Programa:** CPL-001  
**Status:** Documentação apenas — **adapters NÃO implementados**

---

## Modelo alvo

```
Cognitive Platform (CPL-002+)
        ↓
Domain Adapter
        ↓
Existing Domain Implementation (preserved)
```

O WMS torna-se **adapter**, não proprietário exclusivo da camada cognitiva.

---

## Adapters definidos

| Adapter ID | Domínio | Bridges (implementações existentes) | Fase |
|------------|---------|-------------------------------------|------|
| `logistics_adapter` | logistics_wms | OPM-007, OPM-008, logisticsNativeCockpitRegistry | CPL-002 |
| `quality_adapter` | quality | domains/quality/cognitive/, qualityNativeCockpitRegistry | CPL-002 |
| `safety_adapter` | safety | SafetyCognitiveHub, cognitiveRuntime/domains/sst/ | CPL-002 |
| `environment_adapter` | environment | environment/cognitive-runtime/, cognitiveRuntime/domains/environmental/ | CPL-002 |
| `maintenance_adapter` | maintenance | cognitiveRuntime/domains/maintenance/ | CPL-002 |
| `production_adapter` | production | cognitiveRuntime/domains/production/ | CPL-002 |
| `ppap_adapter` | ppap | CognitivePpapHub, ppapNativeCockpitRegistry | CPL-003 |
| `ishikawa_adapter` | ishikawa | ishikawaHubs, ishikawaNativeCockpitRegistry | CPL-003 |
| `command_center_adapter` | command_center | cognitiveEcosystem/, smartPanel/ | CPL-003 |

---

## Logistics Adapter (referência)

```
Cognitive Platform
        ↓
Logistics Adapter (CPL-002)
        ↓
├── OPM-007 Warehouse Intelligence (analítico)
├── OPM-008 Cognitive Logistics (cognitivo)
├── cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry
└── domains/logistics/cockpit/CognitiveLogisticsHub (Centro Comando)
```

**Nota:** `CognitiveLogisticsHub` (cockpit CC) e `CognitiveLogisticsModule` (OPM-008 operational) são **distintos** — ambos preservados.

---

## Quality Adapter (futuro)

```
Cognitive Platform
        ↓
Quality Adapter
        ↓
├── CognitiveQualityHub
├── QualityRecommendationPanel
├── qualityCognitiveRuntimeSignalAdapter
└── qualityNativeCockpitRegistry
```

---

## Safety / Environment / Maintenance

Mesmo padrão: adapter traduz contratos corporativos (`RecommendationProvider`, etc.) para implementações domínio existentes **sem reimplementação**.

---

## Regras do adapter (CPL-002)

1. **Read-only** por defeito — sem mutações operacionais
2. **Pass-through** para implementação canónica do domínio
3. **Decision trace** obrigatório em recomendações
4. **Sem dependência inversa** — domínios não importam platform/cognitive
5. **Feature flag** por domínio para rollout incremental

---

## Proibido em CPL-001

- Criar ficheiros `*Adapter.js` funcionais
- Alterar imports nos domínios
- Migrar lógica de OPM-007/008 para platform/

---

## Registo

Ver `COGNITIVE_ADAPTER_REGISTRY` em `cognitivePlatformRegistry.js`.
