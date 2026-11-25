// From the live page's PALLY:APP:DATA block: tables, sync operations, photos, wipe, API routes.

/** @param {PageEnv} env */
const CARE_KINDS = ['schedule', 'med', 'appt'];
const CARE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const CARE_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const CARE_TIME = /^[0-9]{2}:[0-9]{2}$/;
const CARE_BATCH_MAX = 100;
const CARE_PHOTO_MAX = 1500000;
const CARE_SW = `var C='rabbi-day-shell-v1';self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.add('/')}).then(function(){return self.skipWaiting()}))});self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);if(u.origin!==location.origin||u.pathname.indexOf('/api/')===0)return;if(r.mode==='navigate'||u.pathname==='/'){e.respondWith(fetch(r).then(function(res){if(res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put('/',cp)})}return res}).catch(function(){return caches.match('/')}))}});`;

async function initializeCareV2(env) {
  await query(env.DB, `CREATE TABLE IF NOT EXISTS rd_items (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', rev INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, last_op TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (kind, id))`).run();
  await query(env.DB, `CREATE TABLE IF NOT EXISTS rd_logs (id TEXT PRIMARY KEY, occ_key TEXT, type TEXT NOT NULL, for_date TEXT NOT NULL, for_time TEXT NOT NULL DEFAULT '', done_at INTEGER NOT NULL, aide TEXT NOT NULL DEFAULT '', photo_id TEXT, data TEXT NOT NULL DEFAULT '{}', deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await query(env.DB, `CREATE TABLE IF NOT EXISTS rd_photos (id TEXT PRIMARY KEY, mime TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await query(env.DB, 'CREATE UNIQUE INDEX IF NOT EXISTS rd_logs_occ ON rd_logs (occ_key)').run();
  await query(env.DB, 'CREATE INDEX IF NOT EXISTS rd_logs_day ON rd_logs (for_date)').run();
}

function careStr(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function careJson(s) { try { return JSON.parse(String(s)); } catch { return {}; } }

function careCleanLog(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = careStr(raw.id, 64);
  if (!CARE_ID.test(id)) return null;
  const type = String(raw.type);
  if (!['meds', 'vitals', 'bp', 'other'].includes(type)) return null;
  const forDate = String(raw.forDate);
  if (!CARE_DATE.test(forDate)) return null;
  const forTime = String(raw.forTime ?? '');
  if (forTime && !CARE_TIME.test(forTime)) return null;
  const doneAt = Number(raw.doneAt);
  if (!Number.isFinite(doneAt) || doneAt <= 0) return null;
  const photoId = raw.photoId ? careStr(raw.photoId, 64) : null;
  if (photoId && !CARE_ID.test(photoId)) return null;
  if ((type === 'vitals' || type === 'bp') && !photoId) return null;
  const occKey = raw.occKey ? careStr(raw.occKey, 200) : null;
  const meds = Array.isArray(raw.meds) ? raw.meds.slice(0, 30).map((m) => ({ name: careStr(m && m.name, 120), dose: careStr(m && m.dose, 60), unit: careStr(m && m.unit, 30) })) : [];
  const data = { label: careStr(raw.label, 200), meds, person: careStr(raw.person, 80), tz: Number.isFinite(Number(raw.tzOffset)) ? Number(raw.tzOffset) : 0, schedId: careStr(raw.schedId, 64), sub: type === 'vitals' && raw.sub === 'temp' ? 'temp' : '' };
  return { id, type, forDate, forTime, doneAt: Math.round(doneAt), aide: careStr(raw.aide, 80), photoId, occKey, data };
}

function careLogOut(r) {
  const d = careJson(r.data);
  return { id: String(r.id), occKey: r.occ_key === null ? null : String(r.occ_key), type: String(r.type), forDate: String(r.for_date), forTime: String(r.for_time), doneAt: Number(r.done_at), aide: String(r.aide), photoId: r.photo_id === null ? null : String(r.photo_id), deleted: Number(r.deleted) === 1, label: d.label || '', meds: d.meds || [], person: d.person || '', text: d.text || '', localAt: d.localAt || '', schedId: d.schedId || '', sub: d.sub || '', tzOffset: d.tz || 0, rev: Number(r.rev) };
}

function careCleanItem(kind, d) {
  if (!d || typeof d !== 'object') return null;
  if (kind === 'med') {
    const name = careStr(d.name, 120);
    if (!name) return null;
    return { name, dose: careStr(d.dose, 60), unit: careStr(d.unit, 30) };
  }
  if (kind === 'appt') {
    const title = careStr(d.title, 120);
    if (!CARE_DATE.test(String(d.date)) || !CARE_TIME.test(String(d.time)) || !title) return null;
    return { date: d.date, time: d.time, title };
  }
  if (!['meds', 'vitals', 'bp', 'other'].includes(d.type) || !CARE_TIME.test(String(d.time))) return null;
  const days = [...new Set((Array.isArray(d.days) ? d.days : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  if (!days.length) return null;
  const label = careStr(d.label, 80);
  if (d.type === 'other' && !label) return null;
  const medIds = (Array.isArray(d.medIds) ? d.medIds : []).slice(0, 30).map((x) => careStr(x, 64)).filter(Boolean);
  if (d.type === 'meds' && !medIds.length) return null;
  const repeat = Math.max(0, Math.min(1440, Math.floor(Number(d.repeat) || 0)));
  const until = CARE_TIME.test(String(d.until || '')) ? d.until : '';
  if (repeat > 0 && (!until || until <= d.time)) return null;
  return { type: d.type, sub: d.type === 'vitals' && d.sub === 'temp' ? 'temp' : '', label: d.type === 'other' ? label : '', time: d.time, days, medIds: d.type === 'meds' ? medIds : [], repeat, until: repeat ? until : '' };
}

async function careMigrateLegacy(env) {
  if ((await careEpoch(env)) > 0) return;
  const total = await query(env.DB, 'SELECT COUNT(*) AS n FROM care_entries').first();
  if (!Number(total && total.n)) return;
  const done = await query(env.DB, 'SELECT COUNT(*) AS n FROM rd_logs WHERE id LIKE ?', ['legacy-%']).first();
  if (Number(total.n) <= Number((done && done.n) || 0)) return;
  const rows = (await query(env.DB, `SELECT * FROM care_entries WHERE ('legacy-' || id) NOT IN (SELECT id FROM rd_logs WHERE id LIKE 'legacy-%') ORDER BY id LIMIT 500`).all()).results;
  if (!rows.length) return;
  const lo = Number(rows[0].id);
  const hi = Number(rows[rows.length - 1].id);
  const meds = (await query(env.DB, 'SELECT entry_id, name, dose, given_time FROM care_meds WHERE entry_id >= ? AND entry_id <= ? ORDER BY id', [lo, hi]).all()).results;
  const byE = {};
  for (const m of meds) { (byE[m.entry_id] = byE[m.entry_id] || []).push([String(m.given_time), String(m.name), String(m.dose)].filter(Boolean).join(' ')); }
  const has = (v) => v !== null && v !== undefined;
  const stmts = rows.map((r) => {
    const at = String(r.entry_at);
    const bits = [];
    if (has(r.systolic) || has(r.diastolic)) bits.push('BP ' + (has(r.systolic) ? r.systolic : '?') + '/' + (has(r.diastolic) ? r.diastolic : '?'));
    if (has(r.pulse)) bits.push('Pulse ' + r.pulse);
    if (has(r.oxygen)) bits.push('Oxygen ' + r.oxygen);
    if (has(r.temperature)) bits.push('Temperature ' + r.temperature);
    if (has(r.breaths)) bits.push('Breaths ' + r.breaths);
    const mt = byE[r.id] || [];
    if (mt.length) bits.push('Medications: ' + mt.join(', '));
    if (r.notes) bits.push('Notes: ' + r.notes);
    const data = { label: 'Earlier entry', text: bits.join('. '), localAt: at, meds: [], person: '', tz: 0, schedId: '' };
    return query(env.DB, 'INSERT OR IGNORE INTO rd_logs (id,occ_key,type,for_date,for_time,done_at,aide,photo_id,data) VALUES (?,?,?,?,?,?,?,?,?)', ['legacy-' + r.id, null, 'legacy', String(r.day), at.slice(11, 16), Date.parse(at + ':00Z') || 0, String(r.caregiver || ''), null, JSON.stringify(data)]);
  });
  await env.DB.batch(stmts);
}

async function careEpoch(env) {
  const r = await query(env.DB, "SELECT rev FROM rd_items WHERE kind = 'meta' AND id = 'wipe-epoch'").first();
  return r ? Number(r.rev) : 0;
}

async function careState(env) {
  await careMigrateLegacy(env);
  const items = (await query(env.DB, "SELECT kind, id, data, rev, deleted FROM rd_items WHERE kind <> 'meta'").all()).results.map((r) => ({ kind: String(r.kind), id: String(r.id), rev: Number(r.rev), deleted: Number(r.deleted) === 1, data: careJson(r.data) }));
  const logs = (await query(env.DB, 'SELECT * FROM rd_logs ORDER BY done_at DESC LIMIT 4000').all()).results.map(careLogOut);
  return { serverTime: Date.now(), epoch: await careEpoch(env), items, logs };
}

async function careApplyOp(env, op, created) {
  const opId = careStr(op && op.opId, 64);
  const rej = (error) => ({ opId, status: 'rejected', error });
  if (!CARE_ID.test(opId)) return rej('Missing change id.');
  if (op.type === 'log.put') {
    const l = careCleanLog(op.log);
    if (!l) return rej('This log is missing required details. Vitals and blood pressure need a photo.');
    const same = await query(env.DB, 'SELECT * FROM rd_logs WHERE id = ?', [l.id]).first();
    if (same) return { opId, status: 'ok', log: careLogOut(same) };
    if (l.occKey) {
      const occ = await query(env.DB, 'SELECT * FROM rd_logs WHERE occ_key = ?', [l.occKey]).first();
      if (occ) {
        if (Number(occ.deleted) === 0) return { opId, status: 'deduped', log: careLogOut(occ) };
        await query(env.DB, 'UPDATE rd_logs SET type=?, for_date=?, for_time=?, done_at=?, aide=?, photo_id=?, data=?, deleted=0, rev=rev+1 WHERE id=?', [l.type, l.forDate, l.forTime, l.doneAt, l.aide, l.photoId, JSON.stringify(l.data), String(occ.id)]).run();
        created.push(l);
        const row = await query(env.DB, 'SELECT * FROM rd_logs WHERE id = ?', [String(occ.id)]).first();
        return { opId, status: 'revived', log: careLogOut(row) };
      }
    }
    await query(env.DB, 'INSERT OR IGNORE INTO rd_logs (id,occ_key,type,for_date,for_time,done_at,aide,photo_id,data) VALUES (?,?,?,?,?,?,?,?,?)', [l.id, l.occKey, l.type, l.forDate, l.forTime, l.doneAt, l.aide, l.photoId, JSON.stringify(l.data)]).run();
    const row = await query(env.DB, 'SELECT * FROM rd_logs WHERE id = ?', [l.id]).first();
    if (row) { created.push(l); return { opId, status: 'ok', log: careLogOut(row) }; }
    const won = l.occKey ? await query(env.DB, 'SELECT * FROM rd_logs WHERE occ_key = ?', [l.occKey]).first() : null;
    return won ? { opId, status: 'deduped', log: careLogOut(won) } : rej('Could not save this log.');
  }
  if (op.type === 'log.retake') {
    const rid = careStr(op.logId, 64);
    const rpid = careStr(op.photoId, 64);
    const rat = Math.round(Number(op.doneAt));
    if (!CARE_ID.test(rid) || !CARE_ID.test(rpid) || !Number.isFinite(rat) || rat <= 0) return rej('Bad retake.');
    await query(env.DB, 'UPDATE rd_logs SET photo_id = ?, done_at = ?, rev = rev + 1 WHERE id = ? AND deleted = 0 AND photo_id IS NOT NULL', [rpid, rat, rid]).run();
    return { opId, status: 'ok' };
  }
  if (op.type === 'log.undo') {
    const id = careStr(op.logId, 64);
    await query(env.DB, 'UPDATE rd_logs SET deleted = 1, rev = rev + 1 WHERE id = ? AND deleted = 0', [id]).run();
    return { opId, status: 'ok' };
  }
  if (op.type === 'item.put' || op.type === 'item.del') {
    const kind = op.kind;
    const id = careStr(op.id, 64);
    if (!CARE_KINDS.includes(kind) || !CARE_ID.test(id)) return rej('Unknown item.');
    const baseRev = Math.floor(Number(op.baseRev) || 0);
    let data = null;
    if (op.type === 'item.put') {
      data = careCleanItem(kind, op.data);
      if (!data) return rej('This item is missing something or has a bad value.');
    }
    const row = await query(env.DB, 'SELECT rev, deleted, data, last_op FROM rd_items WHERE kind = ? AND id = ?', [kind, id]).first();
    if (!row) {
      if (op.type === 'item.del') return { opId, status: 'ok', rev: 0 };
      await query(env.DB, 'INSERT OR IGNORE INTO rd_items (kind,id,data,rev,deleted,last_op) VALUES (?,?,?,1,0,?)', [kind, id, JSON.stringify(data), opId]).run();
      return { opId, status: 'ok', rev: 1 };
    }
    if (row.last_op === opId) return { opId, status: 'ok', rev: Number(row.rev) };
    const conflict = (r) => ({ opId, status: 'conflict', kind, id, server: { rev: Number(r.rev), deleted: Number(r.deleted) === 1, data: careJson(r.data) } });
    if (Number(row.rev) !== baseRev) return conflict(row);
    const res = await query(env.DB, 'UPDATE rd_items SET data = ?, deleted = ?, rev = rev + 1, last_op = ?, updated_at = CURRENT_TIMESTAMP WHERE kind = ? AND id = ? AND rev = ?', [op.type === 'item.put' ? JSON.stringify(data) : String(row.data), op.type === 'item.del' ? 1 : 0, opId, kind, id, baseRev]).run();
    if (Number((res.meta && res.meta.changes) || 0) === 0) {
      const now = await query(env.DB, 'SELECT rev, deleted, data, last_op FROM rd_items WHERE kind = ? AND id = ?', [kind, id]).first();
      if (now && now.last_op === opId) return { opId, status: 'ok', rev: Number(now.rev) };
      return conflict(now || row);
    }
    return { opId, status: 'ok', rev: baseRev + 1 };
  }
  return rej('Unknown change type.');
}

async function careSync(context) {
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, error: 'Could not read that.' }, 400); }
  const curEpoch = await careEpoch(context.env);
  if (body && body.epoch !== undefined && body.epoch !== null && Number(body.epoch) !== curEpoch) {
    const st = await careState(context.env);
    const rs = json({ ok: true, stale: true, results: [], ...st });
    rs.headers.set('cache-control', 'no-store');
    return rs;
  }
  const ops = Array.isArray(body && body.ops) ? body.ops.slice(0, CARE_BATCH_MAX) : [];
  const created = [];
  const results = [];
  for (const op of ops) {
    try { results.push(await careApplyOp(context.env, op, created)); } catch { results.push({ opId: careStr(op && op.opId, 64), status: 'error', error: 'Could not save this change. It will be retried.' }); }
  }
  for (const l of created.slice(0, 5)) {
    const who = l.aide || 'An aide';
    recordEvent(context, 'care-log', who, who + ' logged ' + (l.data.label || l.type));
  }
  const state = await careState(context.env);
  const res = json({ ok: true, results, ...state });
  res.headers.set('cache-control', 'no-store');
  return res;
}

async function carePhotoPut(context) {
  const id = context.params.id;
  if (!CARE_ID.test(id)) return json({ ok: false, error: 'Bad photo id.' }, 400);
  let form;
  try { form = await context.request.formData(); } catch { return json({ ok: false, error: 'Could not read that photo.' }, 400); }
  const file = form.get('photo');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'No photo found.' }, 400);
  if (file.size > CARE_PHOTO_MAX) return json({ ok: false, error: 'Photo is too large.' }, 413);
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf);
  if (buf.byteLength < 100 || head[0] !== 255 || head[1] !== 216) return json({ ok: false, error: 'Photo must be a JPEG.' }, 400);
  await query(context.env.DB, 'INSERT OR IGNORE INTO rd_photos (id, mime, size, bytes) VALUES (?, ?, ?, ?)', [id, 'image/jpeg', buf.byteLength, buf]).run();
  return json({ ok: true, id });
}

