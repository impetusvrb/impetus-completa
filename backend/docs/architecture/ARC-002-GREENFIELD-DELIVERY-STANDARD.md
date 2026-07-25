# ARC-002 — Platform Engineering & Delivery Standard

**Identificador:** `ARC-002`  
**Classificação:** Architecture Governance · Fase de Padronização da Engenharia  
**Data:** 2026-07-17  
**Natureza:** **Documentation Only** — governança arquitectural  
**Baseline referência:** [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md) (preservado)  
**Guardião técnico:** [ARC-001-ARCHITECTURE-CONFORMANCE.md](../evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md) (preservado)  
**Evidência encerramento:** [ARC-002-COMPLETION.md](../evidence/ARC-002-COMPLETION.md)

---

## Declaração constitucional

> A partir da aprovação deste documento, **toda nova iniciativa** na plataforma IMPETUS (Greenfield, Operational Completion Program, INC, EV, Hotfix, Patch) **deve referenciar explicitamente ARC-002** como norma de execução.

Este documento **não implementa funcionalidades** e **não altera comportamento** da aplicação. Institucionaliza o processo de evolução validado em **PPAP**, **MSA**, **Ishikawa** e no início do **WMS Operational Program**.

---

## Modo obrigatório — Documentation Only

| Proibido | Estado |
|----------|--------|
| Alterar código | **NO** |
| Alterar banco / APIs / UI / runtimes / registries / flags / permissões | **NO** |
| Alterar ARC-001 | **NO** |
| Alterar BASELINE-SYSTEM v1.4 | **NO** |

**Produzido:** exclusivamente documentação de governança.

---

## Documentos do pacote ARC-002

| Documento | Papel |
|-----------|-------|
| **Este documento** | Referência principal — constituição de engenharia |
| [ENGINEERING-GOVERNANCE.md](ENGINEERING-GOVERNANCE.md) | Funções e responsabilidades |
| [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md) | Ciclos + gates obrigatórios |
| [ARCHITECTURE-DECISION-MATRIX.md](ARCHITECTURE-DECISION-MATRIX.md) | Matriz de decisão expandida |
| [BASELINE-GOVERNANCE.md](BASELINE-GOVERNANCE.md) | Critérios LOCKED e congelamento |

---

# Parte 1 — Tipos de iniciativas

Categorias **oficiais** da plataforma IMPETUS.

| Tipo | Sigla | Descrição | Desenvolvimento | Exemplos |
|------|-------|-----------|:---------------:|----------|
| **Greenfield** | **GF** | Criar **novo domínio cognitivo** nativo (runtime Z.19→Z.23) | Sim | PPAP · MSA · Ishikawa |
| **Operational Completion Program** | **OCP** / **WMS-xxx** | Completar **domínio operacional** existente sem alterar runtime cognitivo homologado | Sim | WMS Program |
| **Architecture Registration** | **INC** | Registo arquitectural / SYSTEM baseline | **Não** | INC-045 · INC-047 |
| **Architecture Governance** | **ARC** | Padronização e conformidade de engenharia | **Não** | ARC-001 · **ARC-002** |
| **Baseline** | **BL** | Congelamento arquitectural formal | **Não** | BASELINE-SYSTEM v1.4 |
| **Evolution** | **EV** | Capacidade incremental sobre runtime **LOCKED** | Sim (aditivo) | Picking avançado pós-WMS |
| **Hotfix** | **HF** | Correção emergencial produção | Sim (mínimo) | Incidente P0 |
| **Patch** | **PT** | Correção evolutiva baixo impacto | Sim (localizado) | Bug não estrutural |

### Relação com taxonomia histórica

- **GF** permanece o identificador de Greenfield cognitivo (GF-000…GF-020).  
- **OCP** é formalizado por ARC-002 para programas operacionais (WMS-001…).  
- **EV** continua válido para evolução sobre LOCKED (ver [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)).

---

# Parte 2 — Ciclos oficiais

## 2.1 Ciclo Greenfield (domínio cognitivo)

Validado em PPAP · MSA · Ishikawa.

