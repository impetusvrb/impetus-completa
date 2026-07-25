# REV-001 — Gap Matrix

**Revisão:** REV-001  
**Modo:** READ ONLY  
**Data:** 2026-07-18

Identificadores de lacuna: **`GAP-{DOMÍNIO}-{NNN}`** — backlog formal para fechamento.

---

## Legenda

| Prioridade | Significado |
|------------|-------------|
| **P0** | Bloqueia completude funcional ou homologação |
| **P1** | Impacto alto; roadmap já prevê |
| **P2** | Melhoria / paridade UX |
| **P3** | Dívida técnica / documentação |

| Impacto | Descrição |
|---------|-----------|
| **Crítico** | Módulo inutilizável ou risco operacional |
| **Alto** | Funcionalidade core incompleta |
| **Médio** | UX / visibilidade / paridade |
| **Baixo** | Naming / consistência documental |

---

## Matriz principal

| ID | Domínio | Projeto arquitectural | Estado actual | Gap | Impacto | Prioridade | Recomendação | Dependências |
|----|---------|----------------------|---------------|-----|---------|:----------:|--------------|--------------|
| **GAP-WMS-001** | WMS | WMS-003 APIs reais via OCL | Stubs foundation | Endpoints retornam status foundation, não dados operacionais | Alto | **P0** | Executar WMS-003 | WMS-002 ✅ |
| **GAP-WMS-002** | WMS | WMS-004 FE workspace real | Mocks KPIs (AUD-001 G-LOG-002) | UI operacional não consome APIs reais | Alto | **P0** | WMS-004 após WMS-003 | GAP-WMS-001 |
| **GAP-WMS-003** | WMS | WMS-005 RBAC + Navigation | RBAC `activated: false`, menu oculto | Operadores não acedem WMS | Alto | **P1** | WMS-005 | GAP-WMS-002 |
| **GAP-WMS-004** | WMS | WMS-006 Operational Validation | Não iniciado | Sem homologação WMS | Alto | **P1** | WMS-006 + BASELINE-WMS-v1.0 | GAP-WMS-003 |
| **GAP-WMS-005** | WMS | Flags prod activas | `IMPETUS_WMS_*` default OFF | Runtime desligado em prod | Médio | **P1** | Activar após WMS-005 gate | GAP-WMS-003 |
| **GAP-LOG-001** | Logística | Menu publication ON | `VITE_IMPETUS_LOGISTICS_*` ausentes prod | Sidebar logística oculto | Médio | **P1** | Activar flags após WMS-004 ou piloto controlado | GAP-WMS-002 |
| **GAP-LOG-002** | Logística | UI ops + CC alinhados AUD-001 | CC homologado; ops WMS incompleto | Desalinhamento cognitivo vs operacional | Alto | **P0** | WMS-003→004; manter `logistics_native` LOCKED | GAP-WMS-001 |
| **GAP-LOG-003** | Logística | Integração Supply futura | Declarativa only | Sem eventos canónicos cross-domain | Baixo | **P2** | Pós GF-027 + adaptador semântico | GF-027 |
| **GAP-SUP-001** | Supply | GF-025 Promotion + CC | Facade sem `supply_signal_loader` | Runtime não publicado no dashboard | Alto | **P0** | Executar GF-025 | GF-024 ✅ |
| **GAP-SUP-002** | Supply | GF-025 facade attachment | `cognitiveRuntimeFacade` sem supply | CC não recebe blocos Supply | Alto | **P0** | Parte GF-025 | GAP-SUP-001 |
| **GAP-SUP-003** | Supply | APIs REST scoped | Sem mount `server.js` | Domínio in-memory only | Alto | **P1** | GF-026 ou fase API dedicada | GAP-SUP-002 |
| **GAP-SUP-004** | Supply | RBAC + perfis procurement | Sem definições | Acesso não governado | Alto | **P1** | GF-026 Pilot Enablement | GAP-SUP-003 |
| **GAP-SUP-005** | Supply | UI + menu Supply | Sem rota FE | Módulo invisível | Alto | **P1** | GF-026 | GAP-SUP-004 |
| **GAP-SUP-006** | Supply | GF-027 Homologation | Foundation only | Não registado SYSTEM v1.5 | Médio | **P1** | GF-027 + INC | GF-026 |
| **GAP-PPAP-001** | PPAP | Navegação dedicada baseline | CC only, sem rotas App.jsx | Utilizador só acede via Centro de Comando | Médio | **P2** | Rotas FE opcionais ou documentar CC-only | — |
| **GAP-MSA-001** | MSA | Paridade navegação PPAP | CC only | Mesmo gap PPAP | Médio | **P2** | Idem PPAP | — |
| **GAP-ISH-001** | Ishikawa | Paridade navegação | CC only | 10 hubs só via CC | Médio | **P2** | Idem PPAP | — |
| **GAP-QMS-001** | Qualidade | Sub-runtimes no menu | PPAP/MSA/Ishikawa CC-only | Descoberta difícil fora CC | Médio | **P2** | Links CC → módulos ou menu quality estendido | — |
| **GAP-EHS-001** | SST | Safety executive visibility | Flag ausente prod | Itens cognitive/executive ocultos | Médio | **P2** | `VITE_IMPETUS_SAFETY_EXECUTIVE_VISIBILITY_ENABLED` | — |
| **GAP-EHS-002** | SST | Paridade Environment menu | CEO/diretor suppress domain nav | Liderança sem overlay safety | Médio | **P2** | Revisar `Layout.jsx` policy | — |
| **GAP-ENV-001** | Ambiente | domainRegistry shadow | `status: shadow` | Registo não active | Baixo | **P3** | Promover status pós validação | — |
| **GAP-EXEC-001** | Executive | Descoberta portal | Deep-link only | Utilizadores não encontram portal | Médio | **P2** | Link institucional documentado | — |
| **GAP-PLAT-001** | Plataforma | Testes BD CI (EV-001 C-4) | Testes hang local | Regressão não validada em ambiente | Alto | **P1** | CI com PostgreSQL | — |
| **GAP-PLAT-002** | Plataforma | Manifest FOUNDATION vs HOMOLOGATED | Tensão MSA/Ishikawa/PPAP | Confusão governança | Baixo | **P3** | Alinhar `baselineManifest.js` doc | — |
| **GAP-PLAT-003** | Plataforma | HR / Production / Maintenance UI | Facade only | Baselines LOCKED sem UI industrial dedicada | Médio | **P2** | Programa EV incremental | — |
| **GAP-LOG-004** | Logística | ColaboradorRouteGuard logistics | Prefixos logistics excluídos | Operadores redireccionados | Médio | **P2** | Alinhar guard com quality/safety | — |

