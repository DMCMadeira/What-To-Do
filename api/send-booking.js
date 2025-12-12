// api/send-booking.js
const nodemailer = require('nodemailer');

/* ---------------------------------------
 * Helpers para texto
 * -------------------------------------*/
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

/* ---------------------------------------
 * Código de reserva (sem BD, versão simples)
 * Formato: YYMMDD[L]-NN  ex: 251211A-03
 * -------------------------------------*/
function generateBookingReference(payload) {
  const { date, experienceId } = payload;

  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const baseDate = date || todayIso;
  const [yyyy, mm, dd] = baseDate.split('-');

  const yy = (yyyy || '0000').slice(-2);
  const letter =
    typeof experienceId === 'string' && experienceId.length > 0
      ? experienceId[0].toUpperCase()
      : 'X';

  // Número “fake” por agora, até termos BD (00–99)
  const randomNum = Math.floor(Math.random() * 100);
  const numPart = String(randomNum).padStart(2, '0');

  return `${yy}${mm}${dd}${letter}-${numPart}`;
}

/* ---------------------------------------
 * Email interno (pode ficar só em EN)
 * -------------------------------------*/
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
    submittedAt,
    customerName,
    bookingReference
  } = payload;

  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);

  const subject = `New pre-booking – ${experienceTitle} – ${date || 'no date'} – ${bookingReference || '-'}`;

  const text = `
New pre-booking received from the website.

Booking reference: ${bookingReference || '-'}

=== Experience ===
ID: ${experienceId || '-'}
Name: ${experienceTitle || '-'}
Category: ${category || '-'}
Date: ${date || '-'}

Adults: ${adults ?? 0}
Children: ${children ?? 0}
Estimated total: €${Number.isFinite(totalEstimate) ? totalEstimate : 0}

=== Guest ===
Name: ${customerName || '-'}

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

/* ---------------------------------------
 * Email para o cliente (PT / EN)
 * -------------------------------------*/
function buildClientEmail(payload) {
  const {
    experienceTitle,
    date,
    adults,
    children,
    totalEstimate,
    extraInfoAnswers,
    contactType,
    contactValue,
    language,
    customerName,
    bookingReference
  } = payload;

  if (contactType !== 'email' || !contactValue) {
    return null;
  }

  const lang = (language || 'en').toLowerCase();
  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);
  const totalText = `€${Number.isFinite(totalEstimate) ? totalEstimate : 0}`;

  let subject;
  let text;

  if (lang === 'pt') {
    subject = `Pré-reserva recebida – ${experienceTitle || 'a sua experiência'} – ${bookingReference || '-'}`;
    text = `
Olá${customerName ? ` ${customerName}` : ''},

Obrigado pelo seu pedido!
Recebemos a sua pré-reserva para a seguinte experiência:

Referência de reserva: ${bookingReference || '-'}

=== Experiência ===
${experienceTitle || '-'}
Data: ${date || '-'}
Adultos: ${adults ?? 0}
Crianças: ${children ?? 0}
Valor estimado: ${totalText}

=== Informação adicional que indicou ===
${extraInfoBlock}

Atenção: esta ainda NÃO é a confirmação final da reserva.

A nossa equipa vai agora verificar a disponibilidade e entrará em contacto
consigo para confirmar a reserva ou sugerir alternativas, se necessário.

Se detetar algum erro na informação acima ou precisar de alterar algo,
pode contactar-nos através de:

Email: marketing@dmcmadeira.pt
WhatsApp: +351 9xx xxx xxx

Obrigado,
What to Do Madeira / DMC Madeira
`.trim();
  } else {
    // EN (default)
    subject = `Pre-booking received – ${experienceTitle || 'your experience'} – ${bookingReference || '-'}`;
    text = `
Hello${customerName ? ` ${customerName}` : ''},

Thank you for your request!
We have received your pre-booking for the following experience:

Booking reference: ${bookingReference || '-'}

=== Experience ===
${experienceTitle || '-'}
Date: ${date || '-'}
Adults: ${adults ?? 0}
Children: ${children ?? 0}
Estimated total: ${totalText}

=== Additional information you provided ===
${extraInfoBlock}

Please note: this is NOT the final booking confirmation yet.

Our team will now check availability and will contact you to confirm your booking
or suggest alternatives if needed.

