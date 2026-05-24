'use strict';

const core = require('../_core/sz4PipelineCore');
module.exports = { detect: (ctx, ent) => core.detectAwarenessSignals(ctx, ent) };
