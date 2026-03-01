# Instruções detalhadas: coleta de dados PLC via cabeamento direto

**Sistema:** IMPETUS Comunica IA  
**Registro INPI:** BR512025007048-9  
**Escopo:** Coleta de dados das máquinas via comunicação direta com PLCs (sem IoT/cloud)

---

## 1. Visão geral

O Impetus **não utiliza Internet das Coisas (IoT)** para coletar dados das máquinas. A coleta é feita por **cabeamento direto** entre o servidor de coleta e os PLCs das máquinas, usando protocolos industriais (Modbus RTU/TCP, OPC UA, etc.).

### Fluxo de dados

```
[Máquina 1]──PLC──┐
[Máquina 2]──PLC──┼── Cabo (RS-485 ou Ethernet) ──► Coletor Impetus ──► Banco ──► IA analisa ──► Alertas
[Máquina 3]──PLC──┘
```

### Arquitetura existente no Impetus

- **plc_collected_data** – armazena leituras brutas (temperatura, pressão, vibração, status, rpm, potência)
- **plc_analysis** – resultados da análise da IA
- **plc_alerts** – alertas exibidos no dashboard
- **plcCollector.js** – hoje usa simulação; deve ser substituído/estendido pela leitura real de PLC

---

## 2. Requisitos de hardware

### 2.1 Tipos de cabeamento

| Tipo | Uso típico | Comprimento máximo | Observações |
|------|------------|---------------------|-------------|
| **RS-485** | Modbus RTU (serial) | ~1,2 km | Cabeamento em barra, vários PLCs |
| **RS-232** | Ponto a ponto | ~15 m | Um PLC por porta serial |
| **Ethernet (Cat5e/6)** | Modbus TCP, OPC UA | ~100 m sem switch | Um cabo por PLC ou rede industrial |

### 2.2 Cenários de instalação

**Cenário A: Modbus RTU (RS-485)**  
- Vários PLCs em barra serial  
- Um cabo de par trançado (2–4 fios) ligando todos os PLCs em série  
- Terminador de 120 Ω na ponta da rede  
- Conversor USB-RS485 ou porta serial no servidor de coleta  

**Cenário B: Modbus TCP (Ethernet)**  
- Cada PLC com Ethernet  
- Rede industrial (switch) ou conexão ponto a ponto  
- Servidor de coleta na mesma rede ou VLAN  

**Cenário C: OPC UA**  
- PLCs com servidor OPC UA embutido  
- Ethernet até o servidor OPC UA (ou gateway)  
- Cliente OPC UA no servidor Impetus  

### 2.3 Equipamentos necessários

| Item | Descrição |
|------|-----------|
| **Conversor USB-RS485** | Para Modbus RTU quando o servidor só tem USB |
| **Switch industrial** | Para Ethernet em ambientes industriais |
| **Cabos blindados** | Par trançado blindado para RS-485 |
| **Terminadores** | Resistência 120 Ω para RS-485 (quando exigido) |
| **Fonte isolada** | Opcional, para maior estabilidade e isolamento |

### 2.4 PLCs comuns e protocolos

| Fabricante | Modelos típicos | Protocolo nativo | Alternativa |
|------------|-----------------|------------------|-------------|
| Siemens | S7-200, S7-1200, Logo! | S7, Profinet | Modbus RTU/TCP (módulo ou conversão) |
| Allen-Bradley | Micro800, CompactLogix | EtherNet/IP | Modbus TCP (add-on) |
| Schneider | M221, M241, Premium | Modbus | Modbus RTU/TCP nativo |
| WEG | CFW, MCA | Modbus | Modbus RTU nativo |
| FATEK | FBs | Modbus | Modbus RTU nativo |
| Delta | DVP | Modbus | Modbus RTU nativo |

---

## 3. Mapeamento de registros

Antes de implementar, é necessário mapear **endereços Modbus** (ou tags OPC UA) de cada equipamento.

### 3.1 Exemplo de mapeamento

| Equipamento | Variável | Tipo | Endereço Modbus | Unidade | Faixa normal |
|-------------|----------|------|-----------------|---------|--------------|
| Compressor 1 | Temperatura | Holding Register 40001 | 40001 | °C | 40–65 |
| Compressor 1 | Pressão | Holding Register 40002 | 40002 | bar | 2–6 |
| Compressor 1 | Vibração | Holding Register 40003 | 40003 | mm/s | 0–2 |
| Compressor 1 | Status | Coil 00001 | 1 | on/off | - |
| Bomba 1 | RPM | Holding Register 40101 | 40101 | rpm | 1000–2000 |

### 3.2 Convenção Modbus

- **Coils (0xxx):** saídas digitais (on/off)
- **Discrete Inputs (1xxx):** entradas digitais
- **Input Registers (3xxx):** entradas analógicas (somente leitura)
- **Holding Registers (4xxx):** valores analógicos configuráveis (leitura/escrita)

