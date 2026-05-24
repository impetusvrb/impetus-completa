'use strict';

module.exports = { prepare: (input) => require('../_core/sz4PipelineCore').buildPersistentTaskRecord(input, input.entities || {}, input.workflow) };
