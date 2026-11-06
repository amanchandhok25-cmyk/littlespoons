const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, hashPassword, verifyPassword, getSettings, setSettings, seed, DATA_DIR } = require('./lib/db');
const { generatePlan, foodStates, allergenStatus, allFoods, ageOn, addDays, daysBetween } = require('./lib/planner');
const { TIPS } = require('./lib/foods');
const push = require('./lib/push');

seed();
push.init();

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const SESSION_DAYS = 365;
let rev = Date.now(); // bumps on every write so clients know to refresh

function today() { return new Date().toLocaleDateString('en-CA'); } // YYYY-MM-DD in server TZ
function nowTime() { return new Date().toTimeString().slice(0, 5); }

// ---------- helpers ----------
function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; let size = 0;
    req.on('data', c => { size += c.length; if (size > 8e6) { reject(new Error('too large')); req.destroy(); } else data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=').map(decodeURIComponent)).filter(p => p[0]));
}
function currentUser(req) {
  const t = cookies(req).sid;
  if (!t) return null;
  const row = db.prepare('SELECT u.id, u.username, u.display_name, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').get(t);
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}
function log(user, kind, text) {
  db.prepare('INSERT INTO activity(user_id, kind, text) VALUES(?,?,?)').run(user ? user.id : null, kind, text);
  rev = Date.now();
}
const loginAttempts = new Map();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
function serveStatic(req, res, urlPath) {
  let p = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  if (p === '/' || !path.extname(p)) p = '/index.html';
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' || p === '/sw.js' ? 'no-cache' : 'public, max-age=3600' });
    res.end(buf);
  });
}

function getPlan(date, create = true) {
  const row = db.prepare('SELECT * FROM plans WHERE date=?').get(date);
  if (row) return { ...JSON.parse(row.data), edited: !!row.edited };
  if (!create) return null;
  const plan = generatePlan(date);
  savePlan(date, plan, 0);
  return plan;
}
function savePlan(date, plan, edited) {
  db.prepare(`INSERT INTO plans(date, data, generated_at, edited) VALUES(?,?,?,?)
    ON CONFLICT(date) DO UPDATE SET data=excluded.data, generated_at=excluded.generated_at, edited=excluded.edited`)
    .run(date, JSON.stringify(plan), new Date().toISOString(), edited ? 1 : 0);
  rev = Date.now();
}
function mergeKeep(oldPlan, plan) {
  // Keep parents' notes and ticked prep across regenerations
  if (!oldPlan) return plan;
  plan.parentNotes = oldPlan.parentNotes || [];
  const done = new Set((oldPlan.prep || []).filter(p => p.done).map(p => p.text));
  plan.prep.forEach(p => { if (done.has(p.text)) p.done = true; });
  return plan;
}

function mealsBetween(from, to) {
  const meals = db.prepare(`SELECT m.*, u.display_name AS by FROM meals m LEFT JOIN users u ON u.id=m.user_id WHERE m.date BETWEEN ? AND ? ORDER BY m.date DESC, m.time DESC, m.id DESC`).all(from, to);
  const items = db.prepare(`SELECT mi.* FROM meal_items mi JOIN meals m ON m.id=mi.meal_id WHERE m.date BETWEEN ? AND ?`).all(from, to);
  const byMeal = {};
  for (const it of items) (byMeal[it.meal_id] ||= []).push(it);
  return meals.map(m => ({ ...m, items: byMeal[m.id] || [] }));
}