### 3.3 Tabela de configuração no banco

Criar tabela `plc_connections` para armazenar:

- `company_id`
- `equipment_id` (código do equipamento)
- `equipment_name`
- `protocol` (modbus_rtu, modbus_tcp, opcua)
- `connection_params` (IP, porta, slave_id, porta serial, baudrate, etc.)
- `register_map` (JSON com mapeamento temperatura, pressão, etc.)

---

## 4. Implementação no software

### 4.1 Dependências Node.js

Instalar biblioteca Modbus:

```bash
cd backend
npm install modbus-serial
```

Para **OPC UA** (se necessário):

```bash
npm install node-opcua
```

### 4.2 Nova migration: tabela de conexões PLC

Criar `backend/src/models/plc_connections_migration.sql`:

```sql
-- Configuração de conexões PLC por equipamento
CREATE TABLE IF NOT EXISTS plc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  equipment_name TEXT,
  
  -- Protocolo: modbus_rtu, modbus_tcp, opcua
  protocol TEXT NOT NULL DEFAULT 'modbus_tcp',
  
  -- Parâmetros de conexão (JSON)
  -- Modbus TCP: { host, port, unitId }
  -- Modbus RTU: { path, baudRate, dataBits, stopBits, parity, unitId }
  -- OPC UA: { endpoint, securityPolicy }
  connection_params JSONB NOT NULL DEFAULT '{}',
  
  -- Mapeamento de registros
  -- { temperature: 40001, pressure: 40002, vibration: 40003, status: 1, rpm: 40101, power_kw: 40102 }
  register_map JSONB NOT NULL DEFAULT '{}',
  
  -- Escalas e unidades (opcional)
  scales JSONB DEFAULT '{}',
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, equipment_id)
);

CREATE INDEX idx_plc_connections_company ON plc_connections(company_id);
CREATE INDEX idx_plc_connections_active ON plc_connections(company_id, active) WHERE active = true;
```

### 4.3 Serviço de leitura PLC

Criar `backend/src/services/plcReader.js`:

```javascript
/**
 * Leitor real de PLC via Modbus RTU/TCP
 * Substitui simulatePLCRead quando plc_connections está configurado
 */
const ModbusRTU = require('modbus-serial').ModbusRTU;
const db = require('../db');

const TIMEOUT_MS = 5000;

/**
 * Lê dados de um equipamento via Modbus TCP
 */
async function readModbusTCP(connConfig, registerMap) {
  const client = new ModbusRTU();
  const { host, port = 502, unitId = 1 } = connConfig;

  try {
    await client.connectTCP(host, { port });
    client.setTimeout(TIMEOUT_MS);
    client.setUnitId(unitId);

    const data = {};
    if (registerMap.temperature != null) {
      const r = await client.readHoldingRegisters(registerMap.temperature - 40001, 1);
      data.temperature = r.data[0] != null ? r.data[0] / 10 : null;
    }
    if (registerMap.pressure != null) {
      const r = await client.readHoldingRegisters(registerMap.pressure - 40001, 1);
      data.pressure = r.data[0] != null ? r.data[0] / 100 : null;
    }
    if (registerMap.vibration != null) {
      const r = await client.readHoldingRegisters(registerMap.vibration - 40001, 1);
      data.vibration = r.data[0] != null ? r.data[0] / 100 : null;
    }
    if (registerMap.rpm != null) {
      const r = await client.readHoldingRegisters(registerMap.rpm - 40001, 1);
      data.rpm = r.data[0] ?? null;
    }
    if (registerMap.power_kw != null) {
      const r = await client.readHoldingRegisters(registerMap.power_kw - 40001, 1);
      data.power_kw = r.data[0] != null ? r.data[0] / 10 : null;
    }
    if (registerMap.status != null) {
      const r = await client.readCoils(registerMap.status - 1, 1);
      data.status = r.data[0] ? 'running' : 'stopped';
    }

    client.close();
    return data;
  } catch (err) {
    try { client.close(); } catch (_) {}
    throw err;
  }
}

/**
 * Lê dados de um equipamento via Modbus RTU (serial)
 */
async function readModbusRTU(connConfig, registerMap) {
  const client = new ModbusRTU();
  const { path, baudRate = 9600, dataBits = 8, stopBits = 1, parity = 'none', unitId = 1 } = connConfig;

  try {
    await client.connectRTUBuffered(path, { baudRate, dataBits, stopBits, parity });
    client.setTimeout(TIMEOUT_MS);
    client.setUnitId(unitId);

    const data = {};
    if (registerMap.temperature != null) {
      const r = await client.readHoldingRegisters(registerMap.temperature - 40001, 1);
      data.temperature = r.data[0] != null ? r.data[0] / 10 : null;
    }
    if (registerMap.pressure != null) {
      const r = await client.readHoldingRegisters(registerMap.pressure - 40001, 1);
      data.pressure = r.data[0] != null ? r.data[0] / 100 : null;
    }
    if (registerMap.vibration != null) {
      const r = await client.readHoldingRegisters(registerMap.vibration - 40001, 1);
      data.vibration = r.data[0] != null ? r.data[0] / 100 : null;
    }
    if (registerMap.rpm != null) {
      const r = await client.readHoldingRegisters(registerMap.rpm - 40001, 1);
      data.rpm = r.data[0] ?? null;
    }
    if (registerMap.power_kw != null) {
      const r = await client.readHoldingRegisters(registerMap.power_kw - 40001, 1);
      data.power_kw = r.data[0] != null ? r.data[0] / 10 : null;
    }
    if (registerMap.status != null) {
      const r = await client.readCoils(registerMap.status - 1, 1);
      data.status = r.data[0] ? 'running' : 'stopped';
    }

    client.close();
    return data;
  } catch (err) {
    try { client.close(); } catch (_) {}
    throw err;
  }
}

/**
 * Busca configurações de PLC da empresa e lê cada equipamento
 */
async function getPlcConfigs(companyId) {
  const r = await db.query(`
    SELECT id, equipment_id, equipment_name, protocol, connection_params, register_map
    FROM plc_connections
    WHERE company_id = $1 AND active = true
  `, [companyId]);
  return r.rows;
}

/**
 * Lê dados reais de um equipamento configurado
 * Retorna null se não houver configuração ou em caso de erro
 */
async function readPlcData(connection) {
  const { protocol, connection_params, register_map, equipment_id, equipment_name } = connection;
  const params = connection_params || {};
  const map = register_map || {};

  let rawData = {};
  try {
    if (protocol === 'modbus_tcp') {
      rawData = await readModbusTCP(params, map);
    } else if (protocol === 'modbus_rtu') {
      rawData = await readModbusRTU(params, map);
    } else {
      return null;
    }
  } catch (err) {
    console.warn('[PLC_READER]', equipment_id, err.message);
    return null;
  }

  return {
    equipment_id,
    equipment_name,
    temperature: rawData.temperature ?? null,
    pressure: rawData.pressure ?? null,
    vibration: rawData.vibration ?? null,
    status: rawData.status || 'unknown',
    rpm: rawData.rpm ?? null,
    power_kw: rawData.power_kw ?? null,
    raw_data: { timestamp: new Date().toISOString(), source: 'plc', protocol }
  };
}

module.exports = {
  readPlcData,
  getPlcConfigs,
  readModbusTCP,
  readModbusRTU
};
```

