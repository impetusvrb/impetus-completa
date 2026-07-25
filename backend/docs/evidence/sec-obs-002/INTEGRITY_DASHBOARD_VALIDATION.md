# INTEGRITY_DASHBOARD_VALIDATION.md
## SEC-OBS-002 — Validação do Consumo no Centro de Comando

**Fase:** SEC-OBS-002  
**Data:** 2026-07-23  
**Status:** PASS

---

## 1. Campos Consumidos

| Campo esperado | Presente | Valor observado |
|---|---|---|
| estado operacional (`mode`) | ✅ | WATCH |
| activos monitorados | ✅ | 35 |
| eventos / violações | ✅ | violations ≥ 4 (ATUOU) |
| última verificação | ✅ | last_check ISO |
| versão / id do baseline | ✅ | INT-01A-BASELINE-20260723 |
| estado da camada INTEGRITY | ✅ | ATUOU |

---

## 2. Coerência

| Teste | Resultado |
|---|---|
| 5 leituras consecutivas consistentes | ✅ |
| Ausência de estados contraditórios (available vs mode) | ✅ |
| Sem duplicação de lógica no Dashboard | ✅ (apenas `readStateFile`) |
| state.json ↔ getIntegrityState() | ✅ Campos alinhados |

---

## 3. Comportamento da Camada INTEGRITY

| Condição | Status esperado | Observado |
|---|---|---|
| Motor activo + violations > 0 | ATUOU | ✅ |
| Motor DEGRADED | SEM_TELEMETRIA | ✅ (FASE 5) |
| state corrompido | fallback / proxy | ✅ available=false |

---

## 4. Restrições Respeitadas

- Dashboard **não** recalcula hashes/permissões
- Nenhuma alteração adicional ao Dashboard nesta fase além do consumo já introduzido em INT-01D
- APPSEC e SEC-01→SEC-21C intocados

**DASHBOARD_UPDATED = TRUE** (consumo operacional activo com sensor ligado)
