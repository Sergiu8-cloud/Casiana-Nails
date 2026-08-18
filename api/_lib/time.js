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
const PAS = 10;                   // orele se ofera din 10 in 10 minute (11:20, 13:50, 14:40)

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

// O ora e buna daca e in program, cade pe pasul de 10 minute si lucrarea nu se suprapune
// peste alta programare. Golurile ramase NU blocheaza nimic: a refuza o programare de
// 1h20 ca sa eviti 10 minute libere inseamna sa pierzi mai mult decat castigi. Golurile
// se descurajeaza in pagina, unde orele care se lipesc perfect sunt marcate ca recomandate.
function oraValida(programari, start, durata, ultimulStart) {
  const sfarsit = start + Number(durata);
  if (start < DESCHIDERE || start > (ultimulStart || ULTIMUL_START)) return false;
  if (start % PAS !== 0) return false;

  const ocupate = intervaleOcupate(programari);
  return !ocupate.some(i => start < i.sfarsit && sfarsit > i.start);
}

// se lipeste de programul zilei fara sa lase timp mort: fie incepe exact cand se termina
// alta programare (sau la deschidere), fie se termina exact cand incepe urmatoarea
function faraGol(programari, start, durata) {
  const sfarsit = start + Number(durata);
  const ocupate = intervaleOcupate(programari);
  const inainte = ocupate.filter(i => i.sfarsit <= start).pop();
  if (start === (inainte ? inainte.sfarsit : DESCHIDERE)) return true;
  const dupa = ocupate.find(i => i.start >= sfarsit);
  return !!dupa && dupa.start === sfarsit;
}

module.exports = {
  timeToMinutes, overlaps, WORKING_DAYS, isWorkingDay,
  DESCHIDERE, ULTIMUL_START, PAS,
  ultimulStartPentruDurata, oraValida, faraGol,
};
