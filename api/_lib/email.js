async function sendEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // notificarile pe email sunt optionale daca nu e configurata cheia

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Casiana Nails <onboarding@resend.dev>',
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Eroare la trimiterea emailului:', res.status, body);
  }
}

module.exports = { sendEmail };
