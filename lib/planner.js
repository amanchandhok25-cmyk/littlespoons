// Builds daily meal plans from the food library and the baby's history.
const { db, getSettings } = require('./db');
const { FOODS, ALLERGENS, RECIPES, TIPS } = require('./foods');

function allFoods() {
  const custom = db.prepare('SELECT * FROM custom_foods').all().map(c => ({
    id: c.id, name: c.name, cat: c.cat, allergen: c.allergen || null, iron: !!c.iron, serve: c.serve || '',
    choke: c.choke || null, staple: 1, minMonths: 6, ahead: null, custom: true,
    roles: { veg: ['veg'], fruit: ['fruit'], protein: ['protein'], legume: ['protein'], grain: ['carb'], starch: ['carb', 'veg'], dairy: ['dairy'] }[c.cat] || ['extra'],
  }));
  return [...FOODS, ...custom];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}
function ageOn(dob, date) {
  const days = daysBetween(dob, date);
  const weeks = Math.floor(days / 7);
  const months = days / 30.44;
  return { days, weeks, months, text: `${weeks} weeks (${Math.floor(months)} months)` };
}

// Per-food state derived from logs, reactions and manual overrides.
function foodStates(uptoDate) {
  const foods = allFoods();
  const items = db.prepare(`SELECT mi.food_id, mi.amount, mi.liking, m.date FROM meal_items mi
    JOIN meals m ON m.id = mi.meal_id WHERE m.date <= ? ORDER BY m.date`).all(uptoDate || '9999-12-31');
  const reactions = db.prepare('SELECT * FROM reactions').all();
  const overrides = Object.fromEntries(db.prepare('SELECT * FROM food_overrides').all().map(o => [o.food_id, o]));
  const st = {};
  for (const fd of foods) st[fd.id] = { ...fd, tries: 0, first: null, last: null, likes: 0, dislikes: 0, likingSum: 0, reactions: [], status: 'untried' };
  for (const it of items) {
    const s = st[it.food_id]; if (!s) continue;
    s.tries++; s.first = s.first || it.date; s.last = it.date;
    s.likingSum += it.liking; if (it.liking >= 1) s.likes++; if (it.liking < 0) s.dislikes++;
  }
  for (const r of reactions) {
    for (const fid of JSON.parse(r.suspects || '[]')) if (st[fid]) st[fid].reactions.push({ id: r.id, date: r.date, severity: r.severity });
  }
  for (const s of Object.values(st)) {
    s.liking = s.tries ? s.likingSum / s.tries : null;
    if (s.tries > 0) s.status = 'safe';
    if (s.reactions.some(r => r.severity === 'mild')) s.status = 'watch';
    if (s.reactions.some(r => r.severity !== 'mild')) s.status = 'avoid';
    const o = overrides[s.id];
    if (o && o.status) s.status = o.status;
    s.note = o ? o.note : null;
    s.disliked = s.tries >= 2 && s.liking < 0;
  }
  return st;
}

function allergenStatus(states, date) {
  return ALLERGENS.map(a => {
    const foods = Object.values(states).filter(s => s.allergen === a.group);
    const tried = foods.filter(s => s.tries > 0);
    const first = tried.map(s => s.first).sort()[0] || null;
    const last = tried.map(s => s.last).sort().reverse()[0] || null;
    const reacted = foods.some(s => s.status === 'avoid');
    const watch = foods.some(s => s.status === 'watch');
    return {
      ...a, introduced: !!first, first, last, times: tried.reduce((n, s) => n + s.tries, 0),
      daysSince: last ? daysBetween(last, date) : null,
      status: reacted ? 'reaction' : watch ? 'watch' : first ? 'tolerated' : 'not yet',
    };
  });
}

// Small deterministic RNG so the same day gives the same plan unless asked to reshuffle.
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

const SLOT_ROLES = {
  breakfast: [['carb', 'protein'], ['fruit'], ['dairy', 'extra']],
  lunch: [['protein'], ['veg'], ['carb']],
  dinner: [['protein'], ['veg'], ['carb']],
  snack: [['fruit', 'veg'], ['dairy', 'carb']],
};