function saveMeal(user, body, id) {
  const { date, time, slot, notes = '', milk_ml = null, milk_type = null, items = [] } = body;
  if (!date || !slot) throw new Error('date and slot required');
  let mealId = id;
  const before = foodStates();
  if (id) {
    db.prepare('UPDATE meals SET date=?, time=?, slot=?, notes=?, milk_ml=?, milk_type=? WHERE id=?').run(date, time || null, slot, notes, milk_ml, milk_type, id);
    db.prepare('DELETE FROM meal_items WHERE meal_id=?').run(id);
  } else {
    mealId = db.prepare('INSERT INTO meals(date,time,slot,notes,milk_ml,milk_type,user_id) VALUES(?,?,?,?,?,?,?)').run(date, time || null, slot, notes, milk_ml, milk_type, user.id).lastInsertRowid;
  }
  const ins = db.prepare('INSERT INTO meal_items(meal_id, food_id, amount, liking, texture) VALUES(?,?,?,?,?)');
  for (const it of items) ins.run(mealId, it.food_id, it.amount ?? 2, it.liking ?? 1, it.texture || null);
  const firsts = items.filter(it => before[it.food_id] && before[it.food_id].tries === 0).map(it => before[it.food_id].name);
  const names = items.map(it => before[it.food_id]?.name || it.food_id).join(', ');
  log(user, 'meal', `${id ? 'updated' : 'logged'} ${slot}${names ? ': ' + names : ''}${milk_ml ? ` (${milk_ml}ml)` : ''}`);
  if (firsts.length && !id) push.notifyOthers(user.id, { title: 'First taste!', body: `${user.display_name} logged a first try of ${firsts.join(', ')}.`, url: '/#log' });
  return mealId;
}

function insights(date) {
  const states = foodStates();
  const list = Object.values(states);
  const tried = list.filter(s => s.tries > 0);
  const byCat = {};
  for (const s of tried) byCat[s.cat] = (byCat[s.cat] || 0) + 1;
  const week = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(date, -i);
    const r = db.prepare(`SELECT COUNT(DISTINCT mi.food_id) foods, COUNT(DISTINCT m.id) meals FROM meals m LEFT JOIN meal_items mi ON mi.meal_id=m.id WHERE m.date=? AND m.slot != 'milk'`).get(d);
    const sk = db.prepare('SELECT MAX(score) score FROM skin WHERE date=?').get(d);
    const re = db.prepare('SELECT COUNT(*) c FROM reactions WHERE date=?').get(d);
    week.push({ date: d, foods: r.foods, meals: r.meals, skin: sk.score, reactions: re.c });
  }
  // Skin flare correlation: foods first tried within 48h before a flare (score >= 6)
  const flares = db.prepare('SELECT date, score FROM skin WHERE score >= 6 ORDER BY date DESC LIMIT 20').all();
  const flareLinks = {};
  for (const fl of flares) {
    for (const s of tried) {
      if (s.first && daysBetween(s.first, fl.date) >= 0 && daysBetween(s.first, fl.date) <= 2) (flareLinks[s.id] ||= { name: s.name, flares: [] }).flares.push(fl.date);
    }
  }
  return {
    triedCount: tried.length, goal: 100, byCat,
    loved: tried.filter(s => s.liking >= 1.5).map(s => s.name),
    reoffer: tried.filter(s => s.disliked && s.tries < 15).map(s => ({ name: s.name, tries: s.tries })),
    ironToday: null, week, flareLinks: Object.values(flareLinks),
    allergens: allergenStatus(states, date),
  };
}

