# INTEGRITY_GOVERNANCE_UPDATE

**Emitido em:** 2026-07-23 16:02 UTC  
**Fase de origem:** SEC-BASELINE-002  

---

## 1. Alteração de Baseline de Segurança

### 1.1 Estado Anterior (pré-SEC-BASELINE-002)

A camada INTEGRITY existia no roadmap e arquitectura, mas não estava incorporada ao Baseline de Segurança oficial do IMPETUS. A plataforma operava com:

- Baseline de segurança sem cobertura de integridade de ficheiros
- Motor de integridade activo (INTEGRITY_SENSOR_ENABLED=true) mas sem baseline oficial actualizado para os seus próprios ficheiros
- Status do ciclo: aberto (aguardando consolidação)

### 1.2 Estado Após SEC-BASELINE-002

A camada INTEGRITY é agora parte integrante do Baseline de Segurança oficial do IMPETUS:

| Atributo | Valor |
|---|---|
| Camada | INTEGRITY |
| Status | CERTIFIED_WITH_LIMITATIONS |
| Baseline ID | IMPETUS-INTEGRITY-BASELINE-v2 |
| Data de vigência | 2026-07-23 |
| Motor activo | Sim (INTEGRITY_SENSOR_ENABLED=true) |
| Cobertura CRITICAL/HIGH | 100 % |

---

## 2. Fluxo Oficial de Manutenção da Camada INTEGRITY

### 2.1 Operação Normal (sem evolução)

```
[Motor em produção]
    ↓ (periódico)
IntegrityHashChecker / IntegrityPermChecker / IntegrityAuditdBridge
    ↓
IntegrityEventBus → IntegrityCorrelationEngine
    ↓
IntegrityStateStore (state.json + events.jsonl)
    ↓
adminPortalSecurityDashboardService (read-only)
    ↓
Centro de Comando (INTEGRITY: ATUOU/OBSERVADA/SEM_TELEMETRIA)
```

### 2.2 Alertas e Resposta

| Evento | Severidade | Acção imediata |
|---|---|---|
| Hash alterado (CRITICAL) | CRITICAL | Investigação imediata; baseline não é actualizado automaticamente |
| Hash alterado (HIGH) | HIGH | Revisão em 4h; justificação ou rollback |
| Hash alterado (MEDIUM) | MEDIUM | Revisão em 24h |
| Permissão alterada | HIGH/CRITICAL | Verificar se mudança foi autorizada |
| Ficheiro removido | CRITICAL | Alerta imediato; verificar backup |
| Motor em DEGRADED | HIGH | Investigar causa; auto-recovery em curso |

### 2.3 Actualização Autorizada do Baseline

Qualquer alteração intencionalmente autorizada a activos monitorizados (deployments, patches, actualizações de configuração) segue este fluxo:

1. **Deploy autorizado** concluído e verificado
2. **Confirmação** que a alteração é esperada e aprovada
3. **Não actualizar baseline automaticamente** — aguardar ciclo de governança
4. **Registar** no changelog de governança
5. **Na próxima janela de manutenção:** iniciar ciclo OBS → COVERAGE → CERT → BASELINE

> ⚠️ **O baseline NUNCA deve ser actualizado unilateralmente como resposta a um alerta.** Toda actualização requer ciclo formal completo.

---

## 3. Processo para Futuras Alterações ao Baseline

### 3.1 Trigger de Novo Ciclo

Um novo ciclo de governança deve ser iniciado quando:

- Novo componente de software é adicionado ao inventário
- Componente existente sofre evolução arquitectural significativa
- Novas regras de auditd são adicionadas (LIM-001)
- Escopo de monitorização é expandido (novo domínio)
- Risco residual P1/P2 é endereçado por implementação

### 3.2 Ciclo Obrigatório

```
EVOLUÇÃO APROVADA
    ↓
OBS (Validação Operacional)
    ↓
COVERAGE (Auditoria de Cobertura)
    ↓
CERT (Certificação Formal)
    ↓
BASELINE (Consolidação Oficial)
```

Nenhuma fase pode ser omitida. Em caso de falha numa fase, o ciclo para e o baseline anterior permanece vigente.

### 3.3 Critérios de Aprovação para Novo Baseline

| Critério | Obrigatório |
|---|---|
| 0 divergências inesperadas | Sim |
| 100 % cobertura CRITICAL/HIGH | Sim |
| FP/FN aceitáveis (< 5 %) | Sim |
| Todos os drifts justificados | Sim |
| Baseline anterior preservado | Sim |
| Manifesto criptográfico gerado | Sim |

---

## 4. Camada INTEGRITY no Baseline de Segurança IMPETUS

A tabela abaixo representa o estado actualizado das camadas de segurança no baseline oficial:

| Camada | Status | Baseline | Observações |
|---|---|---|---|
| FIREWALL | CERTIFICADA | Baseline anterior | Sem alterações |
| FAIL2BAN | CERTIFICADA | Baseline anterior | Sem alterações |
| AUDITD | CERTIFICADA (parcial) | Baseline anterior | Cobertura expandida planeada |
| SSL/TLS | CERTIFICADA | Baseline anterior | Sem alterações |
| INTEGRITY | **CERTIFIED_WITH_LIMITATIONS** | **v2.0 (2026-07-23)** | **Novo — SEC-BASELINE-002** |

---

## 5. Responsabilidades

| Papel | Responsabilidade |
|---|---|
| Equipa de desenvolvimento | Não modificar componentes certificados fora de escopo aprovado |
| Operações | Monitorizar estado da camada INTEGRITY no Centro de Comando |
| Governança | Aprovar novos ciclos de evolução; manter este documento actualizado |
| Auditor | Verificar cadeia de custódia e SHA-256 dos baselines em auditorias |

---

## 6. Referências

- `backend/docs/evidence/sec-baseline-002/INTEGRITY_SECURITY_BASELINE_2026.md`
- `backend/docs/evidence/sec-baseline-002/INTEGRITY_BASELINE_VERSION_HISTORY.md`
- `backend/docs/evidence/sec-baseline-002/INTEGRITY_LIMITATIONS_REGISTER.md`
- `backend/docs/evidence/sec-baseline-002/INTEGRITY_BASELINE_MANIFEST.md`
- `backend/docs/evidence/sec-cert-002/INTEGRITY_FINAL_CERTIFICATE.md`
- `backend/security/integrity/baseline.json` (v2 — activo)
- `backend/security/integrity/baseline-int-01a.json` (v1 — arquivado)
