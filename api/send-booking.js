// api/send-booking.js
const nodemailer = require('nodemailer');

function formatExtraInfo(extraInfoAnswers) {
  if (!extraInfoAnswers || typeof extraInfoAnswers !== 'object') {
    return 'No additional information provided.';
  }

  const entries = Object.entries(extraInfoAnswers);
  if (!entries.length) return 'No additional information provided.';

  return entries
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase());

      if (typeof value === 'boolean') {
        return `${label}: ${value ? 'Yes' : 'No'}`;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return `${label}: None indicated`;
      }
      return `${label}: ${value}`;
    })
    .join('\n');
}

function buildInternalEmail(payload) {
  const {
    experienceId,
    experienceTitle,
    category,
    date,
    adults,
    children,
    totalEstimate,
    extraInfoAnswers,
    contactType,
    contactValue,
    language,
    submittedAt
  } = payload;

  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);

  const subject = `New pre-booking – ${experienceTitle} – ${date || 'no date'}`;

  const text = `
New pre-booking received from the website.

=== Experience ===
ID: ${experienceId || '-'}
Name: ${experienceTitle || '-'}
Category: ${category || '-'}
Date: ${date || '-'}

Adults: ${adults ?? 0}
Children: ${children ?? 0}
Estimated total: €${Number.isFinite(totalEstimate) ? totalEstimate : 0}

=== Additional information from the guest ===
${extraInfoBlock}

=== Guest contact ===
Preferred channel: ${contactType || '-'}  
Contact value: ${contactValue || '-'}

Language: ${language || '-'}
Submitted at: ${submittedAt || '-'}

Please check availability and contact the guest to confirm or adjust the booking details.
`.trim();

  return { subject, text };
}

function buildClientEmail(payload) {
  const {
    experienceTitle,
    date,
    adults,
    children,
    totalEstimate,
    extraInfoAnswers,
    contactType,
    contactValue
  } = payload;

  // Só enviamos email se o cliente introduziu email
  if (contactType !== 'email' || !contactValue) return null;

  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);

  const subject = `Pre-booking received – ${experienceTitle}`;

  const text = `
Hello,

Thank you for your request!
We have received your pre-booking for the following experience:

=== Experience ===
${experienceTitle}
Date: ${date || '-'}
Adults: ${adults ?? 0}
Children: ${children ?? 0}
Estimated total: €${Number.isFinite(totalEstimate) ? totalEstimate : 0}

=== Additional information you provided ===
${extraInfoBlock}

Please note: this is NOT the final booking confirmation yet.

Our team will now check availability and will contact you to confirm your booking.

If you notice any mistake in the information above or need to change anything, contact us at:

Email: marketing@dmcmadeira.pt
WhatsApp: +351 9xx xxx xxx

Thank you,
What to Do Madeira / DMC Madeira
`.trim();

  return { subject, text, to: contactValue };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = req.body;
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    console.log('📩 New booking payload received:', payload);

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      BOOKING_FROM_EMAIL,
      BOOKING_TO_EMAIL
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !BOOKING_FROM_EMAIL || !BOOKING_TO_EMAIL) {
      console.error('Missing SMTP or booking email environment variables.');
      return res.status(500).json({ success: false, error: 'Email not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    // 1) Email interno para ti
    const internalEmail = buildInternalEmail(payload);
    await transporter.sendMail({
      from: BOOKING_FROM_EMAIL,
      to: BOOKING_TO_EMAIL,
      subject: internalEmail.subject,
      text: internalEmail.text
    });

    // 2) Email de pré-reserva para o cliente (se aplicável)
    const clientEmail = buildClientEmail(payload);
    if (clientEmail) {
      await transporter.sendMail({
        from: BOOKING_FROM_EMAIL,
        to: clientEmail.to,
        subject: clientEmail.subject,
        text: clientEmail.text
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error in /api/send-booking:', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error.' });
  }
};
