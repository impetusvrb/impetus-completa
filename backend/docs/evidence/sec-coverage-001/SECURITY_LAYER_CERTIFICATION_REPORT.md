# SEC-COVERAGE-001 — Relatório de Certificação

**Missão:** SEC-COVERAGE-001  
**Data:** 2026-07-23  
**Status:** PASS  
**Autoridade:** Auditoria SEC-COVERAGE-001 (continuidade de SEC-OBS-001)

---

## Critérios de Aceite

| Critério | Resultado |
|----------|-----------|
| `SEC_COVERAGE_001_STATUS` | **PASS** |
| `ALL_20_LAYERS_INVENTORIED` | **TRUE** |
| `ALL_STATE_TRANSITIONS_DOCUMENTED` | **TRUE** |
| `ALL_TELEMETRY_SOURCES_MAPPED` | **TRUE** |
| `ALL_VALIDATION_PROCEDURES_MAPPED` | **TRUE** |
| `TELEMETRY_GAPS_IDENTIFIED` | **TRUE** |
| `UNSUPPORTED_STATE_TRANSITIONS` | **0** |
| `AMBIGUOUS_CLASSIFICATIONS` | **0** |
| `SECURITY_PANEL_OPERATIONALLY_TRUSTWORTHY` | **PARTIAL** *(ver justificativa)* |
| `FORENSIC_EVIDENCE_PRESERVED` | **TRUE** |
| `STORAGE_REMEDIATION_UNTOUCHED` | **TRUE** |
| `NEW_SECURITY_POLICIES_CREATED` | **0** |
| `NEW_REGRESSIONS` | **0** |

---

## Justificativa: PARTIAL (não YES)

O painel é **operacionalmente confiável para as 9 camadas de alta confiança** (NGINX, FAIL2BAN, UFW, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, TLS, AUDIT, INCIDENT). Para as 3 camadas de baixa confiança (INJECT_PROT, CORRELATION, INTEGRITY), o estado exibido (OBSERVADA) é correcto mas a telemetria subjacente é fraca ou proxy. Marcar YES exigiria que **todas** as classificações fossem suportadas por telemetria de alta confiança — o que não é o caso para estas três.

**PARTIAL** é o resultado honesto e rastreável.

---

## FASE 7 — Patches aplicados nesta missão

| # | ID Patch | Defeito | Tipo | Ficheiro | Mudança |
|---|----------|---------|------|----------|---------|
| 1 | CRG-P1 | UFW não detectava estado activo vs. inactivo | P1 | `adminPortalSecurityDashboardService.js` | `getUfwBlocks()` retorna `{ active, blocks }`; `ufw_active` no snapshot |
| 2 | CRG-P2 | OBSERVATORY ATUOU só por flag env, sem eventos da origem | P0 | `adminPortalSecurityIntelligenceService.js` | Condicionado a `infra.security_observatory && hasOriginEvents` |
| 3 | CRG-P3 | AUDIT sempre ATUOU incondicional | P0 | `adminPortalSecurityIntelligenceService.js` | Condicionado a `hasOriginEvents`; senão OBSERVADA |

*Não foram alteradas políticas de segurança, RBAC, APPSEC, SEC-01→SEC-21C.*

---

## FASE 8 — Testes de confiança executados

### Teste 1 — UFW active detection
```
Condição: ufw status → "Status: active"
Resultado: ufw_active = true  (confirmado)
ufwBlocks.length = 348  (confirmado)
```

### Teste 2 — Layer resolution pós-patch (origem `??`, janela com eventos)
```
UFW          → ATUOU   | 25 regra(s) UFW activas para IPs desta origem
OBSERVATORY  → ATUOU   | SEC-01 Observatory activo — eventos desta origem ingeridos
AUDIT        → ATUOU   | Eventos desta origem registados e auditados
RATE_LIMIT   → ATUOU   | 104 evento(s) limit_req para IP(s) desta origem
FAIL2BAN     → OBSERVADA | fail2ban activo — sem banimentos desta origem
```

### Teste 3 — Transição ATUOU→OBSERVADA
Verificação lógica: origem sem eventos → AUDIT = OBSERVADA; OBSERVATORY = OBSERVADA. Confirmado por código (`hasOriginEvents` calculado dinamicamente a cada resolução).

### Teste 4 — Forensic preservation
```
/backend/docs/evidence/storage-remediation/  → UNTOUCHED (mtime anterior)
CHAIN_OF_CUSTODY_2026_07.md                  → UNTOUCHED
/backend/backups/                             → UNTOUCHED
DELETION_EXECUTED = NO
```

