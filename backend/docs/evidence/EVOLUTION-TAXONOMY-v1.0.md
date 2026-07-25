# EVOLUTION-TAXONOMY v1.0 — Política Oficial de Evolução IMPETUS

**Identificador:** `EVOLUTION-TAXONOMY-v1.0`  
**Data:** 2026-07-16  
**Estado:** `EVOLUTION_TAXONOMY = LOCKED`  
**Registo:** [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md)  
**Índice sistémico:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md)

---

## Declaração

Este documento define a **taxonomia oficial** para classificar todo trabalho de evolução no IMPETUS após **BASELINE-SYSTEM v1.2**.

A separação **INC / GF / EV** é **obrigatória** em planos, evidências e commits de documentação. Misturar categorias invalida a trilha de auditoria.

---

## Visão geral

```
INC-022 → INC-045   Arquitectura estabilizada
GF-000 → GF-006     PPAP construído
ARC-001             Guardião automático (conformidade)
GF-007+ / EV-001+   Capacidades sobre baseline protegido
```

---

## INC — Incremento arquitectural

### Definição

**INC** (*Incremental Change* — alteração estrutural) cobre qualquer modificação que afecte o **contrato arquitectural** da plataforma ou o **índice mestre** de baselines.

### Quando usar INC

| Situação | Exemplo |
|----------|---------|
| Alterar runtime homologado (Z.19–Z.23) | Modificar `qualityTenantSignalLoader` |
| Alterar promotion / consolidation | Novo supervisor Z.22 |
| Alterar `cognitiveRuntimeFacade` | Nova fase transversal |
| Alterar `dashboardSurfaceCapabilities` | Nova regra fail-closed |
| Alterar CentroComando shell homologado | Geometria, mount gates |
| Alterar loader homologado | Block bridge, thresholds |
| Registar domínio no índice SYSTEM | **INC-045** — PPAP → SYSTEM v1.2 |
| Consolidar baselines transversais | **INC-044** — SYSTEM v1.1 |

### Quando NÃO usar INC

- Nova funcionalidade de negócio sobre runtime LOCKED → **EV**
- Novo domínio completo do zero → **GF** (+ INC de registo no fim)
- Documentação de auditoria read-only sem alteração → evidência dentro da GF/INC activa

### Requisitos INC

1. Escopo explícito com lista **proibido / permitido**
2. Auditoria read-only prévia (quando aplicável)
3. Regressão multi-domínio completa (quando há código)
4. Actualização de baseline (domínio + SYSTEM se transversal)
5. Evidência em `backend/docs/evidence/INC-xxx-*.md`

### Subtipos

| Subtipo | Descrição | Exemplo |
|---------|-----------|---------|
| **Implementation INC** | Altera código + baseline | INC-034 Quality homologation |
| **Registration INC** | Só documentação / índice | **INC-045** PPAP registration |
| **Consolidation INC** | Unifica índice sem código | INC-044 SYSTEM v1.1 |

---

## GF — Greenfield

### Definição

**GF** (*Greenfield*) designa a construção de um **domínio ou sub-runtime novo** sobre a arquitectura LOCKED, **sem violar** baselines existentes.

### Sequência canónica

```
GF-000  Discovery (read-only)
  ↓
GF-001  Runtime Foundation (inactivo)
  ↓
GF-002  Core Domain (schema + APIs)
  ↓
GF-003  Signal Loader (Z.20 real)
  ↓
GF-004  Promotion + Command Center (Z.22/Z.23)
  ↓
GF-005  Pilot Enablement (massa operacional)
  ↓
GF-006  Homologation + Baseline próprio
  ↓
INC-0xx Registration no BASELINE-SYSTEM
```

### Referência homologada — PPAP

| GF | Entrega |
|----|---------|
| GF-000 → GF-006 | Sequência completa |
| Resultado | `ppap_native` + BASELINE-PPAP-v1.0 |
| Registo SYSTEM | INC-045 → BASELINE-SYSTEM v1.2 |

### Regras GF

