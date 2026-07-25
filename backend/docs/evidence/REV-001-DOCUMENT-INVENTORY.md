# REV-001 — Inventário Documental

**Revisão:** REV-001 — Master Project Conformance Review  
**Modo:** READ ONLY  
**Data:** 2026-07-18  
**Normas:** ARC-001 · ARC-002 · BASELINE-SYSTEM v1.4

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Ficheiros `.md` / `.mdc` com termos arquitecturais | **~2.336** (glob repositório) |
| Camada canónica `backend/docs/architecture/` | **16** documentos |
| Evidências `backend/docs/evidence/` | **~114** top-level + **38** INC-* + **25** GF-* |
| Auditorias `backend/docs/audit/` | **4** (AUD-001 + anexos) |
| ICEB blueprint (fichas endpoint) | **~1.060** |
| AIOI specs `backend/docs/AIOI_*` | **~400+** |
| Frontend docs `frontend/docs/` | **49** |

**Duplicados identificados:** ver secção §Duplicados.

---

## Hierarquia documental (fonte primária REV-001)

```
BASELINE-SYSTEM v1.4 (LOCKED)          ← índice mestre
├── SYSTEM-RUNTIME-INVENTORY v1.4
├── EVOLUTION-TAXONOMY + ARC-002
├── DELIVERY-LIFECYCLE + ENGINEERING-GOVERNANCE
├── GF-021-ROADMAP (Supply)
├── WMS-IMPLEMENTATION-ROADMAP
├── BASELINE-{módulo}-v* (evidence/)
├── GF-000…024 / INC-010…047 (evidence/)
├── AUD-001 + EV-001 (audit/readiness)
└── ICEB / AIOI (referência histórica e detalhe)
```

---

## 1. Governança e índice mestre

| Documento | Caminho | Objectivo | Data | Relação |
|-----------|---------|-----------|------|---------|
| **BASELINE-SYSTEM v1.4** | `backend/docs/architecture/BASELINE-SYSTEM-v1.4.md` | Índice mestre global LOCKED | 2026-07-17 | **Raiz canónica** |
| SYSTEM-RUNTIME-INVENTORY | `backend/docs/architecture/SYSTEM-RUNTIME-INVENTORY.md` | 11 runtimes homologados | 2026-07-17 | Inventário oficial |
| EVOLUTION-TAXONOMY | `backend/docs/architecture/EVOLUTION-TAXONOMY.md` | Política INC/GF/EV/ARC | 2026-07-17 | Governança evolutiva |
| ARC-002 Greenfield Standard | `backend/docs/architecture/ARC-002-GREENFIELD-DELIVERY-STANDARD.md` | Norma entrega Greenfield | 2026-07-17 | Norma GF-* |
| ARCHITECTURE-CHANGELOG | `backend/docs/architecture/ARCHITECTURE-CHANGELOG.md` | Changelog baselines | 2026-07-17 | Histórico |
| DELIVERY-LIFECYCLE | `backend/docs/architecture/DELIVERY-LIFECYCLE.md` | Gates OCP/WMS/GF | 2026-07-17 | Processo |
| ENGINEERING-GOVERNANCE | `backend/docs/architecture/ENGINEERING-GOVERNANCE.md` | Governança engenharia | 2026-07-17 | Processo |
| BASELINE-GOVERNANCE | `backend/docs/architecture/BASELINE-GOVERNANCE.md` | Regras congelamento | — | Governança |
| ARCHITECTURE-DECISION-MATRIX | `backend/docs/architecture/ARCHITECTURE-DECISION-MATRIX.md` | ADR consolidado | 2026-07-17 | Decisões |

---

## 2. Roadmaps activos

