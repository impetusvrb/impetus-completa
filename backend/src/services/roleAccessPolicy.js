const ROLE_RANK = {
  colaborador: 1,
  monitor: 2,
  mecanico: 2,
  mecânico: 2,
  supervisor: 3,
  coordenador: 4,
  gerente: 5,
  diretor: 6,
  ceo: 7,
  admin: 7
};

function getRankFromUser(user = {}) {
  if (Number.isFinite(user?.hierarchy_level)) {
    const lvl = Number(user.hierarchy_level);
    if (lvl <= 1) return 7;
    if (lvl === 2) return 5;
    if (lvl === 3) return 4;
    if (lvl === 4) return 3;
    return 1;
  }
  const role = String(user?.role || '').trim().toLowerCase();
  return ROLE_RANK[role] || 1;
}

function canShareWith(requester, targetUser) {
  const requesterRank = getRankFromUser(requester);
  const targetRank = getRankFromUser(targetUser);
  return targetRank >= requesterRank || requesterRank >= 6;
}

function filterUsersByAccess(requester, users = []) {
  return users.filter((u) => canShareWith(requester, u));
}

module.exports = {
  getRankFromUser,
  canShareWith,
  filterUsersByAccess
};
