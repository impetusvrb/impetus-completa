# REV-001 — Domain Coverage

**Revisão:** REV-001  
**Modo:** READ ONLY  
**Data:** 2026-07-18

---

## Critério de classificação (REV-001)

**IMPLEMENTADO** exige, quando aplicável: runtime registado · registries · RBAC · flags · CC · navegação · APIs · UI ops · UI gov · coerência arquitectural.

---

## 1. Qualidade (`quality_native`)

| Dimensão | Previsto | Implementado | Aderência |
|----------|----------|--------------|:---------:|
| Runtime | `quality_native` LOCKED | `cognitiveRuntime/bridge/qualityTenantSignalLoader.js`, Z.19–Z.23 | ✅ |
| Registries | domainRegistry + cognitiveDomainRegistry | `domains/_core/domainRegistry.js`, `cognitiveDomainRegistry.js` | ✅ |
| Signal loader | Sim | `qualityTenantSignalLoader.js` | ✅ |
| Promotion / CC | Sim | `renderPromotionSupervisor.js`, `cognitiveCockpitConsolidator.js` | ✅ |
| Facade dashboard | Sim | `cognitiveRuntimeFacade.js` → `specialized_cockpit_runtime` | ✅ |
| APIs | quality-intelligence, operational, governance, telemetry, cognitive | `server.js` mounts L~850+ | ✅ |
| UI operacional | `/app/quality/operational` | `App.jsx` + manifesto publicação | ✅ |
| UI governança | governance routes + activation | `quality-governance`, rollout | ✅ |
| RBAC | domainAuthority eixo quality | `domainAuthority/registry/domainRegistry.js` | ✅ |
| Feature flags | Z.19–Z.23 | `phaseZ19/22/23FeatureFlags.js`; **prod ON** | ✅ |

**Classificação:** **IMPLEMENTADO**

**Evidências:** `domains/quality/`, `BASELINE-QUALITY-v1.1.md`, `qualityNativeCockpitRegistry.js`

---

## 2. Segurança do Trabalho / SST (`safety_native`)

| Dimensão | Previsto | Implementado | Aderência |
|----------|----------|--------------|:---------:|
| Runtime | `safety_native` LOCKED | `cognitiveRuntime/domains/sst/` | ✅ |
| Signal loader / CC | Z.25 | `safetySignalLoader.js`, `safetyCockpitConsolidationRuntime.js` | ✅ |
| Facade | Sim | `sst_cognitive_runtime` | ✅ |
| APIs | safety-operational, governance, telemetry, cognitive | `server.js` | ✅ |
| UI operacional | `/app/safety/operational` | `App.jsx` | ✅ |
| Menu | Publicação safety | **Prod ON** exceto `SAFETY_EXECUTIVE_VISIBILITY` | ⚠️ |
| RBAC | SST + EHS inheritance | `ehsModuleInheritance.js`, `canRegisterSstEvent()` | ✅ |

**Classificação:** **IMPLEMENTADO PARCIALMENTE**  
**Gap:** GAP-EHS-001 (visibilidade executive/cognitive menu)

---

## 3. Meio Ambiente (`environmental_native`)

| Dimensão | Previsto | Implementado | Aderência |
|----------|----------|--------------|:---------:|
| Runtime | `environmental_native` LOCKED | `cognitiveRuntime/domains/environmental/` | ✅ |
| domainRegistry | shadow → active path | `status: shadow` | ⚠️ |
| CC + facade | P1Env | `environmental_cognitive_runtime` | ✅ |
| APIs | environment-* suite | `server.js` | ✅ |
| UI | `/app/environment/operational` | Publicação **prod ON** | ✅ |
| RBAC | domainAuthority environmental | Flags operacionais gated | ✅ |

**Classificação:** **IMPLEMENTADO** (registry shadow é estado documentado, não ausência)

---

## 4. Logística — análise aprofundada

### 4.1 Runtime cognitivo (`logistics_native`)

| Pergunta | Resposta | Evidência |
|----------|----------|-----------|
| Existe runtime? | **Sim** | `cognitiveRuntime/domains/logistics/runtime/logisticsRuntimeDescriptor.js` |
| Registado? | **Sim** | `cognitiveDomainRegistry`, `HOMOLOGATED_RUNTIMES`, `BASELINE-LOGISTICS-v1.1` |
| Signal loader? | **Sim** | `logisticsTenantSignalLoader.js`, binding runtime |
| Promotion / CC? | **Sim** | `logisticsRenderPromotionSupervisor.js`, 7 hubs `LOGISTICS_HUB_REGISTRY` |
| Facade dashboard? | **Sim** | `logistics_cognitive_runtime`, `logistics_signal_loader` |
| CC anexado? | **Sim** | `CentroComando.jsx`, `logisticsNativeCockpitRegistry.js` |

### 4.2 Domínio bounded context (`domains/logistics/`)

