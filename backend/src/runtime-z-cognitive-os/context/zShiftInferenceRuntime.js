'use strict';

const SHIFTS = [
  { name: 'turno_1', from: 6, to: 14 },
  { name: 'turno_2', from: 14, to: 22 },
  { name: 'turno_3', from: 22, to: 30 }
];

function inferShift(now = new Date()) {
  const h = now.getHours();
  const adj = h < 6 ? h + 24 : h;
  const shift = SHIFTS.find((s) => adj >= s.from && adj < s.to) || SHIFTS[0];
  const within_change_window = adj % 8 >= 7 || adj % 8 < 1;
  return {
    shift_name: shift.name,
    shift_hours: `${shift.from % 24}h–${shift.to % 24}h`,
    within_change_window
  };
}

module.exports = { inferShift };
