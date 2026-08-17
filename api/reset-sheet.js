// TEMPORAR — reseteaza tab-ul Programari (antet corect + sterge toate randurile de test)
// si sterge tab-urile pe zile create gresit. Se sterge dupa folosire.
const { google } = require('googleapis');

const SHEET_NAME = 'Programari';
const HEADER_ROW = ['Data', 'Zi', 'Ora', 'Serviciu', 'Durata (min)', 'Nume', 'Telefon', 'Email', 'Observatii', 'Status', 'Trimis la'];
const DAY_TABS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

module.exports = async function handler(req, res) {
  try {
    const auth = getAuth();
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets.map(s => s.properties.title);

    // sterge tab-urile pe zile (contin date corupte de test)
    const toDelete = meta.data.sheets.filter(s => DAY_TABS.includes(s.properties.title));
    if (toDelete.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: toDelete.map(s => ({ deleteSheet: { sheetId: s.properties.sheetId } })) },
      });
    }

    // reseteaza tab-ul principal: antet corect + fara randuri de date
    if (existingTitles.includes(SHEET_NAME)) {
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAME}!A1:K1000` });
    } else {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });

    res.status(200).json({ success: true, deletedTabs: toDelete.map(s => s.properties.title) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
