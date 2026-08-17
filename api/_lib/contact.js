// Aduce numarul la forma nationala: 0748607772, indiferent cum a fost scris
// (0748 607 772, +40 748 607 772, 0040748607772, 748607772)
function normalizeazaTelefon(t) {
  let c = String(t || '').replace(/\D/g, '');
  if (c.startsWith('0040')) c = c.slice(4);
  else if (c.startsWith('40') && c.length > 10) c = c.slice(2);
  if (c.length === 9 && c[0] !== '0') c = '0' + c;
  return c;
}

// numere romanesti reale: mobil 07xx xxx xxx, fix 02x / 03x — 10 cifre
function telefonValid(t) {
  return /^0[237]\d{8}$/.test(normalizeazaTelefon(t));
}

// la anulare comparam ultimele 9 cifre, ca prefixul de tara sa nu conteze
function acelasiTelefon(a, b) {
  const x = normalizeazaTelefon(a);
  const y = normalizeazaTelefon(b);
  if (x.length < 9 || y.length < 9) return false;
  return x.slice(-9) === y.slice(-9);
}

function emailValid(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
}

function acelasiEmail(a, b) {
  const x = String(a || '').trim().toLowerCase();
  const y = String(b || '').trim().toLowerCase();
  return !!x && x === y;
}

module.exports = { normalizeazaTelefon, telefonValid, acelasiTelefon, emailValid, acelasiEmail };
