'use strict';

function analyzeBoardroomPerformance(timings = {}) {
  const ms = timings.total_ms ?? 0;
  return { runtime_performance_safe: ms < 800, render_ms: ms, boardroom_heavy: ms > 500 };
}

module.exports = { analyzeBoardroomPerformance };
