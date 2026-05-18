import { runEnterprisePublicationPipelineStability } from '../../../runtime-validation/enterprisePublicationPipelineStability.js';

export function runEnvironmentPublicationPipelineCheck(ctx = {}) {
  const pipeline = runEnterprisePublicationPipelineStability(ctx);
  return {
    ...pipeline,
    domain: 'environment',
    pipeline_order: ['quality', 'safety', 'logistics', 'environment']
  };
}
