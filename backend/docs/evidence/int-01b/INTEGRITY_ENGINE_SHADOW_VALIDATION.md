# Motor de Integridade — Validação Shadow Mode

**Documento:** INTEGRITY_ENGINE_SHADOW_VALIDATION.md  
**Missão:** INT-01B (FASE 8 + FASE 12)  
**Data:** 2026-07-23  
**Status:** SHADOW_MODE_VALIDATED

---

## 1. Shadow Mode — definição

O Shadow Mode é o modo de operação em que o Motor de Integridade:
- Monitoriza, compara e correlaciona eventos
- Regista exclusivamente no `integrity-shadow.log`
- **Não** alimenta o Dashboard
- **Não** alimenta o Centro de Comando
- **Não** alimenta o threat-watch.log
- **Não** altera a classificação das camadas de protecção

Activação: `INTEGRITY_SENSOR_ENABLED=false` (default actual)

---

## 2. Shadow log

**Localização:** `/var/log/impetus-integrity-shadow.log`

**Criado em:** 2026-07-23T13:04:48Z (primeira execução dos testes)

**Formato:** NDJSON (cada linha = 1 evento JSON completo)

**Header de sessão:**
```
[2026-07-23T13:04:48.651Z] INTEGRITY_SHADOW_SESSION_START pid=3128769 SHADOW_MODE=true
```

**Exemplo de evento registado:**
```json
{
  "event_id": "int-20260723130448-0013",
  "schema_version": "1.0",
  "timestamp": "2026-07-23T13:04:48.653Z",
  "event_type": "INTEGRITY_HASH_CHANGED",
  "severity": "CRITICAL",
  "asset_path": "/var/www/impetus-completa/backend/src/server.js",
  "asset_id": "INT-C-001",
  "asset_criticality": "CRITICAL",
  "sensor_component": "HashChecker",
  "confidence": "HIGH",
  "severity_final": "CRITICAL",
  "escalate_to_observatory": true,
  "false_positive_score": 0,
  "response_required": true
}
```

---

## 3. Verificação de isolamento

| Verificação | Resultado |
|---|---|
| `INTEGRITY_SENSOR_ENABLED=false` → `getEngine() === null` | ✔ CONFIRMADO |
| Nenhuma entrada em `/var/log/impetus-threat-watch.log` | ✔ CONFIRMADO (sem acesso pelo motor) |
| Nenhum campo novo no payload de `collectSecurityEvidence()` | ✔ CONFIRMADO (não modificado) |
| Estado INTEGRITY no Dashboard inalterado | ✔ CONFIRMADO (proxy fail2ban activo) |
| Security Intelligence sem referência ao motor | ✔ CONFIRMADO |
| SEC-01 → SEC-21C inalterados | ✔ CONFIRMADO |

---

## 4. Fluxo de dados em Shadow Mode

```
audit.log ──► AuditdBridge ──┐
                              │
server.js, .env, etc. ──► HashChecker ──► IntegrityEventBus ──► CorrelationEngine ──► shadow.log
                              │                                        ↑
nginx, fail2ban, etc. ──► PermChecker ──┘                     (enriquece, classifica,
                                                                suprime FPs)
```

**Destinos actuais do shadow.log:** apenas `/var/log/impetus-integrity-shadow.log`

**Destinos em INT-01C (futuro):**
```
shadow.log + /var/lib/impetus/integrity/state.json + /var/lib/impetus/integrity/events.jsonl
```

---

## 5. FASE 12 — Reversibilidade verificada

### Cenário A: INTEGRITY_SENSOR_ENABLED=false (actual)
- `IntegrityRuntime.init()` carregado → verifica flag → retorna imediatamente
- `getEngine() === null` → zero impacto
- Nenhum `setInterval` criado → zero carga
- Nenhum `fs.watch` criado → zero IO
- Nenhum evento emitido → zero ruído

### Cenário B: INTEGRITY_SENSOR_ENABLED=true (futuro — INT-01C)
- Motor activo com todos os componentes
- Shadow log alimentado + state.json actualizado
- Painel usa `getIntegrityState()` em vez do proxy

### Cenário C: Reversão de Cenário B para Cenário A
- `INTEGRITY_SENSOR_ENABLED=false` no `.env` → restart impetus-backend
- Motor não inicia → painel reverte automaticamente para proxy fail2ban
- Zero dados corrompidos (shadow log e state.json são apenas evidência)

```
REVERSIBILITY_CONFIRMED              = TRUE
ZERO_FUNCTIONAL_IMPACT_WITH_FLAG_OFF = TRUE
DASHBOARD_UNCHANGED_WITH_FLAG_OFF    = TRUE
ROLLBACK_PROCEDURE                   = envvar change + pm2 reload
```

---

## 6. Conteúdo actual do shadow log

```
[2026-07-23T13:04:48.651Z] INTEGRITY_SHADOW_SESSION_START pid=3128769 SHADOW_MODE=true
[evento INTEGRITY_HASH_CHANGED — teste controlado de server.js]
[2026-07-23T13:04:48.854Z] INTEGRITY_SHADOW_SESSION_START pid=3128769 SHADOW_MODE=true
[evento INTEGRITY_HASH_CHANGED — suprimido por deploy mode]
```

O shadow log contém apenas eventos dos testes controlados (runTests.js). **Nenhum evento de operação real do sistema foi gerado** porque `INTEGRITY_SENSOR_ENABLED=false` no servidor de produção.

---

## 7. Próximos passos (INT-01C)

Para activar a integração controlada:

1. Adicionar `getIntegrityState()` ao `adminPortalSecurityDashboardService.js`
2. Adicionar `integrity_state` ao payload de `collectSecurityEvidence()`
3. Actualizar `buildProtectionLayers()` no `adminPortalSecurityIntelligenceService.js`
4. Activar `INTEGRITY_SENSOR_ENABLED=true` (janela de manutenção acordada)
5. Restart `--update-env --only impetus-backend`
6. Validar estado INTEGRITY no painel (OBSERVADA se sistema íntegro)
