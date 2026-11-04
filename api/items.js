// Liste de courses : ajouter (POST), cocher (PATCH), supprimer (DELETE ?id= ou ?done=1).
const { db, guard, fail, body } = require('./_lib');

const CATS = ['fruits', 'frais', 'epicerie', 'surgeles', 'boissons', 'maison', 'autre'];

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const p = await db();
    if (req.method === 'POST') {
      const b = body(req);
      const name = String(b.name || '').trim().slice(0, 120);
      const cat = CATS.includes(b.cat) ? b.cat : 'autre';
      if (!name) return res.status(400).json({ error: 'Nom manquant' });
      const r = await p.query('INSERT INTO items (name, cat) VALUES ($1, $2) RETURNING id, name, cat, done', [name, cat]);
      return res.status(200).json(r.rows[0]);
    }
    if (req.method === 'PATCH') {
      const b = body(req);
      await p.query('UPDATE items SET done = $1 WHERE id = $2', [!!b.done, Number(b.id)]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      if (req.query.done === '1') await p.query('DELETE FROM items WHERE done = TRUE');
      else await p.query('DELETE FROM items WHERE id = $1', [Number(req.query.id)]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) { fail(res, e); }
};
