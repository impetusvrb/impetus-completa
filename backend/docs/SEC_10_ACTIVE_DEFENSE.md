# SEC-10 — Enterprise Active Defense (Fase 1)

**Módulo:** `backend/src/securityActiveDefense/`  
**Feature flag:** `SECURITY_ACTIVE_DEFENSE=false` (default)  
**Modo:** `SECURITY_ACTIVE_DEFENSE_MODE=observe`  
**Tipo:** Consultivo — **sem bloqueios automáticos**

---

## Missão

Camada de **Defesa Ativa Enterprise** sobre SEC-01→SEC-09 certificados:

1. Detectar ataques em tempo real (via SEC-02)
2. Interpretar ameaças (SEC-03)
3. Verificar integridade (SEC-04)
4. Preparar notificações (SEC-05)
5. Consultar respostas graduadas (SEC-06)
6. Consolidar SOC (SEC-07)
7. Produzir **Defense Recommendations** apenas

---

## Princípio Enterprise

```
observa → correlaciona → interpreta → notifica → recomenda → protege
```

SEC-10 implementa a fase **recomenda** (consultiva). A fase **protege** adaptativa fica para SEC-11.

---

## Flags

```env
SECURITY_ACTIVE_DEFENSE=false
SECURITY_ACTIVE_DEFENSE_MODE=observe
SECURITY_ACTIVE_DEFENSE_MAX_LEVEL=2
SECURITY_ACTIVE_DEFENSE_EVAL_MS=60000
SECURITY_ACTIVE_DEFENSE_OPERATORS=Wellington,Gustavo
```

---

## Endpoint

```
GET /api/audit/security-active-defense
```

---

## Proibições

- Bloquear IP · alterar nginx/firewall · reiniciar PM2 · matar processos
- Alterar Event Governance · ECO · Cognitive Core · Enterprise Baseline
- IA generativa · ML · feeds externos · execução automática

---

## Teste

```bash
node backend/src/tests/securityActiveDefense/SEC_10_ACTIVE_DEFENSE.test.js
```

---

*Additive layer — preserva integralmente Enterprise Security v1 certificado (SEC-08).*