*Nota: os deslocamentos de endereço (ex.: `registerMap.temperature - 40001`) dependem da biblioteca. O Modbus usa endereço lógico 0-based; ajuste conforme a documentação do `modbus-serial`.*

### 4.4 Integração no plcCollector

Alterar `plcCollector.js` para:

1. Buscar `plc_connections` da empresa.
2. Se existir configuração: chamar `plcReader.readPlcData()`.
3. Se não existir: manter `simulatePLCRead()` como fallback (ou pular o equipamento).

```javascript
// Em runCollectorCycle:
const plcReader = require('./plcReader');
const configs = await plcReader.getPlcConfigs(companyId);

if (configs.length > 0) {
  for (const conn of configs) {
    const data = await plcReader.readPlcData(conn);
    if (data) {
      const saved = await plcData.saveCollectedData(companyId, data);
      // ... resto do fluxo IA
    }
  }
} else {
  // Fallback: equipamentos simulados
  // ... código atual com equipmentList fixo
}
```

---

## 5. Procedimento de instalação física

### 5.1 Modbus RTU (RS-485)

1. **Desligar** todas as máquinas e PLCs da rede.
2. Identificar o **barramento RS-485** nos PLCs (A/B, D+/D-, etc.).
3. Conectar os cabos em **daisy-chain** (saída de um PLC = entrada do próximo).
4. Instalar **terminador 120 Ω** nos dois extremos da rede.
5. Conectar o **conversor USB-RS485** ao servidor de coleta.
6. Mapear a **porta serial** (ex.: `/dev/ttyUSB0` em Linux, `COM3` em Windows).
7. Configurar **baudrate, paridade, bits** conforme manual do PLC (ex.: 9600 8N1).
8. Ligar os equipamentos e testar comunicação.

### 5.2 Modbus TCP (Ethernet)

1. Definir **IP fixo** para cada PLC na rede industrial.
2. Conectar os PLCs ao **switch industrial** (ou rede dedicada).
3. Conectar o **servidor de coleta** à mesma rede.
4. Testar **ping** de cada IP.
5. Verificar se a **porta 502** (Modbus TCP) está liberada no firewall.
6. Testar leitura com ferramenta (ex.: Modbus Poll, QModMaster).

