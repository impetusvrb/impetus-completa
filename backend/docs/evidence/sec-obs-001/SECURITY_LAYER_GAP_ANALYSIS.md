# SEC-OBS-001 — Análise de Gaps

**Data:** 2026-07-23  
**Classificação de gaps:** P0 = classificação falsa | P1 = telemetria incompleta | P2 = melhoria / documentação

---

## Gaps fechados nesta missão

| ID | Severidade | Descrição | Correcção |
|----|------------|-----------|-----------|
| GAP-RL-01 | **P0** | RATE_LIMIT sempre `SEM_TELEMETRIA` apesar de `limit_req` activo e logs existentes | Ler conf + `error.log`; estados ATUOU/OBSERVADA/SEM |
| GAP-TXT-01 | P2 | Textos N/A de RLS/Backup sugeriam ausência de produto | Clarificar escopo do painel + estado real (piloto / ADR-018) |
| GAP-TXT-02 | P2 | DB_PROTECT dizia “RLS activo” de forma absoluta | Texto “tabelas piloto” |

### Ficheiros alterados

- `backend/src/services/adminPortalSecurityDashboardService.js`
  - `detectNginxRateLimitConfigured()`
  - `collectNginxRateLimitHits()`
  - `infrastructure.nginx_rate_limit`
  - `rate_limit_hits` no snapshot de evidência
- `backend/src/services/adminPortalSecurityIntelligenceService.js`
  - lógica `RATE_LIMIT` + textos TENANT_ISO / BACKUP / DB_PROTECT
  - filtro `rate_limit_hits` por `country_code`

**Políticas de segurança:** nenhuma alteração (nginx zones, fail2ban, UFW, RLS, backups intactos).

---

## Gaps abertos (não corrigidos — sem evidência de classificação falsa crítica)

| ID | Severidade | Camada | Gap | Recomendação |
|----|------------|--------|-----|--------------|
| GAP-F2B-RL | P1 | RATE_LIMIT / fail2ban | Jail `nginx-limit-req` com 0 bans e journal matches vazio apesar de limit_req a actuar | Auditar filtro fail2ban (journal vs ficheiro); **não** muda status do painel se error.log já alimenta RATE_LIMIT |
| GAP-INT-01 | P1 | INTEGRITY | Status proxy via `fail2ban.available`, não via sensor de integridade | Introduzir telemetria real (hashes/baseline) ou renomear evidência |
| GAP-AUD-01 | P2 | AUDIT | Sempre ATUOU no drill-down | Condicionar a presença de eventos da origem → ATUOU else OBSERVADA |
| GAP-OBS-01 | P2 | OBSERVATORY | ATUOU só pela flag env, sem eventos da origem | ATUOU se eventos correlacionados; senão OBSERVADA com flag ON |
| GAP-CF-01 | P1 | CLOUDFLARE | Só detecta ficheiro local; sem WAF/analytics CF | Integração opcional API CF (fora de SEC-OBS-001) |
| GAP-RLS-01 | P1 (produto) | TENANT_ISO / DB | `companies` sem RLS; piloto parcial | Fora do painel de origem; roadmap tenant-isolation |
| GAP-BK-01 | P1 (produto) | BACKUP | ADR-018 aceite; pipeline diário imutável não operacionalizado | Implementação DATA-01 — não misturar com badges de ataque |
| GAP-INJ-01 | P2 | INJECT_PROT | Sem contadores por origem | Instrumentar middleware (métricas) se necessário para decisão SOC |

---

## Decisões explícitas (não-mudança)

1. **Não** forçar ATUOU em camadas OBSERVADAS.
2. **Manter N/A** para TENANT_ISO e BACKUP neste painel (escopo origem externa).
3. **Não** alterar rates nginx / jails / UFW só para “melhorar” o badge.
4. Baseline SEC-VISUAL-INTELLIGENCE-001: recolha de rate-limit é **paralela** ao pipeline incremental access/threat (janela limitada de error.log, sem provider GeoIP síncrono extra no critical path além do enrichWithCountries já usado).

---

## Conclusão

O painel era **maioritariamente fiável** para camadas com telemetria directa (Nginx, fail2ban, UFW, auth). O único defeito de classificação comprovado e material era **RATE_LIMIT**. Após SEC-OBS-001, o Rate Limiting passa a reflectir actuação real quando há linhas `limiting requests` correlacionáveis à origem, ou OBSERVADA quando a camada está configurada sem eventos na janela.