```
Discovery                    (GF-0xx / GF-014)
    ↓
Runtime Foundation           (Z.19 pilot · flags · registry)
    ↓
Core Domain                  (tabelas · APIs · workflow · semântica SSOT)
    ↓
Signal Loader                (Z.20 · bridge tenant · binding)
    ↓
Promotion                    (Z.22 · CC · render controlled)
    ↓
Pilot Enablement             (cenários · binding target · perfis piloto)
    ↓
Homologation                 (read-only audit · zero fake data)
    ↓
Runtime Baseline             (BASELINE-{DOMAIN}-v1.0 LOCKED)
    ↓
INC                          (Registration · BASELINE-SYSTEM index)
    ↓
System Baseline              (BASELINE-SYSTEM v1.x actualizado)
```

**Referência detalhada:** [DELIVERY-LIFECYCLE.md § Greenfield](DELIVERY-LIFECYCLE.md)

## 2.2 Ciclo Operational Completion Program

Validado no desenho WMS (AUD-001 · WMS-001 · WMS-002 plano).

```
Foundation                   (WMS-001 · SSOT · schemas · stubs)
    ↓
Compatibility Layer          (WMS-002 · Legacy Adapter · OCL)
    ↓
Core Services                (WMS-002 · regras negócio · eventos wms.*)
    ↓
Operational APIs             (WMS-003 · endpoints reais · zero mock)
    ↓
Frontend Workspace           (WMS-004 · views · remoção placeholders)
    ↓
RBAC + Navigation            (WMS-005 · perfis · menu pilot)
    ↓
Validation                   (WMS-006 · pack enterprise · homologação)
    ↓
Operational Baseline         (BASELINE-WMS-v1.0 LOCKED)
```

**Regra:** **nunca** alterar runtime cognitivo homologado (`*_native` LOCKED) dentro deste ciclo.

**Referência:** [WMS-IMPLEMENTATION-ROADMAP.md](WMS-IMPLEMENTATION-ROADMAP.md)

---

# Parte 3 — Gates obrigatórios

Cada fase **deve** possuir os sete elementos abaixo. Template canónico em [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md).

| Elemento | Descrição |
|----------|-----------|
| **Objetivo** | Resultado mensurável da fase |
| **Escopo** | Inclusões e exclusões explícitas |
| **Critérios de entrada** | Pré-requisitos (baseline, INC, auditoria) |
| **Critérios de saída** | Flags binárias de encerramento |
| **Evidências obrigatórias** | Documentos em `backend/docs/evidence/` |
| **Testes mínimos** | Scripts npm correspondentes |
| **Aprovação** | Homologation sign-off ou INC registration |

### Gates transversais (todas as fases)

| Gate | Regra |
|------|-------|
| **G-ARC** | `npm run test:architecture-conformance` PASS antes de homologação runtime |
| **G-DOC** | Evidência emitida **antes** da fase seguinte |
| **G-ISO** | Runtime cognitivo isolado de processos operacionais |
| **G-SSOT** | Sem duplicação semântica não documentada |

---

# Parte 4 — Princípios arquitecturais

Princípios **oficiais** — violação exige INC explícita.

| # | Princípio | Enunciado |
|---|-----------|-----------|
| P-01 | **SSOT** | Nunca duplicar semântica. Uma entidade canónica por conceito de negócio. |
| P-02 | **Adapter Pattern** | Legado acedido **apenas** por adapters (`warehouseLegacyAdapter`, etc.). |
| P-03 | **Compatibility Layer** | Obrigatório durante migração dual-stack. Core Services consomem OCL, não legado. |
| P-04 | **Runtime Isolation** | Runtimes cognitivos **não** implementam processos operacionais (WMS/MES/ERP). |
| P-05 | **Operational Isolation** | Domínios operacionais **não** implementam IA / promotion / signal loader. |
| P-06 | **Read-Only Signal Loader** | Signal loader **nunca** altera dados — apenas lê e liga blocos. |
| P-07 | **Deterministic Promotion** | Promotion **nunca** recalcula binding — consome resultado Z.20. |
| P-08 | **Immutable Baselines** | Baselines LOCKED **nunca** são alteradas — evolução aditiva ou nova INC. |
| P-09 | **Documentation First** | Arquitectura e evidência **antes** da implementação da fase seguinte. |
| P-10 | **Fail-Closed Honesty** | Sem mock / synthetic em runtime homologado ou APIs operacionais declaradas reais. |

