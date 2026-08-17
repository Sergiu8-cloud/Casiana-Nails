const { getAllBookings, setBookingStatus, refreshTabs } = require('./_lib/sheets');
const { sendEmail } = require('./_lib/email');

// pastram doar cifrele, ca 0748 607 772 si 0748607772 sa fie acelasi numar
function doarCifre(t) {
  return String(t || '').replace(/\D/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Metoda nu este permisa.' });
    return;
  }

  const { data, ora, telefon } = req.body || {};
  if (!data || !ora || !telefon) {
    res.status(400).json({ success: false, error: 'Completeaza data, ora si telefonul.' });
    return;
  }

  try {
    const all = await getAllBookings();
    const gasita = all.find(b =>
      b.data === data &&
      b.ora === ora &&
      b.status !== 'anulat' &&
      doarCifre(b.telefon) === doarCifre(telefon)
    );

    if (!gasita) {
      res.status(200).json({
        success: false,
        error: 'Nu am gasit o programare activa cu aceste date. Verifica data, ora si numarul de telefon.',
      });
      return;
    }

    await setBookingStatus(gasita.rand, 'anulat');
    await refreshTabs(data);

    const salonEmail = process.env.SALON_EMAIL;
    if (salonEmail) {
      await sendEmail(
        salonEmail,
        `Programare anulata: ${gasita.nume} - ${data} ${ora}`,
        `O programare a fost anulata de pe site.\n\nNume: ${gasita.nume}\nTelefon: ${gasita.telefon}\nServiciu: ${gasita.serviciu}\nData: ${data}\nOra: ${ora}\n\nOra este din nou libera pentru rezervari.`
      );
    }
    if (gasita.email) {
      await sendEmail(
        gasita.email,
        'Programare anulata - Casiana Nails',
        `Buna, ${gasita.nume}!\n\nProgramarea ta din ${data}, ora ${ora} (${gasita.serviciu}) a fost anulata.\n\nTe asteptam cu drag data viitoare!\nCasiana Nails`
      );
    }

    res.status(200).json({ success: true, serviciu: gasita.serviciu, nume: gasita.nume });
  } catch (err) {
    console.error('Eroare la anularea programarii:', err);
    res.status(500).json({ success: false, error: 'Eroare la anularea programarii. Incearca din nou.' });
  }
};
