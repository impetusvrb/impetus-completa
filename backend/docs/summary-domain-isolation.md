# Summary Domain Isolation (Z.16)

## Ordem correcta

1. Construir **narrative pool** por domínio (`buildNarrativePool`)
2. **Isolar** tópicos bloqueados (`filterNarrativePool`) — ANTES da composição
3. Aplicar authority/hierarchy no pool
4. Compor summary a partir do pool filtrado
5. `lockSummaryAfterTerminal` — sem mutação posterior

## Anti-padrão proibido

Compor narrativa cross-domain e filtrar **depois** do texto final.

## Módulo

`finalSummaryAuthority.js` — `applySummaryDomainIsolationBeforeCompose`, `lockSummaryAfterTerminal`.

## Integração

`GET /dashboard/smart-summary` chama `applyTerminalSummaryLock` quando summary lock activo.
