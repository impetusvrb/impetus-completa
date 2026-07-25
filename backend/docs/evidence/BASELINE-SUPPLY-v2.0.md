# BASELINE-SUPPLY-v2.0 — Certified Baseline Definition

**Identificador:** `BASELINE-SUPPLY-v2.0`  
**Categoria:** Certified Baseline · Configuration Freeze  
**Data de publicação:** 2026-07-18  
**Modo:** Configuration Management (READ ONLY)

---

## Objetivo

Oficializar como referência arquitectural e operacional o conjunto certificado pela **REV-002**, congelando o estado integrado **Supply + WMS + INC-048** para evoluções futuras.

---

## Escopo

| Inclusão | Detalhe |
|----------|---------|
| Supply Runtime | `supply_native` — GF-021→027 homologado |
| WMS Operational | `logistics-operational` — WMS-001→006 certificado |
| INC-048 | Convergência arquitectural Supply ↔ WMS |
| Pilot Integration Layer | Contrato v0.3.0 |
| Promotion Runtime | GF-025 |
| Public APIs | `/api/supply/v1`, `/api/logistics-operational/v1` |
| Workspaces | Supply + Logística operacional |

**Origem certificada:** BASELINE-SYSTEM v1.4 (11 runtimes LOCKED inalterados)

---

## Estado da certificação

| Gate | Parecer |
|------|---------|
| REV-002 | **BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS** |
| WMS-006 | Homologação congelada COMPLETE |
| WMS-005 | Validação operacional integrada COMPLETE |

---

## Documentos normativos

- BASELINE-SYSTEM v1.4 (LOCKED)
- ARC-001 · ARC-002
- REV-001 · **REV-002**
- GF-021 → GF-027 · WMS-001 → WMS-006 · INC-048

---

## Manifesto utilizado

| Campo | Valor |
|-------|-------|
| Source | `BASELINE-CANDIDATE-SUPPLY-WMS-v2.0` |
| Published | `BASELINE-SUPPLY-v2.0-MANIFEST` |
| Signature | `a7fa921afdf385f6…` |

**Ficheiro:** [BASELINE-SUPPLY-v2.0-MANIFEST.json](./BASELINE-SUPPLY-v2.0-MANIFEST.json)

---

## Condições certificadas aceites

| Condição | Estado |
|----------|--------|
| GAP-LOG-001 | **PARTIAL** — menu flags prod |
| GAP-LOG-002 | **PARTIAL** — legacy FE mocks |
| WMS activation flags | **OFF** — rollout controlado |
| Feature Flags | Ativação piloto tenant only |

Estes itens compõem o histórico oficial da baseline e **não impedem** sua utilização.

---

## Parecer

## **BASELINE-SUPPLY-v2.0 ACTIVE**

**Configuration Freeze COMPLETE** · **Program Cycle CLOSED**
