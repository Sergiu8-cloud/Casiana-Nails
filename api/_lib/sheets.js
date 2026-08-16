const { google } = require('googleapis');

const SHEET_NAME = 'Programari';
const HEADER_ROW = ['Data', 'Ora', 'Serviciu', 'Durata (min)', 'Nume', 'Telefon', 'Email', 'Observatii', 'Status', 'Trimis la'];

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

async function getAllBookings() {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:J`,
  });
  const rows = res.data.values || [];
  return rows.map(r => ({
    data: r[0] || '',
    ora: r[1] || '',
    serviciu: r[2] || '',
    durata: Number(r[3]) || 0,
    nume: r[4] || '',
    telefon: r[5] || '',
    email: r[6] || '',
    observatii: r[7] || '',
    status: r[8] || '',
  }));
}

async function appendBooking(row) {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

module.exports = { getAllBookings, appendBooking };
