// Outils partagés : base Neon, connexion par mot de passe, réponses JSON.
// (Les fichiers qui commencent par "_" ne deviennent pas des routes sur Vercel.)
const { Pool } = require('pg');
const crypto = require('crypto');

let pool = null;
let ready = null;

function cleanUrl(raw) {
  // pg n'aime pas toujours sslmode / channel_binding : on les retire et on force le SSL.
  try {
    const u = new URL(raw);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch (e) {
    return raw;
  }
}

async function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  if (!pool) {
    pool = new Pool({ connectionString: cleanUrl(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false }, max: 3 });
  }
  if (!ready) {
    // Les tables se créent toutes seules au premier appel.
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        cat        TEXT NOT NULL DEFAULT 'autre',
        done       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id         SERIAL PRIMARY KEY,
        store      TEXT NOT NULL DEFAULT '',
        date       DATE NOT NULL,
        total      NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).catch((e) => { ready = null; throw e; });
  }
  await ready;
  return pool;
}

// ---------- Connexion ----------
const COOKIE = 'nc_session';
const MAX_AGE = 180 * 24 * 3600; // 6 mois

function sign(value) {
  return crypto.createHmac('sha256', process.env.APP_SECRET || '').update(value).digest('hex');
}

function sessionCookie() {
  const t = String(Date.now());
  return `${COOKIE}=${t}.${sign(t)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function isAuthed(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)nc_session=([^;]+)/);
  if (!m) return false;
  const [t, s] = m[1].split('.');
  if (!t || !s) return false;
  const expected = sign(t);
  if (s.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return false;
  return Date.now() - Number(t) < MAX_AGE * 1000;
}

// À appeler en haut de chaque route protégée. Renvoie false si la réponse est déjà envoyée.
function guard(req, res) {
  if (!process.env.APP_SECRET || !process.env.APP_PASSWORD) {
    res.status(500).json({ error: 'Variables APP_PASSWORD ou APP_SECRET manquantes sur Vercel' });
    return false;
  }
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Non connecté' });
    return false;
  }
  return true;
}

function fail(res, e) {
  console.error(e);
  res.status(500).json({ error: 'Erreur serveur : ' + (e && e.message ? e.message : 'inconnue') });
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = { db, guard, sessionCookie, clearCookie, fail, body, crypto };
