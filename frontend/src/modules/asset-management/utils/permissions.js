const ALLOWED = {
  gerente: ['twinsView', 'ordersApproveP1P2', 'ordersViewAll', 'stockView'],
  supervisor: ['twinsView', 'ordersViewAll'],
  analista_pcm: ['ordersViewAll', 'stockView']
};

export function can(profile, permission) {
  const list = ALLOWED[String(profile || '').toLowerCase()] || [];
  return list.includes(permission);
}

