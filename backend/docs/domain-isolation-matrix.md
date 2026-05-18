# Matriz de isolamento contextual entre domínios

Fonte canónica: `backend/src/domainAuthority/registry/domainRegistry.js`  
Enforcement: `backend/src/domainAuthority/guards/domainIsolationGuard.js`

## Matriz obrigatória (resumo)

| Axis | Allowed (exemplos) | Denied (exemplos) |
|------|-------------------|-------------------|
| **environmental** | ESG, waste_management, utilities, environment_intelligence, water_consumption, emissions | SPC, CAPA, NCR quality, quality_intelligence, raw_material_lots, manuia |
| **sustainability** | environment_intelligence, esg_reporting | quality_intelligence, quality_spc |
| **quality** | CAPA, SPC, quality_intelligence, inspection, raw_material_lots | ESG, waste_management, emissions, environment_intelligence |
| **hr** | people, payroll, hr_intelligence, pulse_rh, training | PLC, industrial telemetry, manuia, quality_intelligence, anomaly_detection |
| **financial** | costs, budget, audit, financial_intelligence | industrial telemetry, sensors, SPC, manuia, anomaly_detection |
| **logistics** | logistics_tms, wms, expedition | quality_intelligence, hr_intelligence, environment_intelligence |
| **safety** | sst, incident_safety, epi | quality_intelligence |
| **maintenance** | manuia, maintenance_os, tpm | hr_intelligence, environment_intelligence |
| **production** | oee, production_shift, anomaly_detection | hr_intelligence, environment_intelligence |
| **operations** | operational_command, anomaly_detection | — (domínio amplio) |
| **compliance** | compliance_audit, regulatory, audit | plc_telemetry, production_shift |
| **legal** | legal_cases, audit | manuia, quality_intelligence, plc_telemetry |
| **admin** | admin, audit, systems | — |
| **pcp** | mrp, scheduling | hr_intelligence, environment_intelligence |
| **engineering** | process_engineering, anomaly_detection | hr_intelligence, quality_intelligence |
| **utilities** | utilities_consumption, environment_intelligence | quality_intelligence |

## Regras cross-domain (guard)

| Origem | Bloqueia padrão |
|--------|-----------------|
| environmental* | `quality`, `spc`, `capa`, `ncr`, `supplier_quality` |
| quality | `waste`, `emission`, `esg`, `environmental_governance`, `environment_intelligence` |
| hr | `plc`, `telemetry`, `manuia`, `opcua`, `mqtt` |
| finance | `plc`, `telemetry`, `spc`, `sensor`, `opcua` |
| compliance / legal | `production_shift`, `plc`, `oee` |

## Módulos de menu (`visible_modules`)

| menu_key | Domínios típicos |
|----------|------------------|
| `environment_intelligence` | environmental, sustainability, esg, utilities, ehs |
| `quality_intelligence` | quality, laboratory, production (parcial) |
| `hr_intelligence` | hr |
| `manuia` | maintenance, industrial, production |
| `anomaly_detection` | production, operations, engineering, maintenance |
| `audit` | finance, compliance, legal, governance, executive |

## Pipelines cognitivos

| Pipeline | Domínio |
|----------|---------|
| `quality_spc`, `quality_capa`, `quality_ncr` | quality |
| `waste_management`, `emissions`, `esg_reporting` | environmental / sustainability |
| `people_analytics`, `payroll` | hr |
| `financial_intelligence`, `cost_center` | finance |
| `plc_telemetry`, `opcua`, `mqtt_sensors` | production / maintenance (negado em hr/finance) |

## Cenários de regressão validados

| Persona | Axis | Perfil | Sem módulo |
|---------|------|--------|------------|
| Coordenador de Meio Ambiente | environmental | coordinator_environmental | quality_intelligence |
| Gerente de RH | hr | manager_hr | quality_intelligence |
| Diretor Financeiro (CFO) | finance | director_financial | manuia |
| Coordenador Jurídico | legal | coordinator_legal | quality_intelligence |
| Técnico de Segurança do Trabalho | safety | coordinator_safety | quality_intelligence |
| Coordenador de Qualidade | quality | coordinator_quality | environment_intelligence |

## Verificação

```bash
cd backend && npm run test:domain-contextual-regression
```

Logs esperados em violação: `DOMAIN_MODULE_DENIED`, `DOMAIN_ISOLATION_BLOCKED`.
