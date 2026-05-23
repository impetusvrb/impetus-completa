'use strict';

const LEAK_PATTERNS = [
  { id: 'sst_granular', re: /apr\/pt|loto|epi individual/i },
  { id: 'quality_granular', re: /nc individual|capa-\d|spc point/i },
  { id: 'production_granular', re: /linha_[a-z]|turno_\d|sensor_/i },
  { id: 'hr_granular', re: /operador\s|matricula\s\d/i }
];

function protectBoardroomFromLeakage(payload = {}) {
  const blob = JSON.stringify(payload);
  const blocked = LEAK_PATTERNS.filter((p) => p.re.test(blob)).map((p) => p.id);
  return { cross_domain_clean: blocked.length === 0, blocked_patterns: blocked };
}

module.exports = { protectBoardroomFromLeakage };