If you notice any mistake in the information above or need to change anything,
you can contact us at:

Email: marketing@dmcmadeira.pt
WhatsApp: +351 9xx xxx xxx

Thank you,
What to Do Madeira / DMC Madeira
`.trim();
  }

  return { subject, text, to: contactValue };
}

/* ---------------------------------------
 * WhatsApp – template booking_pre_confirmation
 * Variáveis no template:
 *  {{1}} Experience
 *  {{2}} Date
 *  {{3}} Adults
 *  {{4}} Children
 *  {{5}} Estimated total
 *  {{6}} Additional information
 *  {{7}} Booking reference
 * -------------------------------------*/
async function sendWhatsAppConfirmation(payload) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env;

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp env vars not configured. Skipping WhatsApp send.');
    return;
  }

  const {
    contactType,
    contactValue,
    language,
    experienceTitle,
    date,
    adults,
    children,
    totalEstimate,
    extraInfoAnswers,
    bookingReference
  } = payload;

  if (contactType !== 'whatsapp' || !contactValue) {
    return;
  }

  const to = contactValue.trim(); // ex: +351939473552
  const langCode = (language || 'en').toLowerCase() === 'pt' ? 'pt_PT' : 'en_US';

  const totalNumber = Number(totalEstimate || 0);
  const totalText = `${totalNumber.toFixed(2)}€`;
  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  console.log('Sending WhatsApp template message to:', to);
  console.log('WhatsApp API URL:', url);

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'booking_pre_confirmation', // nome do teu template
      language: { code: langCode },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: experienceTitle || '-' },                 // {{1}}
            { type: 'text', text: date || '-' },                            // {{2}}
            { type: 'text', text: adults != null ? String(adults) : '0' },  // {{3}}
            { type: 'text', text: children != null ? String(children) : '0' }, // {{4}}
            { type: 'text', text: totalText },                              // {{5}}
            { type: 'text', text: extraInfoBlock },                         // {{6}}
            { type: 'text', text: bookingReference || '-' }                 // {{7}}
          ]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('WhatsApp API error:', response.status, errText);
    throw new Error('WhatsApp API error');
  } else {
    const data = await response.json();
    console.log('WhatsApp API success (template):', JSON.stringify(data));
  }
}

/* ---------------------------------------
 * Handler principal
 * -------------------------------------*/
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = req.body;
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    console.log('📩 New booking payload received:', payload);

    // Gera (ou reaproveita) a referência de reserva
    const bookingReference = payload.bookingReference || generateBookingReference(payload);
    const payloadWithRef = { ...payload, bookingReference };

    console.log('Generated booking reference:', bookingReference);

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      BOOKING_FROM_EMAIL,
      BOOKING_TO_EMAIL
    } = process.env;

    if (
      !SMTP_HOST ||
      !SMTP_PORT ||
      !SMTP_USER ||
      !SMTP_PASS ||
      !BOOKING_FROM_EMAIL ||
      !BOOKING_TO_EMAIL
    ) {
      console.error('Missing SMTP or booking email environment variables.');
      return res.status(500).json({ success: false, error: 'Email not configured.' });
    }

    const portNumber = Number(SMTP_PORT);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portNumber,
      secure: portNumber === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 1) Email interno
    const internalEmail = buildInternalEmail(payloadWithRef);
    await transporter.sendMail({
      from: BOOKING_FROM_EMAIL,
      to: BOOKING_TO_EMAIL,
      subject: internalEmail.subject,
      text: internalEmail.text
    });

    // 2) Email para o cliente (se escolheu email)
    const clientEmail = buildClientEmail(payloadWithRef);
    if (clientEmail) {
      await transporter.sendMail({
        from: BOOKING_FROM_EMAIL,
        to: clientEmail.to,
        subject: clientEmail.subject,
        text: clientEmail.text
      });
    }

    // 3) WhatsApp para o cliente (se escolheu WhatsApp)
    if (payloadWithRef.contactType === 'whatsapp') {
      await sendWhatsAppConfirmation(payloadWithRef);
    }

    return res.status(200).json({ success: true, bookingReference });
  } catch (err) {
    console.error('❌ Error in /api/send-booking:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unexpected server error.'
    });
  }
};