---

# Parte 5 — Estrutura documental

Nomenclatura **oficial** de artefactos.

| Tipo | Padrão de nome | Localização | Exemplo |
|------|----------------|-------------|---------|
| **Discovery** | `GF-0xx-{DOMAIN}-DISCOVERY.md` | `docs/evidence/` | GF-014 Ishikawa |
| **Evidence** | `GF-0xx-*` · `WMS-0xx-*` · `INC-0xx-*` | `docs/evidence/` | GF-020 homologation |
| **Architecture** | `{DOMAIN}-ARCHITECTURE-v1.0.md` | `docs/evidence/` | ISHIKAWA-ARCHITECTURE |
| **Roadmap** | `{DOMAIN}-IMPLEMENTATION-ROADMAP.md` | `docs/architecture/` | WMS-IMPLEMENTATION-ROADMAP |
| **Baseline domínio** | `BASELINE-{DOMAIN}-v1.x.md` | `docs/evidence/` ou `architecture/` | BASELINE-MSA-v1.0 |
| **Baseline SYSTEM** | `BASELINE-SYSTEM-v1.x.md` | `docs/architecture/` | v1.4 |
| **INC** | `INC-0xx-{TITLE}.md` | `docs/evidence/` | INC-047 |
| **ARC** | `ARC-0xx-{TITLE}.md` | `docs/architecture/` + evidence | ARC-002 |
| **Audit** | `AUD-0xx-{DOMAIN}-*.md` | `docs/audit/` | AUD-001 Logistics |
| **Audit gap** | `*-GAP-ANALYSIS.md` | `docs/audit/` | LOGISTICS-GAP-ANALYSIS |

### Prefixos de programa

| Prefixo | Uso |
|---------|-----|
| `GF-` | Greenfield cognitivo |
| `WMS-` | Operational Completion — Logística |
| `INC-` | Incremento / registo arquitectural |
| `ARC-` | Governança e conformidade |
| `AUD-` | Auditoria read-only |
| `EV-` | Evolução incremental |

---

# Parte 6 — Estrutura de testes

Suites **padronizadas** por tipo de programa.

## 6.1 Greenfield cognitivo

| Fase | Script npm (padrão) | Exemplo Ishikawa |
|------|---------------------|------------------|
| Runtime Foundation | `test:{domain}-runtime-foundation` | `test:ishikawa-runtime-foundation` |
| Core Domain | `test:{domain}-core-domain` | `test:ishikawa-core-domain` |
| Signal Loader | `test:{domain}-signal-loader` | `test:ishikawa-signal-loader` |
| Promotion | `test:{domain}-promotion-chain` | `test:ishikawa-promotion-chain` |
| Pilot | `test:{domain}-pilot-enablement` | `test:ishikawa-pilot-enablement` |
| Homologation | `test:{domain}-runtime-homologation` | `test:ishikawa-runtime-homologation` |
| Conformidade global | `test:architecture-conformance` | ARC-001 |

## 6.2 Operational Completion Program

| Fase | Script npm (padrão) | Estado WMS |
|------|---------------------|------------|
| Foundation | `test:wms-foundation` | WMS-001 |
| Core Services | `test:wms-core-services` | WMS-002 (planeado) |
| APIs | `test:wms-api` | WMS-003 |
| UI | `test:wms-ui` | WMS-004 |
| Validation | `test:wms-validation` | WMS-006 |

## 6.3 Governança

| Suite | Script | Quando |
|-------|--------|--------|
| Architecture Conformance | `test:architecture-conformance` | Pré-homologação · CI |
| Baseline integrity | incluso ARC-001H | Registo INC |

---

# Parte 7 — Matriz de decisão

Resumo — matriz completa em [ARCHITECTURE-DECISION-MATRIX.md](ARCHITECTURE-DECISION-MATRIX.md).

| Situação | Processo |
|----------|----------|
| Novo domínio cognitivo | **Greenfield (GF)** |
| Completar domínio operacional existente | **Operational Completion Program (OCP)** |
| Registrar arquitectura no SYSTEM | **INC** (Registration) |
| Alterar Z.19–Z.23 homologado | **INC** (Implementation) |
| Padronizar engenharia | **ARC** |
| Congelar arquitectura | **Baseline** |
| Correção emergencial produção | **Hotfix** |
| Evolução pequena localizada | **Patch** |
| Funcionalidade sobre runtime LOCKED | **EV** |

