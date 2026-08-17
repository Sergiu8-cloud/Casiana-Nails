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

const DESCHIDERE = 10 * 60;       // 10:00 — prima ora de start
const ULTIMUL_START = 17 * 60;    // 17:00 — ultima ora la care poate incepe o programare
const ULTIMUL_START_PACHET = 15 * 60; // pachetul pedichiura + manichiura, singurul peste 4h
const GOL_MINIM = 80;             // cat tine cel mai scurt serviciu (manichiura clasica)

// ultima ora de start pentru un serviciu, dedusa din durata: doar pachetul trece de 4h
function ultimulStartPentruDurata(durata) {
  return Number(durata) > 240 ? ULTIMUL_START_PACHET : ULTIMUL_START;
}

function intervaleOcupate(programari) {
  return programari
    .filter(b => b.status !== 'anulat')
    .map(b => ({ start: timeToMinutes(b.ora), sfarsit: timeToMinutes(b.ora) + Number(b.durata) }))
    .sort((a, b) => a.start - b.start);
}

// O ora e buna daca: e in program, lucrarea nu se suprapune peste alta programare, iar
// golul lasat inainte si cel lasat dupa sunt ori zero, ori destul de mari cat sa incapa
// ceva in ele. Altfel raman ferestre in care mesterul nu poate primi pe nimeni.
function oraValida(programari, start, durata, ultimulStart) {
  const sfarsit = start + Number(durata);
  if (start < DESCHIDERE || start > (ultimulStart || ULTIMUL_START)) return false;

  const ocupate = intervaleOcupate(programari);
  if (ocupate.some(i => start < i.sfarsit && sfarsit > i.start)) return false;

  const inainte = ocupate.filter(i => i.sfarsit <= start).pop();
  const golInainte = start - (inainte ? inainte.sfarsit : DESCHIDERE);
  if (golInainte > 0 && golInainte < GOL_MINIM) return false;

  // dupa ultima programare a zilei nu mai e "gol" — acolo se inchide oricum
  const dupa = ocupate.find(i => i.start >= sfarsit);
  if (dupa && dupa.start - sfarsit > 0 && dupa.start - sfarsit < GOL_MINIM) return false;

  return true;
}

module.exports = {
  timeToMinutes, overlaps, WORKING_DAYS, isWorkingDay,
  DESCHIDERE, ULTIMUL_START, GOL_MINIM,
  ultimulStartPentruDurata, oraValida,
};