---

## Resumo por domínio

| Domínio | Lacunas | P0 | P1 | P2 | P3 |
|---------|:-------:|:--:|:--:|:--:|:--:|
| WMS | 5 | 2 | 3 | 0 | 0 |
| Logística | 4 | 1 | 1 | 2 | 0 |
| Supply | 6 | 2 | 4 | 0 | 0 |
| PPAP / MSA / Ishikawa | 3 | 0 | 0 | 3 | 0 |
| Qualidade | 1 | 0 | 0 | 1 | 0 |
| SST | 2 | 0 | 0 | 2 | 0 |
| Ambiente | 1 | 0 | 0 | 0 | 1 |
| Executive | 1 | 0 | 0 | 1 | 0 |
| Plataforma | 3 | 0 | 1 | 1 | 1 |
| **Total** | **26** | **5** | **9** | **10** | **2** |

---

## Cadeia de dependências críticas

```
WMS-002 ✅
    └── GAP-WMS-001 (WMS-003)
            └── GAP-WMS-002 (WMS-004)
                    ├── GAP-WMS-003 (WMS-005)
                    │       └── GAP-WMS-004 (WMS-006)
                    └── GAP-LOG-001 / GAP-LOG-002

GF-024 ✅
    └── GAP-SUP-001/002 (GF-025)
            └── GAP-SUP-003/004/005 (GF-026)
                    └── GAP-SUP-006 (GF-027)
```

