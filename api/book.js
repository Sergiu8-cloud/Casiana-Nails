const { getAllBookings, appendBookingRow, setBookingStatus, refreshTabs } = require('./_lib/sheets');
const { sendEmail } = require('./_lib/email');
const { timeToMinutes, overlaps, isWorkingDay } = require('./_lib/time');

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

  if (!isWorkingDay(data)) {
    res.status(200).json({ success: false, error: 'Salonul este inchis duminica si luni. Alege alta zi.' });
    return;
  }

  const ocupat = 'Ne pare rau, ora selectata tocmai a fost ocupata. Alege alta ora.';

  try {
    const newStart = timeToMinutes(ora);
    const newDur = Number(durata);
    const seSuprapune = b =>
      b.data === data &&
      b.status !== 'anulat' &&
      overlaps(newStart, newDur, timeToMinutes(b.ora), b.durata);

    // verificare inainte de scriere: prinde cazul obisnuit, cand ora e deja luata
    const inainte = await getAllBookings();
    if (inainte.some(seSuprapune)) {
      res.status(200).json({ success: false, error: ocupat });
      return;
    }

    const trimisLa = new Date().toISOString();
    await appendBookingRow({
      data, ora, serviciu, durata: newDur, nume, telefon,
      email: email || '', observatii: observatii || '',
      status: 'confirmat', trimisLa,
    });

    // verificare dupa scriere: daca doua cliente au apasat "Confirma" in aceeasi clipa,
    // amandoua puteau trece de verificarea de mai sus. Acum randurile sunt amandoua in
    // foaie, deci pastram programarea trimisa prima si o anulam pe a doua.
    // Pauza scurta ca randul celeilalte sa fie sigur vizibil cand citim.
    await new Promise(r => setTimeout(r, 600));
    const dupa = await getAllBookings();
    const alMeu = dupa.find(b => b.trimisLa === trimisLa && b.telefon === telefon && b.data === data && b.ora === ora);
    const castigator = dupa.find(b => alMeu && b.rand !== alMeu.rand && seSuprapune(b) && b.trimisLa && b.trimisLa < trimisLa);

    if (castigator && alMeu) {
      await setBookingStatus(alMeu.rand, 'anulat');
      await refreshTabs(data);
      res.status(200).json({ success: false, error: ocupat });
      return;
    }

    await refreshTabs(data);

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
        `Buna, ${nume}!\n\nProgramarea ta a fost inregistrata cu succes:\nServiciu: ${serviciu}\nData: ${data}\nOra: ${ora}\n\nPentru anulare, intra pe site la sectiunea "Anuleaza o programare".\n\nTe asteptam la salon!\nCasiana Nails`
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Eroare la salvarea programarii:', err);
    res.status(500).json({ success: false, error: 'Eroare la salvarea programarii. Incearca din nou.' });
  }
};