| Pergunta | Resposta | Evidência |
|----------|----------|-----------|
| Existe domínio? | **Sim** | 17 ficheiros — contracts, navigation, activation, analytics |
| Operations Layer? | **Parcial** | Inteligência + validação; **não** execução WMS |
| Governance Layer? | **Parcial** | `logisticsPublicationHealthService`, activation engines |
| APIs expostas? | **Sim** | `/api/logistics-intelligence`, navigation, activation, validation |
| Integração WMS? | **Declarada, não operacional** | Sem bridge runtime; WMS isolado em `logistics-operational/` |
| Integração Supply? | **Ausente (correcto)** | Supply GF-024 sem facade; integração declarativa GF-023 only |

### 4.3 WMS operacional (`logistics-operational/`)

| Pergunta | Resposta | Evidência |
|----------|----------|-----------|
| Existe domínio WMS? | **Sim** | `domains/logistics-operational/` — repos, services, OCL |
| Runtime cognitivo WMS? | **Não** (by design) | Não em cognitiveDomainRegistry |
| APIs? | **Sim (stubs/foundation)** | `/api/logistics-operational/*` — `server.js` L523 |
| UI operacional? | **Sim, oculta** | `/app/logistics-operational/workspace`, `menu_visible: false` |
| Feature flags? | **Default OFF** | `wmsFeatureFlags.js`, `IMPETUS_WMS_*` |
| RBAC WMS? | **Definido, inactivo** | `wmsRbacDefinitions.js` — `activated: false` |

### 4.4 Dashboard e navegação

| Pergunta | Resposta | Evidência |
|----------|----------|-----------|
| Menu sidebar Logística? | **Não em prod** | `VITE_IMPETUS_LOGISTICS_*` ausentes em `.env.production` |
| Rotas acessíveis? | **Sim** (direct URL) | `/app/logistics/operational`, legacy almoxarifado |
| CC cognitivo? | **Sim** | Quando `consolidation_applied` |
| Módulo oculto? | **WMS sim** | `wmsOperationalRegistry.js` |
| Rota não exposta? | **WMS menu** | Oculto por desenho WMS-001 |
| Runtime não anexado CC? | **Supply** (não Logística) | Supply fora facade |

### 4.5 Infraestrutura vs funcional

| Componente | Estado |
|------------|--------|
| `logistics_native` pipeline Z.19–Z.23 | **Infra + CC homologados** |
| WMS OCL + Core Services (WMS-002) | **Infra operacional** |
| WMS APIs reais (WMS-003) | **Não implementado** |
| FE workspace real (WMS-004) | **Mocks** (AUD-001 G-LOG-002) |
| RBAC/nav WMS (WMS-005) | **Não activo** |

**Classificação Logística (global):** **IMPLEMENTADO PARCIALMENTE**

**Cobertura arquitectural:** ~75% (runtime cognitivo homologado; operacional WMS incompleto)  
**Cobertura funcional:** ~45% (AUD-001 gaps persistem até WMS-003+)

---

## 5. Supply (`supply_native`)

| Dimensão | Previsto (GF-021→027) | Implementado | Aderência |
|----------|----------------------|--------------|:---------:|
| GF-022 Foundation | Sim | `domains/supply/`, registries | ✅ |
| GF-023 Core Domain | Sim | semantics, services, policies (in-memory) | ✅ |
| GF-024 Signal Loader | Semantic read-only | `supplyTenantSignalLoader.js` + bridge | ✅ |
| GF-025 Promotion + CC | Pendente | **Não** — facade sem `supply_*` | ❌ |
| APIs REST | Futuro GF+ | **Nenhum mount** `server.js` | ❌ |
| UI / menu | GF-026+ | **Nenhuma rota** | ❌ |
| RBAC | GF-026+ | **Nenhuma definição** | ❌ |
| Isolamento WMS | Obrigatório | Sem imports logistics-operational | ✅ |

**Classificação:** **IMPLEMENTADO PARCIALMENTE** (conforme roadmap — fase GF-024)

---

## 6. Executive (`executive_boardroom`)

| Dimensão | Previsto | Implementado |
|----------|----------|--------------|
| Runtime + CC | Sim | `executiveCockpitConsolidationRuntime.js` |
| Facade (prioridade máxima) | Sim | `executive_cognitive_runtime` |
| Portal UI | Deep-link | `/executive-portal/*` — **fora sidebar** |
| Menu principal | Não previsto sidebar | Correcto |
| RBAC | Institucional | `ExecutiveAccessGuard.jsx` |

**Classificação:** **IMPLEMENTADO PARCIALMENTE** (CC sim; navegação institucional only — by design)

---

## 7. PPAP (`ppap_native`)

| Dimensão | Previsto | Implementado |
|----------|----------|--------------|
| Runtime + loader + CC | Sim | Facade PPAP-Z.19→23, 6 hubs |
| APIs operacionais | Sim | `/api/ppap/*` |
| Rotas FE dedicadas | Implícito baseline | **Não** em `App.jsx` |
| Menu / visible_modules | — | **Não** — CC only |
| domainRegistry Wave5 | — | **Não** (cognitive registry only) |

