# OEE Grounding Feasibility Study (Fase 38-E)

**Data:** 2026-06-01  
**Fonte:** `plc_collected_data` — tenant find fish alimentos  
**Modo:** READ-ONLY (análise de colunas e amostra 7d)

---

## Colunas disponíveis

`equipment_id`, `equipment_name`, `temperature`, `pressure`, `vibration`, `status`, `rpm`, `power_kw`, `raw_data`, `collected_at`, `oil_level`, `water_flow`, `hydraulic_pressure`, `electrical_current`, `motor_temperature`, `vibration_level`, `alarm_state`

**Cadência observada:** ~10 s (`LAB-EQ-001`, 24h).

---

## KPI vs viabilidade

| Componente OEE | Fórmula típica | Viabilidade com dados actuais | Notas |
|----------------|----------------|------------------------------|-------|
| **Disponibilidade** | Tempo a correr / tempo planeado | **PARCIAL** | Só `status=running` observado em 7d; sem `stopped`/`fault` → disponibilidade ≈ 100% trivial |
| **Performance** | Produção real / teórica | **NOT POSSIBLE** | Sem contador produção, ciclos, peças, throughput |
| **Qualidade** | Boas / total | **NOT POSSIBLE** | Sem refugo, scrap, NC ligada ao PLC |
| **OEE completo** | A × P × Q | **NOT POSSIBLE** | Faltam P e Q |
| **Utilização / runtime** | Σ intervalos com leituras / janela | **FULLY POSSIBLE** | `collected_at` + gaps |
| **Downtime (proxy)** | Gaps > limiar ou `status != running` | **PARTIAL** | Precisa estados parada na telemetria |
| **Eficiência energética proxy** | `power_kw` se preenchido | **NOT POSSIBLE** | `power_kw` null na amostra |
| **Alarmes / criticidade** | `alarm_state != ok` | **PARTIAL** | Campo existe; amostra só `ok` |
| **MTBF / MTTR** | OS + falhas | **NOT POSSIBLE** | Sem `maintenance_work_orders` / eventos MES |

---

## Classificação global

# **PARTIALLY_POSSIBLE**

---

## O que já é possível hoje (sem código novo — só análise)

1. **Lista de equipamentos activos** — `COUNT(DISTINCT equipment_id)` 24h/30d (já feito no snapshot telemetria).
2. **Runtime / utilização** — horas com amostras / horas calendário por `equipment_id`.
3. **Disponibilidade bruta** — se surgirem `status` distintos (`idle`, `fault`, `stopped`).
4. **Tendência vibração/temperatura** — séries para manutenção preditiva (não é OEE, é condição).

---

## O que falta para OEE real

| Lacuna | Impacto |
|--------|---------|
| Contagem de produção (unidades, ciclos) | Performance |
| Plano de produção / tempo planeado | Disponibilidade real |
| Qualidade (scrap/rejeição) | Qualidade OEE |
| Bridge equipment_id → máquina MES | Grounding cognitivo |
| Estados PLC diversificados (parada/falha) | Downtime credível |
| Eventos produção (`findRecentEvents`) | `production_active` no classificador |

---

## Utilizando apenas `equipment_id`, `status`, `alarm_state`, `collected_at`

| Métrica | Possível? |
|---------|-----------|
| Disponibilidade simplificada | Sim, se houver variação de `status` |
| Utilização | **Sim** |
| Runtime | **Sim** |
| Downtime inferido por gap | **Sim** (heurística) |
| OEE % credível auditável | **Não** sem P e Q |

---

## Veredito 38-E

O tenant **tem telemetria suficiente para métricas de utilização e presença de equipamento**, **insuficiente para OEE industrial certificável**. A IA não apresenta nem estes proxies porque o ramo cognitivo está em `tenant_empty`, não por falta de colunas PLC.
