// Tickets : ajouter (POST), modifier (PUT), supprimer (DELETE ?id=).
const { db, guard, fail, body } = require('./_lib');

function clean(b) {
  const total = Math.round(Number(b.total) * 100) / 100;
  const date = String(b.date || '');
  if (!(total > 0 && total < 10000)) return { error: 'Montant invalide' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Date invalide' };
  return { store: String(b.store || '').trim().slice(0, 80), date, total };
}

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const p = await db();
    if (req.method === 'POST' || req.method === 'PUT') {
      const b = body(req);
      const t = clean(b);
      if (t.error) return res.status(400).json(t);
      if (req.method === 'POST') {
        await p.query('INSERT INTO tickets (store, date, total) VALUES ($1, $2, $3)', [t.store, t.date, t.total]);
      } else {
        await p.query('UPDATE tickets SET store = $1, date = $2, total = $3 WHERE id = $4', [t.store, t.date, t.total, Number(b.id)]);
      }
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await p.query('DELETE FROM tickets WHERE id = $1', [Number(req.query.id)]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) { fail(res, e); }
};