---

# Parte 8 — Critérios de congelamento (LOCKED)

Detalhe em [BASELINE-GOVERNANCE.md](BASELINE-GOVERNANCE.md).

Critérios **mínimos** para declarar componente **LOCKED**:

1. Arquitectura concluída e documentada  
2. Homologação concluída (auditoria read-only ou funcional)  
3. Testes aprovados (suites mínimas da fase)  
4. Documentação de evidência emitida  
5. Baseline publicada (`BASELINE-*-v1.x`)  
6. INC de registo concluída (quando aplicável ao SYSTEM index)

---

# Parte 9 — Governança

Funções — **sem** associação a pessoas. Detalhe em [ENGINEERING-GOVERNANCE.md](ENGINEERING-GOVERNANCE.md).

| Função | Responsabilidade |
|--------|------------------|
| **Architecture** | Baselines · INC · ARC · decisões estruturais |
| **Engineering** | Implementação GF · OCP · EV · patches |
| **Quality** | Homologação · auditorias AUD · zero fake data |
| **Homologation** | Sign-off fase · critérios de saída |
| **Release** | Flags · rollout · produção |

---

# Parte 10 — Roadmap oficial pós v1.4

```
BASELINE-SYSTEM v1.4                    ← LOCKED (11 runtimes)
        │
        ├── ARC-002                     ← este documento (governança)
        │
        ├── WMS Program                 ← OCP paralelo (WMS-001 ✅ · WMS-002 planeado)
        │       └── referencia ARC-002 como norma
        │
        ├── Platform Stabilization Review
        │
        └── GF-021 Discovery            ← próximo Greenfield candidato (Finance ou Supply)
```

---

## Referências históricas (validação do padrão)

| Programa | Ciclo | Baseline | INC |
|----------|-------|----------|-----|
| PPAP | GF-000→006 | BASELINE-PPAP-v1.0 | INC-045 |
| MSA | GF-007→013 | BASELINE-MSA-v1.0 | INC-046 |
| Ishikawa | GF-014→020 | BASELINE-ISHIKAWA-v1.0 | INC-047 |
| WMS | WMS-001→ | BASELINE-WMS-v1.0 (futuro) | — |
| Conformidade | ARC-001 | — | — |

---

# Parte 11 — Conformidade ARC-002 (obrigatória em toda iniciativa)

> **Regra permanente:** Toda nova iniciativa (**GF**, **OCP**, **INC**, **ARC**, **EV**, **Hotfix**, **Patch**) deve iniciar com uma secção **Conformidade ARC-002**, indicando explicitamente:

| Campo | Descrição |
|-------|-----------|
| **Categoria** | Tipo de iniciativa conforme taxonomia (EVOLUTION-TAXONOMY) |
| **Objetivo** | Resultado mensurável da iniciativa |
| **Critérios de entrada** | Pré-requisitos verificáveis (baselines, homologações, AUD) |
| **Critérios de saída** | Evidências e gates de encerramento |
| **Impacto esperado na arquitetura** | Camadas, runtimes, domínios afectados |
| **Baselines afectadas** | Se houver incremento ou lock de baseline |
| **Justificativa de categoria** | Porque esta categoria e não outra (ex.: OCP vs GF vs EV) |

**Modelo mínimo (copiar no topo de evidence / plano):**

```markdown
## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| Categoria | … |
| Objetivo | … |
| Critérios de entrada | … |
| Critérios de saída | … |
| Impacto arquitetural | … |
| Baselines afectadas | … |
| Justificativa de categoria | … |
```

**Enforcement:** documentos de evidence sem esta secção são **incompletos** para encerramento de iniciativa pós 2026-07-17.

---

## Critérios de encerramento ARC-002

Ver [ARC-002-COMPLETION.md](../evidence/ARC-002-COMPLETION.md).

---

## Versão

| Versão | Data | Alteração |
|--------|------|-----------|
| **v1.0** | **2026-07-17** | Institucionalização Platform Engineering & Delivery Standard |
