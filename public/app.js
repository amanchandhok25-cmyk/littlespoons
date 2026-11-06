/* Little Spoons: family weaning tracker front end (no build step). */
'use strict';

const S = { boot: null, view: 'today', planDate: null, foodFilter: 'all', foodQuery: '', sheetOpen: false, rev: 0, cache: {} };
const $app = document.getElementById('app');

// ---------- utils ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(path, opts = {}) {
  const r = await fetch(path, { method: opts.method || 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin' });
  if (r.status === 401 && path !== '/api/login') { S.boot = null; renderLogin(); throw new Error('Please log in'); }
  const data = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
const localToday = () => new Date().toLocaleDateString('en-CA');
const nowTime = () => new Date().toTimeString().slice(0, 5);
const fmtDate = d => {
  const t = localToday();
  if (d === t) return 'Today';
  if (d === addDays(t, 1)) return 'Tomorrow';
  if (d === addDays(t, -1)) return 'Yesterday';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
const longDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const food = id => S.boot.foods.find(f => f.id === id) || { id, name: id, cat: 'other' };
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'milk'];
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', milk: 'Milk feed' };
const AMOUNTS = ['Refused', 'Taste', 'Some', 'Most/all'];
const FACES = [[-1, '😖', 'Dislike'], [0, '😐', 'Meh'], [1, '🙂', 'Like'], [2, '😍', 'Love']];
const CATS = { veg: 'Vegetables', starch: 'Starchy veg', fruit: 'Fruit', protein: 'Meat, fish & eggs', legume: 'Beans & lentils', grain: 'Grains', dairy: 'Dairy', nut_seed: 'Nuts & seeds', fat: 'Fats & oils', herb: 'Herbs & spices' };
const SYMPTOMS = ['Hives / welts', 'Red rash', 'Eczema flare', 'Swelling (lips/face/eyes)', 'Itching', 'Vomiting', 'Diarrhoea', 'Tummy pain / crying', 'Runny nose / sneezing', 'Coughing / wheeze', 'Unusually sleepy / floppy', 'Rash round the mouth'];
const firstName = () => S.boot.settings.baby_name || 'Baby';

const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21c-4.5 0-8-3.6-8-8 0-3.3 2.4-6 5-6 1.2 0 2 .5 3 .5s1.8-.5 3-.5c2.6 0 5 2.7 5 6 0 4.4-3.5 8-8 8z"/><path d="M12 7.5c0-2 1-4 3-4.5"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
};

// ---------- boot / login ----------
async function boot() {
  try {
    S.boot = await api('/api/bootstrap');
    S.rev = S.boot.rev;
    if (!S.planDate) S.planDate = addDays(localToday(), 1);
    renderShell();
    route();
  } catch (e) { if (S.boot === null) return; console.error(e); }
}
function renderLogin(err) {
  $app.innerHTML = `<div class="login">
    <img class="logo" src="/icons/icon-192.png" alt="">
    <h1>Little Spoons</h1><p class="muted" style="text-align:center;margin-top:0">Our weaning tracker</p>
    <form id="loginForm" class="card">
      <label class="field"><span>Name</span><input type="text" name="username" autocomplete="username" autocapitalize="none" required></label>
      <label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>
      ${err ? `<div class="banner danger">${esc(err)}</div>` : ''}
      <button class="btn block" type="submit">Log in</button>
    </form></div>`;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { await api('/api/login', { method: 'POST', body: { username: fd.get('username'), password: fd.get('password') } }); S.boot = undefined; boot(); }
    catch (er) { renderLogin(er.message); }
  };
}

function renderShell() {
  $app.innerHTML = `
  <header class="top">
    <h1 id="hdTitle"></h1>
    <button class="iconbtn" data-go="progress" aria-label="Progress">${ICON.chart}</button>
    <button class="iconbtn" data-go="settings" aria-label="Settings">${ICON.gear}</button>
  </header>
  <main id="view"></main>
  <nav class="bottom">
    <button data-go="today">${ICON.today}<span>Today</span></button>
    <button data-go="plan">${ICON.plan}<span>Tomorrow</span></button>
    <button class="plus" data-act="log" aria-label="Log food">${ICON.plus}</button>
    <button data-go="foods">${ICON.foods}<span>Foods</span></button>
    <button data-go="health">${ICON.health}<span>Health</span></button>
  </nav>`;
}
$app.addEventListener('click', onClick);
function onClick(e) {
  const go = e.target.closest('[data-go]');
  if (go) { location.hash = go.dataset.go; return; }
  const act = e.target.closest('[data-act]');
  if (act && act.dataset.act === 'log') openLogSheet();
}
window.addEventListener('hashchange', () => route());
function route() {
  if (!S.boot) return;
  const v = (location.hash.slice(1) || 'today').split('/')[0];
  S.view = ['today', 'plan', 'foods', 'health', 'progress', 'settings', 'log'].includes(v) ? v : 'today';
  if (S.view === 'log') { location.hash = 'today'; openLogSheet(); return; }
  document.querySelectorAll('nav.bottom [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === S.view));
  const title = { today: `${esc(firstName())}<span class="sub">${esc(S.boot.age.text)} old</span>`, plan: 'Plan & prep', foods: 'Foods', health: 'Reactions & skin', progress: 'Progress', settings: 'Settings' }[S.view];
  document.getElementById('hdTitle').innerHTML = title;
  const fn = { today: viewToday, plan: viewPlan, foods: viewFoods, health: viewHealth, progress: viewProgress, settings: viewSettings }[S.view];
  fn().catch(err => { document.getElementById('view').innerHTML = `<div class="banner danger">${esc(err.message)}</div>`; });
  window.scrollTo(0, 0);
}
async function refresh() { S.boot = await api('/api/bootstrap'); S.rev = S.boot.rev; route(); }
const V = () => document.getElementById('view');

// ---------- shared pieces ----------
function foodTags(f, opts = {}) {
  let t = '';
  if (f.isNew || opts.isNew) t += ' <span class="tag new">first try</span>';
  if (f.allergen) t += ` <span class="tag allergen">${esc(allergenLabel(f.allergen))}</span>`;
  if (f.maintain) t += ' <span class="tag maintain">keep it up</span>';
  if (f.iron && opts.iron !== false) t += ' <span class="tag iron">iron</span>';
  if (f.disliked) t += ' <span class="tag watch">re-offer</span>';
  return t;
}
const allergenLabel = g => (S.boot.allergens.find(a => a.group === g) || { label: g }).label;

function mealCard(m, date, logged) {
  return `<div class="meal ${logged ? 'logged' : ''}">
    <div class="when">${esc(SLOT_LABEL[m.slot])}${m.time ? ' · ' + esc(m.time) : ''}${m.optional ? ' · optional' : ''}</div>
    <div class="title">${esc(m.title)}</div>
    ${m.how ? `<div class="small muted">${esc(m.how)}</div>` : ''}
    <ul>${m.foods.map(f => `<li><b>${esc(f.name)}</b>${foodTags(f)}<br><span class="small muted">${esc(f.serve)}</span>${f.choke ? `<br><span class="small" style="color:var(--red)">⚠ ${esc(f.choke)}</span>` : ''}</li>`).join('')}</ul>
    ${m.note ? `<div class="banner info small" style="margin:8px 0 0">${esc(m.note)}</div>` : ''}
    <div class="actions">
      <button class="btn small" data-logplan="${esc(m.slot)}" data-date="${date}">${logged ? 'Log again' : 'Log this meal'}</button>
      <button class="btn small secondary" data-swap="${esc(m.slot)}" data-date="${date}">Swap</button>
    </div></div>`;
}
function bindMealActions(root, plan, after) {
  root.querySelectorAll('[data-logplan]').forEach(b => b.onclick = () => {
    const m = plan.meals.find(x => x.slot === b.dataset.logplan);
    openLogSheet({ date: b.dataset.date, slot: m.slot, items: m.foods.map(f => ({ food_id: f.id, amount: 2, liking: 1 })) });
  });
  root.querySelectorAll('[data-swap]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    await api(`/api/plans/${b.dataset.date}/swap`, { method: 'POST', body: { slot: b.dataset.swap } });
    toast('Swapped'); after();
  });
}

