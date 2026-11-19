/**
 * Palmotićeva 29 · vote and interest collector (Google Apps Script)
 *
 * Setup (about 5 minutes):
 * 1. Create a Google Sheet. Extensions > Apps Script. Paste this file. Save.
 * 2. Deploy > New deployment > type "Web app".
 *    Execute as: Me. Who has access: Anyone.
 * 3. Copy the web app URL (ends in /exec) into CONFIG.endpoint in index.html.
 *
 * Two tabs are created automatically: "Votes" (one row per visitor, updated if
 * they vote again) and "Interest" (one row per registration).
 * Optional: set NOTIFY_EMAIL to get an email for every new registration.
 */
const NOTIFY_EMAIL = ''; // e.g. 'you@example.com'
const LAYOUTS = { '17': 'Studio', '21B': 'Team', '21R': 'Front Desk', '13': 'Collaborative', 'empty': 'Empty space' };

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.website) return json_({ ok: true }); // honeypot
    if (d.type === 'vote') {
      if (!LAYOUTS[d.layout]) return json_({ ok: false, error: 'layout' });
      const sh = sheet_('Votes', ['Voter', 'Layout', 'Layout name', 'Priorities', 'Note', 'Language', 'Time']);
      const row = [clip(d.voter, 64), d.layout, LAYOUTS[d.layout], clip((d.priorities || []).join(', '), 300), clip(d.note, 600), clip(d.lang, 4), new Date()];
      const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]);
      const i = ids.indexOf(row[0]);
      if (i > 0) sh.getRange(i + 1, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
      return json_({ ok: true });
    }
    if (d.type === 'lead') {
      if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return json_({ ok: false, error: 'fields' });
      const sh = sheet_('Interest', ['Time', 'Name', 'Company', 'Email', 'Phone', 'Business', 'Team size', 'Move-in', 'Layout', 'Message', 'Language']);
      sh.appendRow([new Date(), clip(d.name, 120), clip(d.company, 120), clip(d.email, 160), clip(d.phone, 40), clip(d.type, 20), clip(d.team, 10), clip(d.when, 20), LAYOUTS[d.layout] || '', clip(d.message, 1500), clip(d.lang, 4)]);
      if (NOTIFY_EMAIL) MailApp.sendEmail(NOTIFY_EMAIL, 'Palmotićeva 29 · new interest: ' + clip(d.name, 80),
        [d.name, d.company, d.email, d.phone, 'Team: ' + d.team, 'Layout: ' + (LAYOUTS[d.layout] || '-'), '', d.message].join('\n'));
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'type' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  if ((e.parameter || {}).action !== 'tallies') return json_({ ok: true });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Votes');
  const counts = {}; let total = 0;
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().forEach(r => {
    if (LAYOUTS[r[0]]) { counts[r[0]] = (counts[r[0]] || 0) + 1; total++; }
  });
  return json_({ counts, total });
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
