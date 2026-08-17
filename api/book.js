const { getAllBookings, appendBooking } = require('./_lib/sheets');
const { sendEmail } = require('./_lib/email');
const { timeToMinutes, overlaps } = require('./_lib/time');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Metoda nu este permisa.' });
    return;
  }

  const { nume, telefon, email, observatii, serviciu, pret, durata, data, ora } = req.body || {};

  if (!nume || !telefon || !serviciu || !durata || !data || !ora) {
    res.status(400).json({ success: false, error: 'Lipsesc campuri obligatorii.' });
    return;
  }

  try {
    const all = await getAllBookings();
    const newStart = timeToMinutes(ora);
    const newDur = Number(durata);

    const conflict = all.some(b =>
      b.data === data &&
      b.status !== 'anulat' &&
      overlaps(newStart, newDur, timeToMinutes(b.ora), b.durata)
    );

    if (conflict) {
      res.status(200).json({ success: false, error: 'Ne pare rau, ora selectata tocmai a fost ocupata. Alege alta ora.' });
      return;
    }

    await appendBooking({
      data, ora, serviciu, durata: newDur, nume, telefon,
      email: email || '', observatii: observatii || '',
      status: 'confirmat', trimisLa: new Date().toISOString(),
    });

    const salonEmail = process.env.SALON_EMAIL;
    if (salonEmail) {
      await sendEmail(
        salonEmail,
        `Programare noua: ${nume} - ${data} ${ora}`,
        `Programare noua!\n\nNume: ${nume}\nTelefon: ${telefon}\nServiciu: ${serviciu}\nPret: ${pret || '-'}\nData: ${data}\nOra: ${ora}\nObservatii: ${observatii || '-'}`
      );
    }
    if (email) {
      await sendEmail(
        email,
        'Confirmare programare - Casiana Nails',
        `Buna, ${nume}!\n\nProgramarea ta a fost inregistrata cu succes:\nServiciu: ${serviciu}\nData: ${data}\nOra: ${ora}\n\nTe asteptam la salon!\nCasiana Nails`
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Eroare la salvarea programarii:', err);
    res.status(500).json({ success: false, error: 'Eroare la salvarea programarii. Incearca din nou.' });
  }
};