---

## Itens pendentes consolidados

### Alta prioridade (P0 + P1)

| ID | Item | Programa |
|----|------|----------|
| GAP-WMS-001 | APIs operacionais reais | WMS-003 |
| GAP-WMS-002 | FE workspace sem mocks | WMS-004 |
| GAP-WMS-003 | RBAC + navigation WMS | WMS-005 |
| GAP-WMS-004 | Validação operacional WMS | WMS-006 |
| GAP-LOG-002 | Alinhamento ops/cognitivo logística | WMS-003+ |
| GAP-SUP-001/002 | Promotion + CC Supply | GF-025 |
| GAP-SUP-003/004/005 | APIs, RBAC, UI Supply | GF-026 |
| GAP-SUP-006 | Homologação Supply | GF-027 |
| GAP-LOG-001 | Menu logística prod | Pós-WMS-004 |
| GAP-PLAT-001 | CI testes BD | Infra |

### Média prioridade (P2)

Navegação PPAP/MSA/Ishikawa; Safety executive visibility; Executive discovery; Production/Maintenance/HR UI; Logistics route guard.

### Baixa prioridade (P3)

GAP-ENV-001, GAP-PLAT-002.

---

## Fechamento pós-GF-025

**Actualização:** 2026-07-18 · Governança REV-001 viva

| ID | Estado anterior | Estado actual | Fechado por |
|----|-----------------|---------------|-------------|
| **GAP-SUP-001** | OPEN (P0) | **CLOSED** | GF-025 — Promotion Runtime + CC Foundation |
| **GAP-SUP-002** | OPEN (P0) | **DEFERRED → GF-026** | Facade `cognitiveRuntimeFacade` fora do escopo GF-025 |
| GAP-SUP-003 | OPEN | OPEN | — |
| GAP-SUP-004 | OPEN | OPEN | — |
| GAP-SUP-005 | OPEN | OPEN | — |
| GAP-SUP-006 | OPEN | OPEN | — |

**Novos GAPs introduzidos pela GF-025:** nenhum.

---

## Fechamento pós-WMS-003

**Actualização:** 2026-07-18

| ID | Estado anterior | Estado actual | Fechado por |
|----|-----------------|---------------|-------------|
| **GAP-WMS-001** | OPEN (P0) | **CLOSED** | WMS-003 — Operational APIs v1 via OCL |
| GAP-WMS-002 | OPEN | OPEN | WMS-004 FE workspace |
| GAP-LOG-002 | OPEN (P0) | **PARTIAL** | Ops APIs ready; FE mocks persist (WMS-004) |

**Novos GAPs introduzidos pela WMS-003:** nenhum.

---

## Fechamento pós-GF-026

**Actualização:** 2026-07-18

| ID | Estado anterior | Estado actual | Fechado por |
|----|-----------------|---------------|-------------|
| **GAP-SUP-002** | DEFERRED | **CLOSED** | GF-026 — facade + CC consolidation |
| GAP-SUP-003 | OPEN | **PARTIAL** | Pilot bridge OK; Supply REST → GF-027 |
| GAP-SUP-004 | OPEN | **PARTIAL** | Pilot policy; RBAC formal → GF-027 |
| GAP-SUP-005 | OPEN | OPEN | UI/menu → GF-027 |
| GAP-SUP-006 | OPEN | OPEN | Homologation → GF-027 |

**Novos GAPs GF-026:** nenhum.

---

## Fechamento pós-GF-027

**Actualização:** 2026-07-18

| ID | Estado anterior | Estado actual | Fechado por |
|----|-----------------|---------------|-------------|
| GAP-SUP-003 | PARTIAL | **CLOSED** | GF-027 — REST APIs `/api/supply/v1` |
| GAP-SUP-004 | PARTIAL | **CLOSED** | GF-027 — RBAC formal |
| GAP-SUP-005 | OPEN | **CLOSED** | GF-027 — workspace + CC (flags OFF) |
| GAP-SUP-006 | OPEN | **CLOSED** | GF-027 — homologation COMPLETE; SYSTEM → INC-048 |

