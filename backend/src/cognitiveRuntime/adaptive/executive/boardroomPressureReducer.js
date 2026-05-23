'use strict';

function reduceBoardroomPressure(payload = {}) {
  const centers = payload.executive_cognitive_centers?.length ?? 0;
  const widgets = (payload.widgets_promoted || []).length;
  return {
    boardroom_pressure: centers * 0.1 + widgets * 0.05,
    reduce_noise: centers > 4 || widgets > 6,
    recommendation: centers > 4 ? 'reduce_centers' : null
  };
}

module.exports = { reduceBoardroomPressure };
