// From the live page's PALLY:APP:RENDER block: the HTML shell served at /, with the CSS and client script inlined.

async function renderCareApp(_context) {
  return `<h1 class='rd-h1'>Rabbi's Care Log</h1><section id='v-home' class='rd-view' aria-label='Home'><div id='notices'></div><div id='above'></div><section id='clockcard' class='rd-clock' aria-label='Current time'><p class='rd-cdate' id='clkd'></p><p class='rd-clk' id='clk'></p></section><div id='blink'></div><div id='below'></div></section><section id='v-schedule' class='rd-view' hidden aria-labelledby='h-sched'><h2 id='h-sched'>Schedule</h2><div id='conf-s'></div><button type='button' id='add-routine' class='btn btn-primary'>Add routine</button><div id='sched-editor' style='margin-top:1rem'></div><div id='sched-list' style='margin-top:1rem'></div><h2 style='margin-top:1.5rem'>Calendar</h2><div id='cal'></div><div id='cal-day'></div></section><section id='v-settings' class='rd-view' hidden aria-labelledby='h-set'><h2 id='h-set'>Settings</h2><div id='conf-m'></div><div class='rd-box'><h3>Sync</h3><div id='rd-status' class='rd-status' role='status' aria-live='polite'><p id='st-main'>Starting</p><button type='button' id='st-sync' class='btn btn-small'>Sync now</button><p id='st-warn' class='rd-warn' hidden></p></div></div><div class='rd-box'><h3>This phone</h3><label class='field'><span>Person name</span><input id='set-person' maxlength='80' autocomplete='off'></label><label class='field'><span>Aide name</span><input id='set-aide' maxlength='80' autocomplete='name'></label><p class='hint'>Names are saved on this phone only. Each device has its own.</p></div><div class='rd-box'><h3>Medication list</h3><div id='med-list'></div><div id='med-form'></div><button type='button' id='med-add' class='btn btn-secondary'>Add medication</button><p class='hint'>Name, dose and unit are only what you type. This list gives no medical advice.</p></div><div class='rd-box'><h3>Logs</h3><button type='button' id='open-logs' class='btn btn-secondary'>View all logs</button></div><div class='rd-box'><h3>Backup and import</h3><p id='bk-note'></p><p id='ph-note' class='hint'></p><button type='button' id='bk-exp' class='btn btn-secondary'>Back up to rabbi-day-backup.json</button><button type='button' id='bk-imp' class='btn btn-secondary' style='margin-top:.5rem'>Import backup file</button><p id='bk-msg' class='status' role='status'></p></div><div class='rd-box'><h3>Wipe shared app data</h3><p>Erases all app data for everyone who has this link: shared schedules, medication list, appointments, logs and photos (including legacy care entries and medication records), plus this phone queued and cached data and this phone saved person and aide names. The table structures are kept. It needs an internet connection and two confirmations. If the server does not confirm, nothing is erased.</p><p>Online devices clear their own copy on their next sync. A phone that is offline cannot be erased remotely until it reconnects. Until then it still holds its old copy, and its unsent changes are discarded instead of uploaded when it reconnects. An offline-only wipe is never offered.</p><button type='button' id='wipe' class='btn btn-danger'>Wipe shared app data</button><p id='wipe-msg' class='status' role='status'></p></div><div class='rd-box'><h3>Privacy and limits</h3><ul><li>Anyone who has this private link can read and write everything here. There are no named-user accounts, no revocable caregiver permissions and no per-person sign-in. The link does not verify who a person is.</li><li>This is an unvalidated prototype. It is not clinically validated and is not safe for medication decisions.</li><li>It gives no diagnoses, dosing guidance, readings interpretation, alerts or medical advice.</li><li>All times are this phone local time.</li><li>Data works offline on this phone and is shared to the page database only when online.</li></ul></div></section><section id='v-logs' class='rd-view' hidden aria-labelledby='h-logs'><button type='button' id='logs-back' class='btn btn-secondary'>Back to Settings</button><h2 id='h-logs' style='margin-top:1rem'>All logs</h2><div id='log-filters' class='rd-filters'></div><label class='field'><span>Jump to a day</span><select id='log-jump'></select></label><div id='log-body'></div></section><nav class='rd-tabs' aria-label='Main'><button type='button' class='rd-tab' data-v='schedule'>Schedule</button><button type='button' class='rd-tab' data-v='home' aria-current='page'>Home</button><button type='button' class='rd-tab' data-v='settings'>Settings</button></nav><div id='toast' class='rd-toast' role='status'></div><div id='viewer' class='rd-viewer' hidden role='dialog' aria-modal='true' aria-label='Photo full screen'><div class='rd-vbar'><button type='button' id='vclose' class='btn btn-small'>Close</button><button type='button' id='vundo' class='btn btn-small' hidden>Undo this check</button></div><img id='vimg' alt=''></div><div id='sheet' class='rd-sheet' hidden role='dialog' aria-modal='true' aria-labelledby='sh-title'><div class='rd-sheetin'><h2 id='sh-title' class='rd-dh'>Log photo</h2><input type='file' id='sh-cam' class='rd-file' accept='image/*' capture='environment'><label for='sh-cam' class='btn btn-primary rd-pick'>Take photo</label><p id='sh-msg' class='status' role='alert' tabindex='-1'></p><button type='button' id='sh-retry' class='btn btn-secondary' hidden>Try again</button><button type='button' id='sh-close' class='btn btn-secondary'>Cancel</button></div></div><input id='imp' type='file' accept='application/json,.json' hidden><script>` + CARE_JS + `</script>`;
}

