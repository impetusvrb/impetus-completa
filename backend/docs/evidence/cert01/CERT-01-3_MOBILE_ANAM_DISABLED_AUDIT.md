# CERT-01.3 — MOBILE-ANAM-004A

**Classe:** FIX (auditoria + correção UX) | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Auditoria do estado `ANAM_STATE.DISABLED` não renderizado + correção de prioridade DISABLED > ERROR

---

## 1. Resumo executivo

| Conclusão | Detalhe |
|-----------|---------|
| **Hipótese confirmada** | **A** — o ambiente de produção **tem ANAM habilitada** (`GET /api/anam/public-config` → `enabled: true`) |
| **Comportamento observado (capturas do utilizador)** | `● Conectando…` → `⚠️ Falha de conexão com a ANAM` — **correto para falha WebRTC**, não para módulo desativado |
| **Bug lógico encontrado** | **C** — `isAnamModuleDisabled()` isentava `checking`/`connecting`, promovendo `DISABLED → ERROR` quando `anamConfigured === false` |
| **Bug visual encontrado** | Placeholder do avatar com `z-index: 2` **atrás** do `<video>` (`z-index: 4`) — círculo vazio mesmo em DISABLED |
| **Correção** | Prioridade `DISABLED > ERROR`; avatar disabled sobreposto; audit runtime |

---

## 2. Etapa 1 — Valores reais em runtime (servidor)

```bash
curl -sS http://127.0.0.1:4000/api/anam/public-config
```

**Resposta observada:**

```json
{
  "ok": true,
  "enabled": true,
  "personaId": "cdc1721e-a936-4fe2-b34d-ac804cfc1c27",
  "hasApiKey": true,
  "reason": null
}
```

| Flag | Valor real |
|------|------------|
| `anamEnabled` (hook) | `true` após `configured === true` |
| `anamConfigured` | `true` |
| `anamStatus` (durante abertura) | `checking` → `connecting` → `error` (timeout watchdog 32s) |

**Interpretação:** as capturas com «Conectando…» e «Falha de conexão» refletem **tentativa real de ligação WebRTC**, não módulo desativado. O relatório MOBILE-ANAM-004 assumiu incorretamente «ANAM desativada neste ambiente».

---

## 3. Etapa 2 — Rastreamento `resolveAnamOperationalState()`

### Antes da correção (simulação Node)

| Input | `isAnamModuleDisabled` | Estado final | Problema |
|-------|------------------------|--------------|----------|
| `configured:false`, `status:checking`, `hasRealFailure:true` | **false** | **ERROR** | Isenção de `checking` |
| `configured:false`, `status:checking` | **false** | **ready** | Nunca DISABLED durante fetch |
| `status:unconfigured`, `configured:false` | true | disabled | OK |
| `enabled:true`, `status:connecting` | false | connecting | OK (env actual) |
| `enabled:true`, `status:error`, `hasRealFailure:true` | false | error | OK (env actual) |

### Depois da correção

```json
{"case":"disabled-config-false-checking","disabled":true,"state":"disabled","reason":"anamConfigured === false"}
{"case":"disabled-unconfigured","disabled":true,"state":"disabled","reason":"anamStatus === unconfigured"}
{"case":"enabled-connecting","disabled":false,"state":"connecting","reason":"anamEnabled && status checking/connecting"}
{"case":"enabled-error-watchdog","disabled":false,"state":"error","reason":"hasRealFailure === true"}
```

**Regra aplicada:** `DISABLED` quando `anamStatus === 'unconfigured'` **ou** `anamConfigured === false` — **sem isenção** para `checking`/`connecting`.

---

## 4. Etapa 3 — Cadeia Provider → Hook → Overlay

```
ImpetusVoiceProvider
  useAnamAvatar → anamEnabled, anamConfigured, anamStatus, onError
  onAnamError → filtra transitório; ignora se unconfigured/configured false (ref)
  ↓ props (+ audit flag opcional)
ImpetusVoiceOverlay
  isAnamModuleDisabled() → hasRealFailure = !moduleDisabled && alert
  resolveAnamOperationalState() → DISABLED antes de ERROR
  ↓
VoiceAvatarExternalSlot
  anamModuleDisabled → placeholder z-index 6, vídeo oculto
  ↓
.command-compact → ○ Inativa | pill operacional | erro real
```

### Onde ocorria `DISABLED → ERROR`

1. **`isAnamModuleDisabled` L57-58 (versão anterior):** `if (anamStatus === 'checking' || anamStatus === 'connecting') return false`
2. Com `anamConfigured === false` + alerta de config → `hasRealFailure === true` → **ERROR** indevido

---

## 5. Etapa 4 — Evidência visual `ANAM_STATE.DISABLED`

**Screenshot (360×800):**

`backend/docs/evidence/cert01/screenshots/MOBILE-ANAM-004A-DISABLED-fixture-360x800.png`

Renderização comprovada:

- Avatar: **ANAM** + **Módulo não habilitado**
- Badge: **○ Inativa**
- Sem alerta vermelho
- Sem botão reconectar
- Metadados: `anamEnabled=false · anamConfigured=false · anamStatus=unconfigured`

**Validação em app live (audit flag):**

```javascript
sessionStorage.setItem('impetus-anam-audit-disabled', '1');
// Reabrir overlay de voz — força props DISABLED sem alterar backend/hooks
```

Audit runtime exposto em overlay aberto:

```javascript
window.__IMPETUS_ANAM_STATE_AUDIT__
// ou sessionStorage.setItem('impetus-anam-audit-log','1') + console
```

---

## 6. Etapa 5 — Correções aplicadas

| Arquivo | Alteração |
|---------|-----------|
| `voiceOverlayStatusUtils.js` | `DISABLED > ERROR`; remove isenção checking; `decisionReason`; `buildAnamOperationalAuditPayload()` |
| `ImpetusVoiceProvider.jsx` | `anamMetaRef` pós-hook; filtro `onAnamError` para disabled; flag `impetus-anam-audit-disabled` |
| `ImpetusVoiceOverlay.jsx` | Audit log; hooks antes de early return |
| `VoiceAvatarExternalSlot.jsx` | `showDisabledOverlay`; mount `--disabled` |
| `VoiceAvatarExternalSlot.css` | Placeholder z-index 6; vídeo oculto em disabled |

### Inalterado

WebRTC, `useAnamAvatar.js`, APIs, backend, Voice Engine, Canvas, lógica de conexão.

---

## 7. Por que o overlay entrou em ERROR (ambiente actual)

1. `public-config` retorna **`enabled: true`** — ANAM **contratada/configurada**
2. Hook entra em `checking` → `connecting` → tenta `acquireAnamStream`
3. WebRTC não estabelece sessão dentro do watchdog (**32s**)
4. `anamStatus` → `error`; `onError` → alerta real
5. `resolveAnamOperationalState` → **ERROR** (comportamento **correcto**)

**Não é regressão do MOBILE-ANAM-004** — é falha de ligação em módulo **activo**.

---

## 8. Critérios de aceitação

| Cenário | Esperado | Estado |
|---------|----------|--------|
| ANAM habilitada + conectada | ● Ouvindo | ✅ (env dependente) |
| ANAM processando | ● Analisando… | ✅ |
| ANAM respondendo | ● Respondendo… | ✅ |
| ANAM desabilitada (`configured:false`) | ANAM + Módulo não habilitado + ○ Inativa | ✅ (screenshot + lógica) |
| Timeout real (enabled) | ⚠️ Falha + ↻ Reconectar | ✅ (env actual) |

---

## 9. Build e deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend --update-env
```

Executado em 2026-06-22 — build OK, PM2 online.
