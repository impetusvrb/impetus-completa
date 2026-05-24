'use strict';

const core = require('../_core/sz4PipelineCore');
module.exports = {
  ingest: (input) => core.processOperationalSignal(input),
  contextualIngest: (input) => core.processOperationalSignal({ ...input, force_observe: true })
};
