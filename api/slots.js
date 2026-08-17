const { getAllBookings } = require('./_lib/sheets');

function adaugaZile(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const data = req.query.data;
  // cu ?zile=N intoarce N zile la rand, ca sa putem cauta prima zi libera dintr-un
  // singur drum la server in loc de cate o cerere pentru fiecare zi
  const zile = Math.min(Math.max(Number(req.query.zile) || 1, 1), 31);

  if (!data) {
    res.status(400).json({ error: 'Lipseste parametrul data.' });
    return;
  }

  try {
    const all = await getAllBookings();
    const active = all.filter(b => b.status !== 'anulat');
    const dinZi = zi => active.filter(b => b.data === zi).map(b => ({ ora: b.ora, durata: b.durata }));

    if (zile === 1) {
      res.status(200).json({ bookings: dinZi(data) });
      return;
    }

    const rezultat = {};
    for (let i = 0; i < zile; i++) {
      const zi = adaugaZile(data, i);
      rezultat[zi] = dinZi(zi);
    }
    res.status(200).json({ zile: rezultat });
  } catch (err) {
    console.error('Eroare la citirea programarilor:', err);
    res.status(500).json({ error: 'Eroare la citirea programarilor.' });
  }
};