function csvEscape(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function reportHtml() {
  const s = getSettings();
  const states = foodStates();
  const al = allergenStatus(states, today());
  const reactions = db.prepare('SELECT r.*, u.display_name by_name FROM reactions r LEFT JOIN users u ON u.id=r.user_id ORDER BY date DESC').all();
  const skin = db.prepare('SELECT * FROM skin ORDER BY date DESC LIMIT 60').all();
  const tried = Object.values(states).filter(x => x.tries > 0).sort((a, b) => (a.first > b.first ? 1 : -1));
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const age = ageOn(s.dob, today());
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feeding summary</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:800px;margin:24px auto;padding:0 16px;color:#222}h1{font-size:22px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f5f5f5}.small{color:#666;font-size:12px}@media print{button{display:none}}</style></head><body>
<button onclick="print()">Print / save as PDF</button>
<h1>Feeding summary: ${esc(s.baby_name)}</h1>
<p>Date of birth ${esc(s.dob)} · age ${esc(age.text)} · printed ${esc(today())}${s.eczema ? ' · <b>has eczema</b>' : ''}</p>
<h2>Allergens</h2><table><tr><th>Allergen</th><th>Status</th><th>First</th><th>Last</th><th>Times</th></tr>
${al.map(a => `<tr><td>${esc(a.label)}</td><td>${esc(a.status)}</td><td>${esc(a.first || '')}</td><td>${esc(a.last || '')}</td><td>${a.times}</td></tr>`).join('')}</table>
<h2>Reactions (${reactions.length})</h2>${reactions.length ? `<table><tr><th>Date</th><th>Severity</th><th>Symptoms</th><th>Suspected foods</th><th>Onset / duration</th><th>Notes</th></tr>
${reactions.map(r => `<tr><td>${esc(r.date)} ${esc(r.time || '')}</td><td>${esc(r.severity)}</td><td>${esc(JSON.parse(r.symptoms).join(', '))}</td><td>${esc(JSON.parse(r.suspects).map(id => states[id]?.name || id).join(', '))}</td><td>${esc(r.onset || '')} / ${esc(r.duration || '')}</td><td>${esc(r.notes)}${r.action ? '<br><i>' + esc(r.action) + '</i>' : ''}</td></tr>`).join('')}</table>` : '<p>None logged.</p>'}
<h2>Skin / eczema diary (last 60 entries)</h2>${skin.length ? `<table><tr><th>Date</th><th>Score (0-10)</th><th>Areas</th><th>Notes</th></tr>${skin.map(k => `<tr><td>${esc(k.date)}</td><td>${k.score}</td><td>${esc(k.areas)}</td><td>${esc(k.notes)}</td></tr>`).join('')}</table>` : '<p>None logged.</p>'}
<h2>Foods tried (${tried.length})</h2><table><tr><th>Food</th><th>First tried</th><th>Times</th><th>Status</th></tr>
${tried.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.first)}</td><td>${x.tries}</td><td>${esc(x.status)}</td></tr>`).join('')}</table>
<p class="small">Generated by the family weaning tracker. This is a parent-kept record, not a medical document.</p></body></html>`;
}

