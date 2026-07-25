# SUPPLY — Event Namespace

**Programa:** GF-022  
**Prefixo oficial:** `supply.`  
**Processamento:** **NENHUM** (contratos reservados)

---

## Regras

1. Todos os eventos Supply **devem** iniciar com `supply.`  
2. GF-022 reserva namespace — **sem handlers**  
3. Emissão activa apenas GF-023+ após commit canónico  

---

## Eventos GF-022 (reservados)

| Evento | Fase activação | Critical |
|--------|----------------|:--------:|
| `supply.request.created` | GF-022 (reserved) | NO |
| `supply.order.approved` | GF-022 (reserved) | NO |
| `supply.vendor.selected` | GF-022 (reserved) | NO |
| `supply.contract.updated` | GF-022 (reserved) | NO |

---

## Eventos planeados (catálogo)

| Evento | Fase |
|--------|------|
| `supply.signal.received` | GF-024 |
| `supply.case.opened` | GF-023 |
| `supply.case.resolved` | GF-023 |
| `supply.metric.threshold_breached` | GF-023 |
| `supply.commitment.updated` | GF-023 |
| `supply.party.score_updated` | GF-023 |

---

## Implementação

| Artefacto | Path |
|-----------|------|
| Namespace helper | `domains/supply/events/supplyEventNamespace.js` |
| Catálogo | `domains/supply/events/supplyEventCatalog.js` |

---

## Validação

```bash
npm run test:supply-foundation
```

Teste: `event namespace supply.*` — todos os catálogo entries válidos.

---

*Referência:* [GF-021-UBIQUITOUS-LANGUAGE.md](../architecture/GF-021-UBIQUITOUS-LANGUAGE.md)
