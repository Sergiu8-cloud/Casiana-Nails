// TEMPORAR — verifica daca variabilele de mediu sunt setate corect, fara sa afiseze valorile reale.
module.exports = function handler(req, res) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  const sheetId = process.env.GOOGLE_SHEET_ID || '';
  const resendKey = process.env.RESEND_API_KEY || '';
  const salonEmail = process.env.SALON_EMAIL || '';

  res.status(200).json({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? (email.includes('@') && email.endsWith('.gserviceaccount.com') ? 'OK (' + email + ')' : 'GRESIT: ' + email) : 'LIPSA',
    GOOGLE_PRIVATE_KEY: key ? (key.includes('BEGIN PRIVATE KEY') ? 'OK (lungime ' + key.length + ')' : 'GRESIT — nu contine "BEGIN PRIVATE KEY", lungime ' + key.length) : 'LIPSA',
    GOOGLE_SHEET_ID: sheetId ? (sheetId === '1T2x0LUaOat_NRf99TGl8XEjG2vWnJUqK2VejjfkrOTs' ? 'OK' : 'ALT ID: ' + sheetId) : 'LIPSA',
    RESEND_API_KEY: resendKey ? (resendKey.startsWith('re_') ? 'OK' : 'GRESIT — nu incepe cu re_') : 'LIPSA',
    SALON_EMAIL: salonEmail ? (salonEmail.includes('@') ? 'OK (' + salonEmail + ')' : 'GRESIT: ' + salonEmail) : 'LIPSA',
  });
};
