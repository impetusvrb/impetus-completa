'use strict';

const { approvalPolicy } = require('../policies/supplyDomainPolicies');

class ApprovalPolicyService {
  resolveFlow({ amount, categoryCode, spendCenterId }) {
    return approvalPolicy({ amount, approvalLimit: categoryCode === 'CAPEX' ? 25000 : 10000 });
  }

  isFullyApproved(steps = []) {
    return steps.length > 0 && steps.every((s) => s.status === 'APPROVED');
  }
}

module.exports = { ApprovalPolicyService };