// The older markup and script from the first version, still carried in the page.
async function renderApp(_context) {
  return `
<h1 class="app-title">Aide care log</h1>

<section id="view-add" class="view" aria-labelledby="h-add">
  <h2 id="h-add">Add entry</h2>
  <form id="form" novalidate>
    <div class="group">
      <label class="field"><span>When</span>
        <input type="datetime-local" id="when" required></label>
      <label class="field"><span>Your name</span>
        <input type="text" id="name" autocomplete="name" maxlength="80">
        <p class="hint">Saved on this phone. Change it any time.</p></label>
    </div>

    <div class="group">
      <h3>Vitals <span class="opt">(leave blank if not taken)</span></h3>
      <div class="field">
        <span class="lbl">Blood pressure</span>
        <div class="bp">
          <label><small>top</small><input type="text" inputmode="numeric" id="sys" maxlength="3" aria-label="Blood pressure top number"></label>
          <span class="sep" aria-hidden="true">/</span>
          <label><small>bottom</small><input type="text" inputmode="numeric" id="dia" maxlength="3" aria-label="Blood pressure bottom number"></label>
          <span class="unit">mmHg</span>
        </div>
      </div>
      <label class="field"><span>Pulse</span>
        <div class="with-unit"><input type="text" inputmode="numeric" id="pulse" maxlength="3"><span class="unit">bpm</span></div></label>
      <label class="field"><span>Oxygen</span>
        <div class="with-unit"><input type="text" inputmode="numeric" id="oxygen" maxlength="3"><span class="unit">%</span></div></label>
      <label class="field"><span>Temperature</span>
        <div class="with-unit"><input type="text" inputmode="decimal" id="temp" maxlength="5"><span class="unit">F</span></div></label>
      <label class="field"><span>Breaths per minute</span>
        <div class="with-unit"><input type="text" inputmode="numeric" id="breaths" maxlength="3"><span class="unit">per min</span></div></label>
    </div>

    <div class="group">
      <h3>Medications given</h3>
      <div id="meds"></div>
      <button type="button" class="btn btn-secondary" id="addmed">+ Add another medication</button>
    </div>

    <div class="group">
      <label class="field"><span>Notes <span class="opt">(optional)</span></span>
        <textarea id="notes" maxlength="2000" placeholder="How he seemed, anything unusual"></textarea></label>
    </div>

    <button type="submit" class="btn btn-primary" id="save">Save entry</button>
    <p id="status" class="status" role="status" tabindex="-1"></p>
  </form>
</section>

<section id="view-log" class="view" aria-labelledby="h-log" hidden>
  <h2 id="h-log">Log</h2>
  <div class="filters">
    <label class="field"><span>Day</span>
      <select id="f-day">
        <option value="all">All days</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="pick">Pick a date</option>
      </select></label>
    <label class="field" id="pickwrap" hidden><span>Date</span><input type="date" id="f-date"></label>
    <label class="field"><span>Caregiver</span>
      <select id="f-who"><option value="all">All</option></select></label>
  </div>
  <div id="loglist"></div>
</section>

<section id="view-today" class="view" aria-labelledby="h-today" hidden>
  <h2 id="h-today">Today</h2>
  <div id="todaybox"></div>
</section>

<nav class="tabbar" aria-label="Views">
  <button type="button" class="tab" data-view="add" aria-current="page">Add</button>
  <button type="button" class="tab" data-view="log">Log</button>
  <button type="button" class="tab" data-view="today">Today</button>
</nav>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var entries = [];
  var loadFailed = false;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nowLocal() { var d = new Date(); return dayStr(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function nowTime() { return nowLocal().slice(11); }
  function todayStr() { return dayStr(new Date()); }
  function yesterdayStr() { var d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function fmtTime(t) {
    if (!t) return "";
    var h = parseInt(t.slice(0, 2), 10), m = t.slice(3, 5);
    return ((h % 12) || 12) + ":" + m + (h < 12 ? " AM" : " PM");
  }
  function fmtDay(s) {
    if (s === todayStr()) return "Today";
    if (s === yesterdayStr()) return "Yesterday";
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function num(v) { return v === null || v === undefined ? null : +v; }
  function show(v) {
    ["add", "log", "today"].forEach(function (k) {
      $("view-" + k).hidden = k !== v;
    });
    document.querySelectorAll(".tab").forEach(function (b) {
      if (b.getAttribute("data-view") === v) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    if (v !== "add") load();
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-view")); });
  });

  /* name */
  try { $("name").value = localStorage.getItem("aide-name") || ""; } catch (e) {}
  $("when").value = nowLocal();

  /* meds */
  function addMedRow() {
    var row = el("div", "medrow");
    var l1 = el("label", "field"); l1.appendChild(el("span", "", "Medication name"));
    var n = el("input"); n.type = "text"; n.maxLength = 120; n.className = "m-name"; l1.appendChild(n);
    var two = el("div", "two");
    var l2 = el("label", "field"); l2.appendChild(el("span", "", "Dose"));
    var d = el("input"); d.type = "text"; d.maxLength = 80; d.className = "m-dose"; l2.appendChild(d);
    var l3 = el("label", "field"); l3.appendChild(el("span", "", "Time given"));
    var t = el("input"); t.type = "time"; t.className = "m-time"; t.value = nowTime(); l3.appendChild(t);
    two.appendChild(l2); two.appendChild(l3);
    var rm = el("button", "btn btn-small", "remove"); rm.type = "button";
    rm.setAttribute("aria-label", "Remove this medication");
    rm.addEventListener("click", function () { row.remove(); });
    row.appendChild(l1); row.appendChild(two); row.appendChild(rm);
    $("meds").appendChild(row);
  }
  $("addmed").addEventListener("click", function () {
    addMedRow();
    var rows = $("meds").querySelectorAll(".m-name");
    rows[rows.length - 1].focus();
  });
  addMedRow();

  function setStatus(msg, cls) {
    var s = $("status");
    s.textContent = msg; s.className = "status " + (cls || "");
  }

  function collect() {
    var meds = [];
    $("meds").querySelectorAll(".medrow").forEach(function (r) {
      meds.push({
        name: r.querySelector(".m-name").value.trim(),
        dose: r.querySelector(".m-dose").value.trim(),
        time: r.querySelector(".m-time").value
      });
    });
    return {
      when: $("when").value || nowLocal(),
      name: $("name").value.trim(),
      sys: $("sys").value.trim(), dia: $("dia").value.trim(),
      pulse: $("pulse").value.trim(), oxygen: $("oxygen").value.trim(),
      temp: $("temp").value.trim(), breaths: $("breaths").value.trim(),
      meds: meds, notes: $("notes").value.trim()
    };
  }

  $("form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = collect();
    var hasMed = data.meds.some(function (m) { return m.name || m.dose; });
    var empty = !data.sys && !data.dia && !data.pulse && !data.oxygen && !data.temp && !data.breaths && !hasMed && !data.notes;
    if (empty) { setStatus("Nothing filled in yet", "err"); $("status").focus(); return; }
    var btn = $("save");
    btn.disabled = true; btn.textContent = "Saving…";
    setStatus("", "");
    fetch("/api/entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) {
        if (!res.ok) throw new Error(b && b.error ? b.error : "failed");
        return b;
      });
    }).then(function () {
      try { if (data.name) localStorage.setItem("aide-name", data.name); } catch (e) {}
      ["sys", "dia", "pulse", "oxygen", "temp", "breaths", "notes"].forEach(function (k) { $(k).value = ""; });
      $("meds").textContent = ""; addMedRow();
      $("when").value = nowLocal();
      setStatus("Saved", "ok");
      $("status").focus();
      show("add");
    }).catch(function (e) {
      var m = e && e.message && e.message !== "failed" && e.message !== "Failed to fetch" ? e.message + " " : "";
      setStatus(m + "Could not save. Your entry is still here. Tap Save entry to try again.", "err");
      $("status").focus();
    }).then(function () {
      btn.disabled = false; btn.textContent = "Save entry";
    });
  });

  /* load */
  function load() {
    return fetch("/api/entries").then(function (r) {
      if (!r.ok) throw new Error("x");
      return r.json();
    }).then(function (b) {
      entries = b.entries || []; loadFailed = false;
    }).catch(function () { loadFailed = true; }).then(function () {
      renderWho(); renderLog(); renderToday();
    });
  }
  function retryBox(into) {
    var p = el("p", "status err", "Could not load the log.");
    var b = el("button", "btn btn-secondary", "Try again"); b.type = "button";
    b.addEventListener("click", load);
    into.appendChild(p); into.appendChild(b);
  }

  function renderWho() {
    var sel = $("f-who"), cur = sel.value;
    var names = [];
    entries.forEach(function (e) { var n = e.caregiver || "Name not given"; if (names.indexOf(n) < 0) names.push(n); });
    names.sort();
    sel.textContent = "";
    var all = el("option", "", "All"); all.value = "all"; sel.appendChild(all);
    names.forEach(function (n) { var o = el("option", "", n); o.value = n; sel.appendChild(o); });
    sel.value = names.indexOf(cur) >= 0 ? cur : "all";
  }

  function entryCard(e) {
    var c = el("article", "card");
    c.appendChild(el("h4", "", fmtTime(e.at.slice(11)) + " · " + (e.caregiver || "Name not given")));
    var chips = [];
    if (num(e.sys) !== null && num(e.dia) !== null) chips.push("BP " + e.sys + "/" + e.dia);
    else if (num(e.sys) !== null) chips.push("BP top " + e.sys);
    else if (num(e.dia) !== null) chips.push("BP bottom " + e.dia);
    if (num(e.pulse) !== null) chips.push("Pulse " + e.pulse);
    if (num(e.oxygen) !== null) chips.push("O2 " + e.oxygen + "%");
    if (num(e.temp) !== null) chips.push("Temp " + e.temp);
    if (num(e.breaths) !== null) chips.push("Breaths " + e.breaths);
    if (chips.length) {
      var w = el("div", "chips");
      chips.forEach(function (t) { w.appendChild(el("span", "chip", t)); });
      c.appendChild(w);
    }
    if (e.meds.length) {
      var ul = el("ul", "meds");
      e.meds.forEach(function (m) {
        var t = [fmtTime(m.time), m.name, m.dose].filter(Boolean).join(" ");
        ul.appendChild(el("li", "", t));
      });
      c.appendChild(ul);
    }
    if (e.notes) c.appendChild(el("p", "", e.notes));
    return c;
  }

  function renderLog() {
    var box = $("loglist"); box.textContent = "";
    if (loadFailed) { retryBox(box); return; }
    var dm = $("f-day").value, who = $("f-who").value;
    $("pickwrap").hidden = dm !== "pick";
    var want = dm === "today" ? todayStr() : dm === "yesterday" ? yesterdayStr() : dm === "pick" ? $("f-date").value : null;
    var list = entries.filter(function (e) {
      if (want && e.day !== want) return false;
      if (dm === "pick" && !want) return true;
      if (who !== "all" && (e.caregiver || "Name not given") !== who) return false;
      return true;
    });
    if (!list.length) { box.appendChild(el("p", "empty", "No entries yet.")); return; }
    var last = "";
    list.forEach(function (e) {
      if (e.day !== last) { box.appendChild(el("h3", "day-h", fmtDay(e.day))); last = e.day; }
      box.appendChild(entryCard(e));
    });
  }
  ["f-day", "f-date", "f-who"].forEach(function (id) { $(id).addEventListener("change", renderLog); });

  function renderToday() {
    var box = $("todaybox"); box.textContent = "";
    if (loadFailed) { retryBox(box); return; }
    var td = entries.filter(function (e) { return e.day === todayStr(); });
    var dl = el("dl", "sum");
    function row(label, text) {
      var d = el("div"); d.appendChild(el("dt", "", label));
      d.appendChild(el("dd", text ? "" : "none", text || "not recorded today"));
      dl.appendChild(d);
    }
    function first(fn) { for (var i = 0; i < td.length; i++) { if (fn(td[i])) return td[i]; } return null; }
    function at(e) { return " at " + fmtTime(e.at.slice(11)); }
    var bp = first(function (e) { return num(e.sys) !== null && num(e.dia) !== null; });
    row("Blood pressure", bp ? bp.sys + "/" + bp.dia + " mmHg" + at(bp) : "");
    var p = first(function (e) { return num(e.pulse) !== null; });
    row("Pulse", p ? p.pulse + " bpm" + at(p) : "");
    var o = first(function (e) { return num(e.oxygen) !== null; });
    row("Oxygen", o ? o.oxygen + "%" + at(o) : "");
    var t = first(function (e) { return num(e.temp) !== null; });
    row("Temperature", t ? t.temp + " F" + at(t) : "");
    var b = first(function (e) { return num(e.breaths) !== null; });
    row("Breaths per minute", b ? b.breaths + at(b) : "");
    var best = null, bestKey = "";
    td.forEach(function (e) {
      e.meds.forEach(function (m) {
        var key = (m.time || e.at.slice(11)) + "|" + e.at;
        if (!best || key > bestKey) { best = { m: m, t: m.time || e.at.slice(11) }; bestKey = key; }
      });
    });
    row("Last medication", best ? [best.m.name, best.m.dose].filter(Boolean).join(" ") + " at " + fmtTime(best.t) : "");
    box.appendChild(dl);

    var h = el("h3", "day-h", "Entries today");
    box.appendChild(h);
    box.appendChild(el("p", "", td.length + (td.length === 1 ? " entry" : " entries") + " today"));
    var counts = {}, order = [];
    td.forEach(function (e) {
      var n = e.caregiver || "Name not given";
      if (!(n in counts)) { counts[n] = 0; order.push(n); }
      counts[n]++;
    });
    box.appendChild(el("h3", "day-h", "Logged by"));
    if (!order.length) box.appendChild(el("p", "empty", "No one has logged yet today."));
    else {
      var ul = el("ul", "meds");
      order.forEach(function (n) { ul.appendChild(el("li", "", n + " (" + counts[n] + ")")); });
      box.appendChild(ul);
    }
  }

  load();
})();
</script>`;
}
