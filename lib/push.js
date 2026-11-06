// Web push (works on Android and on iOS 16.4+ when the app is installed to the home screen).
const { db } = require('./db');
let webpush = null;
try { webpush = require('web-push'); } catch { console.warn('[push] web-push not installed; notifications disabled'); }

let keys = null;
function init() {
  if (!webpush) return;
  const row = db.prepare("SELECT value FROM settings WHERE key='vapid'").get();
  if (row) keys = JSON.parse(row.value);
  else {
    keys = webpush.generateVAPIDKeys();
    db.prepare("INSERT INTO settings(key,value) VALUES('vapid',?)").run(JSON.stringify(keys));
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@localhost', keys.publicKey, keys.privateKey);
}
function publicKey() { return keys ? keys.publicKey : null; }

async function sendTo(rows, payload) {
  if (!webpush || !keys) return 0;
  let n = 0;
  await Promise.all(rows.map(async r => {
    try { await webpush.sendNotification(JSON.parse(r.data), JSON.stringify(payload)); n++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(r.endpoint);
      else console.warn('[push]', e.statusCode || e.message);
    }
  }));
  return n;
}
const notifyAll = p => sendTo(db.prepare('SELECT * FROM push_subs').all(), p);
const notifyUser = (uid, p) => sendTo(db.prepare('SELECT * FROM push_subs WHERE user_id=?').all(uid), p);
const notifyOthers = (uid, p) => sendTo(db.prepare('SELECT * FROM push_subs WHERE user_id!=?').all(uid), p);

module.exports = { init, publicKey, notifyAll, notifyUser, notifyOthers };