**Novos GAPs GF-027:** nenhum.

**Supply GAPs remanescentes REV-001:** nenhum (todos GAP-SUP encerrados).

---

## Fechamento pós-WMS-004

**Actualização:** 2026-07-18

| ID | Estado anterior | Estado actual | Fechado por |
|----|-----------------|---------------|-------------|
| **GAP-WMS-002** | OPEN | **CLOSED** | WMS-004 — workspace FE consome APIs v1 |
| GAP-WMS-003 | OPEN | OPEN | WMS-005 — menu + RBAC activation |
| GAP-LOG-001 | OPEN | **PARTIAL** | Menu flags → WMS-005 |
| GAP-LOG-002 | PARTIAL | **PARTIAL** | Legacy FE mocks; WMS-004 workspace OK |

**Novos GAPs WMS-004:** nenhum.

---

## Validação pós-INC-048

**Actualização:** 2026-07-18

| Verificação | Resultado |
|-------------|-----------|
| GAP-SUP-001 … 006 | **CLOSED** (sem reabertura) |
| GAP-WMS-001 | **CLOSED** (sem reabertura) |
| GAP-WMS-002 | **CLOSED** (sem reabertura) |
| Novos GAPs INC-048 | **nenhum** |

---

## Validação pós-WMS-005

**Actualização:** 2026-07-18 · Modo validação only (INC-048 conformant)

| ID | Estado anterior | Estado actual | Validação WMS-005 |
|----|-----------------|---------------|-------------------|
| GAP-WMS-003 | OPEN | **VALIDATED** | RBAC + navigation testados; activation prod → WMS-006 |
| GAP-LOG-001 | PARTIAL | **PARTIAL** | Menu flags validados; activation prod → WMS-006 |
| GAP-LOG-002 | PARTIAL | **PARTIAL** | Legacy FE mocks documentados; workspace WMS-004 OK |
| GAP-WMS-001 … 002 | CLOSED | **CLOSED** | Sem reabertura |
| GAP-SUP-001 … 006 | CLOSED | **CLOSED** | Sem reabertura |

**Novos GAPs WMS-005:** nenhum.

**Inconsistências encontradas:** nenhuma corrigida automaticamente (conforme governança WMS-005).

**Parecer:** **READY FOR WMS-006**

**Defeitos corrigidos durante validação (não reclassificados como GAP):**

| Item | Classificação | Acção |
|------|---------------|-------|
| Import paths `purchaseRequestAggregate` | Defeito implementação | Corrigido (sem alteração arquitectural) |
| Round-trip `unitPrice` em `valueObjects` | Defeito domínio | Corrigido |
| `createDraft` reset indevido de status PR | Defeito serviço | Corrigido |
| Path FE em `runInc048CrossDomainTests` | Defeito teste | Corrigido |

---

## Certificação pós-WMS-006

**Actualização:** 2026-07-18 · Modo homologação congelada (zero evolução arquitectural)

| ID | Estado anterior | Estado actual | Certificação WMS-006 |
|----|-----------------|---------------|----------------------|
| GAP-WMS-004 | OPEN | **CERTIFIED** | Homologação congelada completa |
| GAP-WMS-003 | VALIDATED | **VALIDATED** | Sem alteração — activation pós-REV-002 |
| GAP-LOG-001 | PARTIAL | **PARTIAL** | Correctamente classificado |
| GAP-LOG-002 | PARTIAL | **PARTIAL** | Correctamente classificado — legacy mocks |
| GAP encerrados | CLOSED | **CLOSED** | Sem reabertura |

**Novos GAPs WMS-006:** nenhum.

**Alterações arquitecturais durante WMS-006:** nenhuma.

**Baseline Candidate Manifest:** `BASELINE-CANDIDATE-SUPPLY-WMS-v2.0`

**Parecer:** **READY FOR REV-002**

---

*Roadmap:* [REV-001-ROADMAP-RECOMMENDATION.md](./REV-001-ROADMAP-RECOMMENDATION.md)
