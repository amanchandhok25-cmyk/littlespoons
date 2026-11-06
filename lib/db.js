const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'weaning.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  pass_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS custom_foods (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL, allergen TEXT, iron INTEGER DEFAULT 0,
  serve TEXT DEFAULT '', choke TEXT, created_by INTEGER);
CREATE TABLE IF NOT EXISTS food_overrides (
  food_id TEXT PRIMARY KEY, status TEXT, note TEXT, updated_by INTEGER, updated_at TEXT);
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, time TEXT, slot TEXT NOT NULL,
  notes TEXT DEFAULT '', milk_ml INTEGER, milk_type TEXT, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY, meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL, amount INTEGER DEFAULT 2, liking INTEGER DEFAULT 1, texture TEXT);
CREATE INDEX IF NOT EXISTS idx_items_food ON meal_items(food_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, time TEXT, severity TEXT NOT NULL,
  symptoms TEXT NOT NULL DEFAULT '[]', suspects TEXT NOT NULL DEFAULT '[]', onset TEXT, duration TEXT,
  action TEXT, notes TEXT DEFAULT '', photo TEXT, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS skin (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, score INTEGER NOT NULL, areas TEXT DEFAULT '',
  notes TEXT DEFAULT '', user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS plans (
  date TEXT PRIMARY KEY, data TEXT NOT NULL, generated_at TEXT NOT NULL, edited INTEGER DEFAULT 0,
  notified INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY, user_id INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY, user_id INTEGER, kind TEXT, text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

const DEFAULT_SETTINGS = {
  baby_name: 'Baby',
  dob: '2026-03-20',
  eczema: '1',
  gp_nuts_ok: '0',
  plan_time: '19:00',
  new_foods_per_day: '1',
  allergen_gap_days: '3',
  maintain_days: '4',
  times: JSON.stringify({ breakfast: '07:30', lunch: '11:45', dinner: '16:45', snack: '14:30' }),
  include_snack: '1',
};

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return {
    baby_name: s.baby_name, dob: s.dob, eczema: s.eczema === '1', gp_nuts_ok: s.gp_nuts_ok === '1',
    plan_time: s.plan_time, new_foods_per_day: +s.new_foods_per_day, allergen_gap_days: +s.allergen_gap_days,
    maintain_days: +s.maintain_days, times: JSON.parse(s.times), include_snack: s.include_snack === '1',
  };
}
function setSettings(obj) {
  const st = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    let val = v;
    if (typeof v === 'boolean') val = v ? '1' : '0';
    else if (typeof v === 'object') val = JSON.stringify(v);
    st.run(k, String(val));
  }
}

function seed() {
  // Users from env: USERS="aman:Aman:password,kiran:Kiran:password"
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count === 0) {
    const spec = process.env.USERS || 'aman:Aman:,kiran:Kiran:';
    for (const part of spec.split(',')) {
      let [username, display, pw] = part.split(':');
      if (!username) continue;
      if (!pw) {
        pw = crypto.randomBytes(6).toString('base64url');
        console.log(`[setup] Created user "${username}" with password: ${pw}  (change it in Settings)`);
      }
      db.prepare('INSERT INTO users(username, display_name, pass_hash) VALUES(?,?,?)')
        .run(username.toLowerCase().trim(), display || username, hashPassword(pw));
    }
  }
  // Seed history once
  const seeded = db.prepare("SELECT value FROM settings WHERE key='seeded'").get();
  if (!seeded) {
    if (process.env.BABY_NAME) setSettings({ baby_name: process.env.BABY_NAME });
    if (process.env.BABY_DOB) setSettings({ dob: process.env.BABY_DOB });
    const first = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    const history = ['sweet_potato', 'cucumber', 'green_beans', 'chicken', 'spinach', 'tomato', 'yoghurt', 'egg'];
    const today = new Date();
    history.forEach((food, i) => {
      const d = new Date(today); d.setDate(d.getDate() - 7 - (history.length - i) * 2);
      const date = d.toISOString().slice(0, 10);
      const m = db.prepare("INSERT INTO meals(date,time,slot,notes,user_id) VALUES(?,?,?,?,?)")
        .run(date, '11:45', 'lunch', 'Added from earlier history (no problems)', first ? first.id : null);
      db.prepare('INSERT INTO meal_items(meal_id, food_id, amount, liking) VALUES(?,?,?,?)').run(m.lastInsertRowid, food, 2, 1);
    });
    db.prepare("INSERT INTO settings(key,value) VALUES('seeded','1')").run();
  }
}

module.exports = { db, hashPassword, verifyPassword, getSettings, setSettings, seed, DATA_DIR };
