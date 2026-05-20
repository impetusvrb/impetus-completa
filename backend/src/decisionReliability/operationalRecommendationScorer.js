'use strict';

function scoreOperationalRecommendation(rec = {}) {
  const text = String(rec.text || rec.reply || '');
  const actionable = /recomendo|sugiro|priorize|verifique|ação|passo/i.test(text);
  const operational = /operação|produção|manutenção|qualidade|segurança|kpi/i.test(text);
  let usefulness = 0.65;
  if (actionable) usefulness += 0.15;
  if (operational) usefulness += 0.1;
  if (rec.degraded) usefulness -= 0.2;
  return {
    operational_usefulness: Number(Math.max(0.2, Math.min(1, usefulness)).toFixed(4)),
    guidance_precision: Number((usefulness * 0.9).toFixed(4)),
    actionable
  };
}

module.exports = { scoreOperationalRecommendation };
