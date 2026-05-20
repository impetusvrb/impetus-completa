'use strict';

const { ROLLOUT_SEQUENCE } = require('./activationSequenceController');

function getDeploymentRunbook() {
  return {
    version: '1.0',
    activation_order: ROLLOUT_SEQUENCE,
    phases: [
      { phase: 'pre_deploy', actions: ['final/report', 'deployment/validate', 'backup env'] },
      { phase: 'framework', actions: ['IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on', 'pm2 reload'] },
      { phase: 'channel_rollout', actions: ROLLOUT_SEQUENCE.map((ch) => `POST activate/${ch}`) },
      { phase: 'observation', actions: ['7d shadow per channel', 'production/observe'] },
      { phase: 'rollback', actions: ['demote channels', 'flags off', 'pm2 reload'] }
    ],
    auto_execute: false,
    shadow_days_between_channels: 7,
    quality_gates_required: true
  };
}

module.exports = { getDeploymentRunbook };
