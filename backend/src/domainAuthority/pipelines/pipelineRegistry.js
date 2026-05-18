'use strict';

const domainRegistry = require('../registry/domainRegistry');
const domainIsolationGuard = require('../guards/domainIsolationGuard');

function getAllowedPipelinesForAxis(axis) {
  const domain = domainRegistry.getDomain(axis);
  return [...(domain.allowed_pipelines || [])];
}

function filterPipelinesForUser(pipelines, axis, meta) {
  return domainIsolationGuard.filterPipelines(pipelines, axis, meta);
}

module.exports = {
  getAllowedPipelinesForAxis,
  filterPipelinesForUser
};
