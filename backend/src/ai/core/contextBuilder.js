'use strict';

function buildContext(context = {}) {
  const parts = [];

  if (context.identityBlock) parts.push(context.identityBlock);
  if (context.memoryBlock) parts.push(context.memoryBlock);
  if (context.complianceBlock) parts.push(context.complianceBlock);
  if (context.governanceBlock) parts.push(context.governanceBlock);
  if (context.extraContext) parts.push(context.extraContext);

  return parts.filter(Boolean).join('\n\n').trim();
}

module.exports = {
  buildContext
};
