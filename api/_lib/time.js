function timeToMinutes(label) {
  const [h, m] = String(label).split(':').map(Number);
  return h * 60 + m;
}

function overlaps(startA, durA, startB, durB) {
  return startA < startB + durB && startA + durA > startB;
}

module.exports = { timeToMinutes, overlaps };