// ---------- Today ----------
async function viewToday() {
  const d = localToday();
  const [plan, meals, activity] = await Promise.all([api(`/api/plans/${d}`), api(`/api/meals?from=${d}&to=${d}`), api('/api/activity')]);
  const loggedSlots = new Set(meals.map(m => m.slot));
  const s = S.boot.settings;
  const others = activity.filter(a => a.user_id && a.user_id !== S.boot.me.id).slice(0, 5);
  const milk = meals.filter(m => m.slot === 'milk');
  const totalMl = milk.reduce((n, m) => n + (m.milk_ml || 0), 0);
  V().innerHTML = `
    ${plan.newFoods.length ? `<div class="banner info">🥄 <div>New today: <b>${plan.newFoods.map(f => esc(f.name)).join(', ')}</b>${plan.newFoods.some(f => f.allergen) ? '. It\'s an allergen, so offer it in the morning and watch him for 2 hours.' : ''}</div></div>` : ''}
    ${plan.maintain.length ? `<div class="banner ok">🔁 <div>Keep allergens going: ${plan.maintain.map(a => `${esc(a.label)} (${a.daysSince} days ago)`).join(', ')}. Included in today's meals.</div></div>` : ''}
    <div class="card"><h2>Today's meals</h2>
      ${plan.meals.map(m => mealCard(m, d, loggedSlots.has(m.slot))).join('')}
      <div class="row small muted" style="margin-top:6px">💧 ${esc(plan.water)}</div>
    </div>
    <div class="card"><div class="row"><h2 style="margin:0">Logged today</h2><span class="spacer"></span>
      <button class="btn small secondary" id="quickMilk">+ Milk</button></div>
      ${meals.length ? meals.map(entryHtml).join('') : '<p class="muted small">Nothing logged yet. Tap + to log a meal.</p>'}
      ${totalMl ? `<p class="small muted">Milk logged today: ${totalMl}ml</p>` : ''}
    </div>
    ${others.length ? `<div class="card"><h2>From ${esc(others[0].by)}</h2>${others.map(a => `<div class="small" style="padding:4px 0">${esc(a.by)} ${esc(a.text)} <span class="muted">· ${timeAgo(a.created_at)}</span></div>`).join('')}</div>` : ''}
    <div class="card"><h2>💡 Tip</h2><p class="small" style="margin:0">${esc(plan.tip)}</p></div>
    <div class="row"><button class="btn secondary block" data-go="plan">See tomorrow's plan →</button></div>
    <p class="disclaimer">Suggestions follow general NHS-style weaning guidance and are not medical advice. Speak to your GP or health visitor about anything specific to ${esc(firstName())}.</p>`;
  bindMealActions(V(), plan, viewToday);
  bindEntries(V(), viewToday);
  document.getElementById('quickMilk').onclick = () => openLogSheet({ slot: 'milk' });
}
function timeAgo(ts) {
  const t = new Date(ts.replace(' ', 'T') + 'Z'); const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`; return `${Math.round(m / 1440)}d ago`;
}
function entryHtml(m) {
  const items = m.items.map(it => { const f = food(it.food_id); const face = FACES.find(x => x[0] === it.liking); return `${esc(f.name)} ${face ? face[1] : ''}<span class="muted small"> ${AMOUNTS[it.amount] || ''}</span>`; }).join(', ');
  return `<div class="entry" data-entry="${m.id}"><div class="head"><b>${esc(SLOT_LABEL[m.slot] || m.slot)}</b><span class="muted small">${esc(m.time || '')} · ${esc(m.by || '')}</span><span class="spacer"></span><button class="btn ghost small" data-edit="${m.id}">Edit</button></div>
    <div class="small">${m.slot === 'milk' ? `${m.milk_ml ? m.milk_ml + 'ml ' : ''}${esc(m.milk_type || '')}` : items}</div>${m.notes ? `<div class="small muted">${esc(m.notes)}</div>` : ''}</div>`;
}
function bindEntries(root, after, meals) {
  root.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const id = +b.dataset.edit;
    const list = await api(`/api/meals?from=2000-01-01&to=2100-01-01`);
    const m = list.find(x => x.id === id);
    if (m) openLogSheet({ ...m, items: m.items.map(i => ({ food_id: i.food_id, amount: i.amount, liking: i.liking })) }, after);
  });
}

