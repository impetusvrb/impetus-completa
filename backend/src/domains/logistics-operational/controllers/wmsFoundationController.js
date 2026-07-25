'use strict';

const wmsFlags = require('../shared/wmsFeatureFlags');
const services = require('../services');

function operationalPayload(subgroup, extra = {}) {
  return {
    status: 'operational',
    phase: 'WMS-002',
    subgroup,
    flags: wmsFlags.snapshot(),
    production_enabled: false,
    ...extra
  };
}

const SERVICE_MAP = {
  warehouse: services.warehouseService,
  inventory: services.inventoryService,
  movement: services.movementService,
  receiving: services.receivingService,
  picking: services.pickingService,
  shipping: services.shippingService,
  transfer: services.transferService
};

function createOperationalHandlers(subgroup, serviceKey) {
  const svc = SERVICE_MAP[serviceKey];
  return {
    health: (req, res) => {
      res.json(operationalPayload(subgroup, {
        ok: true,
        contract: svc?.getContract?.() || { service: serviceKey, status: 'operational' }
      }));
    },
    list: async (req, res) => {
      try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(403).json({ ok: false, error: 'tenant required' });
        const listFn = {
          warehouse: () => svc.list(companyId),
          inventory: () => svc.listItems(companyId),
          movement: () => svc.list(companyId),
          receiving: () => svc.list(companyId),
          picking: () => svc.list(companyId),
          shipping: () => svc.list(companyId),
          transfer: () => svc.list(companyId)
        }[serviceKey];
        const result = await listFn();
        res.json(operationalPayload(subgroup, { operation: 'list', result }));
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    },
    create: async (req, res) => {
      try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(403).json({ ok: false, error: 'tenant required' });
        res.status(501).json(operationalPayload(subgroup, { operation: 'create', note: 'use POST on subgroup router' }));
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    }
  };
}

/** @deprecated use logisticsOperationalRoutes mountSubgroup */
function foundationPayload(subgroup, extra = {}) {
  return operationalPayload(subgroup, extra);
}

/** @deprecated use createOperationalHandlers */
function createFoundationHandlers(subgroup, serviceKey) {
  return createOperationalHandlers(subgroup, serviceKey);
}

module.exports = {
  operationalPayload,
  createOperationalHandlers,
  foundationPayload,
  createFoundationHandlers
};
