// Reçoit la photo du ticket (base64), l'envoie à Google Cloud Vision, renvoie total / magasin / date.
const { db, guard, fail, body } = require('./_lib');
const { parseReceipt } = require('./_receipt');

const MONTHLY_LIMIT = 950; // reste sous les 1 000 lectures gratuites par mois

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY manquant sur Vercel' });

  const image = String(body(req).image || '');
  if (!image || image.length > 6_000_000) return res.status(400).json({ error: 'Image manquante ou trop lourde' });

  try {
    // Compteur mensuel pour ne jamais payer
    const p = await db();
    const month = new Date().toISOString().slice(0, 7);
    const c = await p.query(
      `INSERT INTO settings (key, value) VALUES ($1, '1')
       ON CONFLICT (key) DO UPDATE SET value = (settings.value::int + 1)::text
       RETURNING value::int AS n`,
      ['scans:' + month]
    );
    if (c.rows[0].n > MONTHLY_LIMIT) {
      return res.status(429).json({ error: 'Limite de scans gratuits atteinte ce mois-ci. Saisis le montant à la main.' });
    }

    const r = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['fr'] },
        }],
      }),
    });
    const j = await r.json();
    if (!r.ok || j.responses?.[0]?.error) {
      const msg = j.error?.message || j.responses?.[0]?.error?.message || 'Erreur Google Vision';
      console.error('Vision:', msg);
      return res.status(502).json({ error: 'Google Vision : ' + msg });
    }
    const text = j.responses?.[0]?.fullTextAnnotation?.text || '';
    if (!text.trim()) return res.status(200).json({ total: null, store: '', date: null, sure: false });
    res.status(200).json(parseReceipt(text));
  } catch (e) { fail(res, e); }
};