// ---------- Plan ----------
async function viewPlan() {
  const d = S.planDate;
  const plan = await api(`/api/plans/${d}`);
  const isTomorrow = d === addDays(localToday(), 1);
  const untried = S.boot.foods.filter(f => f.tries === 0 && f.status !== 'avoid').sort((a, b) => a.name.localeCompare(b.name));
  V().innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <button class="iconbtn" id="prevDay">${ICON.left}</button>
      <div style="flex:1;text-align:center"><b>${esc(fmtDate(d))}</b><div class="small muted">${esc(longDate(d))} · ${esc(plan.age)}</div></div>
      <button class="iconbtn" id="nextDay">${ICON.right}</button>
    </div>
    ${isTomorrow ? `<p class="small muted" style="margin-top:0">This plan is refreshed automatically at ${esc(S.boot.settings.plan_time)} each evening, using everything logged today. Ticks and notes are shared between you both.</p>` : ''}
    ${plan.notes.map(n => `<div class="banner warn small">${esc(n)}</div>`).join('')}
    ${plan.watchFor.map(n => `<div class="banner danger small">👀 <div>${esc(n)}</div></div>`).join('')}
    <div class="card"><h2>Run-through</h2>
      ${plan.milk ? `<div class="small muted" style="margin-bottom:6px">🍼 ${esc(plan.milk)}</div>` : ''}
      ${plan.meals.map(m => mealCard(m, d, false)).join('')}
    </div>
    <div class="card"><h2>Prep ${isTomorrow ? 'tonight' : 'the night before'}</h2>
      <div id="prepList">${plan.prep.map(p => `<label class="check ${p.done ? 'done' : ''}"><input type="checkbox" data-prep="${p.id}" ${p.done ? 'checked' : ''}><span>${p.safety ? '⚠ ' : ''}${esc(p.text)}${p.done && p.by ? ` <span class="muted small">· ${esc(p.by)}</span>` : ''}</span></label>`).join('')}</div>
      <form id="addPrep" class="row" style="margin-top:8px"><input type="text" placeholder="Add a prep task" name="t"><button class="btn small">Add</button></form>
    </div>
    <div class="card"><h2>Shopping check</h2><div class="chips">${plan.shopping.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>
    <div class="card"><h2>Notes for each other</h2>
      ${(plan.parentNotes || []).map(n => `<div class="entry"><b class="small">${esc(n.by)}</b> <span class="small">${esc(n.text)}</span></div>`).join('') || '<p class="small muted">e.g. "I\'ll do breakfast, can you defrost the bolognese?"</p>'}
      <form id="addNote" class="row" style="margin-top:8px"><input type="text" placeholder="Leave a note" name="t"><button class="btn small">Send</button></form>
    </div>
    <div class="card"><h2>Change the plan</h2>
      <label class="field"><span>Choose the new food</span><select id="pickNew"><option value="">Let the planner choose</option>${untried.map(f => `<option value="${f.id}" ${plan.newFoods.some(n => n.id === f.id) ? 'selected' : ''}>${esc(f.name)}${f.allergen ? ' (allergen)' : ''}</option>`).join('')}</select></label>
      <button class="btn secondary block" id="reshuffle">Reshuffle all meals</button>
    </div>
    <div class="card small"><b>Tip:</b> ${esc(plan.tip)}</div>
    <p class="disclaimer">Not medical advice. Follow your GP or health visitor's guidance for ${esc(firstName())}.</p>`;
  document.getElementById('prevDay').onclick = () => { S.planDate = addDays(d, -1); viewPlan(); };
  document.getElementById('nextDay').onclick = () => { S.planDate = addDays(d, 1); viewPlan(); };
  V().querySelectorAll('[data-prep]').forEach(c => c.onchange = async () => { await api(`/api/plans/${d}/update`, { method: 'POST', body: { prepId: +c.dataset.prep, done: c.checked } }); c.closest('.check').classList.toggle('done', c.checked); });
  document.getElementById('addPrep').onsubmit = async e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; await api(`/api/plans/${d}/update`, { method: 'POST', body: { addPrep: t } }); viewPlan(); };
  document.getElementById('addNote').onsubmit = async e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; await api(`/api/plans/${d}/update`, { method: 'POST', body: { note: t } }); viewPlan(); };
  document.getElementById('reshuffle').onclick = async () => { await api(`/api/plans/${d}/regenerate`, { method: 'POST', body: { shuffle: true } }); toast('New plan made'); viewPlan(); };
  document.getElementById('pickNew').onchange = async e => { await api(`/api/plans/${d}/regenerate`, { method: 'POST', body: { newFood: e.target.value || undefined } }); toast('Plan updated'); viewPlan(); };
  bindMealActions(V(), plan, viewPlan);
}