- Payload isolado (`ppap_cognitive_runtime` — não sobrescrever `quality_native`)
- Gate-driven promotion — sem bypass de binding
- Sem mock / synthetic em runtime
- Parent domain LOCKED preservado (cross-domain regression obrigatória)
- Baseline próprio antes do registo SYSTEM

### Quando NÃO usar GF

- Enriquecer hub existente sem novo runtime → **EV**
- Corrigir bug em loader homologado → **INC** explícita
- Alterar threshold de domínio LOCKED → **INC**

---

## EV — Evolução incremental

### Definição

**EV** (*Evolution*) designa **capacidade funcional nova** sobre um domínio ou runtime já **LOCKED**, sem alterar a cadeia homologada Z.19→Z.23.

### Quando usar EV

| Situação | Exemplo |
|----------|---------|
| Novo hub ou rota aditiva | Picking em Logistics |
| Enriquecimento de dados em hub existente | OTIF avançado |
| Nova API read-only scoped | `/quality-intelligence/...` |
| UI funcional nova em superfície não congelada | Ishikawa UI |
| Conteúdo cognitivo (textos, insights) | Narrativas quality |

### Quando NÃO usar EV

- Novo runtime cognitivo completo → **GF**
- Alterar loader / promotion / facade → **INC**
- Registar no índice SYSTEM → **INC**

### Requisitos EV

1. Não alterar componentes listados em baseline LOCKED
2. Regressão do domínio afectado
3. Evidência opcional `EV-xxx-*.md` para evoluções significativas
4. Classificação honesta (REAL / INSUFFICIENT_DATA / NOT_IMPLEMENTED)

---

## Matriz de decisão

| Pergunta | Resposta → Tipo |
|----------|-----------------|
| Altera Z.19–Z.23 homologado? | **INC** |
| Altera índice BASELINE-SYSTEM? | **INC** (Registration ou Consolidation) |
| Cria runtime / domínio novo? | **GF** (+ INC registo) |
| Adiciona funcionalidade sobre LOCKED? | **EV** |
| Só documentação de registo pós-GF? | **INC** (Registration) |

---

## Relação com baselines

| Documento | Papel |
|-----------|-------|
| **BASELINE-SYSTEM v1.2** | Índice mestre — lista todos os domínios homologados |
| **BASELINE-{DOMAIN}-vX.Y** | Contrato congelado por domínio |
| **INC-xxx** | Alteração ou registo arquitectural |
| **GF-xxx** | Trilha de construção greenfield |
| **EV-xxx** | Trilha de evolução incremental (quando formalizada) |
| **ARC-xxx** | Suíte de conformidade arquitectural (guardião pré-merge) |

---

## Política pós v1.2

> **Arquitectura congelada:** BASELINE-SYSTEM v1.2  
> **Novas capacidades:** exclusivamente **GF** ou **EV**  
> **Novas INCs:** somente alteração estrutural da plataforma ou registo SYSTEM

### Exemplos futuros

| Trabalho | Classificação |
|----------|---------------|
| MSA (novo sub-runtime Quality) | **GF-000…GF-006** + INC registo |
| Picking Logistics | **EV** sobre LOGISTICS v1.1 |
| Finance Native | **GF** completo + INC registo |
| Alterar threshold Z.22 global | **INC** transversal |
| Enriquecer CapabilityHub PPAP | **EV** sobre PPAP v1.0 |

---

## Gates de conformidade

| Gate | Critério |
|------|----------|
| `TAXONOMY_APPLIED` | Plano identifica INC, GF ou EV |
| `NO_CATEGORY_MIXING` | Um trabalho = uma categoria principal |
| `BASELINE_PRESERVED` | EV/GF não alteram LOCKED sem INC |
| `SYSTEM_INDEX_CURRENT` | Novos domínios registados via INC |

---

## Referências

| Documento | Relação |
|-----------|---------|
| [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) | Índice mestre |
| [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md) | Origem taxonomia implícita |
| [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md) | Registo formal v1.0 taxonomia |
| [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) | Modelo GF espelho |

---

## Versão

| Versão | Data | Alteração |
|--------|------|-----------|
| **v1.0** | **2026-07-16** | **Política oficial INC/GF/EV — INC-045** |
