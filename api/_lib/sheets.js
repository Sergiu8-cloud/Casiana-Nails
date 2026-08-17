const { google } = require('googleapis');

const SHEET_NAME = 'Programari';
const HEADER_ROW = ['Data', 'Zi', 'Ora', 'Serviciu', 'Durata (min)', 'Nume', 'Telefon', 'Email', 'Observatii', 'Status', 'Trimis la'];
const DOW_RO = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

function getDayNameRo(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return '';
  return DOW_RO[new Date(y, m - 1, d).getDay()];
}

function toRow(b) {
  return [b.data, getDayNameRo(b.data), b.ora, b.serviciu, b.durata, b.nume, b.telefon, b.email || '', b.observatii || '', b.status, b.trimisLa];
}

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

async function ensureSheetExists(sheets, sheetName) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

async function getAllBookings() {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets, SHEET_NAME);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:K`,
  });
  const rows = res.data.values || [];
  return rows.map(r => ({
    data: r[0] || '',
    zi: r[1] || '',
    ora: r[2] || '',
    serviciu: r[3] || '',
    durata: Number(r[4]) || 0,
    nume: r[5] || '',
    telefon: r[6] || '',
    email: r[7] || '',
    observatii: r[8] || '',
    status: r[9] || '',
    trimisLa: r[10] || '',
  }));
}

async function appendBooking(booking) {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets, SHEET_NAME);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [toRow(booking)] },
  });

  await rebuildMasterSort(sheets);

  const dayName = getDayNameRo(booking.data);
  if (dayName) await rebuildDayTab(sheets, dayName);
}

async function rebuildMasterSort(sheets) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const all = await getAllBookings();
  const sorted = [...all].sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAME}!A2:K` });
  if (sorted.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: sorted.map(toRow) },
    });
  }
}

async function rebuildDayTab(sheets, dayName) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await ensureSheetExists(sheets, dayName);

  const all = await getAllBookings();
  const filtered = all
    .filter(b => getDayNameRo(b.data) === dayName && b.status !== 'anulat')
    .sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${dayName}!A2:K` });
  if (filtered.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${dayName}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: filtered.map(toRow) },
    });
  }
}

module.exports = { getAllBookings, appendBooking };