| Documento | Caminho | Objectivo | Estado |
|-----------|---------|-----------|--------|
| GF-021 Supply Roadmap | `backend/docs/architecture/GF-021-ROADMAP.md` | Sequência GF-022→027 | GF-024 ✅ |
| WMS Implementation | `backend/docs/architecture/WMS-IMPLEMENTATION-ROADMAP.md` | WMS-001→006 | WMS-002 ✅ |
| GF-021 Discovery | `backend/docs/architecture/GF-021-DISCOVERY.md` | Discovery Supply | ✅ |
| GF-021 Domain Boundary | `backend/docs/architecture/GF-021-DOMAIN-BOUNDARY.md` | Bounded context | ✅ |
| GF-021 Ubiquitous Language | `backend/docs/architecture/GF-021-UBIQUITOUS-LANGUAGE.md` | UL Supply | ✅ GF-023 |

---

## 3. Auditorias e readiness (pré-REV-001)

| ID | Caminho | Objectivo | Data |
|----|---------|-----------|------|
| **AUD-001** | `backend/docs/audit/AUD-001-LOGISTICS-OPERATIONAL-AUDIT.md` | Auditoria Logística READ ONLY | 2026-07-17 |
| AUD-001 anexos | `LOGISTICS-GAP-ANALYSIS.md`, `LOGISTICS-DEPLOYMENT-STATUS.md`, `LOGISTICS-FUNCTIONAL-INVENTORY.md` | Gaps deploy Logística | 2026-07-17 |
| **EV-001** | `backend/docs/evidence/EV-001-ARCHITECTURE-READINESS.md` | Gate GF-021 (READY WITH CONDITIONS) | 2026-07-17 |
| EV-001 síntese | `EV-001-EXECUTIVE-SUMMARY.md`, `EV-001-PLATFORM-STABILIZATION-REVIEW.md` | Revisão plataforma | 2026-07-17 |
| EV-001 dívida | `EV-001-TECHNICAL-DEBT.md` | TD-M01…M03 | 2026-07-17 |
| **ARC-001** | `backend/docs/evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md` | Suite conformidade | 2026-07-16 |
| **ARC-002** | `backend/docs/evidence/ARC-002-COMPLETION.md` | Conclusão norma GF | 2026-07-17 |

---

## 4. Baselines por módulo (canónico = versão mais alta)

| Baseline | Canónico | Duplicado / histórico |
|----------|----------|----------------------|
| SYSTEM | `architecture/BASELINE-SYSTEM-v1.4.md` | evidence/BASELINE-SYSTEM-v1.0…v1.4 (stub) |
| Quality | `evidence/BASELINE-QUALITY-v1.1.md` | v1.0 |
| Logistics | `evidence/BASELINE-LOGISTICS-v1.1.md` | v1.0 |
| PPAP | `evidence/BASELINE-PPAP-v1.0.md` | — |
| MSA | `architecture/BASELINE-MSA-v1.0.md` | — |
| Ishikawa | `evidence/BASELINE-ISHIKAWA-v1.0.md` | — |
| Safety | `evidence/BASELINE-SAFETY-v1.0.md` | — |
| Environment | `evidence/BASELINE-ENVIRONMENT-v1.0.md` | ENVIRONMENT_BASELINE_V1 |
| Executive | `evidence/BASELINE-EXECUTIVE-v1.0.md` | CEO_BASELINE_V1 |
| Supply (doc) | `evidence/BASELINE-SUPPLY-v1.0.md` | Pré-GF-022 (legado) |
| UI / Dashboards | `BASELINE-UI-v1.0`, `BASELINE-DASHBOARDS-v1.0` | — |

---

## 5. Programas concluídos / em curso

### Greenfields homologados (BASELINE-SYSTEM v1.2→v1.4)

| Série | Docs | Registo |
|-------|------|---------|
| PPAP GF-000→006 | `evidence/GF-00*-PPAP-*.md` | INC-045 |
| MSA GF-007→013 | `evidence/GF-0*-MSA-*.md` | INC-046 |
| Ishikawa GF-014→020 | `evidence/GF-0*-ISHIKAWA-*.md` | INC-047 |

