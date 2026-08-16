// ============================================================
// CASIANA NAILS — Backend Google Apps Script + Google Sheets
// ============================================================

const SHEET_ID = '1rx0EnzQjaFgEFOqEKWuvm1AXlEHTsz21XJGxXklvyJw';
const SHEET_NAME = 'Programari';
const SALON_EMAIL = 'vadimash204@gmail.com'; // <-- schimbă dacă vrei alt email pentru notificări

/* ---------- ROUTER ---------- */

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  let result;
  if (action === 'sloturiOcupate') {
    result = getSloturiOcupate(e.parameter.data);
  } else {
    result = { error: 'Actiune necunoscuta' };
  }

  // JSONP: site-ul cere datele printr-un tag <script>, ca sa evite protectia anti-bot
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(result);
}

function doPost(e) {
  try {
    // Site-ul trimite datele printr-un formular ascuns (nu fetch), ca sa evite
    // protectia anti-bot a Google — deci JSON-ul vine in e.parameter.payload.
    const raw = (e.parameter && e.parameter.payload) ? e.parameter.payload : e.postData.contents;
    const body = JSON.parse(raw);
    return creazaProgramare(body);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Date invalide: ' + err.message });
  }
}

/* ---------- HELPERS ---------- */

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Data', 'Ora', 'Serviciu', 'Durata (min)', 'Nume', 'Telefon', 'Email', 'Observatii', 'Status', 'Trimis la']);
  }
  return sheet;
}

function formatDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

function timeToMinutes(label) {
  const parts = String(label).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/* ---------- CITIRE: ore ocupate pentru o zi ---------- */

function getSloturiOcupate(data) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const bookings = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowData = formatDate(row[0]);
    const status = row[8];
    if (rowData === data && status !== 'anulat') {
      bookings.push({
        ora: row[1],
        durata: Number(row[3])
      });
    }
  }

  return { bookings: bookings };
}

/* ---------- SCRIERE: creare programare nouă ---------- */

function creazaProgramare(body) {
  const data = body.data;
  const ora = body.ora;
  const serviciu = body.serviciu;
  const durata = body.durata;
  const nume = body.nume;
  const telefon = body.telefon;
  const email = body.email;
  const observatii = body.observatii;

  if (!data || !ora || !serviciu || !durata || !nume || !telefon) {
    return jsonResponse({ success: false, error: 'Lipsesc campuri obligatorii.' });
  }

  // Blocare (un singur mester => nu vrem ca doua confirmari simultane sa creeze suprapuneri)
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const newStart = timeToMinutes(ora);
    const newEnd = newStart + Number(durata);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = formatDate(row[0]);
      const status = row[8];
      if (rowData === data && status !== 'anulat') {
        const existingStart = timeToMinutes(row[1]);
        const existingEnd = existingStart + Number(row[3]);
        if (newStart < existingEnd && newEnd > existingStart) {
          return jsonResponse({ success: false, error: 'Ne pare rau, ora selectata tocmai a fost ocupata. Alege alta ora.' });
        }
      }
    }

    sheet.appendRow([data, ora, serviciu, durata, nume, telefon, email || '', observatii || '', 'confirmat', new Date()]);

    trimiteEmailuri(data, ora, serviciu, nume, telefon, email, observatii);

    return jsonResponse({ success: true });

  } finally {
    lock.releaseLock();
  }
}

/* ---------- EMAILURI ---------- */

function trimiteEmailuri(data, ora, serviciu, nume, telefon, email, observatii) {
  const subiectSalon = 'Programare noua: ' + nume + ' - ' + data + ' ' + ora;
  const corpSalon =
    'Programare noua!\n\n' +
    'Nume: ' + nume + '\n' +
    'Telefon: ' + telefon + '\n' +
    'Serviciu: ' + serviciu + '\n' +
    'Data: ' + data + '\n' +
    'Ora: ' + ora + '\n' +
    'Observatii: ' + (observatii || '-');

  MailApp.sendEmail(SALON_EMAIL, subiectSalon, corpSalon);

  if (email) {
    const subiectClient = 'Confirmare programare - Casiana Nails';
    const corpClient =
      'Buna, ' + nume + '!\n\n' +
      'Programarea ta a fost inregistrata cu succes:\n' +
      'Serviciu: ' + serviciu + '\n' +
      'Data: ' + data + '\n' +
      'Ora: ' + ora + '\n\n' +
      'Te asteptam la salon!\nCasiana Nails';

    MailApp.sendEmail(email, subiectClient, corpClient);
  }
}