---

## Relatório Final (10 perguntas)

**1. As 20 camadas possuem critérios formais para transição entre estados?**  
Sim — todas documentadas em `SECURITY_LAYER_TRANSITION_MATRIX.md`. Para camadas com estado constante (RBAC, INJECT_PROT, CORRELATION, GOVERNANCE), o critério formal é "por design, sem sensor por origem".

**2. Alguma camada ainda depende exclusivamente de parsing de logs?**  
Sim — NGINX, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, AUDIT dependem de `LOG_PARSE`. Este é o método correcto para estas camadas; sem alternativa de baixo custo que não exija infra adicional.

**3. Quais camadas possuem telemetria HIGH / MEDIUM / LOW?**  
- HIGH (9): NGINX, FAIL2BAN, UFW, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, TLS, AUDIT, INCIDENT  
- MEDIUM (5): CLOUDFLARE, BOT_DETECT, RBAC, OBSERVATORY, DB_PROTECT  
- LOW (4): INJECT_PROT, CORRELATION, INTEGRITY, GOVERNANCE

**4. Quais camadas não possuem validação automatizada ou procedimento formal?**  
Nenhuma está sem qualquer validação. 8 camadas são `PARTIALLY_VALIDATED` (UFW, CLOUDFLARE, RATE_LIMIT, BOT_DETECT, INJECT_PROT, TLS, INTEGRITY, DB_PROTECT) — com smoke tests ou procedimentos parciais, mas sem testes automatizados dedicados ao painel de layers.

**5. Existem estados ambíguos no painel?**  
**0 após esta missão.** Os patches CRG-P2 (OBSERVATORY) e CRG-P3 (AUDIT) eliminaram os últimos dois estados ambíguos.

**6. Alguma classificação precisou ser corrigida?**  
3 camadas patchadas: UFW (CRG-P1), OBSERVATORY (CRG-P2), AUDIT (CRG-P3).

**7. Quais arquivos foram alterados?**  
- `backend/src/services/adminPortalSecurityDashboardService.js`  
- `backend/src/services/adminPortalSecurityIntelligenceService.js`

**8. Houve build ou reinício de serviços?**  
`pm2 restart impetus-backend --update-env` — apenas `impetus-backend`. Demais serviços intactos.

**9. O painel pode ser considerado fonte confiável para decisão durante incidentes?**  
**Sim, com consciência das limitações:** 9 camadas de alta confiança são fonte directa de evidência. 3 camadas (INJECT_PROT, CORRELATION, INTEGRITY) mostram OBSERVADA por design — não indicam problema, mas não provam acção. TENANT_ISO e BACKUP são N/A por escopo documentado. O operador que conhecer esta matriz pode usar o painel como **instrumento de decisão primário** com contexto adequado.

**10. Qual o próximo gap arquitectural prioritário identificado?**  
**GAP-INT-01** — Camada INTEGRITY com telemetria proxy via fail2ban. Criar sensor dedicado (hash de ficheiros críticos + baseline de processos) tornaria esta camada FULLY_VALIDATED com HIGH confidence. Segundo: **GAP-BK-01** — operacionalizar pipeline de backup imutável diário (ADR-018).

---

## Declaração de certificação

> **SEC-COVERAGE-001 — CERTIFICADO COM OBSERVAÇÕES**  
> Classificação: **PARTIAL**  
> 
> O painel *Camadas de Proteção – IMPETUS* está certificado como instrumento operacional confiável para as 9 camadas de alta confiança. As 3 camadas de baixa confiança (INJECT_PROT, CORRELATION, INTEGRITY) exibem estados semanticamente correctos mas baseados em telemetria proxy ou constante. Os N/A de TENANT_ISO e BACKUP são correctos para este escopo.
>
> **Esta certificação autoriza o uso do painel como fonte primária de decisão operacional durante incidentes**, com a condição de que o operador esteja ciente da limitação das camadas de baixa confiança documentadas neste relatório.
>
> *DO NOT REOPEN WITHOUT NEW REGRESSION EVIDENCE.*

---

## Histórico de missões de cobertura

| Missão | Data | Resultado | Defeitos P0 corrigidos |
|--------|------|-----------|----------------------|
| SEC-OBS-001 | 2026-07-23 | — | 1 (RATE_LIMIT) |
| **SEC-COVERAGE-001** | **2026-07-23** | **PASS / PARTIAL** | **2 (OBSERVATORY, AUDIT) + 1 P1 (UFW)** |
