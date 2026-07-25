# SEC-VISUAL-INTELLIGENCE-001 — BASELINE CERTIFICADO

**Status:** CERTIFIED  
**Classificação:** A  
**Baseline:** LOCKED  
**Data de encerramento:** 2026-07-11  
**Ciclo completo:** 001 → 001A → 001B → 001C → 001D → 001E → 001F → 001G → 001G-R1 → 001H → 001H-R1

---

## Declaração formal

> **SEC-VISUAL-INTELLIGENCE-001 — ENCERRADO — INTEGRALMENTE CERTIFICADO — CLASSIFICAÇÃO A**

O pipeline analítico do Centro de Segurança (mapa mundial de ameaças, drill-down por país, badges, GeoIP assíncrono, equivalência FULL×INCREMENTAL) está certificado como baseline arquitetural e funcional. Nenhuma alteração funcional ocorreu durante a missão de certificação final (001H-R1).

**DO NOT REOPEN WITHOUT REGRESSION EVIDENCE** — ver seção Regras de Reabertura.

---

## Arquitetura certificada — Modelo A

### Componentes principais

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/services/adminPortalSecurityDashboardService.js` | `collectSecurityEvidence`, `getGeoState`, `scheduleGeoBacklogEnrichment`, `computeGeoUniverseStats` |
| `backend/src/services/adminPortalSecurityEvidenceLogWindow.js` | Motor incremental de logs (`acquireLogWindow`, FULL_REBUILD fail-safe) |
| `backend/src/services/adminPortalSecurityPhaseBService.js` | `buildWorldMap`, drill-down |
| `backend/src/services/adminPortalSecurityIntelligenceService.js` | `/intelligence?country_code=…` — drill-down analítico |
| `admin-portal/src/pages/SecurityDashboard.jsx` | Interface do Centro de Segurança |
| `admin-portal/src/components/SecurityEvidenceDrilldown.jsx` | Painel drill-down SEC-VISUAL-INTELLIGENCE-001 |

### Decisão arquitetural (001H — Modelo A)

`resolveIpsBounded` foi removido do critical path síncrono de `collectSecurityEvidence`. O enrichment GeoIP ocorre exclusivamente via `setImmediate(() => scheduleGeoBacklogEnrichment(...))` — single-flight, assíncrono, sem bloquear o snapshot. O snapshot síncrono usa o geoCache existente; IPs não presentes são marcados `GEO_NOT_ENRICHED` com `country_code = ??`.

---

## Invariantes certificadas (INV-SVI)

### INV-SVI-001 — Snapshot imutável

Um snapshot emitido não pode ser alterado retroativamente por enrichment posterior. O `snapshot_id` do objeto X deve permanecer inalterado após a geração do snapshot Y.

### INV-SVI-002 — País nunca presumido

Sem GeoIP comprovado: `country_code = ??`. Proibido inferir país por ASN, hostname, idioma ou heurística sem fonte declarada.

### INV-SVI-003 — Pendência explícita

Preservar separação semântica dos quatro estados:
- `GEO_RESOLVED` — resolução HTTP confirmada, TTL 24h
- `GEO_UNRESOLVED` — tentativa falhou (rate-limit, timeout), TTL 5min
- `GEO_INVALID` — IP inválido por classificação (`classifyIp`)
- `GEO_NOT_ENRICHED` — IP válido, ausente do cache por budget ou timing

Proibido fundir `GEO_UNRESOLVED` com `GEO_NOT_ENRICHED`. Proibido remover qualquer estado.

### INV-SVI-004 — GeoIP fora do critical path

Obrigatório: `geo_sync_provider_calls = 0` na construção síncrona da evidência. `geo_enrichment_mode = ASYNC_DECOUPLED`.

### INV-SVI-005 — Modelo X → Y

```
snapshot X  (T1, GEO_NOT_ENRICHED para IPs pendentes)
    ↓
enrichment assíncrono (scheduleGeoBacklogEnrichment via setImmediate)
    ↓
snapshot Y  (T2, IPs resolvidos → GEO_RESOLVED)
```

`snapshot_id X ≠ snapshot_id Y`. X permanece imutável. `TOTAL_WEIGHTED_X == TOTAL_WEIGHTED_Y`. `POPULATION_X == POPULATION_Y`. Apenas a distribuição geográfica pode mudar.

### INV-SVI-006 — Conservação de evidência

O enrichment geográfico pode redistribuir evidência entre países. Não pode alterar silenciosamente: população analítica, peso global, quantidade lógica de evidências.

### INV-SVI-007 — Fórmula dos badges

```
ÍNDICE AGREGADO PONDERADO = nginx_suspicious_hits × 1
                           + blocked_ips_count × 2
                           + threat_watch_alerts × 1
