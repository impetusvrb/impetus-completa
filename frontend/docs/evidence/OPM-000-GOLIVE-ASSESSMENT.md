# OPM-000 — Go Live Assessment

**Modo:** READ ONLY · **Data:** 2026-07-19

---

## Critérios de classificação

| Nível | Definição |
|-------|-----------|
| **GO LIVE** | Produto operacional completo para perfil-alvo sem workarounds |
| **GO LIVE COM RESTRIÇÕES** | Infra produção-ready; funcionalidade parcial documentada |
| **PILOTO** | Arquitectura certificada; produto limitado a tenant/flags/API |
| **PROTÓTIPO** | Shell técnico ou infra incompleta |

---

## WMS — avaliação por módulo

| Módulo | Arquitectura | Navegação | Segurança | Runtime/API | Produto UI | Industry 4.0 | **Go Live** |
|--------|:----------:|:---------:|:---------:|:-----------:|:----------:|:------------:|:-----------:|
| Warehouse | 100% | 100% | 100% | 95% | 39% | 40% | **PILOTO** |
| Inventory | 100% | 100% | 100% | 95% | 41% | 35% | **PILOTO** |
| Receiving | 100% | 100% | 100% | 92% | 43% | 35% | **PILOTO** |
| Picking | 100% | 100% | 100% | 92% | 42% | 35% | **PILOTO** |
| Shipping | 100% | 100% | 100% | 92% | 43% | 35% | **PILOTO** |
| Transfers | 100% | 100% | 100% | 92% | 41% | 35% | **PILOTO** |
| Landing + CC | 100% | 100% | 100% | 90% | 70% | 55% | **GO LIVE COM RESTRIÇÕES** |
| logistics_native (CC) | 100% | 100% | 100% | 88% | N/A | 45% | **PILOTO** |

### Parecer WMS global

## **GO LIVE COM RESTRIÇÕES (PILOTO OPERACIONAL)**

Operadores podem **navegar e consultar** módulos via sidebar segregada (NAV-001) com dados reais WMS-003 v1. **Não** podem executar fluxos completos de recebimento, picking, expedição ou transferência **dentro da UI IMPETUS** sem evolução OPM.

---

## Supply — avaliação por capacidade

| Capacidade | Arquitectura | Runtime/API | CC/Cognitive | Produto UI | **Go Live** |
|------------|:----------:|:-------------:|:------------:|:----------:|:-----------:|
| REST v1 (8 entidades) | 100% | 90% | — | 25% | **PILOTO** |
| Pilot + INC-048 | 100% | 85% | — | 50% | **PILOTO** |
| Promotion / Signals | 100% | 88% | 55% | — | **PILOTO** |
| Workspace FE | 100% | — | — | 18% | **PROTÓTIPO (UI)** |
| CC supply_native | 100% | 90% | 50% | — | **GO LIVE COM RESTRIÇÕES** |

### Parecer Supply global

## **PILOTO (ARQUITECTURALMENTE GO · PRODUTO NÃO GO)**

Integrações machine-to-machine e Centro de Comando: **aptos a piloto produção**. Workspace e fluxos utilizador final: **não aptos a Go Live operacional pleno**.

---

## Plataforma integrada WMS + Supply

| Cenário WMS-005 | Estado | Go Live impact |
|-----------------|:------:|----------------|
| procurement_receiving | PASS | API chain ✅; UI chain ❌ |
| inventory_picking | PASS | idem |
| inventory_shipping | PASS | idem |
| warehouse_transfer | PASS | idem |
| cognitive_integrated | PASS | CC/pilot ✅ |

**Conclusão integrada:** Homologação **API/runtime** GO; homologação **produto** NO-GO pleno.

---

## Requisitos antes de Go Live pleno (referência — backlog OPM)

1. UI transaccional mínima por módulo WMS (create + workflow)
2. UI entidade Supply (PR, PO, suppliers) — não shell
3. OPS-003 verificação navegação produção
4. Dados tenant reais (não só in-memory Supply)
5. Remover dependência de cliente externo para workflows

---

*Assessment READ ONLY — sem alteração de flags ou deploy.*
