# REV-001 — Roadmap Recommendation

**Revisão:** REV-001  
**Modo:** READ ONLY  
**Data:** 2026-07-18

---

## ROADMAP STATUS

### Veredicto: **PODE CONTINUAR GF-025** (com WMS-003 em paralelo)

A sequência documentada **não requer replaneamento**. EV-001 autorizou explicitamente execução paralela:

```
GF-025 Supply Promotion + CC     ║     WMS-003 Operational APIs
         (sequencial Supply)     ║     (sequencial WMS)
```

**Não recomendado:** EXECUTAR WMS-003 ANTES de GF-025 como bloqueio — são frentes independentes com isolamento arquitectural verificado.

**Recomendado:** EXECUTAR AJUSTES ESPECÍFICOS (GAP-PLAT-001 CI) em paralelo, sem bloquear either track.

---

## Comparação roadmaps

### Supply (GF-021-ROADMAP)

| Fase | Documento | Estado REV-001 | Próximo |
|------|-----------|:--------------:|---------|
| GF-021 Discovery | ✅ | Concluído | — |
| GF-022 Foundation | ✅ | Concluído | — |
| GF-023 Core Domain | ✅ | Concluído | — |
| GF-024 Signal Loader | ✅ | Concluído | — |
| **GF-025** Promotion + CC | 📋 | **Próximo autorizado** | GAP-SUP-001/002 |
| GF-026 Pilot Enablement | 📋 | Pendente | APIs, RBAC, UI |
| GF-027 Homologation | 📋 | Pendente | BASELINE-SUPPLY-v2.0 |
| INC → SYSTEM v1.5 | 📋 | Pós-GF-027 | INC-048 (roadmap) |

**Sequência correcta?** ✅ Sim — GF-025 é evolução natural pós-GF-024.

**Etapa obrigatória antes?** Nenhuma além de GF-024 ✅.

**Reordenar?** ❌ Não — preservar Greenfield; não reiniciar.

---

### WMS (WMS-IMPLEMENTATION-ROADMAP)

| Fase | Estado REV-001 | Próximo |
|------|:--------------:|---------|
| WMS-001 Foundation | ✅ | — |
| WMS-002 OCL + Core Services | ✅ | — |
| **WMS-003** Operational APIs | 📋 | **Próximo autorizado** |
| WMS-004 Frontend Workspace | 📋 | Depende WMS-003 |
| WMS-005 RBAC + Navigation | 📋 | Depende WMS-004 |
| WMS-006 Validation | 📋 | BASELINE-WMS-v1.0 |

**Sequência correcta?** ✅ Sim — WMS-003 depende WMS-002 (satistfeito).

**Bloqueia GF-025?** ❌ Não — C-2 EV-001 confirma isolamento `logistics-operational/`.

---

## Matriz de decisão sequenciamento

| Cenário | Avaliação | Decisão |
|---------|-----------|---------|
| GF-025 antes WMS-003 | Supply sem dependência WMS | ✅ **Autorizado** |
| WMS-003 antes GF-025 | WMS sem dependência Supply | ✅ **Autorizado** |
| Ambos em paralelo | Sem conflito código/registries | ✅ **Recomendado** |
| GF-026 antes GF-025 | Viola ARC-002 sequence | ❌ **Proibido** |
| WMS-005 antes WMS-003 | Viola DELIVERY-LIFECYCLE | ❌ **Proibido** |
| Reiniciar GF-022 | Invalida baseline | ❌ **Proibido** |

---

## Plano de execução único (preservando baselines)

### Trilha A — Supply (sequencial)

```
GF-025  Promotion + CC + facade attachment
   ↓
GF-026  Pilot · APIs · RBAC · menu · flags controlados
   ↓
GF-027  Homologation · test:supply-runtime-homologation
   ↓
INC-048 → BASELINE-SUPPLY-v2.0 → SYSTEM v1.5 (roadmap GF-021)
```

**Entregáveis GF-025:** `supplyRenderPromotionSupervisor`, facade `supply_signal_loader`, 7 hubs FE, perfil `manager_supply`.

### Trilha B — WMS (sequencial)

```
WMS-003  APIs reais · overview fail-closed · zero mock BE
   ↓
WMS-004  FE workspace · remover G-LOG-002
   ↓
WMS-005  RBAC warehouse_* · menu pilot
   ↓
WMS-006  Validation · BASELINE-WMS-v1.0
```

### Trilha C — Plataforma (paralelo contínuo)

| Item | Acção |
|------|-------|
| GAP-PLAT-001 | CI PostgreSQL para testes supply/wms/architecture |
| GAP-PLAT-002 | Documentar tensão FOUNDATION/HOMOLOGATED (sem alterar baseline) |
| GAP-LOG-001 | Activar flags logistics **após** WMS-004 ou piloto documentado |

### Trilha D — Paridade UX (pós-P0)

| Item | Timing |
|------|--------|
| GAP-PPAP-001, GAP-MSA-001, GAP-ISH-001 | EV incremental ou documentar CC-only como baseline UI |
| GAP-EHS-001 | Flag safety executive quando SST pilot expandir |

---

## Cronograma sugerido (não vinculativo)

| Semana | Trilha A | Trilha B | Trilha C |
|--------|----------|----------|----------|
| 1 | GF-025 início | WMS-003 início | CI tests |
| 2 | GF-025 conclusão | WMS-003 conclusão | — |
| 3 | GF-026 início | WMS-004 | GAP-LOG-001 avaliação |
| 4+ | GF-026/027 | WMS-005/006 | Paridade UX |

---

## Riscos de replaneamento evitados

| Risco | Mitigação |
|-------|-----------|
| Invalidar BASELINE v1.4 | Nenhuma alteração aos 11 runtimes LOCKED |
| Acoplamento Supply-WMS | Manter semantic loader + OCL separados |
| Dual stack warehouse | OCL única fronteira (WMS-002 ✅) |
| Perder GF-022…024 | GF-025 additive only |

---

## Respostas formais REV-001

| Pergunta | Resposta |
|----------|----------|
| Sequência continua correcta? | **Sim** |
| Etapa obrigatória antes? | **Nenhuma** (pré-requisitos satisfeitos) |
| Fase a reordenar? | **Não** |
| REPLANEJAR ROADMAP? | **Não necessário** |

---

*Síntese:* [REV-001-EXECUTIVE-SUMMARY.md](./REV-001-EXECUTIVE-SUMMARY.md)