```

Não denominar automaticamente o índice como "quantidade de ataques". Pesos imutáveis sem nova especificação explícita.

### INV-SVI-008 — Mapa × drill-down

Para o mesmo `snapshot_id`:
```
world_map.badge == intelligence.summary.index_decomposition.total
index_matches_badge == true
```

### INV-SVI-009 — População analítica ≠ limite visual

`recent_alerts_analytical` (população completa, usada no índice) é distinta de `recent_alerts_display` (limite visual). O limite visual não pode truncar silenciosamente a população usada no índice.

### INV-SVI-010 — Incremental fail-safe

Processamento incremental somente quando continuidade for comprovada (`dev`, `ino`, `byteOffset`, `syncMarker`). Em ambiguidade: `FULL_REBUILD` obrigatório. Sem stale silencioso, sem perda presumida de eventos.

---

## Prova de certificação final — 001H-R1

**Data:** 2026-07-11T22:41:41.454Z  
**Script:** `backend/scripts/sec001h-r1-deterministic-equiv.js`  
**Resultado:** 35/35 PASS | exit 0

### Equivalência determinística (entradas congeladas)

```
FULL  canonical hash: 6ad9bff114610c7a8ba2a7d76d46126d
INCR  canonical hash: 6ad9bff114610c7a8ba2a7d76d46126d
```

Hashes idênticos provam que, dado o mesmo dataset congelado (nginx, threat, fail2ban, ufw, geoCache), FULL_REBUILD e INCREMENTAL produzem analiticamente a mesma verdade. A divergência anterior (`blocked_ips` FAIL) foi deterministically atribuída a fail2ban/ufw vivos consultados em momentos diferentes — artefacto de variância externa, não inconsistência algorítmica.

### Matriz EQ-01 a EQ-10

| ID | Estrutura | Resultado |
|---|---|---|
| EQ-01 | attack_origins | PASS |
| EQ-02 | blocked_ips | PASS |
| EQ-03 | recent_alerts_analytical | PASS |
| EQ-04 | recent_alerts_display | PASS |
| EQ-05 | critical_events | PASS |
| EQ-06 | world_map | PASS |
| EQ-07 | badge_decomposition | PASS |
| EQ-08 | analytical_population | PASS |
| EQ-09 | global_weighted_total | PASS |
| EQ-10 | geo_state_distribution | PASS |

### Mapa × Drill-down (6/6)

| País | Resultado |
|---|---|
| CA | PASS |
| US | PASS |
| FR | PASS |
| BR | PASS |
| VN | PASS |
| ?? | PASS |

### Performance certificada (valores observados, não SLA eterno)

```
collect wall-clock  = 279 ms
HIT                 = 6 ms
MISS                = 273 ms
geo_sync_provider_calls = 0
geo_enrichment_mode = ASYNC_DECOUPLED
```

### Regressão de congelamento (2026-07-11T22:58:16.661Z)

14/14 PASS — `FROZEN_OK`

---

## Regras de reabertura (REG-01 a REG-12)

O SEC-VISUAL-INTELLIGENCE-001 somente pode ser reaberto com evidência objetiva de ao menos uma das condições:

| ID | Condição de reabertura |
|---|---|
| REG-01 | `canonical_equivalence` FAIL com entradas congeladas |
| REG-02 | `index_matches_badge` = false |
| REG-03 | Mapa e drill-down com `snapshot_id` divergente indevidamente |
| REG-04 | `geo_sync_provider_calls > 0` no critical path síncrono |
| REG-05 | Snapshot anterior alterado por enrichment posterior |
| REG-06 | Perda de população analítica |
| REG-07 | `global_weighted_total` não conservado |
| REG-08 | `GEO_NOT_ENRICHED` classificado como país presumido |
| REG-09 | Motor incremental perde linhas/eventos |
| REG-10 | FULL_REBUILD fail-safe deixa de atuar em ambiguidade |
| REG-11 | MISS P95 regride sustentadamente acima de 1000 ms (evento transitório ≠ regressão sustentada) |
| REG-12 | Regressão de hardening relacionada ao componente |

**Nota sobre REG-11:** Uma oscilação isolada de latência não reabre automaticamente o ciclo. Exige evidência temporal de regressão sustentada antes de qualquer intervenção arquitetural.

---

## Hardening preservado

Confirmado na certificação final (001H-R1):

- WAF/Nginx: operacional
- fail2ban: operacional, não alterado
- UFW: operacional, não alterado
- RBAC: `super_admin` → 200 | perfis não autorizados → 403
- JWT: token inválido → 401 | sem token → 401
- Rate limiting: preservado
- Turnstile: preservado
- Tenant isolation (RLS): preservado
- mutationTestGuard: preservado
- PM2 impetus-backend: online, unstable_restarts = 0

---

## Proibições sobre o baseline certificado

É proibido sem evidência de regressão (REG-01..12):

- Refatorar o pipeline por preferência estética
- Alterar o Modelo A
- Reacoplar GeoIP ao critical path
- Alterar geoCache, TTLs, GEO_RESOLVE_BUDGET, GEO_CONCURRENCY
- Alterar fórmula dos badges ou pesos do índice
- Alterar população analítica
- Alterar motor incremental de logs
- Remover FULL_REBUILD fail-safe
- Fundir GEO_UNRESOLVED com GEO_NOT_ENRICHED
- Alterar semântica X → Y
- Realizar "cleanup técnico" não solicitado sobre o pipeline certificado
