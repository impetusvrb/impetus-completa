# FIN-CONCEPT-001 — Financial Digital Twin Opportunity

**Achado explícito da auditoria.** Não é implementação.

## Tese

A plataforma já possui os tijolos de um **Financial Digital Twin**:

| Camada | Componente existente |
|--------|----------------------|
| Planta digital | `digitalTwinService`, Applied ManuIA, `integrations/digital-twin/state` |
| Twin organizacional | `organizationalIntelligenceEngine` → `digital_twin` |
| UI cognitiva | `DigitalTwinPanel` (Centro Cognitivo) |
| $ operacional | `industrialCostService` + `industrialCostImpactService` |
| Perdas | `financialLeakageDetectorService` (REG-002) |
| Projecção | `operationalForecastingService` + Centro de Previsão |
| Cenários | CPL `ScenarioProvider`, OPM-008 what-if, AIOI scenarios |
| Economia proxy | `operationalEconomicImpactEngine`, `economicPressureIndexEngine` |
| Domínio UX | Finance hub (FIN-EVOLVE-001 / 001A) |

## O que NÃO existe ainda

1. Camada de **projecção financeira** sobre o estado do twin  
2. Mapeamento estável **máquina/sector → cost drivers**  
3. Vista EOX Finance **“Twin Financeiro”**  
4. Overlay **what-if $** no twin (sem side-effects)

## Porquê integrate_then_develop (e não greenfield)

Criar um “simulador financeiro” novo duplicaria:

- forecasting já existente  
- scenario simulation já existente (CPL/OPM)  
- impacto de custo já existente  
- visualização de planta já existente  

A evolução correcta é **adapter + projection layer** sobre o twin e os serviços $ — preservando Baseline e OPM/WMS certificados.

## Relação com outras ideias

| Ideia | Papel no Financial Digital Twin |
|-------|----------------------------------|
| Smart Costing | Drivers de custo unitário no twin |
| Manutenção Preditiva Financeira | Nó de falha → $ no twin |
| What-if | Overlay de cenário |
| Performance económica | Score agregado do twin |
| Alertas / KPIs | Superfície de leitura |

## Decisão recomendada para FIN-PLAN-001

Classificar **Financial Digital Twin** no **Finance Release 2.2** (expansão incremental P1) — **depois de FIN-STAB-001 e Release 2.0/2.1**, **antes** de CAPEX/OPEX ou consolidação gerencial.

## Proibido nesta fase

- Implementar a camada de projecção  
- Alterar `digitalTwinService` core  
- Criar runtime financeiro novo  

Apenas registar a oportunidade e as dependências.