**Classificação:** **IMPLEMENTADO PARCIALMENTE**

---

## 8. MSA (`msa_native`)

| Dimensão | Previsto | Implementado |
|----------|----------|--------------|
| Homologação baseline | LOCKED v1.0 | Registado INC-046 |
| Manifest tests | FOUNDATION + HOMOLOGATED | Tensão T-02 |
| APIs | Sim | `/api/msa/*` |
| CC 6 hubs | Sim | `MsaNativeCockpitPromotion.jsx` |
| Menu / rotas FE | — | **Não** |

**Classificação:** **IMPLEMENTADO PARCIALMENTE**

---

## 9. Ishikawa (`ishikawa_native`)

| Dimensão | Previsto | Implementado |
|----------|----------|--------------|
| Homologação | LOCKED v1.0 INC-047 | ✅ |
| APIs | Sim | `/api/ishikawa/*` |
| CC 10 hubs | Sim | `IshikawaNativeCockpitPromotion.jsx` |
| Menu / rotas FE | — | **Não** |

**Classificação:** **IMPLEMENTADO PARCIALMENTE**

---

## 10. WMS (programa OCP)

| Fase | Estado | Evidência |
|------|:------:|-----------|
| WMS-001 Foundation | ✅ | migration, domain, stub APIs, FE shell |
| WMS-002 OCL + Core | ✅ | `compatibility/`, 7 services |
| WMS-003 APIs | ❌ | Roadmap — stubs `{ status: "foundation" }` |
| WMS-004 FE | ❌ | Mocks KPIs |
| WMS-005 RBAC/Nav | ❌ | `activated: false` |
| WMS-006 Validation | ❌ | — |

**Classificação:** **IMPLEMENTADO PARCIALMENTE**

---

## Dashboard Review — módulos previstos

| Módulo | Classificação UI | Por quê |
|--------|------------------|---------|
| Quality | **Disponível** | Flags prod ON + rotas + CC |
| Environment | **Disponível** | Flags prod ON + rotas + CC |
| Safety | **Parcialmente disponível** | Menu sem executive visibility |
| Logistics | **Parcialmente disponível** | Flags OFF; rotas existem |
| WMS | **Oculto** | `menu_visible: false`, flags OFF |
| PPAP | **Parcialmente disponível** | CC only |
| MSA | **Parcialmente disponível** | CC only |
| Ishikawa | **Parcialmente disponível** | CC only |
| Supply | **Não registrado** | GF-025+ pendente |
| Executive | **Parcialmente disponível** | Portal separado |

---

## Runtime Inventory Review

| Runtime previsto | Implementado | Publicado CC | Gap |
|------------------|:------------:|:------------:|-----|
| `quality_native` | ✅ | ✅ | — |
| `logistics_native` | ✅ | ✅ | Menu flags |
| `ppap_native` | ✅ | ✅ | FE nav |
| `msa_native` | ✅ | ✅ | FE nav; manifest duality |
| `ishikawa_native` | ✅ | ✅ | FE nav |
| `safety_native` | ✅ | ✅ | Menu executive |
| `environmental_native` | ✅ | ✅ | — |
| `executive_boardroom` | ✅ | ✅ | Sidebar N/A |
| `production_native` | ✅ | Parcial | UI industrial |
| `maintenance_native` | ✅ | Parcial | — |
| `hr_native` | ✅ | Parcial | — |
| `supply_native` | ✅ Foundation | ❌ | GF-025 |
| WMS (operacional) | ✅ Domain | ❌ | WMS-003+ |

**Runtimes órfãos:** Nenhum crítico — WMS e Supply isolados **por desenho**.

**Runtimes incompletos:** `supply_native` (pre-GF-025), WMS operacional (pre-WMS-003).

---

## Cross-Domain Review

| Integração | Classificação | Evidência |
|------------|---------------|-----------|
| Quality ↔ PPAP/MSA/Ishikawa | **Integrado** | Facade multi-payload `manager_quality` |
| Quality ↔ Logistics | **Parcial** | Eixos separados; CC independentes |
| Logistics ↔ WMS | **Planejado** | OCL; sem runtime bridge |
| Supply ↔ WMS | **Planejado** | `integrationContracts.js` declarativo |
| Supply ↔ Logistics cognitivo | **Ausente** | Correcto GF-024 |
| EHS ↔ Safety ↔ Environment | **Parcial** | `ehsModuleInheritance`; isolamento env |
| Executive ↔ todos | **Parcial** | Agregação Z.27; read-only portal |
| SST ↔ Quality | **Parcial** | Domínios separados; CC independentes |

---

*Matriz de lacunas:* [REV-001-GAP-MATRIX.md](./REV-001-GAP-MATRIX.md)
