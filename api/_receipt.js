// Lit le texte brut d'un ticket de caisse (renvoyé par Google Vision)
// et en sort le total payé, le magasin et la date.

const STORES = [
  'E.Leclerc', 'Leclerc', 'Lidl', 'Aldi', 'Carrefour Market', 'Carrefour City', 'Carrefour', 'Auchan',
  'Intermarché', 'Super U', 'Hyper U', 'Super-U', 'Hyper-U', 'Système U', 'U Express', 'Monoprix', 'Franprix',
  'Cora', 'Match', 'Norma', 'Simply', 'Casino', 'Picard', 'Grand Frais', 'Biocoop', 'Netto',
  'Leader Price', 'Action', 'Colruyt', 'Naturalia', 'La Vie Claire', 'Spar', 'Vival', 'Proxi',
  'Bio c\' Bon', 'Thiriet', 'Metro', 'Costco', 'Primeur', 'Boulangerie',
];

const N = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

// Lignes à ne jamais prendre pour le total
const EXCLUDE = /SOUS[\s-]?TOTAL|\bTVA\b|\bHT\b|REMISE|ECONOMI|FIDELITE|POINTS?\b|RENDU|A RENDRE|ESPECES|CAGNOTTE|\bBONS?\b|ARTICLES?\b|AVANTAGE|REDUCTION|TICKET E\.?LECLERC|CONSIGNE/;

const RULES = [
  { p: 3, re: /NET\s+A\s+PAYER|TOTAL\s+A\s+PAYER|MONTANT\s+A\s+PAYER|\bA\s+PAYER\b|TOTAL\s+TTC|MONTANT\s+TTC|TOTAL\s+EUR/ },
  { p: 2, re: /\bTOTAL\b/ },
  { p: 1, re: /CARTE\s+BANCAIRE|\bCB\b|\bCARTE\b|PAIEMENT|SANS\s+CONTACT|\bVISA\b|MASTERCARD|\bMONTANT\b|DEBIT/ },
];

function amountsIn(line) {
  const cleaned = line
    .replace(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g, ' ') // dates
    .replace(/\b\d{1,2}[:h]\d{2}(:\d{2})?\b/g, ' ');           // heures
  const out = [];
  const re = /(?:^|[^\d,.])(\d{1,4})\s?[,.]\s?(\d{2})(?![\d%]|\s?%)/g;
  let m;
  while ((m = re.exec(cleaned))) out.push(parseFloat(m[1] + '.' + m[2]));
  return out.filter((v) => v > 0 && v < 5000);
}

function findTotal(lines) {
  const U = lines.map(N);
  const cands = [];
  for (let i = 0; i < U.length; i++) {
    if (EXCLUDE.test(U[i])) continue;
    const rule = RULES.find((r) => r.re.test(U[i]));
    if (!rule) continue;
    let vals = amountsIn(lines[i]);
    // Vision met souvent le montant sur la ligne suivante
    for (let j = i + 1; !vals.length && j <= i + 3 && j < lines.length; j++) {
      if (EXCLUDE.test(U[j])) break;
      vals = amountsIn(lines[j]);
    }
    if (vals.length) cands.push({ p: rule.p, v: Math.max(...vals) });
  }
  if (cands.length) {
    const best = Math.max(...cands.map((c) => c.p));
    const top = cands.filter((c) => c.p === best).map((c) => c.v);
    return { total: Math.max(...top), sure: best >= 2 };
  }
  // Dernier recours : le plus grand montant du ticket hors lignes exclues
  const all = [];
  lines.forEach((l, i) => { if (!EXCLUDE.test(U[i])) all.push(...amountsIn(l)); });
  return all.length ? { total: Math.max(...all), sure: false } : { total: null, sure: false };
}

function findDate(text) {
  const re = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})\b/g;
  const today = new Date();
  let m;
  while ((m = re.exec(text))) {
    const d = +m[1], mo = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 2020) continue;
    const dt = new Date(y, mo - 1, d);
    if (dt.getMonth() !== mo - 1 || dt > today) continue;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function findStore(lines) {
  const head = N(lines.slice(0, 10).join(' \n '));
  const all = N(lines.join(' \n '));
  for (const zone of [head, all]) {
    for (const s of STORES) {
      const k = N(s).replace(/[.\-]/g, '[\\s.\\-]?');
      if (new RegExp('(^|[^A-Z])' + k + '([^A-Z]|$)').test(zone)) return s.replace('E.Leclerc', 'Leclerc');
    }
  }
  const first = lines.find((l) => /[A-Za-zÀ-ÿ]{3,}/.test(l));
  return first ? first.slice(0, 40) : '';
}

function parseReceipt(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const { total, sure } = findTotal(lines);
  return { total, sure, store: findStore(lines), date: findDate(text || '') };
}

module.exports = { parseReceipt };