// ---------- routes ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;
  if (!p.startsWith('/api/') && p !== '/report') return serveStatic(req, res, p);

  if (p === '/api/login' && m === 'POST') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const a = loginAttempts.get(ip) || { n: 0, t: Date.now() };
    if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
    if (a.n >= 10) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const { username = '', password = '' } = await readBody(req);
    const u = db.prepare('SELECT * FROM users WHERE username=?').get(username.toLowerCase().trim());
    if (!u || !verifyPassword(password, u.pass_hash)) { a.n++; loginAttempts.set(ip, a); return send(res, 401, { error: 'Wrong username or password' }); }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token, u.id, Date.now() + SESSION_DAYS * 864e5);
    const secure = (req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1') ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax${secure}` });
  }

  const user = currentUser(req);
  if (!user) return p === '/report' ? send(res, 302, '', { Location: '/' }) : send(res, 401, { error: 'Not logged in' });

  if (p === '/report') return send(res, 200, reportHtml(), { 'Content-Type': 'text/html; charset=utf-8' });

  if (p === '/api/logout' && m === 'POST') {
    db.prepare('DELETE FROM sessions WHERE token=?').run(cookies(req).sid);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
  }
  if (p === '/api/rev') return send(res, 200, { rev });

  if (p === '/api/bootstrap') {
    const settings = getSettings();
    const states = foodStates();
    const d = today();
    return send(res, 200, {
      me: { id: user.id, username: user.username, name: user.display_name },
      users: db.prepare('SELECT id, username, display_name FROM users').all(),
      settings, today: d, now: nowTime(), age: ageOn(settings.dob, d), rev,
      foods: Object.values(states).map(s => ({ id: s.id, name: s.name, cat: s.cat, allergen: s.allergen, iron: s.iron, serve: s.serve, choke: s.choke, tries: s.tries, first: s.first, last: s.last, liking: s.liking, status: s.status, note: s.note, disliked: s.disliked, reactions: s.reactions, custom: !!s.custom })),
      allergens: allergenStatus(states, d),
      pushKey: push.publicKey(),
    });
  }

  if (p === '/api/settings' && m === 'PUT') {
    const b = await readBody(req);
    setSettings(b);
    log(user, 'settings', 'updated settings');
    return send(res, 200, getSettings());
  }
  if (p === '/api/password' && m === 'POST') {
    const { current, next } = await readBody(req);
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    if (!verifyPassword(current || '', u.pass_hash)) return send(res, 400, { error: 'Current password is wrong' });
    if (!next || next.length < 6) return send(res, 400, { error: 'Use at least 6 characters' });
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(next), user.id);
    return send(res, 200, { ok: true });
  }

  // Meals
  if (p === '/api/meals' && m === 'GET') {
    const to = url.searchParams.get('to') || today();
    const from = url.searchParams.get('from') || addDays(to, -6);
    return send(res, 200, mealsBetween(from, to));
  }
  if (p === '/api/meals' && m === 'POST') return send(res, 200, { id: saveMeal(user, await readBody(req)) });
  let mm;
  if ((mm = p.match(/^\/api\/meals\/(\d+)$/))) {
    if (m === 'PUT') return send(res, 200, { id: saveMeal(user, await readBody(req), +mm[1]) });
    if (m === 'DELETE') { db.prepare('DELETE FROM meals WHERE id=?').run(+mm[1]); log(user, 'meal', 'deleted a meal entry'); return send(res, 200, { ok: true }); }
  }

  // Foods
  if (p === '/api/foods' && m === 'POST') {
    const b = await readBody(req);
    if (!b.name) return send(res, 400, { error: 'Name required' });
    const id = 'c_' + b.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + crypto.randomBytes(2).toString('hex');
    db.prepare('INSERT INTO custom_foods(id,name,cat,allergen,iron,serve,choke,created_by) VALUES(?,?,?,?,?,?,?,?)')
      .run(id, b.name.trim(), b.cat || 'veg', b.allergen || null, b.iron ? 1 : 0, b.serve || '', b.choke || null, user.id);
    log(user, 'food', `added food ${b.name}`);
    return send(res, 200, { id });
  }
  if ((mm = p.match(/^\/api\/foods\/([\w-]+)\/override$/)) && m === 'PUT') {
    const { status = null, note = null } = await readBody(req);
    db.prepare(`INSERT INTO food_overrides(food_id,status,note,updated_by,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(food_id) DO UPDATE SET status=excluded.status, note=excluded.note, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
      .run(mm[1], status || null, note || null, user.id, new Date().toISOString());
    log(user, 'food', `updated ${mm[1]}${status ? ' to ' + status : ''}`);
    return send(res, 200, { ok: true });
  }

  // Suspects: foods eaten in the 48h before a time
  if (p === '/api/suspects') {
    const date = url.searchParams.get('date') || today();
    const meals = mealsBetween(addDays(date, -2), date);
    const states = foodStates();
    const seen = {};
    for (const ml of meals) for (const it of ml.items) {
      const s = states[it.food_id]; if (!s) continue;
      const e = seen[it.food_id] ||= { id: it.food_id, name: s.name, allergen: s.allergen, firstTry: s.first && s.first >= addDays(date, -2), lastAt: ml.date + ' ' + (ml.time || '') };
    }
    return send(res, 200, Object.values(seen).sort((a, b) => (b.firstTry - a.firstTry) || (!!b.allergen - !!a.allergen)));
  }

  // Reactions
  if (p === '/api/reactions' && m === 'GET') return send(res, 200, db.prepare('SELECT r.*, u.display_name AS by FROM reactions r LEFT JOIN users u ON u.id=r.user_id ORDER BY date DESC, time DESC').all().map(r => ({ ...r, symptoms: JSON.parse(r.symptoms), suspects: JSON.parse(r.suspects) })));
  if ((p === '/api/reactions' && m === 'POST') || ((mm = p.match(/^\/api\/reactions\/(\d+)$/)) && m === 'PUT')) {
    const b = await readBody(req);
    const vals = [b.date || today(), b.time || nowTime(), b.severity || 'mild', JSON.stringify(b.symptoms || []), JSON.stringify(b.suspects || []), b.onset || '', b.duration || '', b.action || '', b.notes || '', b.photo || null];
    let id;
    if (m === 'PUT') { id = +mm[1]; db.prepare('UPDATE reactions SET date=?,time=?,severity=?,symptoms=?,suspects=?,onset=?,duration=?,action=?,notes=?,photo=? WHERE id=?').run(...vals, id); }
    else {
      id = db.prepare('INSERT INTO reactions(date,time,severity,symptoms,suspects,onset,duration,action,notes,photo,user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...vals, user.id).lastInsertRowid;
      push.notifyOthers(user.id, { title: `Reaction logged (${vals[2]})`, body: `${user.display_name}: ${(b.symptoms || []).join(', ') || 'see notes'}`, url: '/#health' });
    }
    log(user, 'reaction', `${m === 'PUT' ? 'updated' : 'logged'} a ${vals[2]} reaction`);
    return send(res, 200, { id });
  }
  if ((mm = p.match(/^\/api\/reactions\/(\d+)$/)) && m === 'DELETE') { db.prepare('DELETE FROM reactions WHERE id=?').run(+mm[1]); log(user, 'reaction', 'deleted a reaction'); return send(res, 200, { ok: true }); }

  // Skin diary
  if (p === '/api/skin' && m === 'GET') return send(res, 200, db.prepare('SELECT s.*, u.display_name AS by FROM skin s LEFT JOIN users u ON u.id=s.user_id ORDER BY date DESC, id DESC LIMIT 120').all());
  if (p === '/api/skin' && m === 'POST') {
    const b = await readBody(req);
    db.prepare('INSERT INTO skin(date,score,areas,notes,user_id) VALUES(?,?,?,?,?)').run(b.date || today(), +b.score || 0, b.areas || '', b.notes || '', user.id);
    log(user, 'skin', `logged skin score ${b.score}`);
    return send(res, 200, { ok: true });
  }
  if ((mm = p.match(/^\/api\/skin\/(\d+)$/)) && m === 'DELETE') { db.prepare('DELETE FROM skin WHERE id=?').run(+mm[1]); rev = Date.now(); return send(res, 200, { ok: true }); }

  // Plans
  if ((mm = p.match(/^\/api\/plans\/(\d{4}-\d{2}-\d{2})(\/(\w+))?$/))) {
    const date = mm[1]; const action = mm[3];
    if (!action && m === 'GET') return send(res, 200, getPlan(date));
    const b = m === 'GET' ? {} : await readBody(req);
    if (action === 'regenerate') {
      const old = getPlan(date, false);
      const plan = mergeKeep(old, generatePlan(date, { shuffle: b.shuffle ? crypto.randomBytes(4).toString('hex') : '', newFood: b.newFood }));
      savePlan(date, plan, b.newFood ? 1 : 0);
      log(user, 'plan', `regenerated the plan for ${date}`);
      return send(res, 200, plan);
    }
    if (action === 'swap') {
      const old = getPlan(date);
      const exclude = { ...(old.excluded || {}) };
      const cur = old.meals.find(x => x.slot === b.slot);
      if (cur) (exclude[b.slot] ||= []).push(cur.key);
      const fresh = generatePlan(date, { excludeRecipes: exclude, newFood: old.newFoods[0]?.id, shuffle: String(Date.now()) });
      const nm = fresh.meals.find(x => x.slot === b.slot);
      if (nm) {
        old.meals = old.meals.map(x => x.slot === b.slot ? nm : x);
        const prepTexts = new Set(old.prep.map(p => p.text));
        for (const pr of fresh.prep) if (!prepTexts.has(pr.text) && pr.for === b.slot) old.prep.push({ ...pr, id: old.prep.length });
      }
      old.excluded = exclude;
      savePlan(date, old, 1);
      log(user, 'plan', `swapped ${b.slot} for ${date}`);
      return send(res, 200, old);
    }
    if (action === 'update' && m === 'POST') {
      const plan = getPlan(date);
      if (b.prepId !== undefined) { const it = plan.prep.find(x => x.id === b.prepId); if (it) { it.done = !!b.done; it.by = user.display_name; } }
      if (b.addPrep) plan.prep.push({ id: plan.prep.length, text: b.addPrep, for: 'all', done: false, by: user.display_name });
      if (b.note) (plan.parentNotes ||= []).push({ by: user.display_name, text: b.note, at: new Date().toISOString() });
      if (b.mealEdit) { const ml = plan.meals.find(x => x.slot === b.mealEdit.slot); if (ml) { ml.title = b.mealEdit.title; } }
      savePlan(date, plan, 1);
      if (b.note) push.notifyOthers(user.id, { title: `Note for ${date}`, body: `${user.display_name}: ${b.note}`, url: '/#plan' });
      log(user, 'plan', b.note ? `left a note on ${date}'s plan` : `updated ${date}'s plan`);
      return send(res, 200, plan);
    }
  }

  if (p === '/api/insights') return send(res, 200, insights(today()));
  if (p === '/api/activity') return send(res, 200, db.prepare('SELECT a.*, u.display_name AS by FROM activity a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 30').all());
  if (p === '/api/tips') return send(res, 200, TIPS);

  // Push
  if (p === '/api/push/subscribe' && m === 'POST') {
    const sub = await readBody(req);
    if (!sub.endpoint) return send(res, 400, { error: 'bad subscription' });
    db.prepare('INSERT INTO push_subs(endpoint,user_id,data) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, data=excluded.data').run(sub.endpoint, user.id, JSON.stringify(sub));
    return send(res, 200, { ok: true });
  }
  if (p === '/api/push/unsubscribe' && m === 'POST') { const sub = await readBody(req); db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(sub.endpoint || ''); return send(res, 200, { ok: true }); }
  if (p === '/api/push/test' && m === 'POST') { const n = await push.notifyUser(user.id, { title: 'Notifications are on', body: 'You\'ll get tomorrow\'s plan each evening.', url: '/#plan' }); return send(res, 200, { sent: n }); }

  // Export
  if (p === '/api/export.json') {
    const data = {};
    for (const t of ['settings', 'custom_foods', 'food_overrides', 'meals', 'meal_items', 'reactions', 'skin', 'plans']) data[t] = db.prepare(`SELECT * FROM ${t}`).all();
    return send(res, 200, JSON.stringify(data, null, 2), { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="weaning-backup-${today()}.json"` });
  }
  if (p === '/api/export.csv') {
    const rows = db.prepare(`SELECT m.date, m.time, m.slot, mi.food_id, mi.amount, mi.liking, m.notes, m.milk_ml, u.display_name by_name FROM meals m LEFT JOIN meal_items mi ON mi.meal_id=m.id LEFT JOIN users u ON u.id=m.user_id ORDER BY m.date, m.time`).all();
    const names = Object.fromEntries(allFoods().map(x => [x.id, x.name]));
    const out = ['date,time,meal,food,amount,liking,milk_ml,notes,logged_by', ...rows.map(r => [r.date, r.time, r.slot, names[r.food_id] || r.food_id, ['refused', 'taste', 'some', 'most/all'][r.amount] ?? '', ['dislike', 'neutral', 'like', 'love'][(r.liking ?? 0) + 1] ?? '', r.milk_ml, r.notes, r.by_name].map(csvEscape).join(','))].join('\n');
    return send(res, 200, out, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="weaning-log-${today()}.csv"` });
  }

  send(res, 404, { error: 'Not found' });
}

// ---------- nightly plan ----------
function nightly() {
  try {
    const s = getSettings();
    if (nowTime() < s.plan_time) return;
    const tomorrow = addDays(today(), 1);
    const row = db.prepare('SELECT * FROM plans WHERE date=?').get(tomorrow);
    if (row && row.notified) return;
    let plan;
    if (row && row.edited) plan = JSON.parse(row.data);
    else { plan = mergeKeep(row ? JSON.parse(row.data) : null, generatePlan(tomorrow)); }
    savePlan(tomorrow, plan, row ? row.edited : 0);
    db.prepare('UPDATE plans SET notified=1 WHERE date=?').run(tomorrow);
    const first = plan.meals[0];
    const nf = plan.newFoods.length ? ` New food: ${plan.newFoods.map(x => x.name).join(', ')}.` : '';
    push.notifyAll({ title: `Tomorrow's plan is ready`, body: `${first ? first.title + '.' : ''}${nf} ${plan.prep.filter(x => !x.done).length} prep items for tonight.`, url: '/#plan' });
    log(null, 'plan', `tomorrow's plan (${tomorrow}) was generated`);
    console.log(`[nightly] generated plan for ${tomorrow}`);
  } catch (e) { console.error('[nightly]', e); }
}
setInterval(nightly, 60e3);
setTimeout(nightly, 5e3);

http.createServer((req, res) => {
  handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(res, 500, { error: e.message }); });
}).listen(PORT, () => console.log(`Weaning tracker on http://0.0.0.0:${PORT} (data in ${DATA_DIR}, TZ ${Intl.DateTimeFormat().resolvedOptions().timeZone})`));
