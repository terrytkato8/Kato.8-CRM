(function () {
  "use strict";
  var config = window.KATO8_CRM_CONFIG || {};
  var live = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  var supabaseClient = live ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  var storageKey = "kato8-crm-local-v1";
  var records = [];
  var selectedId = null;
  var channel = null;
  var fields = {
    company: document.getElementById("company"), contact: document.getElementById("contact"),
    email: document.getElementById("email"), stage: document.getElementById("stage"),
    value: document.getElementById("value"), next_date: document.getElementById("next-date"),
    next_action: document.getElementById("next-action"), scope: document.getElementById("scope"),
    notes: document.getElementById("notes")
  };
  var status = document.getElementById("connection-status");
  function escapeHtml(text) { return String(text || "").replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function money(value) { return Number(value || 0).toLocaleString(undefined, {style:"currency", currency:"USD", maximumFractionDigits:0}); }
  function id() { return "client-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8); }
  function setStatus(text, mode) { status.textContent = text; status.className = "status status-" + mode; }
  function localLoad() { try { var saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); records = Array.isArray(saved) ? saved : []; } catch (e) { records = []; } }
  function localSave() { localStorage.setItem(storageKey, JSON.stringify(records)); }
  async function loadRecords() {
    if (!live) { localLoad(); setStatus("Local demo", "local"); return; }
    var result = await supabaseClient.from("clients").select("*").order("updated_at", {ascending:false});
    if (result.error) { setStatus("Sync error", "error"); window.alert("Could not load shared CRM data: " + result.error.message); return; }
    records = result.data || []; setStatus("Live synced", "live"); subscribe();
  }
  function subscribe() {
    channel = supabaseClient.channel("clients-live").on("postgres_changes", {event:"*", schema:"public", table:"clients"}, function (payload) {
      if (payload.eventType === "INSERT") records.unshift(payload.new);
      if (payload.eventType === "UPDATE") records = records.map(function (r) { return r.id === payload.new.id ? payload.new : r; });
      if (payload.eventType === "DELETE") records = records.filter(function (r) { return r.id !== payload.old.id; });
      render();
    }).subscribe();
  }
  async function persist(record) {
    if (!live) { var index = records.findIndex(function (r) { return r.id === record.id; }); if (index >= 0) records[index] = record; else records.unshift(record); localSave(); return true; }
    var result = await supabaseClient.from("clients").upsert(record).select().single();
    if (result.error) { window.alert("Could not save this client: " + result.error.message); return false; }
    records = records.map(function (r) { return r.id === result.data.id ? result.data : r; });
    if (!records.some(function (r) { return r.id === result.data.id; })) records.unshift(result.data);
    return true;
  }
  async function remove(recordId) {
    if (!live) { records = records.filter(function (r) { return r.id !== recordId; }); localSave(); return true; }
    var result = await supabaseClient.from("clients").delete().eq("id", recordId);
    if (result.error) { window.alert("Could not delete this client: " + result.error.message); return false; }
    records = records.filter(function (r) { return r.id !== recordId; }); return true;
  }
  function visibleRecords() {
    var query = document.getElementById("search").value.toLowerCase().trim();
    var stage = document.getElementById("stage-filter").value;
    return records.filter(function (r) {
      return (stage === "all" || r.stage === stage) && (!query || [r.company,r.contact,r.email,r.scope,r.notes,r.next_action].join(" ").toLowerCase().indexOf(query) !== -1);
    });
  }
  function renderMetrics() {
    var open = records.filter(function (r) { return r.stage !== "Won" && r.stage !== "Lost"; });
    var overdue = open.filter(function (r) { return r.next_date && r.next_date < new Date().toISOString().slice(0,10); });
    document.getElementById("metrics").innerHTML = [["Total clients", records.length],["Open pipeline", money(open.reduce(function (n,r) { return n + Number(r.value || 0); }, 0))],["Won value", money(records.filter(function (r) { return r.stage === "Won"; }).reduce(function (n,r) { return n + Number(r.value || 0); }, 0))],["Overdue actions", overdue.length]].map(function (item) { return "<div class=\"metric\"><strong>" + item[1] + "</strong><span>" + item[0] + "</span></div>"; }).join("");
  }
  function renderList() {
    var visible = visibleRecords();
    document.getElementById("client-list").innerHTML = visible.length ? visible.map(function (r) {
      return "<button class=\"client-card " + (r.id === selectedId ? "selected" : "") + "\" data-id=\"" + escapeHtml(r.id) + "\"><span class=\"card-top\"><strong>" + escapeHtml(r.company || "Unnamed client") + "</strong><em class=\"stage-" + String(r.stage || "Lead").toLowerCase() + "\">" + escapeHtml(r.stage || "Lead") + "</em></span><span class=\"muted\">" + escapeHtml(r.contact || "No contact") + "</span><span class=\"card-bottom\"><span>" + money(r.value) + "</span><span>" + escapeHtml(r.next_action || r.next_date || "No next action") + "</span></span></button>";
    }).join("") : "<div class=\"no-records\">No matching clients yet.</div>";
    document.querySelectorAll(".client-card").forEach(function (button) { button.addEventListener("click", function () { select(button.dataset.id); }); });
  }
  function renderEditor() {
    var record = records.find(function (r) { return r.id === selectedId; });
    document.getElementById("empty-state").hidden = Boolean(record);
    document.getElementById("client-form").hidden = !record;
    if (!record) return;
    document.getElementById("record-title").textContent = record.company || "New client";
    Object.keys(fields).forEach(function (key) { fields[key].value = record[key] || ""; });
  }
  function render() { renderMetrics(); renderList(); renderEditor(); }
  function select(recordId) { selectedId = recordId; render(); }
  function newClient() {
    var params = new URLSearchParams(location.search);
    var record = {id:id(), company:params.get("company") || "", contact:params.get("contact") || "", email:params.get("email") || "", stage:"Lead", value:params.get("value") || "", next_date:"", next_action:"", scope:params.get("scope") || "", notes:params.get("source") ? "Opened from " + params.get("source") : ""};
    records.unshift(record); selectedId = record.id; if (!live) localSave(); render(); fields.company.focus();
  }
  document.getElementById("client-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var record = records.find(function (r) { return r.id === selectedId; }); if (!record) return;
    Object.keys(fields).forEach(function (key) { record[key] = fields[key].value.trim(); });
    record.updated_at = new Date().toISOString();
    if (await persist(record)) { document.getElementById("save-message").textContent = "Saved " + new Date().toLocaleTimeString(); render(); }
  });
  document.getElementById("new-client").addEventListener("click", newClient);
  document.getElementById("empty-new").addEventListener("click", newClient);
  document.getElementById("cancel").addEventListener("click", function () { selectedId = null; render(); });
  document.getElementById("delete-client").addEventListener("click", async function () { if (selectedId && window.confirm("Delete this client?") && await remove(selectedId)) { selectedId = null; render(); } });
  document.getElementById("search").addEventListener("input", renderList);
  document.getElementById("stage-filter").addEventListener("change", renderList);
  document.getElementById("sign-in-button").addEventListener("click", async function () {
    if (!live) { window.alert("Configure Supabase in config.js to enable shared sign-in and live sync."); return; }
    var dialog = document.getElementById("auth-dialog"); dialog.showModal();
  });
  document.getElementById("auth-form").addEventListener("submit", async function (event) {
    event.preventDefault(); var email = document.getElementById("auth-email").value.trim();
    var result = await supabaseClient.auth.signInWithOtp({email:email, options:{emailRedirectTo:location.href}});
    document.getElementById("auth-message").textContent = result.error ? result.error.message : "Check your email for the sign-in link.";
  });
  loadRecords().then(function () {
    var params = new URLSearchParams(location.search);
    if (params.get("company")) newClient(); else render();
  });
}());
