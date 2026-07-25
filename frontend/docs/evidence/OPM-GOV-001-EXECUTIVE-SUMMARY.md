# OPM-GOV-001 — Executive Summary

**Marco:** Operational Contract Baseline congelada

---

## Posição na plataforma

```
OPM-E2E-001 End-to-End Certification  ✅
        ↓
OPM-GOV-001 Operational Contract Baseline  ✅
        ↓
OPM-006 Transfer Management  ⏳
```

---

## O que foi congelado

- Ciclos de vida operacionais (Receiving, Inventory, Picking, Shipping)
- Semântica de movimentações (`receipt`, `pick`, `issue` + reservados internos)
- Contratos de handoff entre módulos
- Catálogo de observabilidade (38 eventos)
- Invariantes operacionais (10 regras)
- Matriz de compatibilidade Module → State → Movement → Observability → Timeline

---

## O que NÃO foi alterado

- Componentes EOX
- WMS-REF-001
- APIs WMS-003
- Runtime / Backend (excepto correção login infra)
- Estados certificados
- Funcionalidades OPM-006

---

## Login (correcção infra)

Problema reportado: backend instável (OOM + pool PostgreSQL esgotado) causando 504 no login.

Correcções aplicadas:
- Fail-fast e timeout no handler de login (`auth.js`)
- Imports INC-048 corrigidos
- Heap Node aumentada via PM2

Backend operacional — login responde (401 para credenciais inválidas).

---

## Próximo passo

**OPM-006 — Transfer Management** sobre baseline contratual estável.
