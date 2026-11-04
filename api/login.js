const { sessionCookie, clearCookie, body, crypto } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const expected = process.env.APP_PASSWORD || '';
    if (!expected || !process.env.APP_SECRET) {
      return res.status(500).json({ error: 'Variables APP_PASSWORD ou APP_SECRET manquantes sur Vercel' });
    }
    const given = String(body(req).password || '');
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      await new Promise((r) => setTimeout(r, 800)); // ralentit les essais au hasard
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'Méthode non autorisée' });
};
