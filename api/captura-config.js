module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ mensagem: 'Método não permitido.' });
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  if (!siteKey) return res.status(503).json({ mensagem: 'Formulário temporariamente indisponível.' });
  return res.status(200).json({ siteKey });
};
