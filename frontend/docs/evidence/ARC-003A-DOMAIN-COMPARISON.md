# ARC-003A — Domain Composition Comparison

**Antes ARC-003 → Depois ARC-003 → Depois ARC-003A**

---

## Logística

| Aspecto | Pré-ARC-003 | ARC-003 (regressão?) | ARC-003A |
|---------|-------------|----------------------|----------|
| WMS standalone (OPM-001A) | IndustrialModuleLayout completo | ✅ Intacto (suppressModuleHeader) | ✅ Intacto |
| Hub `/app/logistics/operational` | KPIs OTIF, OperationsOverview, atalhos | ⚠️ `companyId` perdido → KPIs vazios | ✅ Contexto restaurado |
| Header | Inline h1 hub | EOX Header único | EOX Header + hub h1 suprimido |
| Toolbar/Grid/Timeline WMS | OPM-001A slots | ✅ Preservados | ✅ Preservados |

---

## Qualidade

| Componente | Pré-ARC-003 | ARC-003 | ARC-003A |
|------------|-------------|---------|----------|
| QualityRealtimeStatusBar | Acima do conteúdo | ✅ Acima do EOX | ✅ Intacto |
| Hub default (atalhos) | Cards + links | ⚠️ "Sessão sem empresa" | ✅ Hub + cards visíveis |
| `?view=governance` | QualityGovernanceHub (SPC, NCR, CAPA) | ⚠️ Bloqueado por companyId | ✅ Hub monta |
| `?view=telemetry` | QualityTelemetryHub | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=cognitive` | CognitiveQualityHub | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=rollout` | QualityRolloutHub | ⚠️ Bloqueado | ✅ Restaurado |
| `/inspection` | QualityInspectionRuntime | ⚠️ Bloqueado | ✅ Restaurado |
| `/kiosk` | QualityKioskRuntime | ⚠️ Bloqueado | ✅ Restaurado |
| EOX Header | — | ✅ Adicionado | ✅ Mantido (shell only) |

---

## Segurança (SST)

| Componente | Pré-ARC-003 | ARC-003 | ARC-003A |
|------------|-------------|---------|----------|
| Hub default | Atalhos GHE, Incidentes, PT/LOTO | ⚠️ companyId perdido | ✅ Restaurado |
| `?view=governance` | SafetyGovernanceHub (GHE, matriz) | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=telemetry` | SafetyTelemetryHub | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=incident` | SafetyIncidentPanel | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=ptw` | Placeholder (pré-existente parcial) | Placeholder | ✅ SafetyGovernanceHub |
| `?view=epi` | Placeholder | Placeholder | ✅ SafetyGovernanceHub |
| `/inspection` | SafetyFieldInspectionPage | ⚠️ Bloqueado | ✅ Restaurado |

---

## Meio Ambiente

| Componente | Pré-ARC-003 | ARC-003 | ARC-003A |
|------------|-------------|---------|----------|
| Hub default | Cards operacionais | ⚠️ companyId perdido | ✅ Restaurado |
| `?view=water/effluent/…` | EnvironmentOperationalViewRouter | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=esg/compliance/…` | EnvironmentGovernanceViewRouter | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=telemetry` | EnvironmentTelemetryViewRouter | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=cognitive` | EnvironmentCognitiveViewRouter | ⚠️ Bloqueado | ✅ Restaurado |
| `?view=executive` | EnvironmentExecutiveViewRouter | ⚠️ Bloqueado | ✅ Restaurado |
| Remount `?view=` | — | Risco estado preso | ✅ key=pathname+search |

---

## Árvore de composição corrigida (exemplo Qualidade)

```
QualityOperationalLayout
└── QualityOperationalShell
    ├── QualityRealtimeStatusBar          ← domínio (fora EOX)
    └── Outlet context={{ companyId }}
        └── QualityOperationalNavLayout   ← EoxDomainNavLayout
            └── EoxModuleShell
                ├── EoxHeader             ← casco corporativo ONLY
                └── Outlet context={parentCtx}  ← FIX ARC-003A
                    └── QualityOperationalWorkspacePage
                        └── QualityOperationalWorkspace
                            ├── QualityGovernanceHub
                            ├── QualityTelemetryHub
                            └── QualityOperationalHub (cards)
```

---

## Lição aprendida

Testes ARC-003 verificaram **arquitectura e rotas**, não **composição visual com contexto de tenant**. ARC-003A adiciona testes que verificam:

- Reencaminhamento de Outlet context
- Preservação de roots de composição por domínio
- EOX como shell, não substituto de layout
