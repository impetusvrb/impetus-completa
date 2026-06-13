# AIOI_P0D_TENANT_SELECTION

**Fase:** AIOI-P0D — Operational Pilot Certification Framework  
**Etapa:** D.2 — Tenant Selection  
**Data:** 2026-06-12  
**Auditor:** AIOI Certification Engine  
**Versão:** 1.0.0

---

## Metodologia de Seleção

Scoring multi-critério sobre tenants ativos baseado em:

| Critério | Peso | Descrição |
|----------|------|-----------|
| Telemetria PLC | 50% | Volume e diversidade de dados históricos |
| Diversidade de Equipamentos | 30% | Número de equipamentos distintos |
| Estado IOE Limpo | 20% | Sem IOEs preexistentes (ambiente controlado) |

---

## Candidatos Avaliados

| Tenant | Registros PLC | Equipamentos | IOEs | Score | Decisão |
|--------|--------------|--------------|------|-------|---------|
| find fish alimentos | 481.284 | 4 | 0 | 90,1 | **SELECIONADO** |
| industria de teste | 344.382 | 3 | 0 | 73,4 | Reserva |
| Fresh & Fit Ind. Alimentos | 0 | 0 | 0 | 30,0 | Descartado |

---

## Tenant Selecionado

```json
{
  "company_id": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
  "name": "find fish alimentos",
  "active": true,
  "industry_segment": "produção, manutenção, qualidade, logística, rh, diretoria",
  "pilot_score": 90.1,
  "selection_reason": "maior_telemetria_plc"
}
```

---

## Justificativa de Seleção

### Critério 1 — Baixo Risco
- Tenant ativo, dados históricos extensos (481K+ registros PLC)
- Nenhum IOE existente → ambiente limpo para piloto controlado
- Operação normal (equipamentos em `status=running`, `alarm_state=ok`)
- Sem conflitos com módulos cognitivos (não utilizados)

### Critério 2 — Ambiente Controlado
- Pipeline PLC-AIOI inexistente neste tenant → sem interferência com processos existentes
- Dados de telemetria simulados (ambiente de pré-produção) → risco operacional mínimo
- 4 equipamentos distintos → diversidade suficiente para testar categorização

### Critério 3 — Boa Telemetria
- **481.284 registros PLC** disponíveis (maior volume entre candidatos)
- 4 tipos de equipamento industrial: Compressor Principal, Bomba Hidráulica, Prensa 500T, LAB-EQ-001
- Dados históricos contendo temperatura (45–75°C), vibração (0.5–2.5 mm/s), pressão, RPM, potência
- Série temporal suficiente para validar correlação e idempotência

### Critério 4 — Equipe Disponível
- Tenant de desenvolvimento/teste com segmento `produção,manutenção,qualidade,logistica,rh,diretoria`
- Estrutura multi-departamental disponível para validação executiva (D.7)

---

## Perfil de Equipamentos do Tenant Piloto

| Equipamento ID | Nome | Registros | Temp (min/max/avg) | Vibração (min/max) |
|---------------|------|-----------|--------------------|--------------------|
| EQ-001 | Compressor Principal | 114.794 | 45,0 / 75,0 / 60,0 °C | 0,50 / 2,50 mm/s |
| EQ-002 | Bomba Hidráulica | 114.794 | 45,0 / 75,0 / 60,0 °C | 0,50 / 2,50 mm/s |
| EQ-003 | Prensa 500T | 114.794 | 45,0 / 75,0 / 60,0 °C | 0,50 / 2,50 mm/s |
| LAB-EQ-001 | LAB-EQ-001 | 136.903 | 10,0 / 10,0 / 10,0 °C | 2,20 / 2,20 mm/s |

---

## Configuração de Ativação do Piloto

```env
# Ativar para o tenant piloto
IMPETUS_AIOI_ENABLED=true
IMPETUS_AIOI_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3

# Manter desativados (PROIBIDO alterar durante piloto)
IMPETUS_AIOI_QUEUE_ACTIVE=false
IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=false
IMPETUS_AIOI_AUTO_EXECUTE_BAND=none
```

---

## Tenant Reserva

Caso o tenant selecionado apresente bloqueio durante o piloto:

```json
{
  "company_id": "ffd94fb8-79f4-4a38-af21-fe596adfffb5",
  "name": "industria de teste",
  "pilot_score": 73.4,
  "activation": "failover_only"
}
```

---

## Resultado

```json
{
  "audit_id": "AIOI_P0D_D2",
  "timestamp": "2026-06-12T15:43:00.000Z",
  "selected_tenant_id": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
  "selected_tenant_name": "find fish alimentos",
  "selection_score": 90.1,
  "reserve_tenant_id": "ffd94fb8-79f4-4a38-af21-fe596adfffb5",
  "criteria_met": ["low_risk", "controlled_environment", "good_telemetry", "team_available"],
  "verdict": "TENANT_SELECTED"
}
```

---

**VEREDITO: `TENANT_SELECTED`**

> Tenant `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` (find fish alimentos) selecionado para piloto operacional controlado AIOI-P0D.