// ---------- Log sheet ----------
function sheet(html, onClose) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(bg); S.sheetOpen = true;
  const close = () => { bg.remove(); S.sheetOpen = false; onClose && onClose(); };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  return { el: bg.querySelector('.sheet'), close };
}
function openLogSheet(pre = {}, after) {
  const st = { id: pre.id || null, date: pre.date || localToday(), time: pre.time || nowTime(), slot: pre.slot || guessSlot(), items: (pre.items || []).map(i => ({ ...i })), notes: pre.notes || '', milk_ml: pre.milk_ml || '', milk_type: pre.milk_type || 'Breast' };
  const { el, close } = sheet('<div id="logBody"></div>');
  const body = el.querySelector('#logBody');
  function draw() {
    body.innerHTML = `<h2>${st.id ? 'Edit entry' : 'Log food'}<span class="spacer"></span><button class="iconbtn" data-close>${ICON.close}</button></h2>
      <div class="grid2"><label class="field"><span>Date</span><input type="date" id="lDate" value="${st.date}"></label><label class="field"><span>Time</span><input type="time" id="lTime" value="${st.time}"></label></div>
      <div class="chips" style="margin-bottom:12px">${SLOTS.map(s => `<button class="chip ${st.slot === s ? 'on' : ''}" data-slot="${s}">${SLOT_LABEL[s]}</button>`).join('')}</div>
      ${st.slot === 'milk' ? `
        <div class="grid2"><label class="field"><span>Amount (ml, optional)</span><input type="number" inputmode="numeric" id="lMl" value="${st.milk_ml}"></label>
        <label class="field"><span>Type</span><select id="lMilkType">${['Breast', 'Formula', 'Expressed'].map(t => `<option ${st.milk_type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>` : `
        <label class="field"><span>Add foods</span><input type="search" id="lSearch" placeholder="Search e.g. banana" autocomplete="off"></label>
        <div id="lSuggest"></div>
        <div id="lItems">${st.items.map((it, i) => itemHtml(it, i)).join('') || '<p class="small muted">Search to add what he ate, or log from a planned meal on the Today screen.</p>'}</div>`}
      <label class="field"><span>Notes</span><textarea id="lNotes" placeholder="How did it go? Texture, mood, anything to remember">${esc(st.notes)}</textarea></label>
      <button class="btn block" id="lSave">${st.id ? 'Save changes' : 'Save'}</button>
      <div class="row" style="margin-top:10px">
        ${st.id ? '<button class="btn danger small" id="lDel">Delete</button>' : ''}
        <span class="spacer"></span><button class="btn ghost small" id="lReact">Had a reaction? Log it →</button></div>`;
    body.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { capture(); st.slot = b.dataset.slot; draw(); });
    const search = body.querySelector('#lSearch');
    if (search) {
      search.oninput = () => {
        const q = search.value.trim().toLowerCase();
        const box = body.querySelector('#lSuggest');
        if (!q) { box.innerHTML = ''; return; }
        const res = S.boot.foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8);
        box.innerHTML = `<div class="suggest">${res.map(f => `<div data-add="${f.id}"><span class="dot ${f.status}"></span>${esc(f.name)} ${f.tries === 0 ? '<span class="tag new">new</span>' : ''}${f.status === 'avoid' ? '<span class="tag avoid">avoid</span>' : ''}</div>`).join('')}
          <div data-addcustom="${esc(search.value.trim())}">➕ Add "${esc(search.value.trim())}" as a new food</div></div>`;
        box.querySelectorAll('[data-add]').forEach(x => x.onclick = () => { capture(); if (!st.items.some(i => i.food_id === x.dataset.add)) st.items.push({ food_id: x.dataset.add, amount: 2, liking: 1 }); draw(); body.querySelector('#lSearch').focus(); });
        box.querySelector('[data-addcustom]').onclick = async () => {
          capture();
          const r = await api('/api/foods', { method: 'POST', body: { name: search.value.trim(), cat: 'veg' } });
          S.boot = await api('/api/bootstrap');
          st.items.push({ food_id: r.id, amount: 2, liking: 1 }); draw();
        };
      };
    }
    body.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.amt.split(':'); st.items[i].amount = +v; capture(); draw(); });
    body.querySelectorAll('[data-like]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.like.split(':'); st.items[i].liking = +v; capture(); draw(); });
    body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { capture(); st.items.splice(+b.dataset.rm, 1); draw(); });
    body.querySelector('#lSave').onclick = async () => {
      capture();
      if (st.slot !== 'milk' && !st.items.length) { toast('Add at least one food'); return; }
      const payload = { date: st.date, time: st.time, slot: st.slot, notes: st.notes, items: st.slot === 'milk' ? [] : st.items, milk_ml: st.slot === 'milk' && st.milk_ml ? +st.milk_ml : null, milk_type: st.slot === 'milk' ? st.milk_type : null };
      await api(st.id ? `/api/meals/${st.id}` : '/api/meals', { method: st.id ? 'PUT' : 'POST', body: payload });
      close(); toast('Saved'); await refresh(); after && after !== route && after();
    };
    const del = body.querySelector('#lDel');
    if (del) del.onclick = async () => { if (!confirm('Delete this entry?')) return; await api(`/api/meals/${st.id}`, { method: 'DELETE' }); close(); toast('Deleted'); refresh(); };
    body.querySelector('#lReact').onclick = () => { capture(); close(); openReactionSheet({ date: st.date, preSuspects: st.items.map(i => i.food_id) }); };
  }
  function capture() {
    const g = id => body.querySelector(id);
    if (g('#lDate')) st.date = g('#lDate').value;
    if (g('#lTime')) st.time = g('#lTime').value;
    if (g('#lNotes')) st.notes = g('#lNotes').value;
    if (g('#lMl')) st.milk_ml = g('#lMl').value;
    if (g('#lMilkType')) st.milk_type = g('#lMilkType').value;
  }
  function itemHtml(it, i) {
    const f = food(it.food_id);
    return `<div class="fooditem"><div class="top"><span class="dot ${f.status}"></span>${esc(f.name)}${f.tries === 0 ? ' <span class="tag new">first try</span>' : ''}${f.allergen ? ` <span class="tag allergen">${esc(allergenLabel(f.allergen))}</span>` : ''}<span class="spacer"></span><button class="iconbtn" data-rm="${i}" aria-label="Remove" style="width:32px;height:32px">${ICON.close}</button></div>
      ${f.status === 'avoid' ? '<div class="banner danger small" style="margin:6px 0 0">Marked to avoid after a reaction.</div>' : ''}
      <div class="seg">${AMOUNTS.map((a, v) => `<button class="${it.amount === v ? 'on' : ''}" data-amt="${i}:${v}">${a}</button>`).join('')}</div>
      <div class="seg faces">${FACES.map(([v, e, l]) => `<button class="${it.liking === v ? 'on' : ''}" data-like="${i}:${v}" title="${l}" aria-label="${l}">${e}</button>`).join('')}</div></div>`;
  }
  draw();
}
function guessSlot() {
  const t = nowTime(); const times = S.boot.settings.times;
  if (t < '10:00') return 'breakfast'; if (t < '14:00') return 'lunch'; if (t < '15:30') return 'snack'; return 'dinner';
}

// ---------- Reactions ----------
async function openReactionSheet(pre = {}) {
  const st = { id: pre.id || null, date: pre.date || localToday(), time: pre.time || nowTime(), severity: pre.severity || 'mild', symptoms: new Set(pre.symptoms || []), suspects: new Set(pre.suspects || pre.preSuspects || []), onset: pre.onset || '', duration: pre.duration || '', action: pre.action || '', notes: pre.notes || '', photo: pre.photo || null };
  const recent = await api(`/api/suspects?date=${st.date}`);
  const { el, close } = sheet('<div id="rBody"></div>');
  const body = el.querySelector('#rBody');
  function draw() {
    body.innerHTML = `<h2>${st.id ? 'Edit reaction' : 'Log a reaction'}<span class="spacer"></span><button class="iconbtn" data-close>${ICON.close}</button></h2>
      <div class="banner danger small">Call 999 if he has trouble breathing, swelling of the tongue or throat, is pale and floppy, or collapses. For milder symptoms, speak to your GP or call 111.</div>
      <div class="grid2"><label class="field"><span>Date</span><input type="date" id="rDate" value="${st.date}"></label><label class="field"><span>Time noticed</span><input type="time" id="rTime" value="${st.time}"></label></div>
      <label class="field"><span>Severity</span></label>
      <div class="seg" style="margin:-6px 0 12px">${['mild', 'moderate', 'severe'].map(s => `<button class="${st.severity === s ? 'on' : ''}" data-sev="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
      <label class="field"><span>Symptoms</span></label><div class="chips" style="margin:-6px 0 12px">${SYMPTOMS.map(s => `<button class="chip ${st.symptoms.has(s) ? 'on' : ''}" data-sym="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <label class="field"><span>Suspected foods (eaten in the last 48 hours)</span></label>
      <div class="chips" style="margin:-6px 0 12px">${recent.map(f => `<button class="chip ${st.suspects.has(f.id) ? 'on' : ''}" data-sus="${f.id}">${esc(f.name)}${f.firstTry ? ' • new' : ''}</button>`).join('') || '<span class="small muted">No foods logged in the last 48 hours.</span>'}</div>
      <div class="grid2"><label class="field"><span>Started after eating</span><select id="rOnset">${['', 'Within minutes', 'Within 2 hours', '2-6 hours', '6-24 hours', '1-2 days'].map(o => `<option ${st.onset === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      <label class="field"><span>Lasted</span><input type="text" id="rDur" value="${esc(st.duration)}" placeholder="e.g. 2 hours"></label></div>
      <label class="field"><span>What we did</span><input type="text" id="rAction" value="${esc(st.action)}" placeholder="e.g. called 111, gave antihistamine as advised"></label>
      <label class="field"><span>Notes</span><textarea id="rNotes">${esc(st.notes)}</textarea></label>
      <label class="field"><span>Photo (useful to show the GP)</span><input type="file" accept="image/*" id="rPhoto"></label>
      ${st.photo ? `<img class="photo-thumb" src="${st.photo}" alt="Reaction photo">` : ''}
      <p class="small muted">Suspected foods with moderate or severe reactions are marked "avoid" and kept out of plans. Mild ones are marked "watch". You can change this on the food's page.</p>
      <button class="btn block" id="rSave">Save</button>
      ${st.id ? '<button class="btn danger block" id="rDel" style="margin-top:8px">Delete</button>' : ''}`;
    body.querySelectorAll('[data-sev]').forEach(b => b.onclick = () => { cap(); st.severity = b.dataset.sev; draw(); });
    body.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => { cap(); st.symptoms.has(b.dataset.sym) ? st.symptoms.delete(b.dataset.sym) : st.symptoms.add(b.dataset.sym); draw(); });
    body.querySelectorAll('[data-sus]').forEach(b => b.onclick = () => { cap(); st.suspects.has(b.dataset.sus) ? st.suspects.delete(b.dataset.sus) : st.suspects.add(b.dataset.sus); draw(); });
    body.querySelector('#rPhoto').onchange = async e => { cap(); const f = e.target.files[0]; if (f) { st.photo = await shrinkImage(f); draw(); } };
    body.querySelector('#rSave').onclick = async () => {
      cap();
      await api(st.id ? `/api/reactions/${st.id}` : '/api/reactions', { method: st.id ? 'PUT' : 'POST', body: { ...st, symptoms: [...st.symptoms], suspects: [...st.suspects] } });
      close(); toast('Reaction saved'); refresh();
    };
    const del = body.querySelector('#rDel');
    if (del) del.onclick = async () => { if (!confirm('Delete this reaction?')) return; await api(`/api/reactions/${st.id}`, { method: 'DELETE' }); close(); refresh(); };
  }
  function cap() {
    const g = id => body.querySelector(id);
    st.date = g('#rDate').value; st.time = g('#rTime').value; st.onset = g('#rOnset').value; st.duration = g('#rDur').value; st.action = g('#rAction').value; st.notes = g('#rNotes').value;
  }
  draw();
}
function shrinkImage(file) {
  return new Promise(res => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1000; const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    img.src = url;
  });
}

// ---------- Health ----------
async function viewHealth() {
  const [reactions, skin] = await Promise.all([api('/api/reactions'), api('/api/skin')]);
  const al = S.boot.allergens;
  const s = S.boot.settings;
  V().innerHTML = `
    <div class="grid2" style="margin-bottom:12px"><button class="btn" id="newReaction">Log a reaction</button><button class="btn secondary" id="newSkin">Skin check</button></div>
    <div class="card"><h2>Allergens</h2>
      ${s.eczema && !s.gp_nuts_ok ? '<div class="banner warn small">With eczema, check with the GP before starting peanut and tree nuts. Once they\'re happy, turn on "GP has okayed nuts" in Settings and the planner will introduce them one at a time, a few days apart.</div>' : ''}
      <table class="simple"><tr><th>Allergen</th><th>Status</th><th>Last had</th></tr>
      ${al.map(a => `<tr><td>${esc(a.label)}</td><td><span class="tag ${a.status === 'tolerated' ? 'safe' : a.status === 'reaction' ? 'avoid' : a.status === 'watch' ? 'watch' : ''}">${esc(a.status)}</span></td><td class="small">${a.last ? `${esc(fmtDate(a.last))}${a.daysSince >= s.maintain_days ? ' <span class="tag watch">due</span>' : ''}` : '<span class="muted">-</span>'}</td></tr>`).join('')}
      </table>
      <p class="small muted">Once tolerated, keep each allergen in his diet about twice a week. The planner adds any that are due.</p>
    </div>
    <div class="card"><h2>Reactions</h2>${reactions.length ? reactions.map(r => `<div class="entry" data-r="${r.id}" style="cursor:pointer"><div class="head"><span class="tag ${r.severity === 'mild' ? 'watch' : 'avoid'}">${esc(r.severity)}</span><b>${esc(fmtDate(r.date))}</b><span class="muted small">${esc(r.time || '')} · ${esc(r.by || '')}</span></div>
      <div class="small">${esc(r.symptoms.join(', '))}</div><div class="small muted">Suspected: ${esc(r.suspects.map(id => food(id).name).join(', ') || 'unknown')}</div></div>`).join('') : '<p class="small muted">No reactions logged. 🎉</p>'}</div>
    <div class="card"><h2>Skin diary</h2>
      <p class="small muted" style="margin-top:0">A quick daily score (0 = clear, 10 = very bad) helps spot whether flares follow new foods. Progress shows any links.</p>
      ${skin.slice(0, 14).map(k => `<div class="entry"><div class="head"><b>${esc(fmtDate(k.date))}</b><span class="tag ${k.score >= 6 ? 'avoid' : k.score >= 3 ? 'watch' : 'safe'}">${k.score}/10</span><span class="muted small">${esc(k.by || '')}</span><span class="spacer"></span><button class="btn ghost small" data-delskin="${k.id}">Delete</button></div>${k.areas || k.notes ? `<div class="small muted">${esc([k.areas, k.notes].filter(Boolean).join(' · '))}</div>` : ''}</div>`).join('') || '<p class="small muted">No skin checks yet.</p>'}
    </div>
    <div class="card"><h2>For the GP or health visitor</h2><p class="small" style="margin-top:0">A printable summary of allergens, reactions, skin scores and foods tried.</p><a class="btn secondary" href="/report" target="_blank">Open GP summary</a></div>
    <p class="disclaimer">This tracker doesn't diagnose allergies. Always follow medical advice.</p>`;
  document.getElementById('newReaction').onclick = () => openReactionSheet();
  document.getElementById('newSkin').onclick = () => openSkinSheet();
  V().querySelectorAll('[data-r]').forEach(e => e.onclick = () => openReactionSheet(reactions.find(r => r.id === +e.dataset.r)));
  V().querySelectorAll('[data-delskin]').forEach(b => b.onclick = async () => { await api(`/api/skin/${b.dataset.delskin}`, { method: 'DELETE' }); viewHealth(); });
}
function openSkinSheet() {
  const { el, close } = sheet(`<h2>Skin check<span class="spacer"></span><button class="iconbtn" data-close>${ICON.close}</button></h2>
    <label class="field"><span>Date</span><input type="date" id="kDate" value="${localToday()}"></label>
    <div class="score" id="kVal">2</div><input type="range" min="0" max="10" value="2" id="kScore">
    <div class="row small muted"><span>Clear</span><span class="spacer"></span><span>Very bad</span></div>
    <label class="field" style="margin-top:12px"><span>Areas</span><div class="chips" id="kAreas">${['Face', 'Cheeks', 'Neck', 'Arms', 'Elbow creases', 'Legs', 'Knee creases', 'Tummy', 'Back', 'Nappy area'].map(a => `<button class="chip" data-a="${a}">${a}</button>`).join('')}</div></label>
    <label class="field"><span>Notes</span><textarea id="kNotes" placeholder="e.g. new cream, hot weather, teething"></textarea></label>
    <button class="btn block" id="kSave">Save</button>`);
  const r = el.querySelector('#kScore'); r.oninput = () => el.querySelector('#kVal').textContent = r.value;
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.classList.toggle('on'));
  el.querySelector('#kSave').onclick = async () => {
    await api('/api/skin', { method: 'POST', body: { date: el.querySelector('#kDate').value, score: +r.value, areas: [...el.querySelectorAll('[data-a].on')].map(b => b.dataset.a).join(', '), notes: el.querySelector('#kNotes').value } });
    close(); toast('Saved'); if (S.view === 'health') viewHealth();
  };
}

// ---------- Foods ----------
async function viewFoods() {
  const filters = [['all', 'All'], ['tried', 'Tried'], ['untried', 'Not yet'], ['allergens', 'Allergens'], ['loved', 'Loved'], ['reoffer', 'Re-offer'], ['avoid', 'Avoid / watch']];
  const q = S.foodQuery.toLowerCase();
  let list = S.boot.foods.filter(f => !q || f.name.toLowerCase().includes(q));
  list = list.filter(f => ({ all: true, tried: f.tries > 0, untried: f.tries === 0, allergens: !!f.allergen, loved: f.liking >= 1.5, reoffer: f.disliked, avoid: f.status === 'avoid' || f.status === 'watch' }[S.foodFilter]));
  const groups = {};
  for (const f of list) (groups[f.cat] ||= []).push(f);
  const tried = S.boot.foods.filter(f => f.tries > 0).length;
  V().innerHTML = `
    <div class="card row"><div class="stat" style="flex:1"><b>${tried}</b><span class="small muted">foods tried</span></div><div class="stat" style="flex:1"><b>${Math.max(0, 100 - tried)}</b><span class="small muted">to go for 100 before 1</span></div></div>
    <input type="search" id="fSearch" placeholder="Search foods" value="${esc(S.foodQuery)}" style="margin-bottom:10px">
    <div class="chips scroll" style="margin-bottom:12px">${filters.map(([k, l]) => `<button class="chip ${S.foodFilter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    ${Object.keys(CATS).filter(c => groups[c]).map(c => `<div class="section-title">${CATS[c]}</div><div class="card" style="padding:4px 16px">${groups[c].map(f => `
      <div class="list-item" data-food="${f.id}"><span class="dot ${f.tries ? f.status : ''}"></span><span class="name">${esc(f.name)}${f.allergen ? ' <span class="tag allergen">allergen</span>' : ''}</span>
      <span class="meta">${f.tries ? `${f.tries}× ${f.liking >= 1.5 ? '😍' : f.liking >= 0.5 ? '🙂' : f.liking < 0 ? '😖' : '😐'}` : 'not yet'}</span></div>`).join('')}</div>`).join('') || '<p class="muted">No foods match.</p>'}
    <button class="btn secondary block" id="addFood" style="margin-top:12px">Add a food that isn't listed</button>`;
  const fs = document.getElementById('fSearch');
  fs.oninput = () => { S.foodQuery = fs.value; const pos = fs.selectionStart; viewFoods().then(() => { const n = document.getElementById('fSearch'); n.focus(); n.setSelectionRange(pos, pos); }); };
  V().querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.foodFilter = b.dataset.f; viewFoods(); });
  V().querySelectorAll('[data-food]').forEach(b => b.onclick = () => openFoodSheet(b.dataset.food));
  document.getElementById('addFood').onclick = openAddFood;
}
async function openFoodSheet(id) {
  const f = food(id);
  const hist = (await api('/api/meals?from=2000-01-01&to=2100-01-01')).filter(m => m.items.some(i => i.food_id === id)).slice(0, 10);
  const tomorrow = addDays(localToday(), 1);
  const { el, close } = sheet(`<h2>${esc(f.name)}<span class="spacer"></span><button class="iconbtn" data-close>${ICON.close}</button></h2>
    <div class="row wrap" style="margin-bottom:10px">${f.tries ? `<span class="tag ${f.status}">${esc(f.status)}</span>` : '<span class="tag new">not tried yet</span>'}${f.allergen ? ` <span class="tag allergen">${esc(allergenLabel(f.allergen))} allergen</span>` : ''}${f.iron ? ' <span class="tag iron">iron-rich</span>' : ''}</div>
    ${f.serve ? `<div class="card"><b class="small">How to serve at this age</b><p class="small" style="margin:4px 0 0">${esc(f.serve)}</p>${f.choke ? `<p class="small" style="color:var(--red);margin:6px 0 0">⚠ ${esc(f.choke)}</p>` : ''}</div>` : ''}
    ${f.tries ? `<p class="small">Tried <b>${f.tries}</b> times · first ${esc(fmtDate(f.first))} · last ${esc(fmtDate(f.last))}</p>` : ''}
    ${f.disliked ? `<div class="banner info small">Not a fan yet. Babies can need 10 to 15 tries. Keep offering it alongside foods he likes, without pressure.</div>` : ''}
    ${f.reactions.length ? `<div class="banner danger small">Linked to ${f.reactions.length} reaction(s): ${f.reactions.map(r => `${esc(r.severity)} on ${esc(r.date)}`).join(', ')}</div>` : ''}
    ${hist.length ? `<h3 class="small muted">History</h3>${hist.map(m => { const it = m.items.find(i => i.food_id === id); const face = FACES.find(x => x[0] === it.liking); return `<div class="small" style="padding:3px 0">${esc(fmtDate(m.date))} · ${esc(SLOT_LABEL[m.slot])} · ${AMOUNTS[it.amount]} ${face ? face[1] : ''} <span class="muted">${esc(m.by || '')}</span></div>`; }).join('')}` : ''}
    <label class="field" style="margin-top:12px"><span>Status</span><select id="fdStatus">
      <option value="">Automatic (from logs and reactions)</option><option value="safe" ${f.status === 'safe' ? 'selected' : ''}>Safe</option><option value="watch" ${f.status === 'watch' ? 'selected' : ''}>Watch</option><option value="avoid" ${f.status === 'avoid' ? 'selected' : ''}>Avoid</option></select></label>
    <label class="field"><span>Our note</span><input type="text" id="fdNote" value="${esc(f.note || '')}" placeholder="e.g. likes it mixed with yoghurt"></label>
    <button class="btn block" id="fdSave">Save</button>
    ${f.tries === 0 && f.status !== 'avoid' ? `<button class="btn secondary block" id="fdPlan" style="margin-top:8px">Make it tomorrow's new food</button>` : ''}`);
  el.querySelector('#fdSave').onclick = async () => { await api(`/api/foods/${id}/override`, { method: 'PUT', body: { status: el.querySelector('#fdStatus').value, note: el.querySelector('#fdNote').value } }); close(); toast('Saved'); refresh(); };
  const pl = el.querySelector('#fdPlan');
  if (pl) pl.onclick = async () => { await api(`/api/plans/${tomorrow}/regenerate`, { method: 'POST', body: { newFood: id } }); close(); toast(`${f.name} is in tomorrow's plan`); S.planDate = tomorrow; location.hash = 'plan'; };
}
function openAddFood() {
  const { el, close } = sheet(`<h2>Add a food<span class="spacer"></span><button class="iconbtn" data-close>${ICON.close}</button></h2>
    <label class="field"><span>Name</span><input type="text" id="afName"></label>
    <label class="field"><span>Type</span><select id="afCat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="field"><span>Allergen group (if any)</span><select id="afAll"><option value="">None</option>${S.boot.allergens.map(a => `<option value="${a.group}">${esc(a.label)}</option>`).join('')}</select></label>
    <label class="toggle"><input type="checkbox" id="afIron"> Iron-rich</label>
    <label class="field"><span>How we serve it</span><input type="text" id="afServe"></label>
    <button class="btn block" id="afSave">Add</button>`);
  el.querySelector('#afSave').onclick = async () => {
    const name = el.querySelector('#afName').value.trim(); if (!name) return;
    await api('/api/foods', { method: 'POST', body: { name, cat: el.querySelector('#afCat').value, allergen: el.querySelector('#afAll').value || null, iron: el.querySelector('#afIron').checked, serve: el.querySelector('#afServe').value } });
    close(); toast('Added'); refresh();
  };
}

// ---------- Progress ----------
async function viewProgress() {
  const ins = await api('/api/insights');
  const pct = Math.min(1, ins.triedCount / ins.goal);
  const C = 2 * Math.PI * 50;
  const maxCat = Math.max(1, ...Object.values(ins.byCat));
  V().innerHTML = `
    <div class="card row" style="gap:16px">
      <svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="60" cy="60" r="50" fill="none" stroke="var(--brand)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" font-size="26" font-weight="700" fill="var(--ink)">${ins.triedCount}</text><text x="60" y="78" text-anchor="middle" font-size="12" fill="var(--muted)">of ${ins.goal}</text></svg>
      <div><b>100 foods before 1</b><p class="small muted" style="margin:4px 0 0">A popular goal for variety. Variety and repeated exposure matter more than hitting the number.</p></div>
    </div>
    <div class="card"><h2>Variety by food group</h2><div class="bars">${Object.entries(CATS).map(([k, l]) => `<div class="bar"><span style="width:120px">${l}</span><div class="track"><div class="fill" style="width:${((ins.byCat[k] || 0) / maxCat) * 100}%"></div></div><span style="width:20px;text-align:right">${ins.byCat[k] || 0}</span></div>`).join('')}</div></div>
    <div class="card"><h2>Last 14 days</h2>
      <div class="strip">${ins.week.map(w => `<div class="${w.foods >= 8 ? 'l3' : w.foods >= 4 ? 'l2' : w.foods ? 'l1' : ''} ${w.skin >= 6 || w.reactions ? 'flare' : ''}" title="${w.date}: ${w.foods} foods${w.skin != null ? ', skin ' + w.skin : ''}">${w.foods || ''}</div>`).join('')}</div>
      <p class="small muted">Number = different foods eaten that day. Red outline = reaction or skin score of 6 or more.</p></div>
    ${ins.flareLinks.length ? `<div class="card"><h2>Possible flare links</h2><p class="small muted" style="margin-top:0">Foods first tried 0-2 days before a bad skin day. A pattern is worth mentioning to the GP; one-offs are often coincidence.</p>${ins.flareLinks.map(l => `<div class="small">${esc(l.name)}: ${l.flares.map(fmtDate).join(', ')}</div>`).join('')}</div>` : ''}
    <div class="card"><h2>Favourites</h2><p class="small" style="margin:0">${ins.loved.map(esc).join(', ') || '<span class="muted">Mark foods 😍 when logging to see them here.</span>'}</p></div>
    <div class="card"><h2>Keep re-offering</h2><p class="small" style="margin:0">${ins.reoffer.map(r => `${esc(r.name)} (${r.tries} tries)`).join(', ') || '<span class="muted">Nothing he\'s refused repeatedly.</span>'}</p></div>
    <div class="card"><h2>Export</h2><div class="row wrap"><a class="btn secondary small" href="/api/export.csv">Food log (CSV)</a><a class="btn secondary small" href="/api/export.json">Full backup (JSON)</a><a class="btn secondary small" href="/report" target="_blank">GP summary</a></div></div>`;
}

// ---------- Settings ----------
async function viewSettings() {
  const s = S.boot.settings;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && S.boot.pushKey;
  let subscribed = false;
  if (pushSupported) { const reg = await navigator.serviceWorker.ready; subscribed = !!(await reg.pushManager.getSubscription()); }
  V().innerHTML = `
    ${!standalone ? `<div class="card"><h2>Install on your phone</h2>${isIOS ? '<p class="small" style="margin:0">In Safari, tap the Share button, then <b>Add to Home Screen</b>. Open it from the home screen to turn on notifications.</p>' : `<p class="small" style="margin:0">In Chrome, tap the ⋮ menu, then <b>Install app</b> (or Add to Home screen).</p><button class="btn small" id="installBtn" style="margin-top:8px;display:none">Install now</button>`}</div>` : ''}
    <div class="card"><h2>Notifications</h2>
      ${pushSupported ? `<p class="small" style="margin-top:0">Get tomorrow's plan at ${esc(s.plan_time)} each evening, and a ping when the other parent logs a reaction, a first taste or a note.</p>
        <button class="btn ${subscribed ? 'secondary' : ''}" id="pushBtn">${subscribed ? 'Turn off on this phone' : 'Turn on for this phone'}</button>
        ${subscribed ? '<button class="btn ghost" id="pushTest">Send a test</button>' : ''}` : `<p class="small muted" style="margin:0">${isIOS && !standalone ? 'On iPhone, add the app to your home screen first, then open it from there to enable notifications.' : 'Notifications need the app to be served over HTTPS.'}</p>`}
    </div>
    <form class="card" id="setForm"><h2>About ${esc(firstName())}</h2>
      <label class="field"><span>Name</span><input type="text" name="baby_name" value="${esc(s.baby_name)}"></label>
      <label class="field"><span>Date of birth</span><input type="date" name="dob" value="${esc(s.dob)}"></label>
      <label class="toggle"><input type="checkbox" name="eczema" ${s.eczema ? 'checked' : ''}> Has eczema</label>
      <label class="toggle"><input type="checkbox" name="gp_nuts_ok" ${s.gp_nuts_ok ? 'checked' : ''}> GP has okayed starting nuts</label>
      <h3>Planner</h3>
      <label class="field"><span>Make tomorrow's plan at</span><input type="time" name="plan_time" value="${esc(s.plan_time)}"></label>
      <div class="grid2">${['breakfast', 'lunch', 'snack', 'dinner'].map(k => `<label class="field"><span>${SLOT_LABEL[k]} time</span><input type="time" name="t_${k}" value="${esc(s.times[k] || '')}"></label>`).join('')}</div>
      <label class="toggle"><input type="checkbox" name="include_snack" ${s.include_snack ? 'checked' : ''}> Suggest an optional snack</label>
      <label class="field"><span>New (non-allergen) foods per day</span><select name="new_foods_per_day">${[0, 1, 2, 3].map(n => `<option ${s.new_foods_per_day === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Days between new allergens</span><select name="allergen_gap_days">${[2, 3, 4, 5, 7].map(n => `<option ${s.allergen_gap_days === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Re-offer tolerated allergens if not had for (days)</span><select name="maintain_days">${[3, 4, 5, 7].map(n => `<option ${s.maintain_days === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="btn block">Save settings</button>
    </form>
    <form class="card" id="pwForm"><h2>Your account (${esc(S.boot.me.name)})</h2>
      <label class="field"><span>Current password</span><input type="password" name="current" autocomplete="current-password"></label>
      <label class="field"><span>New password</span><input type="password" name="next" autocomplete="new-password"></label>
      <button class="btn secondary block">Change password</button>
      <button type="button" class="btn ghost block" id="logout" style="margin-top:8px">Log out</button>
    </form>
    <p class="disclaimer">Little Spoons · suggestions follow general NHS / AAP weaning guidance and are not medical advice.</p>`;
  document.getElementById('setForm').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const times = {}; for (const k of ['breakfast', 'lunch', 'snack', 'dinner']) times[k] = f['t_' + k].value;
    await api('/api/settings', { method: 'PUT', body: { baby_name: f.baby_name.value, dob: f.dob.value, eczema: f.eczema.checked, gp_nuts_ok: f.gp_nuts_ok.checked, plan_time: f.plan_time.value, times, include_snack: f.include_snack.checked, new_foods_per_day: f.new_foods_per_day.value, allergen_gap_days: f.allergen_gap_days.value, maintain_days: f.maintain_days.value } });
    toast('Saved. Regenerating tomorrow\'s plan…');
    await api(`/api/plans/${addDays(localToday(), 1)}/regenerate`, { method: 'POST', body: {} });
    refresh();
  };
  document.getElementById('pwForm').onsubmit = async e => {
    e.preventDefault();
    try { await api('/api/password', { method: 'POST', body: { current: e.target.current.value, next: e.target.next.value } }); toast('Password changed'); e.target.reset(); } catch (er) { toast(er.message); }
  };
  document.getElementById('logout').onclick = async () => { await api('/api/logout', { method: 'POST' }); S.boot = null; renderLogin(); };
  const pb = document.getElementById('pushBtn');
  if (pb) pb.onclick = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const cur = await reg.pushManager.getSubscription();
      if (cur) { await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: cur.endpoint } }); await cur.unsubscribe(); toast('Notifications off'); }
      else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast('Notifications were not allowed'); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(S.boot.pushKey) });
        await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
        toast('Notifications on');
      }
      viewSettings();
    } catch (er) { toast(er.message); }
  };
  const pt = document.getElementById('pushTest');
  if (pt) pt.onclick = async () => { const r = await api('/api/push/test', { method: 'POST' }); toast(r.sent ? 'Sent!' : 'Could not send'); };
  const ib = document.getElementById('installBtn');
  if (ib && window._installEvt) { ib.style.display = ''; ib.onclick = () => window._installEvt.prompt(); }
}
function b64ToBytes(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ---------- sync between phones ----------
async function poll() {
  if (!S.boot || document.hidden || S.sheetOpen) return;
  try {
    const { rev } = await api('/api/rev');
    if (rev !== S.rev) { S.rev = rev; S.boot = await api('/api/bootstrap'); S.rev = S.boot.rev; if (!S.sheetOpen && !document.activeElement?.matches('input,textarea,select')) route(); }
  } catch { }
}
setInterval(poll, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._installEvt = e; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
boot();
