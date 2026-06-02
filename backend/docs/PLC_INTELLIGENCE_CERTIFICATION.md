# PLC Intelligence Certification (Fase 40-F)

**Script:** `backend/scripts/phase40-plc-intelligence-certification.js`  
**Execução:** 2026-06-01 — **14/14 PASS**

---

## Suíte TI

| ID | Teste | Resultado |
|----|-------|-----------|
| TI-01 | Equipamentos ativos | PASS |
| TI-02 | Última coleta | PASS |
| TI-03 | Alarmes auditáveis | PASS |
| TI-04 | Runtime estimado | PASS |
| TI-05 | Saúde da telemetria | PASS |
| TI-06 | Tenant vazio | PASS |
| TI-07 | PLC ativo sem MES | PASS |
| TI-08 | PLC inativo (tenant vazio) | PASS |
| TI-09 | Alarmes críticos observáveis | PASS |
| TI-10 | Evidence Binding FULL | PASS |

---

## Chat integrado

| ID | Pergunta | Resultado |
|----|----------|-----------|
| TI-CHAT-01 | Equipamentos activos | PASS — `telemetry_only`, LAB-EQ-001 |
| TI-CHAT-02 | Última coleta PLC | PASS |
| TI-CHAT-03 | OEE (tenant real) | PASS — sem % inventado |
| TI-CHAT-04 | OEE (tenant vazio) | PASS — `tenant_empty` |

---

## Critérios de sucesso (checklist)

1. Nenhum KPI industrial inventado — **OK**
2. IA responde com factos PLC observáveis — **OK**
3. Runtime estimado consistente (~24 h / 8637 pts) — **OK**
4. Alarmes auditáveis — **OK**
5. Tenant vazio protegido — **OK**
6. Evidence Binding `plc_collected_data` — **OK**
7. Industrial Truth certificado (modo aditivo) — **OK**
8. Hallucination inalterado — **OK** (sem alteração de flags)

---

## Comando

```bash
cd backend && node scripts/phase40-plc-intelligence-certification.js
```

Após alterações em rotas: `pm2 reload impetus-backend --update-env`
