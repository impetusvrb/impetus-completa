'use strict';

/**
 * Núcleo cognitivo IMPETUS — exports públicos para integração interna (serviços, workers).
 */

const cognitiveOrchestrator = require('./cognitiveOrchestrator');
const cognitiveAudit = require('./cognitiveAudit');
const aiRoles = require('./aiRoles');

module.exports = {
  ...cognitiveOrchestrator,
  cognitiveAudit,
  aiRoles
};
