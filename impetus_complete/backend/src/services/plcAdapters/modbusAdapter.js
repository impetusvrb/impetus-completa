/**
 * IMPETUS - Adapter Modbus TCP/RTU
 * OPCIONAL: requer npm install modbus-serial
 * data_source_config: { host, port, slaveId, registers: { temperature: 1000, ... } }
 */
let ModbusRTU;
try {
  ModbusRTU = require('modbus-serial');
} catch (e) {
  module.exports = { read: async () => null };
  return;
}

async function read(cfg, equipmentId, equipmentName) {
  const host = cfg.host || '127.0.0.1';
  const port = cfg.port || 502;
  const slaveId = cfg.slaveId ?? cfg.slave_id ?? 1;
  const regs = cfg.registers || {};
  const timeout = cfg.timeout || 3000;

  const client = new ModbusRTU();
  try {
    await client.connectTCP(host, { port, timeout });
    client.setID(slaveId);
    client.setTimeout(timeout);

    const tempAddr = regs.temperature ?? regs.motor_temperature ?? 1000;
    const vibAddr = regs.vibration ?? regs.vibration_level ?? 1002;
    const pressAddr = regs.pressure ?? regs.hydraulic_pressure ?? 1004;

    const [tempReg, vibReg, pressReg] = await Promise.all([
      client.readHoldingRegisters(tempAddr, 1).catch(() => [0]),
      client.readHoldingRegisters(vibAddr, 1).catch(() => [0]),
      client.readHoldingRegisters(pressAddr, 1).catch(() => [0])
    ]);

    client.close();

    const scale = cfg.scale || 1;
    return {
      equipment_id: equipmentId,
      equipment_name: equipmentName,
      temperature: (tempReg?.data?.[0] ?? tempReg?.[0] ?? 0) * scale,
      motor_temperature: (tempReg?.data?.[0] ?? tempReg?.[0] ?? 0) * scale,
      vibration: (vibReg?.data?.[0] ?? vibReg?.[0] ?? 0) / 100,
      vibration_level: (vibReg?.data?.[0] ?? vibReg?.[0] ?? 0) / 100,
      pressure: (pressReg?.data?.[0] ?? pressReg?.[0] ?? 0) / 10,
      hydraulic_pressure: (pressReg?.data?.[0] ?? pressReg?.[0] ?? 0) / 10,
      status: 'running',
      machine_status: 'running',
      raw_data: { timestamp: new Date().toISOString(), source: 'modbus' }
    };
  } finally {
    try {
      client.close();
    } catch (_) {}
  }
}

module.exports = { read };
