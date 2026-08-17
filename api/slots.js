const { getAllBookings } = require('./_lib/sheets');

module.exports = async function handler(req, res) {
  const data = req.query.data;
  if (!data) {
    res.status(400).json({ error: 'Lipseste parametrul data.' });
    return;
  }

  try {
    const all = await getAllBookings();
    const bookings = all
      .filter(b => b.data === data && b.status !== 'anulat')
      .map(b => ({ ora: b.ora, durata: b.durata }));
    res.status(200).json({ bookings });
  } catch (err) {
    console.error('Eroare la citirea programarilor:', err);
    res.status(500).json({ error: 'Eroare la citirea programarilor.' });
  }
};
