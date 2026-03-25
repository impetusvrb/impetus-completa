/**
 * Ponto de pedido otimizado — cruzamento consumo × lead time × risco dos gêmeos (sec. 7.2)
 */
export function calculateReorderPoint(item, twins = []) {
  const consumo = Number(item.consumo90dias) || 0;
  const avgDaily = consumo / 90;
  const leadTimeDays = Number(item.leadTime) || 7;
  const safetyStock = avgDaily * leadTimeDays * 1.5;

  const codeLower = String(item.code || '').toLowerCase();
  const nameLower = String(item.name || '').toLowerCase();
  const codeDigits = (item.code || '').match(/\d+/g) || [];
  const twinRisk = twins.some((t) =>
    (t.prediction?.faultParts || []).some((p) => {
      const pl = String(p).toLowerCase();
      if (codeLower && pl.includes(codeLower.replace(/[^a-z0-9]/g, ''))) return true;
      if (codeDigits.some((d) => pl.includes(d))) return true;
      return nameLower && pl.split(/\s+/).some((w) => w.length > 2 && nameLower.includes(w.toLowerCase()));
    })
  );

  const urgencyMultiplier = twinRisk ? 2.5 : 1;
  const reorderPoint = Math.ceil(safetyStock * urgencyMultiplier);
  const max = Number(item.max) || 0;
  const qty = Number(item.qty) || 0;
  const suggestedOrderQty = Math.max(0, Math.ceil(max > 0 ? max - qty : reorderPoint - qty));

  let urgency = 'ok';
  if (twinRisk) urgency = 'critical';
  else if (qty <= reorderPoint) urgency = 'low';

  return {
    reorderPoint,
    suggestedOrderQty,
    urgency,
    aiReason: twinRisk
      ? `Gêmeo digital indica risco em peça relacionada a ${item.name || item.code}`
      : 'Cálculo por consumo histórico (90d) e lead time'
  };
}
