/**
 * IMPETUS - Adapter OPC UA
 * OPCIONAL: requer npm install node-opcua
 * data_source_config: { endpoint, nodeIds: { temperature: "ns=2;s=Temp", ... } }
 */
let opcua = null;
try {
  opcua = require('node-opcua');
} catch (e) {
  module.exports = { read: async () => null };
  return;
}

async function read(cfg, equipmentId, equipmentName) {
  const endpoint = cfg.endpoint || cfg.url;
  if (!endpoint) throw new Error('OPC UA: endpoint obrigatório');

  const nodes = cfg.nodeIds || cfg.nodes || {};
  const client = opcua.OPCUAClient.create({ endpoint_must_exist: false });

  try {
    await client.connect(endpoint);
    const session = await client.createSession();

    const tempNode = nodes.temperature || nodes.motor_temperature || 'ns=2;s=Temperature';
    const vibNode = nodes.vibration || nodes.vibration_level || 'ns=2;s=Vibration';
    const pressNode = nodes.pressure || nodes.hydraulic_pressure || 'ns=2;s=Pressure';

    const [tempVal, vibVal, pressVal] = await Promise.all([
      session.readVariableValue(tempNode).catch(() => ({ value: { value: 0 } })),
      session.readVariableValue(vibNode).catch(() => ({ value: { value: 0 } })),
      session.readVariableValue(pressNode).catch(() => ({ value: { value: 0 } }))
    ]);

    await session.close();
    client.disconnect();

    const t = tempVal?.value?.value ?? 0;
    const v = vibVal?.value?.value ?? 0;
    const p = pressVal?.value?.value ?? 0;

    return {
      equipment_id: equipmentId,
      equipment_name: equipmentName,
      temperature: Number(t),
      motor_temperature: Number(t),
      vibration: Number(v),
      vibration_level: Number(v),
      pressure: Number(p),
      hydraulic_pressure: Number(p),
      status: 'running',
      machine_status: 'running',
      raw_data: { timestamp: new Date().toISOString(), source: 'opc_ua' }
    };
  } finally {
    try {
      client.disconnect();
    } catch (err) {
      console.warn(
        '[opcuaAdapter][disconnect]',
        err && err.message ? err.message : err
      );
    }
  }
}

module.exports = { read };
