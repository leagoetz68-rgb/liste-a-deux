// Tout ce dont la page a besoin, en un seul appel.
const { db, guard, fail } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const p = await db();
    const [s, i, t] = await Promise.all([
      p.query("SELECT value FROM settings WHERE key = 'budget'"),
      p.query('SELECT id, name, cat, done FROM items ORDER BY created_at, id'),
      p.query("SELECT id, store, to_char(date, 'YYYY-MM-DD') AS date, total::float8 AS total FROM tickets ORDER BY date DESC, id DESC"),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      budget: s.rows[0] ? Number(s.rows[0].value) : 300,
      items: i.rows,
      tickets: t.rows,
    });
  } catch (e) { fail(res, e); }
};