function slotsFor(age, settings) {
  const s = ['breakfast', 'lunch', 'dinner'];
  if (age.months < 7) return ['breakfast', 'lunch'];
  if (settings.include_snack) s.push('snack');
  return s;
}

function generatePlan(date, opts = {}) {
  const settings = getSettings();
  const age = ageOn(settings.dob, date);
  const states = foodStates(addDays(date, -1));
  const rand = rng(date + (opts.shuffle || ''));
  const allergens = allergenStatus(states, date);
  const isOk = s => s && (s.status === 'safe') && age.months >= (s.minMonths || 6);
  const recentFoods = new Set(db.prepare(`SELECT DISTINCT mi.food_id FROM meal_items mi JOIN meals m ON m.id=mi.meal_id WHERE m.date >= ? AND m.date < ?`).all(addDays(date, -2), date).map(r => r.food_id));
  const recentReaction = db.prepare('SELECT * FROM reactions WHERE date >= ? ORDER BY date DESC LIMIT 1').get(addDays(date, -3));
  const notes = [];
  const watchFor = [];

  // ---- 1. Choose today's new food(s) ----
  const newFoods = [];
  const lastAllergenIntro = allergens.filter(a => a.first).map(a => a.first).sort().reverse()[0];
  const gapOk = !lastAllergenIntro || daysBetween(lastAllergenIntro, date) >= settings.allergen_gap_days;
  const nextAllergen = allergens.find(a => !a.introduced && (!a.nut || settings.gp_nuts_ok) && a.status !== 'reaction');
  if (recentReaction) {
    notes.push(`There was a ${recentReaction.severity} reaction on ${recentReaction.date}, so no new allergens until a few calm days have passed. Only familiar foods plus one gentle new food at most.`);
  }
  const pendingNuts = allergens.filter(a => a.nut && !a.introduced);
  if (!settings.gp_nuts_ok && pendingNuts.length) {
    notes.push(settings.eczema
      ? 'Nuts: because of his eczema, check with the GP before introducing peanut and tree nuts. Early introduction is still encouraged, so do book it in. Tick "GP has okayed nuts" in Settings and the planner will start scheduling them one at a time.'
      : 'Nuts are paused in Settings. Turn on "Nuts okayed" to schedule them one at a time.');
  }
  const forced = opts.newFood ? states[opts.newFood] : null;
  if (forced) newFoods.push(forced);
  else if (!recentReaction && nextAllergen && gapOk) {
    const f = states[nextAllergen.food];
    if (f && f.status === 'untried') newFoods.push(f);
  }
  const wantNew = recentReaction ? (newFoods.length ? 0 : 1) : Math.max(0, settings.new_foods_per_day - newFoods.filter(f => !f.allergen).length);
  if (wantNew > 0) {
    const candidates = Object.values(states).filter(s => s.status === 'untried' && !s.allergen && age.months >= (s.minMonths || 6) && s.cat !== 'herb' && s.cat !== 'fat');
    candidates.sort((a, b) => (b.staple + (b.iron ? 1 : 0) + rand() * 1.5) - (a.staple + (a.iron ? 1 : 0) + rand() * 1.5));
    newFoods.push(...candidates.slice(0, wantNew));
  }
  const newIds = new Set(newFoods.map(f => f.id));
  for (const nf of newFoods) {
    if (nf.allergen) {
      watchFor.push(`${nf.name} is a new allergen. Offer it in the morning, start with a small amount, and watch him for 2 hours: hives, swelling of lips/face/eyes, vomiting, or an eczema flare over the next day or two. Call 999 for any breathing difficulty, swelling of tongue/throat, or floppiness.`);
    }
  }

  // ---- 2. Which allergens need maintaining (tolerated but not eaten recently) ----
  const maintain = allergens.filter(a => a.status === 'tolerated' && a.daysSince !== null && a.daysSince >= settings.maintain_days - 1);

  // ---- 3. Build each meal ----
  const used = new Map(); // food id -> count today
  const slots = slotsFor(age, settings);
  const meals = [];
  const maintainNeeded = new Set(maintain.map(a => a.group));

  for (const slot of slots) {
    const code = slot[0];
    const exclude = new Set(opts.excludeRecipes?.[slot] || []);
    const hasBreakfast = slots.includes('breakfast');
    const placeNew = newFoods.filter(f => ((f.allergen && hasBreakfast && !['fish', 'shellfish', 'celery', 'mustard'].includes(f.allergen)) ? 'breakfast' : 'lunch') === slot);
    const allowedNew = new Set(placeNew.map(f => f.id));
    const cands = [];

    // Recipe candidates
    for (const r of RECIPES) {
      if (!r.slots.includes(code) || exclude.has(r.id)) continue;
      const fs = r.foods.map(id => states[id]);
      if (fs.some(s => !s)) continue;
      const ok = fs.every(s => isOk(s) || allowedNew.has(s.id) || (s.cat === 'herb' && s.status !== 'avoid'));
      if (!ok) continue;
      cands.push({ kind: 'recipe', id: r.id, title: r.name, foods: r.foods, how: r.how, ahead: r.ahead });
    }
    // Composed plates from safe foods
    const roles = SLOT_ROLES[slot];
    for (let k = 0; k < 6; k++) {
      const picked = [];
      for (const roleSet of roles) {
        const pool = Object.values(states).filter(s => isOk(s) && s.roles.some(r => roleSet.includes(r)) && !picked.includes(s.id) && s.cat !== 'herb');
        if (!pool.length) continue;
        pool.sort((a, b) => scoreFood(b) - scoreFood(a));
        const top = pool.slice(0, 4);
        picked.push(top[Math.floor(rand() * top.length)].id);
      }
      if (picked.length) {
        const key = 'plate:' + [...picked].sort().join('+');
        if (!exclude.has(key) && !cands.some(c => c.id === key)) cands.push({ kind: 'plate', id: key, title: plateTitle(picked.map(id => states[id])), foods: picked });
      }
    }
    function scoreFood(s) {
      let sc = rand() * 2;
      if (s.iron) sc += 1.5;
      if (s.liking !== null) sc += s.liking;
      if (recentFoods.has(s.id)) sc -= 1;
      sc -= (used.get(s.id) || 0) * 2.5;
      if (s.allergen && maintainNeeded.has(s.allergen)) sc += 3;
      if (s.disliked && s.tries < 15) sc += 0.5; // gentle re-exposure
      return sc;
    }
    function scoreMeal(c) {
      let sc = rand() * 2 + (c.kind === 'recipe' ? 1.5 : 0);
      const fs = c.foods.map(id => states[id]);
      if (fs.some(s => s.iron)) sc += 2; else sc -= 2;
      for (const s of fs) {
        if (s.liking !== null) sc += s.liking * 0.5;
        if (recentFoods.has(s.id)) sc -= 0.6;
        sc -= (used.get(s.id) || 0) * 2;
        if (s.allergen && maintainNeeded.has(s.allergen)) sc += 2.5;
        if (allowedNew.has(s.id)) sc += 3;
      }
      return sc;
    }
    if (!cands.length) continue;
    cands.sort((a, b) => scoreMeal(b) - scoreMeal(a));
    const choice = cands[0];
    const foodIds = [...choice.foods];
    // Add the new food to this meal if not already part of it
    let title = choice.title;
    for (const nf of placeNew) if (!foodIds.includes(nf.id)) { foodIds.push(nf.id); title += ` + ${nf.name.toLowerCase()} (first try)`; }
    for (const id of foodIds) {
      used.set(id, (used.get(id) || 0) + 1);
      const s = states[id];
      if (s.allergen) maintainNeeded.delete(s.allergen);
    }
    meals.push({
      slot, time: settings.times[slot] || '', title, recipe: choice.kind === 'recipe' ? choice.id : null, key: choice.id,
      how: choice.how || null, optional: slot === 'snack' && age.months < 12,
      foods: foodIds.map(id => {
        const s = states[id];
        return { id, name: s.name, serve: s.serve, choke: s.choke, isNew: newIds.has(id), allergen: s.allergen, iron: s.iron, disliked: s.disliked, tries: s.tries };
      }),
      aheadRecipe: choice.ahead || null,
    });
  }

  // Any maintenance allergen still not covered: add as a side to the best fitting meal
  for (const g of maintainNeeded) {
    const fd = Object.values(states).find(s => s.allergen === g && isOk(s));
    const target = meals.find(m => m.slot === (fd && fd.cat === 'dairy' ? 'breakfast' : 'lunch')) || meals[0];
    if (fd && target) {
      target.foods.push({ id: fd.id, name: fd.name, serve: fd.serve, choke: fd.choke, isNew: false, allergen: fd.allergen, iron: fd.iron, maintain: true, tries: fd.tries });
      target.title += ` + ${fd.name.toLowerCase()}`;
    }
  }
  for (const m of meals) {
    if (m.optional) m.note = 'Optional: NHS guidance says under-1s don\'t need snacks if they\'re having milk feeds, but offer this if he seems hungry.';
    const nf = m.foods.filter(x => x.isNew);
    if (nf.length) m.note = `First try: ${nf.map(x => x.name).join(', ')}. Offer it early in the meal while he's hungry.`;
  }

  // ---- 4. Prep list for the night before ----
  const prep = [];
  const seenAhead = new Set();
  for (const m of meals) {
    if (m.aheadRecipe && !seenAhead.has(m.aheadRecipe)) { seenAhead.add(m.aheadRecipe); prep.push({ text: m.aheadRecipe, for: m.slot }); }
    for (const fd of m.foods) {
      const s = states[fd.id];
      if (s.ahead && !seenAhead.has(s.ahead) && !prep.some(p => p.text.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))) { seenAhead.add(s.ahead); prep.push({ text: s.ahead, for: m.slot }); }
      if (s.choke && !seenAhead.has(s.choke)) { seenAhead.add(s.choke); prep.push({ text: `${s.name}: ${s.choke}`, for: m.slot, safety: true }); }
    }
  }
  for (const nf of newFoods) prep.push({ text: `Check we have ${nf.name.toLowerCase()} for his first try.`, for: 'shopping' });
  prep.push({ text: 'Clean bibs, cup and highchair tray ready.', for: 'all' });

  const shopping = [...new Set(meals.flatMap(m => m.foods.map(f => f.name)))];
  const tip = TIPS[(daysBetween('2026-01-01', date) % TIPS.length + TIPS.length) % TIPS.length];

  const ageNotes = [];
  if (age.months >= 7 && age.months < 9) ageNotes.push('Around 7-9 months: aim for 3 meals a day alongside milk feeds; mashed and finger foods, with more lumps.');
  if (age.months >= 9 && age.months < 12) ageNotes.push('9-12 months: 3 meals a day; chopped family foods; pincer grip means smaller pieces are OK.');
  if (age.months < 7) ageNotes.push('Under 7 months: 1-2 small meals a day. Smooth, mashed and soft finger foods.');

  return {
    date, generatedAt: new Date().toISOString(), age: age.text, ageMonths: age.months,
    meals, newFoods: newFoods.map(f => ({ id: f.id, name: f.name, allergen: f.allergen, serve: f.serve })),
    maintain: maintain.map(a => ({ group: a.group, label: a.label, daysSince: a.daysSince })),
    prep: prep.map((p, i) => ({ ...p, id: i, done: false })),
    shopping, watchFor, notes: [...notes, ...ageNotes], tip,
    milk: age.months < 12 ? 'Milk feeds continue as usual (breast milk on demand, or about 500-600ml formula).' : null,
    water: 'Offer sips of tap water from an open or free-flow cup with each meal.',
  };
}

function plateTitle(fs) {
  const names = fs.map((s, i) => { const n = s.name.replace(/ \(.*\)/, ''); return i ? n.toLowerCase() : n; });
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

module.exports = { generatePlan, foodStates, allergenStatus, allFoods, ageOn, addDays, daysBetween };
