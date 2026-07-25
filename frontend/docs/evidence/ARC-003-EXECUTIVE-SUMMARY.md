# ARC-003 — Executive Summary

**Programa:** IMPETUS Presentation Architecture  
**Entrega:** ARC-003 — Enterprise Operational Experience Standard (EOX)  
**Data:** 2026-07-19

---

## ARC-003 — ENTERPRISE OPERATIONAL EXPERIENCE

| Critério | Status |
|----------|--------|
| **Padrão visual único (EOX)** | ✅ |
| **Um cabeçalho por página** | ✅ |
| **Breadcrumb integrado ao header** | ✅ |
| **Retornos padronizados (Centro Cognitivo + Domínio)** | ✅ |
| **Logística · Qualidade · SST · Ambiental integrados** | ✅ |
| **Supply / Finance registados (futuro)** | ✅ |
| **Certificações NAV/OPM/WMS preservadas** | ✅ |
| **Build produção** | ✅ |
| **READY FOR OPM-002A (Inventory)** | ✅ |

---

## Resumo

ARC-003 consolida a camada **Presentation** operacional num standard corporativo — **EOX** — antes de retomar a evolução funcional (OPM-002A Inventory, OPM-008 Supply, Finance).

A implementação cria `presentation/eox/` como camada canónica e preserva NAV-002/002A como adapters de compatibilidade. Quatro domínios passam a partilhar exactamente a mesma arquitectura de cabeçalho:

- **Logística** (WMS standalone + hub operacional)
- **Qualidade**
- **Segurança do Trabalho**
- **Meio Ambiente**

Problemas resolvidos:

1. Cabeçalhos duplicados (ONX + hub + industrial) → supressão via contexto EOX
2. Breadcrumb isolado do título → unificado em `EoxHeader`
3. Nomenclatura inconsistente → padronizada ("Centro Cognitivo", nome do domínio)
4. Padrões divergentes entre domínios → adapters finos + registry corporativo

---

## Posição no roadmap

```
NAV-002 ✅ → NAV-002A ✅ → ARC-003 ✅ EOX
     ↓
Revisão operacional Warehouse (persona Gerente Almoxarifado)
     ↓
OPM-002A Inventory Foundation
     ↓
OPM-003+ Receiving · OPM-008 Supply · Finance
```

---

## Investimento estratégico

Com EOX consolidado, OPM-002A (Inventory), OPM-008 (Supply) e Finance **nascerão sobre um padrão visual único**, eliminando retrabalho de alinhamento de interface entre domínios.

---

## Parecer final

**ARC-003 — COMPLETED**

Próximo passo recomendado: **revisão operacional Warehouse** (persona Gerente Almoxarifado) seguida de **OPM-002A Inventory Foundation**.
