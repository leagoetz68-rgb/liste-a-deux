// Abonnement aux notifications : GET = clé publique, POST = enregistrer ce téléphone.
const { db, guard, fail, body } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY || '' });
    if (req.method === 'POST') {
      const sub = body(req).sub;
      if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Abonnement invalide' });
      const p = await db();
      await p.query('INSERT INTO push_subs (endpoint, sub) VALUES ($1, $2) ON CONFLICT (endpoint) DO UPDATE SET sub = EXCLUDED.sub',
        [sub.endpoint, sub]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) { fail(res, e); }
};
