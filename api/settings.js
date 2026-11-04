// Budget mensuel (PUT { budget }).
const { db, guard, fail, body } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Méthode non autorisée' });
  try {
    const v = Math.round(Number(body(req).budget) * 100) / 100;
    if (!(v > 0 && v < 100000)) return res.status(400).json({ error: 'Budget invalide' });
    const p = await db();
    await p.query(
      "INSERT INTO settings (key, value) VALUES ('budget', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [String(v)]
    );
    res.status(200).json({ ok: true });
  } catch (e) { fail(res, e); }
};
