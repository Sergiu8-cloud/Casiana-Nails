const { google } = require('googleapis');

const SHEET_NAME = 'Programari';
const HEADER_ROW = ['Data', 'Zi', 'Ora', 'Serviciu', 'Durata (min)', 'Nume', 'Telefon', 'Email', 'Observatii', 'Status', 'Trimis la'];
const DOW_RO = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const COL_STATUS = 'J'; // coloana Status, a 10-a din HEADER_ROW

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

// o singura autentificare per pornire a functiei: o programare face mai multe apeluri,
// iar altfel fiecare ar plati din nou drumul pana la Google pentru un token nou
let clientPromis = null;
function getSheetsClient() {
  if (!clientPromis) {
    clientPromis = (async () => {
      const auth = getAuth();
      await auth.authorize();
      return google.sheets({ version: 'v4', auth });
    })().catch(err => { clientPromis = null; throw err; });
  }
  return clientPromis;
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
  return rows.map((r, i) => ({
    rand: i + 2, // randul din foaie, ca sa putem modifica exact randul acesta mai tarziu
    gol: !r[0],  // rand ramas gol dupa o compactare — nu e o programare
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
  })).filter(b => !b.gol);
}

// scrie randul si atat — sortarea se face separat, dupa ce stim ca programarea e valida
async function appendBookingRow(booking) {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets, SHEET_NAME);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRow(booking)] },
  });
}

async function setBookingStatus(rand, status) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!${COL_STATUS}${rand}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[status]] },
  });
}

async function refreshTabs(dateStr) {
  const sheets = await getSheetsClient();
  await rebuildMasterSort(sheets);
  const dayName = getDayNameRo(dateStr);
  if (dayName) await rebuildDayTab(sheets, dayName);
}

async function rebuildMasterSort(sheets) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const all = await getAllBookings();
  const ultimulRand = all.length ? all[all.length - 1].rand : 1;

  // programarile anulate ies din tab, nu raman marcate
  const sorted = all
    .filter(b => b.status !== 'anulat')
    .sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));

  // rescriem de sus in jos, fara sa golim tot intai: daca intre timp a intrat o
  // programare noua sub randurile citite, ramane acolo in loc sa se piarda
  if (sorted.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A2:K${sorted.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: sorted.map(toRow) },
    });
  }

  // dupa compactare raman randuri duplicate la coada — le golim, dar numai pe cele
  // pe care le-am citit noi
  const primulGol = sorted.length + 2;
  if (primulGol <= ultimulRand) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${SHEET_NAME}!A${primulGol}:K${ultimulRand}`,
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

module.exports = { getAllBookings, appendBookingRow, setBookingStatus, refreshTabs };
