# Sistema de Inteligência Industrial Autônoma (IMPETUS)

## Objetivo

A IA analítica atua como **cérebro industrial** da empresa, responsável por:

- Monitorar máquinas 24 horas por dia
- Interpretar dados industriais
- Detectar anomalias e prever falhas
- Registrar eventos automaticamente
- Sugerir ações operacionais
- Executar comandos em equipamentos auxiliares quando autorizado

---

## 1. Machine Monitoring Service (24/7)

**Arquivo:** `backend/src/services/machineMonitoringService.js`

- Coleta dados de sensores, PLC e sistemas industriais
- Intervalo: **1 a 5 segundos** por máquina (configurável em `collection_interval_sec`)
- Variáveis lidas: `machine_status`, `motor_temperature`, `vibration_level`, `oil_level`, `water_flow`, `hydraulic_pressure`, `electrical_current`, `rpm`, `alarm_state`
- Inicia automaticamente com o servidor

---

## 2. Machine Brain (Cérebro Industrial)

**Arquivo:** `backend/src/services/machineBrainService.js`

- Armazena histórico operacional
- Aprende padrões normais (média móvel exponencial)
- Detecta anomalias (25% fora do padrão)
- **Previsão de falhas:** tendência de temperatura subindo ou vibração aumentando
- Eventos: `machine_started`, `machine_stopped`, `low_oil`, `overheating`, `vibration_alert`, `pressure_low`, `compressor_offline`, `predicted_failure`

---

## 3. Arquitetura de Comunicação

```
IA → Software IMPETUS → Gateway/PLC → Máquina
```

A IA **nunca** controla máquinas diretamente. O controlador industrial valida segurança antes de executar comandos.

---

## 4. Controle de Equipamentos

**Permitidos (auxiliares):** compressor, bomba, ventilação, refrigeração  
**Proibidos:** prensa, torno, fresadora, guilhotina, dobradeira

**Modos:**
- **Monitoramento:** IA apenas observa
- **Assistido:** IA sugere ações
- **Automático:** IA executa comandos (apenas equipamentos autorizados)

---

## 5. Integração com Manutenção

Eventos críticos (`overheating`, `low_oil`, `vibration_alert`, `predicted_failure`, etc.) geram **Ordem de Serviço** automaticamente, atribuída a mecânico/eletromecânico.

---

## 6. Dashboard - Centro de Operações Industrial

- **Status:** máquinas, alertas, perfis, equipamentos offline, previsões de falha
- **Mapa:** visão da fábrica com status em tempo real
- **Eventos:** histórico de eventos detectados
- **Perfis:** padrões operacionais aprendidos
- **Intervenção:** registro de manutenção e bloqueio de automação
