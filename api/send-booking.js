// api/send-booking.js
export default async function handler(req, res) {
  // Só aceitamos POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Em Vercel, para funções Node "puras", o body vem como string
    const rawBody = req.body;
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    console.log('📩 New booking payload received:', payload);

    // Aqui, no passo seguinte, vamos:
    // - montar o email interno
    // - montar o email para o cliente
    // - enviar ambos através de um provider (SMTP/Resend/etc.)

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in /api/send-booking:', err);
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }
}
