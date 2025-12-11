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
    language
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
    subject = `Pré-reserva recebida – ${experienceTitle || 'a sua experiência'}`;
    text = `
Olá,

Obrigado pelo seu pedido!
Recebemos a sua pré-reserva para a seguinte experiência:

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
    subject = `Pre-booking received – ${experienceTitle || 'your experience'}`;
    text = `
Hello,

Thank you for your request!
We have received your pre-booking for the following experience:

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
 * Mensagem WhatsApp (PT / EN)
 * -------------------------------------*/
function buildWhatsAppText(payload) {
  const {
    experienceTitle,
    date,
    adults,
    children,
    totalEstimate,
    extraInfoAnswers,
    language
  } = payload;

  const lang = (language || 'en').toLowerCase();
  const extraInfoBlock = formatExtraInfo(extraInfoAnswers);
  const totalText = `€${Number.isFinite(totalEstimate) ? totalEstimate : 0}`;

  if (lang === 'pt') {
    return `
Pré-reserva recebida ✅

Experiência: ${experienceTitle || '-'}
Data: ${date || '-'}
Adultos: ${adults ?? 0}
Crianças: ${children ?? 0}
Valor estimado: ${totalText}

Informação adicional:
${extraInfoBlock}

Esta ainda NÃO é a confirmação final da sua reserva.
A nossa equipa vai verificar a disponibilidade e entraremos em contacto
consigo em breve para confirmar ou ajustar a reserva.

Se precisar de alguma alteração urgente, responda diretamente a esta mensagem.
`.trim();
  }

  // EN (default)
  return `
Pre-booking received ✅

Experience: ${experienceTitle || '-'}
Date: ${date || '-'}
Adults: ${adults ?? 0}
Children: ${children ?? 0}
Estimated total: ${totalText}

Additional information:
${extraInfoBlock}

This is NOT yet the final booking confirmation.
Our team will check availability and will contact you soon
to confirm or adjust your booking.

If you need any urgent changes, you can reply directly to this message.
`.trim();
}

/* ---------------------------------------
 * Envio de WhatsApp via WhatsApp Cloud API
 * -------------------------------------*/
async function sendWhatsAppConfirmation(payload) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env;

  // 1) Verificar variáveis de ambiente
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp env vars not configured. Skipping WhatsApp send.');
    return;
  }

  const { contactType, contactValue } = payload;

  // 2) Só envia se o cliente escolheu WhatsApp
  if (contactType !== 'whatsapp' || !contactValue) {
    console.log('WhatsApp not selected or no number provided, skipping.');
    return;
  }

  // Número tem de vir em formato internacional +351...
  const to = contactValue.trim();
  const bodyText = buildWhatsAppText(payload);

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  console.log('➡️ Sending WhatsApp message to:', to);
  console.log('➡️ WhatsApp API URL:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: bodyText }
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error(
        'WhatsApp API error:',
        response.status,
        response.statusText,
        responseText
      );
      // Não atiramos erro para não estragar o fluxo de emails
      return;
    }

    console.log('✅ WhatsApp API success:', response.status, responseText);
  } catch (err) {
    console.error('WhatsApp fetch error:', err);
    // Outra vez: não atiramos erro para não quebrar o resto
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
    const internalEmail = buildInternalEmail(payload);
    await transporter.sendMail({
      from: BOOKING_FROM_EMAIL,
      to: BOOKING_TO_EMAIL,
      subject: internalEmail.subject,
      text: internalEmail.text
    });

    // 2) Email para o cliente (se escolheu email)
    const clientEmail = buildClientEmail(payload);
    if (clientEmail) {
      await transporter.sendMail({
        from: BOOKING_FROM_EMAIL,
        to: clientEmail.to,
        subject: clientEmail.subject,
        text: clientEmail.text
      });
    }

    // 3) WhatsApp para o cliente (se escolheu WhatsApp)
    if (payload.contactType === 'whatsapp') {
      await sendWhatsAppConfirmation(payload);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error in /api/send-booking:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unexpected server error.'
    });
  }
};
