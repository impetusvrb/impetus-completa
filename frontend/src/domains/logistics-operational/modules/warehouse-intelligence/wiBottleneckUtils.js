/** OPM-007 — Detecção gargalos por módulo operacional. */
export function computeWiBottlenecks({ receiving = [], picking = [], shipping = [], transfers = [] }) {
  const bottlenecks = [];

  const rcvPending = receiving.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  if (rcvPending.length >= 3) {
    bottlenecks.push({
      id: 'bn-rcv',
      module: 'receiving',
      moduleLabel: 'Receiving',
      severity: rcvPending.length >= 8 ? 'high' : 'medium',
      count: rcvPending.length,
      hint: 'Gargalo inbound — fila recebimento',
      trace: { source: 'GET /v1/receiving', filter: 'status!=completed', count: rcvPending.length }
    });
  }

  const pckOpen = picking.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  if (pckOpen.length >= 3) {
    bottlenecks.push({
      id: 'bn-pck',
      module: 'picking',
      moduleLabel: 'Picking',
      severity: pckOpen.length >= 8 ? 'high' : 'medium',
      count: pckOpen.length,
      hint: 'Gargalo separação — ordens em fila',
      trace: { source: 'GET /v1/picking', count: pckOpen.length }
    });
  }

  const xfrOpen = transfers.filter((o) => o.status !== 'received' && o.status !== 'cancelled');
  if (xfrOpen.length >= 2) {
    bottlenecks.push({
      id: 'bn-xfr',
      module: 'transfers',
      moduleLabel: 'Transfer',
      severity: xfrOpen.length >= 5 ? 'high' : 'medium',
      count: xfrOpen.length,
      hint: 'Gargalo logística interna',
      trace: { source: 'GET /v1/transfers', count: xfrOpen.length }
    });
  }

  const shpOpen = shipping.filter((o) => o.status !== 'shipped' && o.status !== 'cancelled');
  if (shpOpen.length >= 3) {
    bottlenecks.push({
      id: 'bn-shp',
      module: 'shipping',
      moduleLabel: 'Shipping',
      severity: shpOpen.length >= 8 ? 'high' : 'medium',
      count: shpOpen.length,
      hint: 'Gargalo expedição — fila outbound',
      trace: { source: 'GET /v1/shipping', count: shpOpen.length }
    });
  }

  return bottlenecks.sort((a, b) => b.count - a.count);
}