### Supply Greenfield (activo)

| Fase | Documento |
|------|-----------|
| GF-021 | `GF-021-DISCOVERY-COMPLETION.md`, `DEC-001-DOMAIN-SELECTION.md` |
| GF-022 | `GF-022-RUNTIME-FOUNDATION.md`, `SUPPLY-RUNTIME-INVENTORY.md` |
| GF-023 | `GF-023-CORE-DOMAIN.md`, `SUPPLY-DOMAIN-MODEL.md`, `SUPPLY-POLICIES.md` |
| GF-024 | `GF-024-SIGNAL-LOADER.md`, `SUPPLY-SIGNAL-BINDING.md`, `SUPPLY-BLOCK-BRIDGE.md` |

### WMS (programa OCP paralelo)

| Fase | Documento |
|------|-----------|
| WMS-001 | `WMS-001-FOUNDATION.md`, `WMS-ARCHITECTURE-v0.2.md` |
| WMS-002 | `WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md`, `WMS-002-CORE-SERVICES.md` |
| Legado | `WMS-LEGACY-WAREHOUSE-INVENTORY.md`, `WMS-MIGRATION-PROGRESS.md` |

### Logística runtime (INC-036→043)

`INC-036`…`INC-043`, `LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md`

### Qualidade runtime (INC-023→034)

`INC-023`…`INC-034`, homologação `INC-029`, `INC-034`

---

## 6. INC registos transversais (38 ficheiros)

Último registo arquitectural: **INC-047** (Ishikawa → SYSTEM v1.4)  
Consolidação: **INC-044** (SYSTEM v1.1)

---

## 7. Blueprints e legado (referência secundária)

| Conjunto | Caminho | Nota |
|----------|---------|------|
| ICEB Carta Magna + Vols | `backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/` | Visão enterprise; 1.060 fichas API |
| AIOI backend | `backend/docs/AIOI_*.md` | Auditorias Jun/2026; pré-BASELINE v1.4 |
| AIOI frontend | `frontend/docs/AIOI_P*.md` | Certificação UI P5→P8 |
| docs/ raiz | `docs/IND4_ARQUITETURA.md`, `architecture-map.md` | Legado IND4 |
| Forensics | `backend/docs/forensics/` | Incidentes produção |
| Stabilization | `backend/docs/evidence/stabilization/` | ORPHAN_MODULE_AUDIT, PENDING_FIXES |

---

## 8. Regras Cursor (implementação)

| Ficheiro | Objectivo |
|----------|-----------|
| `.cursor/rules/backend-official-production.mdc` | Backend canónico PM2 |
| `.cursor/rules/design-system-industrial-4.mdc` | DS Industrial 4.0 |
| `.cursor/rules/charts-real-data-industrial.mdc` | Gráficos dados reais |

---

## Duplicados — versão preferida

| Grupo | Usar | Ignorar |
|-------|------|---------|
| BASELINE-SYSTEM | `architecture/BASELINE-SYSTEM-v1.4.md` | `evidence/BASELINE-SYSTEM-v1.4.md` (stub) |
| EVOLUTION-TAXONOMY | `architecture/EVOLUTION-TAXONOMY.md` | `evidence/EVOLUTION-TAXONOMY-v1.0.md` |
| WMS Architecture | `WMS-ARCHITECTURE-v0.2.md` | v0.1 |
| Plano backends | `docs/PLANO_UNIFICACAO_BACKENDS.md` | variantes duplicadas |

---

## Documentos excluídos do master (contexto apenas)

- Ficheiros APPSEC/SEC (~80+) — segurança, não arquitectura funcional
- Certificações `CERTIFICATIONS-INDEX.md` — compliance enterprise
- Transcripts de agente — não são documentação arquitectural

---

*Próximo:* [REV-001-MASTER-PROJECT-CONFORMANCE.md](./REV-001-MASTER-PROJECT-CONFORMANCE.md)
