function timeToMinutes(label) {
  const [h, m] = String(label).split(':').map(Number);
  return h * 60 + m;
}

function overlaps(startA, durA, startB, durB) {
  return startA < startB + durB && startA + durA > startB;
}

const WORKING_DAYS = [2, 3, 4, 5, 6]; // Marți(2) – Sâmbătă(6); 0=Duminică, 1=Luni — inchis

// dateStr: 'YYYY-MM-DD' (aceeasi conventie ca in Sheets)
function isWorkingDay(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return false;
  return WORKING_DAYS.includes(new Date(y, m - 1, d).getDay());
}

module.exports = { timeToMinutes, overlaps, WORKING_DAYS, isWorkingDay };
