# CERT — Módulo Gêmeo Digital Aplicado (Manu IA)

**Data:** 2026-06-23  
**Tipo:** FEAT — Módulo desacoplado dentro do ManuIA  
**Módulo:** Gêmeo Digital Aplicado  

## Objetivo

Transformar o Manu IA em plataforma de diagnóstico industrial visual inteligente usando Gemini como motor cognitivo especializado em engenharia industrial.

## Arquitetura

```
Sensor/PLC → Manu IA (dados existentes) → Gêmeo Digital Aplicado → Gemini Industrial Engine
                                                    ↓
                                         Diagnóstico + Visual + Procedimento + Tendência
                                                    ↓
                                         Memória Industrial (aprendizado contínuo)
```

**Princípio:** zero duplicação de dados — consome `manuia_machines`, `manuia_sensors`, `work_orders`, `manuia_emergency_events` existentes.

## Ficheiros criados

### Backend

| Ficheiro | Propósito |
|----------|-----------|
| `models/digital_twin_applied_migration.sql` | 3 tabelas: diagnostics, memory, visual_assets |
| `services/geminiIndustrialEngine.js` | Motor Gemini especializado (diagnóstico, visual, procedimento, trend, imagem) |
| `services/digitalTwinDiagnosticService.js` | Orquestração completa: contexto → Gemini → persistência → memória |
| `services/digitalTwinMemoryService.js` | Busca, estatísticas, top falhas (aprendizado contínuo) |
| `routes/digitalTwinApplied.js` | 10 endpoints HTTP sob `/api/manutencao-ia/digital-twin/*` |

### Frontend

| Ficheiro | Propósito |
|----------|-----------|
| `modules/digital-twin/DigitalTwinAppliedModule.jsx` | Módulo completo: dashboard, diagnóstico, resultado, histórico |
| `modules/digital-twin/DigitalTwinApplied.css` | Design System Industrial 4.0 |

### Integração (aditiva — zero mudança nos existentes)

| Ficheiro | Alteração |
|----------|-----------|
| `routes/manutencao-ia.js` | `router.use('/digital-twin', ...)` (3 linhas adicionadas no fim) |
| `pages/ManuIA.jsx` | Import + nova aba "Gêmeo Digital" (sem alterar abas existentes) |
| `services/api.js` | `export const digitalTwin = { ... }` (novo bloco) |

## Rotas HTTP

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/digital-twin/health` | Health check + status Gemini |
| GET | `/digital-twin/dashboard` | KPIs + memória + top falhas |
| POST | `/digital-twin/diagnose` | Diagnóstico completo (sensores + Gemini) |
| GET | `/digital-twin/diagnostics` | Listar diagnósticos |
| GET | `/digital-twin/diagnostics/:id` | Diagnóstico detalhado + assets visuais |
| POST | `/digital-twin/diagnostics/:id/resolve` | Resolver + registrar na memória |
| POST | `/digital-twin/trend-analysis` | Análise de tendência standalone |
| POST | `/digital-twin/image-diagnostic` | Diagnóstico por imagem |
| GET | `/digital-twin/memory` | Busca memória industrial |
| GET | `/digital-twin/memory/stats` | Estatísticas memória |

## Capacidades do Motor Gemini Industrial

1. **Diagnóstico por sensores** — temperatura, vibração, corrente, pressão, RPM
2. **Diagnóstico por imagem** — análise visual de componentes industriais
3. **Geração visual** — vista explodida, corte técnico, isométrica, destaque, comparação
4. **Procedimento completo** — causa raiz, plano de ação, LOTO, checklist, ferramentas, peças
5. **Análise de tendência** — predição de falha 7/30 dias, ETA alarme
6. **Memória industrial** — aprendizado contínuo por falha/componente/efetividade

## Feature flags

| Variável | Default | Efeito |
|----------|---------|--------|
| `ENABLE_MANUIA` | `true` | Controla todo o ManuIA (inclui gêmeo digital) |
| `ENABLE_DIGITAL_TWIN` | `true` | Controla apenas o sub-módulo gêmeo digital |

## Tabelas de BD

| Tabela | Registos (deploy) |
|--------|-------------------|
| `digital_twin_diagnostics` | 0 |
| `digital_twin_memory` | 0 |
| `digital_twin_visual_assets` | 0 |

## Validação

```bash
# Health check
curl http://localhost:3000/api/manutencao-ia/digital-twin/health
# → {"ok":true,"module":"digital_twin_applied","gemini_available":true,"version":"1.0.0"}

# Smoke test modules
node -e "require('./src/services/geminiIndustrialEngine'); require('./src/services/digitalTwinDiagnosticService'); console.log('OK')"
```

## Preparação para evolução futura

- Tabela `digital_twin_visual_assets` com `asset_type` extensível
- `embedding_vector FLOAT8[]` em `digital_twin_memory` para futuro RAG pgvector
- Arquitetura preparada para Three.js/GLB/OBJ (campo `visual_url` em diagnostics)
- CSS com variáveis de cor por criticidade (green → yellow → orange → red)