async function carePhotoGet(context) {
  const id = context.params.id;
  if (!CARE_ID.test(id)) return text('Not found', 404);
  const row = await query(context.env.DB, 'SELECT bytes FROM rd_photos WHERE id = ?', [id]).first();
  if (!row) return text('Not found', 404);
  return new Response(new Uint8Array(row.bytes), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' } });
}

async function careWipe(context) {
  let body = null;
  try { body = await context.request.json(); } catch { body = null; }
  if (!body || body.confirm !== 'wipe-shared-app') return json({ ok: false, error: 'Wipe was not confirmed.' }, 400);
  const env = context.env;
  await env.DB.batch([
    query(env.DB, 'DELETE FROM care_meds'),
    query(env.DB, 'DELETE FROM care_entries'),
    query(env.DB, 'DELETE FROM rd_logs'),
    query(env.DB, 'DELETE FROM rd_photos'),
    query(env.DB, "DELETE FROM rd_items WHERE kind <> 'meta'"),
    query(env.DB, "INSERT INTO rd_items (kind,id,data,rev,deleted,last_op) VALUES ('meta','wipe-epoch','{}',1,0,'wipe') ON CONFLICT (kind,id) DO UPDATE SET rev = rd_items.rev + 1, updated_at = CURRENT_TIMESTAMP"),
  ]);
  const epoch = await careEpoch(env);
  recordEvent(context, 'care-wipe', 'Someone with the link', 'Shared app data was wiped');
  const res = json({ ok: true, epoch });
  res.headers.set('cache-control', 'no-store');
  return res;
}

const CARE_ROUTES = [
  { method: 'GET', path: '/api/state', async handler(context) { const s = await careState(context.env); const r = json({ ok: true, ...s }); r.headers.set('cache-control', 'no-store'); return r; } },
  { method: 'POST', path: '/api/sync', handler: careSync },
  { method: 'POST', path: '/api/wipe', handler: careWipe },
  { method: 'GET', path: '/api/epoch', async handler(context) { const r = json({ ok: true, epoch: await careEpoch(context.env) }); r.headers.set('cache-control', 'no-store'); return r; } },
  { method: 'POST', path: '/api/photos/:id', handler: carePhotoPut },
  { method: 'GET', path: '/api/photos/:id', handler: carePhotoGet },
  { method: 'GET', path: '/sw.js', handler() { return new Response(CARE_SW, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } }); } },
  { method: 'GET', path: '/manifest.webmanifest', handler() { return new Response(JSON.stringify({ name: "Rabbi's Care Log", short_name: "Rabbi's Care Log", start_url: '/', scope: '/', display: 'standalone', background_color: '#f4f1ec', theme_color: '#1f5c5a', icons: [{ src: '/_pally/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] }), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } }); } },
];

async function initializeSchema(env) {
  await initializeCareV2(env);
  await query(
    env.DB,
    `CREATE TABLE IF NOT EXISTS care_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_at TEXT NOT NULL,
      day TEXT NOT NULL,
      caregiver TEXT NOT NULL DEFAULT '',
      systolic REAL,
      diastolic REAL,
      pulse REAL,
      oxygen REAL,
      temperature REAL,
      breaths REAL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ).run();
  await query(
    env.DB,
    `CREATE TABLE IF NOT EXISTS care_meds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      dose TEXT NOT NULL DEFAULT '',
      given_time TEXT NOT NULL DEFAULT ''
    )`,
  ).run();
  await query(
    env.DB,
    "CREATE INDEX IF NOT EXISTS care_entries_at ON care_entries (entry_at)",
  ).run();
  await query(
    env.DB,
    "CREATE INDEX IF NOT EXISTS care_meds_entry ON care_meds (entry_id)",
  ).run();
}

/** @type {Array<{sql: string, params?: SqlValue[]}>} */
const SEED = [];

class CareInputError extends Error {}

/** @param {unknown} value @param {number} max */
function careNumber(value, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new CareInputError("A number looks wrong.");
  return n;
}

/** @param {unknown} value @param {number} max */
function careText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** @param {RouteContext} context */
async function listEntries(context) {
  const rows = await query(
    context.env.DB,
    `SELECT id, entry_at, day, caregiver, systolic, diastolic, pulse, oxygen, temperature, breaths, notes
       FROM care_entries ORDER BY entry_at DESC, id DESC LIMIT 1000`,
  ).all();
  const medRows = await query(
    context.env.DB,
    `SELECT entry_id, name, dose, given_time FROM care_meds
      WHERE entry_id IN (SELECT id FROM care_entries ORDER BY entry_at DESC, id DESC LIMIT 1000)
      ORDER BY id`,
  ).all();
  /** @type {Map<number, Array<Record<string, string>>>} */
  const byEntry = new Map();
  for (const m of medRows.results) {
    const key = Number(m.entry_id);
    if (!byEntry.has(key)) byEntry.set(key, []);
    byEntry.get(key)?.push({
      name: String(m.name),
      dose: String(m.dose),
      time: String(m.given_time),
    });
  }
  const entries = rows.results.map((r) => ({
    id: Number(r.id),
    at: String(r.entry_at),
    day: String(r.day),
    caregiver: String(r.caregiver),
    sys: r.systolic,
    dia: r.diastolic,
    pulse: r.pulse,
    oxygen: r.oxygen,
    temp: r.temperature,
    breaths: r.breaths,
    notes: String(r.notes),
    meds: byEntry.get(Number(r.id)) ?? [],
  }));
  return json({ ok: true, entries });
}

/** @param {RouteContext} context */
async function addEntry(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "Could not read that." }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Could not read that." }, 400);
  const when = typeof body.when === "string" ? body.when : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) {
    return json({ ok: false, error: "Please check the date and time." }, 400);
  }
  let vals;
  try {
    vals = [
      careNumber(body.sys, 400),
      careNumber(body.dia, 400),
      careNumber(body.pulse, 400),
      careNumber(body.oxygen, 100),
      careNumber(body.temp, 200),
      careNumber(body.breaths, 200),
    ];
  } catch {
    return json({ ok: false, error: "One of the numbers looks wrong. Please check it." }, 400);
  }
  const name = careText(body.name, 80);
  const notes = careText(body.notes, 2000);
  const medsIn = Array.isArray(body.meds) ? body.meds.slice(0, 20) : [];
  const meds = medsIn
    .map((m) => ({
      name: careText(m?.name, 120),
      dose: careText(m?.dose, 80),
      time: /^\d{2}:\d{2}$/.test(String(m?.time ?? "")) ? String(m.time) : "",
    }))
    .filter((m) => m.name || m.dose);
  if (vals.every((v) => v === null) && meds.length === 0 && !notes) {
    return json({ ok: false, error: "Nothing filled in yet" }, 400);
  }
  const at = when.slice(0, 16);
  const row = await query(
    context.env.DB,
    `INSERT INTO care_entries (entry_at, day, caregiver, systolic, diastolic, pulse, oxygen, temperature, breaths, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [at, at.slice(0, 10), name, ...vals, notes],
  ).first();
  const id = Number(row?.id);
  if (meds.length) {
    await context.env.DB.batch(
      meds.map((m) =>
        query(
          context.env.DB,
          "INSERT INTO care_meds (entry_id, name, dose, given_time) VALUES (?, ?, ?, ?)",
          [id, m.name, m.dose, m.time],
        ),
      ),
    );
  }
  recordEvent(context, "entry", name || "An aide", `${name || "An aide"} added a care entry`);
  return json({ ok: true, id });
}

// From the live page's PALLY:APP:OWNER-ACTIONS block.
/** @param {Record<string, unknown>} body @param {PageEnv} _env */
async function handleOwnerAction(body, _env) {
  return json({ ok: false, error: `Unknown action: ${String(body.action ?? "missing")}` }, 400);
}

// From the live page's PALLY:APP:VISITOR-ROUTES block.
/** @type {VisitorRoute[]} */
const VISITOR_ROUTES = [
  ...CARE_ROUTES,
  {
    method: "GET",
    path: "/",
    async handler(context) {
      return html(await renderCareApp(context), context.request);
    },
  },
  {
    method: "GET",
    path: "/api/entries",
    async handler(context) {
      const response = await listEntries(context);
      response.headers.set("cache-control", "no-store");
      return response;
    },
  },
  {
    method: "POST",
    path: "/api/entries",
    requiredPosture: "add",
    async handler(context) {
      return addEntry(context);
    },
  },
];