---

## 6. Configuração no Impetus

### 6.1 Cadastro de equipamentos

1. Acessar **Pontos Monitorados** ou equivalente.
2. Cadastrar cada máquina com código (ex.: EQ-001, MAQ-COMP-01).
3. Associar manuais de manutenção quando houver.

### 6.2 Cadastro de conexões PLC

Inserir em `plc_connections` (via API ou script SQL):

**Exemplo Modbus TCP – Compressor:**

```sql
INSERT INTO plc_connections (company_id, equipment_id, equipment_name, protocol, connection_params, register_map)
VALUES (
  'uuid-da-empresa',
  'EQ-001',
  'Compressor Principal',
  'modbus_tcp',
  '{"host": "192.168.1.10", "port": 502, "unitId": 1}',
  '{"temperature": 40001, "pressure": 40002, "vibration": 40003, "status": 1, "rpm": 40004, "power_kw": 40005}'
);
```

**Exemplo Modbus RTU – Bomba:**

```sql
INSERT INTO plc_connections (company_id, equipment_id, equipment_name, protocol, connection_params, register_map)
VALUES (
  'uuid-da-empresa',
  'EQ-002',
  'Bomba Hidráulica',
  'modbus_rtu',
  '{"path": "/dev/ttyUSB0", "baudRate": 9600, "dataBits": 8, "stopBits": 1, "parity": "none", "unitId": 2}',
  '{"temperature": 40001, "pressure": 40002, "rpm": 40003}'
);
```

### 6.3 Execução agendada

Usar cron (Linux) ou Agendador de Tarefas (Windows):

```bash
# A cada 5 minutos
*/5 * * * * cd /caminho/impetus/backend && node -r dotenv/config scripts/plc_collector.js
```

---

## 7. Segurança e conformidade (NR-12)

### 7.1 Cabeamento em área industrial

- Usar **cabos blindados** em ambientes com interferência.
- Evitar cruzar cabos de dados com **alimentação de motores**.
- Respeitar **distâncias** indicadas no manual do protocolo.
- Identificar todos os cabos (etiquetas, cores).

### 7.2 Isolamento de redes

- Preferir **rede industrial dedicada** (não misturar com TI corporativa).
- Usar **VLAN** ou switches segmentados se a infraestrutura permitir.
- O servidor de coleta pode estar na **zona desmilitarizada** entre TI e chão de fábrica.

### 7.3 Manutenção

- **Não conectar/desconectar** cabos com equipamentos ligados, quando o manual proibir.
- Em intervenções em PLC, seguir **bloqueio/etiquetagem (LOTO)** conforme NR-12.
- Documentar **topologia** da rede (diagrama) e **mapeamento de registros**.

---

## 8. Checklist de implementação

| Etapa | Descrição |
|-------|-----------|
| 1 | Mapear registros Modbus/OPC UA de cada PLC no manual do equipamento |
| 2 | Instalar cabeamento (RS-485 ou Ethernet) conforme procedimento |
| 3 | Testar comunicação com ferramenta externa (Modbus Poll, etc.) |
| 4 | Criar migration `plc_connections_migration.sql` |
| 5 | Adicionar `plc_connections` ao `run-all-migrations.js` |
| 6 | Instalar `modbus-serial`: `npm install modbus-serial` |
| 7 | Criar `plcReader.js` e ajustar `plcCollector.js` |
| 8 | Inserir configurações em `plc_connections` |
| 9 | Executar `plc_collector.js` manualmente e verificar `plc_collected_data` |
| 10 | Configurar cron/tarefa agendada |

---

## 9. Troubleshooting

| Problema | Possíveis causas | Ação |
|----------|------------------|------|
| Timeout na leitura | IP errado, porta 502 bloqueada, PLC offline | Verificar rede, firewall, status do PLC |
| Valores incoerentes | Mapeamento de registros errado, escala incorreta | Comparar com software do PLC, ajustar `register_map` e `scales` |
| Erro "port not found" | Porta serial incorreta ou sem permissão | Verificar `/dev/ttyUSB*` (Linux) ou COM (Windows), permissões |
| Dados zerados | Endereço Modbus errado, unidade (unitId) incorreta | Conferir manual do PLC e configuração do barramento |
| Intermitência em RS-485 | Terminador ausente, cabo longo, interferência | Adicionar terminador, verificar blindagem, reduzir comprimento |

---

## 10. Referências

- **Modbus:** https://modbus.org/specs.php  
- **node-modbus-serial:** https://github.com/yaacov/node-modbus-serial  
- **NR-12:** Norma Regulamentadora de Segurança no Trabalho em Máquinas e Equipamentos  

---

*Documento gerado para o Impetus Comunica IA – coleta via cabeamento direto PLC.*
