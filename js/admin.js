/**
 * ============================================================
 * admin.js — Panel Superadmin & Tim Admin: shell, bilah atas (cari/notifikasi),
 * Dashboard (KPI, grafik, verifikasi cepat, infrastruktur + Supabase), Produk
 * v3.5: menu bertanda superOnly disembunyikan dari role "Admin".
 * ============================================================
 */

const ADMIN_MENU = [
  { group: 'Ringkasan', items: [{ id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' }] },
  { group: 'Katalog', items: [
    { id: 'products', icon: 'package', label: 'Produk' },
    { id: 'keys', icon: 'key-round', label: 'Kode Akses' }] },
  { group: 'Member & Transaksi', items: [
    { id: 'orders', icon: 'receipt', label: 'Verifikasi Pesanan', badge: true },
    { id: 'custom', icon: 'wand-sparkles', label: 'Aplikasi Custom', badge: true, superOnly: true },
    { id: 'crm', icon: 'contact', label: 'CRM Member', badge: true },
    { id: 'access', icon: 'user-plus', label: 'Pemberian Akses' }] },
  { group: 'Konten', items: [
    { id: 'bootcamps', icon: 'calendar-days', label: 'Bootcamp', badge: true },
    { id: 'showcase', icon: 'trophy', label: 'Pameran Karya', badge: true },
    { id: 'guides', icon: 'book-open', label: 'Panduan' },
    { id: 'announcements', icon: 'megaphone', label: 'Pengumuman' },
    { id: 'helpdesk', icon: 'life-buoy', label: 'Helpdesk' }] },
  { group: 'Komunikasi', items: [
    { id: 'blast', icon: 'send', label: 'Blast WA / Email', superOnly: true },
    { id: 'notif', icon: 'bell-ring', label: 'Notifikasi & Fonnte', superOnly: true }] },
  { group: 'Sistem', items: [
    { id: 'logs', icon: 'activity', label: 'Log Aktivitas', superOnly: true },
    { id: 'import', icon: 'database-zap', label: 'Import & Migrasi', superOnly: true },
    { id: 'settings', icon: 'settings', label: 'Pengaturan', superOnly: true }] }
];
/** v3.5: halaman khusus Superadmin (role "Admin" diarahkan kembali ke Dashboard). */
const SUPER_PAGES = ['custom', 'blast', 'notif', 'logs', 'import', 'settings'];
/** Menu sesuai role yang sedang masuk. */
function adminMenu() { return ADMIN_MENU.map(g => ({ group: g.group, items: g.items.filter(m => isSuper() || !m.superOnly) })).filter(g => g.items.length); }

const ACTION_LABELS = {
  LOGIN: 'Login', LOGOUT: 'Logout', LOGIN_FAILED: 'Login Gagal', REGISTER: 'Pendaftaran', PROFILE_UPDATE: 'Profil Dilengkapi',
  REDEEM_CODE: 'Redeem Kode', REDEEM_FAILED: 'Redeem Gagal', VIEW_PRODUCT: 'Membuka Produk', LEAD_CREATE: 'Lead Baru', LEAD_UPDATE: 'Lead Diubah', LEAD_DELETE: 'Lead Dihapus',
  ORDER_CREATE: 'Pesanan Dibuat', ORDER_APPROVE: 'Pesanan Disetujui', ORDER_REJECT: 'Pesanan Ditolak',
  GRANT_BULK: 'Pemberian Akses', ACCESS_REVOKE: 'Akses Dicabut', MEMBER_ADD: 'Member Ditambah', MEMBER_UPDATE: 'Member Diubah',
  USER_BLOCK: 'Member Diblokir', USER_UNBLOCK: 'Member Diaktifkan',
  PRODUCT_CREATE: 'Produk Ditambah', PRODUCT_UPDATE: 'Produk Diubah', PRODUCT_ARCHIVE: 'Produk Diarsipkan', PRODUCT_RESTORE: 'Produk Diaktifkan',
  PRODUCT_PAUSE: 'Checkout Ditutup', PRODUCT_DELETE: 'Produk Dihapus', VIEW_TEXT: 'Membaca Materi Teks', ADMIN_TEAM_ADD: 'Admin Ditambah', ADMIN_TEAM_TOGGLE: 'Status Admin Diubah', ADMIN_TEAM_REMOVE: 'Admin Dihapus',
  KEY_GENERATE: 'Kode Dibuat', KEY_EDIT: 'Kode Diubah', KEY_DELETE: 'Kode Dihapus',
  HELPDESK_SAVE: 'Artikel Helpdesk', HELPDESK_DELETE: 'Artikel Dihapus', HELPCAT_SAVE: 'Kategori Helpdesk', HELPCAT_DELETE: 'Kategori Dihapus',
  ANNOUNCE_SAVE: 'Pengumuman', ANNOUNCE_DELETE: 'Pengumuman Dihapus', SHOWCASE_SAVE: 'Karya Disimpan', SHOWCASE_DELETE: 'Karya Dihapus',
  BOOTCAMP_SAVE: 'Bootcamp Disimpan', BOOTCAMP_DELETE: 'Bootcamp Dihapus', BOOTCAMP_REGISTER: 'Daftar Bootcamp', BOOTCAMP_ATTEND: 'Absen Bootcamp',
  BOOTCAMP_APPROVE: 'Peserta Disetujui', BOOTCAMP_REJECT: 'Peserta Ditolak', BOOTCAMP_GRANT: 'Akses Peserta Bootcamp', BOOTCAMP_ATTEND_ADMIN: 'Absen oleh Admin',
  SHOWCASE_SUBMIT: 'Ajukan Karya', SHOWCASE_APPROVE: 'Karya Disetujui', SHOWCASE_REJECT: 'Karya Ditolak', SHOWCASE_CONFIG: 'Pengaturan Pameran',
  GUIDE_SAVE: 'Panduan Disimpan', GUIDE_DELETE: 'Panduan Dihapus', GUIDE_CONFIG: 'Judul Panduan', NOTIF_SAVE: 'Notifikasi Diubah',
  BLAST_CREATE: 'Blast Dibuat', BLAST_PAUSE: 'Blast Dijeda', BLAST_RESUME: 'Blast Dilanjutkan', BLAST_CANCEL: 'Blast Dibatalkan', BLAST_RETRY: 'Blast Diulang', BLAST_RUN: 'Blast Manual', BLAST_DELETE: 'Blast Dihapus',
  SETTINGS_SAVE: 'Pengaturan Disimpan', BACKUP: 'Backup', LOG_ARCHIVE: 'Log Diarsipkan', IMPORT_RUN: 'Import Data', IMPORT_CSV: 'Import CSV', TRIGGER_INSTALL: 'Trigger Dipasang'
};

const Admin = {
  booted: false,

  /**
   * Dipanggil saat panel dibuka. v3.2: data menu inti diambil dalam SATU panggilan (batch),
   * lalu menu lain disiapkan saat browser senggang → pindah menu instan tanpa menunggu server.
   */
  async boot() {
    if (this.booted) return;
    this.booted = true;
    Public.prefetch();
    // v3.3: tunggu pustaka tabel/grafik (halaman Dashboard pun menunggunya) → permintaan halaman yang sedang
    // dibuka (mis. dashboard + log realtime) dan menu inti tergabung dalam SATU panggilan batch.
    // Selama itu tampilan sudah terisi dari cache lokal, jadi pengguna tidak menunggu.
    await AdminLibs.ready();
    const first = await this.prefetch(this.core());
    if (!first || !first.success) { this.booted = false; return; }
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
    idle(() => this.prefetch(this.extra(), true));
    // Badge menu (pesanan/pendaftar/custom): tiap 90 dtk saat aktif, 5 mnt saat tidak ada interaksi, berhenti saat tab tersembunyi
    Activity.reset('kpi');
    clearInterval(AppState.timers.kpi);
    AppState.timers.kpi = setInterval(() => { if (Activity.due('kpi', 90000, 300000)) this.fetch('dashboard'); }, 30000);
  },

  /** v3.5: menu inti & menu lain per role (role "Admin" tidak memuat data khusus Superadmin). */
  core() { return ['dashboard', 'ordersAdmin', 'productsAdmin', 'crm'].concat(isSuper() ? ['customAdmin'] : []); },
  extra() {
    return ['showcaseAdmin', 'keysAdmin', 'helpdeskAdmin', 'announcementsAdmin', 'bootcampsAdmin', 'guidesAdmin', 'showcaseConfigAdmin']
      .concat(isSuper() ? ['notifConfig', 'settingsAdmin', 'blastAdmin'] : []);
  },

  /** Beberapa aksi baca dalam 1 panggilan server. skipFresh: lewati aksi yang cachenya masih segar. */
  async prefetch(actions, skipFresh) {
    const list = skipFresh ? actions.filter(a => !this.isFresh(a, 120000)) : actions;
    if (!list.length) return { success: true };
    const all = await this.fetchMany(list);
    return all.some(r => r && r.success) ? { success: true } : (all[0] || { success: false });
  },

  /** Tombol "Segarkan": ambil ulang dari Sheets (lewati cache server) — menu inti dalam 1 panggilan. */
  refreshAll() {
    this.extra().concat(['accessHistory']).forEach(a => { this.stale[a] = 1; });   // menu lain: diambil segar saat dibuka
    return this.fetchMany(this.core(), { _fresh: true });
  },
  stale: {},

  key(action) { return userKey('a:' + action); },
  cached(action) { const c = Store.get(this.key(action), null); return c ? c.data : null; },
  isFresh(action, ms) { const c = Store.get(this.key(action), null); return !!(c && c.t && Date.now() - c.t < ms); },

  /** Simpan data → badge → render ulang HANYA bila data berubah (tabel tidak dibangun ulang sia-sia). */
  ingest(action, data, force) {
    const h = hashData(data), prev = Store.get(this.key(action), null);
    const changed = force || !prev || prev.h !== h || !AppState.a[action];
    AppState.a[action] = data;
    Store.set(this.key(action), { t: Date.now(), h: h, data: data });
    if (action === 'dashboard') setDashBadges(data.kpi);
    if (action === 'ordersAdmin') setNavBadge('orders', data.kpi.pending);
    const r = ADMIN_RENDER[action];
    if (r && changed) r(data);
  },

  /**
   * Ambil data admin dari server (dipakai setelah aksi simpan & tombol Segarkan).
   * v3.3: beberapa Admin.fetch() berurutan (mis. 'ordersAdmin' lalu 'dashboard') otomatis
   * digabung jadi 1 panggilan batch. payload {_fresh:true} = lewati cache server.
   */
  async fetch(action, payload) {
    const k = apiEpoch() + '|' + action + '|' + JSON.stringify(payload || {});
    const p = apiQ(action, payload || {}).then(res => { if (res && res.success) this.ingest(action, res.data); return res; });
    this.pending[k] = p;
    p.then(() => { if (this.pending[k] === p) delete this.pending[k]; });
    return p;
  },
  pending: {},
  fetchMany(actions, payload) { return Promise.all(actions.map(a => this.fetch(a, payload))); },

  /** SWR untuk halaman admin: render dari cache seketika; ke server hanya bila cache > 30 detik. */
  load(action, payload) {
    const c = AppState.a[action] || this.cached(action);
    if (c) { AppState.a[action] = c; const r = ADMIN_RENDER[action]; if (r) r(c); }
    if (this.stale[action]) { delete this.stale[action]; return this.fetch(action, Object.assign({ _fresh: true }, payload || {})); }
    if (c && this.isFresh(action, 30000)) return Promise.resolve({ success: true, data: c, cached: true });
    const inFlight = this.pending[apiEpoch() + '|' + action + '|' + JSON.stringify(payload || {})];
    if (inFlight) return inFlight;                  // sudah diminta (mis. oleh batch pembuka) → tunggu hasil yang sama
    return this.fetch(action, payload);
  }
};

/** Peta aksi → fungsi render (diisi oleh tiap modul halaman). */
const ADMIN_RENDER = {};

function shortText(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

function renderSidebar() {
  const menu = document.getElementById('sidebarMenu');
  if (!menu) return;
  renderSidebarBrand();
  const roleKey = isSuper() ? 'super' : 'staff';
  if (menu.dataset.ready === roleKey) { refreshIcons(); return; }
  menu.dataset.ready = roleKey;
  menu.innerHTML = adminMenu().map(g => '<li class="nav-group">' + esc(g.group) + '</li>' + g.items.map(m =>
    '<li><button type="button" class="sidebar-link w-full" data-nav="admin-' + m.id + '" onclick="go(\'admin/' + m.id + '\')">' +
    '<i data-lucide="' + m.icon + '" class="w-[18px] h-[18px]"></i><span class="flex-1 text-left">' + m.label + '</span>' +
    (m.badge ? '<span class="nav-badge" data-badge="' + m.id + '" hidden>0</span>' : '') + '</button></li>').join('')).join('');
  const d = Admin.cached('dashboard');
  if (d) setDashBadges(d.kpi);
  refreshIcons();
}

function setDashBadges(k) {
  setNavBadge('orders', k.pending);
  setNavBadge('custom', k.customNew || 0);
  setNavBadge('crm', k.pendingReg || 0);
  setNavBadge('bootcamps', k.bootcampPending || 0);     // v3.4: bukti peserta menunggu verifikasi
  setNavBadge('showcase', k.showcasePending || 0);      // v3.4: pengajuan karya member
  renderBell(k);                                        // v3.5: lonceng di bilah atas
}

function renderSidebarBrand() {
  const s = (AppState.pub && AppState.pub.settings) || {};
  const b = document.getElementById('brandBadge');
  if (b) b.outerHTML = '<div id="brandBadge">' + brandLogoHtml(44) + '</div>';
  document.getElementById('brandName').textContent = s.appName || Store.get('brandName', '') || 'Admin Central';
  const rl = document.getElementById('adminRoleLabel'); if (rl) rl.textContent = isSuper() ? 'Admin Suite · Superadmin' : 'Tim Admin Portal Kelas';
  renderAdminTop();
}


// ════════════════════════════════════════════════════════════
// BILAH ATAS ADMIN (v3.5) — pencarian cepat · lonceng tindakan · profil & role
// ════════════════════════════════════════════════════════════
function renderAdminTop() {
  const nm = document.getElementById('adminName');
  if (!nm) return;
  const name = AppState.name || String(AppState.email || '').split('@')[0] || 'Admin';
  nm.textContent = name;
  document.getElementById('adminAvatar').textContent = initial(name);
  document.getElementById('adminWho').innerHTML = '<span class="role35' + (isSuper() ? ' is-super' : '') + '">' + (isSuper() ? 'Superadmin' : 'Admin') + '</span> ' + esc(AppState.email || '');
  const d = Admin.cached && Admin.cached('dashboard');
  if (d) renderBell(d.kpi);
  if (!renderAdminTop._bound) {
    renderAdminTop._bound = true;
    document.addEventListener('click', e => {
      if (!e.target.closest('.admintop-search')) { const b = document.getElementById('adminSearchBox'); if (b) b.hidden = true; }
      if (!e.target.closest('.admintop-bell') && !e.target.closest('#notifDrop')) { const n = document.getElementById('notifDrop'); if (n) n.hidden = true; }
    });
  }
}

/** Daftar hal yang perlu ditindaklanjuti (sesuai role). */
function bellItems(k) {
  k = k || {};
  return [
    ['receipt', 'Pesanan menunggu verifikasi', k.pending, "go('admin/orders')"],
    ['user-round-plus', 'Pendaftar member baru', k.pendingReg, "CF.tab='pending';go('admin/crm')"],
    ['calendar-check', 'Bukti peserta bootcamp', k.bootcampPending, "go('admin/bootcamps')"],
    ['trophy', 'Pengajuan pameran karya', k.showcasePending, "go('admin/showcase')"],
    isSuper() ? ['wand-sparkles', 'Aplikasi custom perlu tindakan', k.customNew, "go('admin/custom')"] : null
  ].filter(x => x && Number(x[2]) > 0);
}
function renderBell(k) {
  const dot = document.getElementById('bellDot');
  if (!dot) return;
  const items = bellItems(k);
  dot.hidden = !items.length;
  const box = document.getElementById('notifDrop');
  if (box) box.innerHTML = '<p class="drop35-h">Perlu tindakan</p>' + (items.length ? items.map(x =>
    '<button type="button" class="drop35-item" onclick="document.getElementById(\'notifDrop\').hidden=true;' + x[3] + '"><span class="drop35-ico"><i data-lucide="' + x[0] + '" class="w-4 h-4"></i></span>' +
    '<span class="flex-1">' + esc(x[1]) + '</span><span class="drop35-n">' + x[2] + '</span></button>').join('')
    : '<p class="text-sm text-muted px-3 py-4 text-center">Semua beres — tidak ada yang menunggu. 🎉</p>');
}
function toggleNotifDrop() {
  const box = document.getElementById('notifDrop');
  if (!box) return;
  const d = Admin.cached('dashboard'); renderBell(d && d.kpi);
  box.hidden = !box.hidden; refreshIcons();
}

/** Pencarian cepat: menu, member, pesanan, produk (dari data yang sudah dimuat — tanpa ke server). */
const ASearch = { items: [], hl: 0 };
function adminSearch(q) {
  const box = document.getElementById('adminSearchBox');
  if (!box) return;
  q = String(q || '').trim().toLowerCase();
  if (!q) { box.hidden = true; return; }
  const has = t => String(t || '').toLowerCase().indexOf(q) > -1;
  // urutan relevansi: sama persis → diawali kata kunci (mis. "member12@…") → mengandung
  const rank = (...vals) => Math.min(...vals.map(v => { v = String(v || '').toLowerCase(); return v === q ? 0 : (v.indexOf(q + '@') === 0 || v.indexOf(q) === 0 && !/\d/.test(v.charAt(q.length))) ? 1 : v.indexOf(q) === 0 ? 2 : 3; }));
  const best = (list, f) => list.map(x => [rank.apply(null, f(x)), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const out = [];
  adminMenu().forEach(g => g.items.forEach(m => { if (has(m.label) || has(g.group)) out.push({ g: 'Menu', icon: m.icon, t: m.label, sub: g.group, act: () => go('admin/' + m.id) }); }));
  const crm = AppState.a.crm || Admin.cached('crm');
  if (crm && crm.members) best(crm.members.filter(m => has(m.email) || has(m.nickname) || has(m.fullName) || has(m.whatsapp)), m => [m.email, m.nickname, m.fullName, m.whatsapp]).slice(0, 5)
    .forEach(m => out.push({ g: 'Member', icon: 'user', t: m.fullName || m.nickname || m.email, sub: m.email + (m.whatsapp ? ' · ' + m.whatsapp : ''), act: () => adminJump('crm', 'tblCrm', m.email) }));
  const ord = AppState.a.ordersAdmin || Admin.cached('ordersAdmin');
  if (ord && ord.orders) best(ord.orders.filter(o => has(o.Order_ID) || has(o.Email) || has(o.Name) || has(o.Product)), o => [o.Order_ID, o.Email, o.Name, o.Product]).slice(0, 5)
    .forEach(o => out.push({ g: 'Pesanan', icon: 'receipt', t: o.Order_ID + ' · ' + (o.Product || ''), sub: (o.Email || '') + ' · ' + o.Status, act: () => adminJump('orders', 'tblOrders', o.Order_ID) }));
  const prods = AppState.a.productsAdmin || Admin.cached('productsAdmin');
  if (prods) best(prods.filter(p => !p.customReqId && has(p.Title)), p => [p.Title]).slice(0, 5)
    .forEach(p => out.push({ g: 'Produk', icon: iconFor(p.Category), t: p.Title, sub: catLabel(p.Category) + ' · ' + p.Status, act: () => adminJump('products', 'tblProducts', p.Title) }));
  ASearch.items = out; ASearch.hl = 0;
  let last = '';
  box.innerHTML = out.length ? out.map((x, i) => (x.g !== last ? '<p class="drop35-h">' + (last = x.g) + '</p>' : '') +
    '<button type="button" class="drop35-item' + (i ? '' : ' is-hl') + '" data-i="' + i + '" onclick="adminSearchGo(' + i + ')"><span class="drop35-ico"><i data-lucide="' + esc(x.icon) + '" class="w-4 h-4"></i></span>' +
    '<span class="min-w-0 flex-1"><span class="block truncate">' + esc(x.t) + '</span><small class="truncate">' + esc(x.sub) + '</small></span></button>').join('')
    : '<p class="text-sm text-muted px-3 py-4 text-center">Tidak ada hasil untuk "' + esc(q) + '".</p>';
  box.hidden = false;
  refreshIcons();
}
function adminSearchKey(e) {
  const n = ASearch.items.length;
  if (e.key === 'Escape') { e.target.value = ''; adminSearch(''); return; }
  if (!n) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); ASearch.hl = (ASearch.hl + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    document.querySelectorAll('#adminSearchBox .drop35-item').forEach(b => b.classList.toggle('is-hl', +b.dataset.i === ASearch.hl));
  } else if (e.key === 'Enter') { e.preventDefault(); adminSearchGo(ASearch.hl); }
}
function adminSearchGo(i) {
  const x = ASearch.items[i]; if (!x) return;
  const inp = document.getElementById('adminSearch'); if (inp) { inp.value = ''; inp.blur(); }
  document.getElementById('adminSearchBox').hidden = true;
  x.act();
}
/** Buka halaman lalu saring tabelnya dengan kata kunci. */
function adminJump(page, tableId, q) {
  if (page === 'crm' && typeof CF !== 'undefined') CF.tab = 'members';
  if (page === 'orders' && typeof OF !== 'undefined') OF.status = 'all';
  go('admin/' + page);
  let n = 0;
  const t = setInterval(() => {
    const tb = AppState.tables[tableId];
    if (tb && document.getElementById(tableId)) { clearInterval(t); try { tb.search(q).draw(); } catch (e) { /* */ } }
    else if (++n > 30) clearInterval(t);
  }, 150);
}

function adminHead(title, sub, actions) {
  return '<div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">' +
    '<div><h1 class="page-title">' + esc(title) + '</h1>' + (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '') + '</div>' +
    (actions ? '<div class="flex flex-wrap gap-2">' + actions + '</div>' : '') + '</div>';
}
function kpi(label, value, icon, tone, sub) {
  return '<div class="stat-card"><div class="min-w-0"><p class="stat-label">' + esc(label) + '</p><p class="stat-value">' + esc(value) + '</p>' +
    (sub ? '<p class="text-xs text-muted mt-2">' + esc(sub) + '</p>' : '') + '</div>' +
    '<div class="stat-icon"' + (tone ? ' style="background:' + tone + '1f;color:' + tone + '"' : '') + '><i data-lucide="' + icon + '" class="w-5 h-5"></i></div></div>';
}
function kpiLink(html, js) { return '<button type="button" class="kpi-link" onclick="' + js + '">' + html + '</button>'; }
function statusBadge(s) {
  const m = { Active: 'badge-success', Published: 'badge-success', Approved: 'badge-success', Done: 'badge-success', Sent: 'badge-success', Member: 'badge-success',
    Draft: 'badge-document', Inactive: 'badge-document', Paused: 'badge-document', Cancelled: 'badge-document',
    Pending: 'badge-warning', Running: 'badge-ai', Waiting: 'badge-warning', Baru: 'badge-warning', Dihubungi: 'badge-video', Tertarik: 'badge-ai',
    Blocked: 'badge-error', Rejected: 'badge-error', Failed: 'badge-error', 'Tidak Tertarik': 'badge-error' };
  return '<span class="badge ' + (m[s] || 'badge-document') + '"><span class="dot"></span>' + esc(s) + '</span>';
}
function bar(pct, tone) {
  pct = Math.max(0, Math.min(100, pct || 0));
  const c = tone || (pct > 85 ? 'var(--error)' : pct > 65 ? 'var(--warning)' : 'var(--accent)');
  return '<div class="meter"><span style="width:' + pct.toFixed(1) + '%;background:' + c + '"></span></div>';
}
/** Halaman admin: tampil setelah lib admin (jQuery/DataTables/Chart.js) termuat — dimuat sekali saja. */
function adminRoute(id, def) {
  if (SUPER_PAGES.indexOf(id) > -1) def.superOnly = true;          // v3.5: role "Admin" tidak bisa membuka
  const show = def.show;
  if (show) def.show = (el, p) => { const r = AdminLibs.ready(); if (window.jQuery && jQuery.fn.dataTable && window.Chart) show(el, p); else r.then(() => { if (AppState.currentPage === 'admin-' + id) show(el, p); }); };
  registerPage('admin-' + id, Object.assign({ layout: 'admin', auth: 'admin' }, def));
}


// ════════════════════════════════════════════════════════════
// DASHBOARD + KUOTA & SISTEM (Point 12)
// ════════════════════════════════════════════════════════════
adminRoute('dashboard', {
  title: 'Dashboard',
  template: () => '<div class="page-wrap-fluid">' +
    '<div class="dash35-head"><div><p class="dash35-crumb">Ringkasan & Performa <span class="text-muted font-medium normal-case tracking-normal">· pemantauan ' + (isSuper() ? 'Superadmin' : 'Tim Admin') + '</span></p>' +
      '<h1 class="page-title mt-1">Dashboard Analitik</h1></div>' +
      '<div class="flex flex-wrap items-center gap-2"><span class="pill35"><span class="live-dot"></span> <span id="dashSync">Sinkron —</span></span>' +
      '<button class="btn-primary !w-auto" onclick="withBusy(this,\'Menyegarkan…\',()=>Promise.all([Admin.refreshAll(),isSuper()?loadSystemStatus(true):null]))"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Segarkan Data</button></div></div>' +
    '<div id="dashKpi" class="kpi35-grid mb-6">' + '<div class="skeleton h-28"></div>'.repeat(10) + '</div>' +
    '<div class="grid xl:grid-cols-4 gap-6 mb-6">' +
      '<div class="panel35 xl:col-span-2"><div class="panel35-h"><div><h3>Tren Akses & Pesanan 14 Hari</h3><p class="text-xs text-muted">Akses yang diberikan dan pesanan masuk per hari</p></div></div><div class="h-[260px]"><canvas id="chTrend"></canvas></div></div>' +
      '<div class="panel35"><div class="panel35-h"><div><h3>Distribusi Produk</h3><p class="text-xs text-muted">Produk aktif per kategori</p></div></div><div class="h-[240px]"><canvas id="chCat"></canvas></div></div>' +
      '<div class="panel35"><div class="panel35-h"><div><h3>Produk Terlaris</h3><p class="text-xs text-muted">Jumlah pemilik akses</p></div></div><div id="dashTop"></div>' +
        '<button class="link35 mt-4" onclick="go(\'admin/products\')">Kelola produk <i data-lucide="arrow-right" class="w-4 h-4"></i></button></div>' +
    '</div>' +
    '<div class="grid xl:grid-cols-2 gap-6 mb-6">' +
      '<div class="panel35"><div class="panel35-h"><h3 class="flex items-center gap-2">Pesanan Menunggu Verifikasi <span id="dashPendN" class="tag35 tone-red" hidden></span></h3><button class="link35" onclick="go(\'admin/orders\')">Kelola semua</button></div><div id="dashPending"></div></div>' +
      (isSuper()
        ? '<div class="panel35"><div class="panel35-h"><h3 class="flex items-center gap-2">Aktivitas Terkini <span class="live-dot">LIVE</span></h3><button class="link35" onclick="go(\'admin/logs\')">Lihat log</button></div><div id="dashActivity" class="act35 max-h-[380px] overflow-y-auto"></div></div>'
        : '<div class="panel35"><div class="panel35-h"><h3>Pemberian Akses Terbaru</h3><button class="link35" onclick="go(\'admin/access\')">Riwayat</button></div><div id="dashRecent" class="max-h-[380px] overflow-y-auto"></div></div>') +
    '</div>' +
    '<div class="grid xl:grid-cols-' + (isSuper() ? '2' : '1') + ' gap-6 mb-6">' +
      '<div class="insight-card rounded-2xl p-6"><div class="flex items-center gap-2 mb-4"><i data-lucide="sparkles" class="w-5 h-5" style="color:var(--amber)"></i><h3 class="font-semibold">Analisis Otomatis</h3></div><ul id="dashInsights" class="space-y-3 text-sm"></ul></div>' +
      (isSuper() ? '<div class="panel35"><div class="panel35-h"><h3>Pemberian Akses Terbaru</h3><button class="link35" onclick="go(\'admin/access\')">Riwayat</button></div><div id="dashRecent" class="max-h-[300px] overflow-y-auto"></div></div>' : '') +
    '</div>' +
    (isSuper() ? '<div id="sysBox" class="mb-6"></div>' : '') +
  '</div>',
  show: () => {
    Admin.load('dashboard');
    if (isSuper()) { loadSystemStatus(false); Live.start('dashActivity', 15000); }      // log & infrastruktur khusus Superadmin
    Object.keys(AppState.charts).forEach(k => { try { AppState.charts[k].resize(); } catch (e) { /* */ } });
  },
  leave: () => Live.stop()
});

/** Kartu KPI v3.5 (ikon berwarna, angka berjalan, klik menuju menu terkait). */
function kpi35(label, value, icon, tone, sub, subCls, js, alert) {
  const isNum = typeof value === 'number' && kpi35.anim;           // angka berjalan hanya saat pertama tampil (bukan tiap data disegarkan)
  return '<button type="button" class="kpi35 spot' + (alert ? ' is-alert' : '') + '"' + (js ? ' onclick="' + js + '"' : '') + '>' +
    '<p class="kpi35-lbl">' + esc(label) + '</p><span class="kpi35-ico ' + tone + '"><i data-lucide="' + icon + '" class="w-[18px] h-[18px]"></i></span>' +
    '<p class="kpi35-val"' + (alert ? ' style="color:var(--error)"' : '') + '>' + (isNum ? '<span data-count="' + value + '">' + value.toLocaleString('id-ID') + '</span>' : (typeof value === 'number' ? value.toLocaleString('id-ID') : value)) + '</p>' +
    (sub ? '<p class="kpi35-sub ' + (subCls || '') + '">' + sub + '</p>' : '') + '</button>';
}

ADMIN_RENDER.dashboard = function (d) {
  const box = document.getElementById('dashKpi');
  if (!box) return;
  const k = d.kpi, acc14 = d.trend.access.reduce((a, b) => a + b, 0);
  kpi35.anim = !box.dataset.counted; box.dataset.counted = '1';
  const pctDone = k.members ? Math.round(k.complete / k.members * 100) : 0;
  const rev = 'Rp ' + Math.round(k.revenue || 0).toLocaleString('id-ID');
  const cards = [
    kpi35('Total Member', k.members, 'users', 'tone-blue', '<i data-lucide="user-check" class="w-3.5 h-3.5"></i> ' + pctDone + '% data lengkap', 'is-up', "go('admin/crm')"),
    kpi35('Produk Aktif', k.products, 'package', 'tone-green', k.paused ? '<i data-lucide="pause-circle" class="w-3.5 h-3.5"></i> ' + k.paused + ' checkout ditutup' : 'tampil di katalog', k.paused ? 'is-warn' : '', "go('admin/products')"),
    kpi35('Total Redeem', k.redeems, 'ticket', 'tone-violet', 'kode akses ditukarkan', '', "go('admin/keys')"),
    kpi35('Pendapatan Valid', '<span class="text-[21px]">' + esc(rev) + '</span>', 'wallet', 'tone-amber', 'pesanan disetujui', 'is-up', "go('admin/orders')"),
    kpi35('Pesanan Pending', k.pending, 'alert-circle', 'tone-red', k.pending ? '<span class="tag35 tone-red">Perlu Tindakan</span>' : 'tidak ada antrean', '', "go('admin/orders')", k.pending > 0),
    isSuper() ? kpi35('Aplikasi Custom', k.customNew || 0, 'wand-sparkles', 'tone-cyan', (k.customNew ? 'perlu tindakan Anda' : 'tidak ada pengajuan baru'), k.customNew ? 'is-warn' : '', "go('admin/custom')")
              : kpi35('Akses 14 Hari', acc14, 'trending-up', 'tone-cyan', 'akses diberikan', '', "go('admin/access')"),
    kpi35('Bootcamp', k.bootcampPending || 0, 'graduation-cap', 'tone-blue', 'bukti peserta menunggu', k.bootcampPending ? 'is-warn' : '', "go('admin/bootcamps')"),
    kpi35('Karya Pameran', k.showcasePending || 0, 'trophy', 'tone-amber', 'pengajuan menunggu tinjau', k.showcasePending ? 'is-warn' : '', "go('admin/showcase')"),
    kpi35('Pendaftar Member', k.pendingReg || 0, 'user-round-plus', 'tone-pink', 'menunggu persetujuan', k.pendingReg ? 'is-warn' : '', "CF.tab='pending';go('admin/crm')"),
    kpi35('Non-Member (Lead)', k.leads, 'user-search', 'tone-slate', (k.newLeads || 0) + ' baru belum dihubungi', '', "CF.tab='leads';go('admin/crm')")
  ];
  box.innerHTML = cards.join('');
  const sync = document.getElementById('dashSync'); if (sync) sync.textContent = 'Sinkron ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('dashInsights').innerHTML = d.insights.filter(t => isSuper() || !/Aplikasi Custom/.test(t)).map(t => '<li>' + esc(t) + '</li>').join('');   // role Admin: tanpa info menu Superadmin

  // Pesanan menunggu: setujui / tolak langsung dari dashboard
  const pn = document.getElementById('dashPendN'); if (pn) { pn.hidden = !k.pending; pn.textContent = k.pending + ' Menunggu'; }
  document.getElementById('dashPending').innerHTML = d.pendingList.length ? d.pendingList.map(o =>
    '<div class="pend35"><span class="cell-avatar">' + esc(initial(o.email)) + '</span><div class="min-w-0 flex-1"><p class="text-sm font-semibold text-main truncate">' + esc(o.email) + '</p>' +
      '<p class="text-xs text-muted truncate">' + esc(o.product) + '</p></div>' +
      '<div class="pend35-amt hidden sm:block">' + esc(fmtMoney(o.amount)) + '<small>' + timeAgo(o.createdAt) + '</small></div>' +
      '<button class="btn-success" onclick="dashVerify(' + jsArg(o.orderId) + ',true)"><i data-lucide="check" class="w-4 h-4"></i> <span class="hidden md:inline">Setujui</span></button>' +
      '<button class="btn-text-danger" onclick="dashVerify(' + jsArg(o.orderId) + ',false)">Tolak</button></div>').join('') +
      (k.pending > d.pendingList.length ? '<button class="link35 mt-3" onclick="go(\'admin/orders\')">+' + (k.pending - d.pendingList.length) + ' pesanan lainnya</button>' : '')
    : '<p class="text-sm text-muted py-8 text-center">Tidak ada pesanan tertunda 🎉</p>';
  const rec = document.getElementById('dashRecent');
  if (rec) rec.innerHTML = d.recent.length ? d.recent.map(r =>
    '<div class="log-row"><div class="cell-avatar">' + esc(initial(r.email)) + '</div><div class="min-w-0 flex-1"><p class="text-sm font-medium text-main truncate">' + esc(r.product) + '</p>' +
    '<p class="text-xs text-muted truncate">' + esc(r.email) + ' · ' + esc(r.source) + ' · ' + timeAgo(r.date) + '</p></div></div>').join('') : '<p class="text-sm text-muted">Belum ada data.</p>';

  // Produk terlaris: batang horizontal (tanpa kanvas → ringan)
  const max = Math.max(1, ...d.top.map(t => t.count));
  document.getElementById('dashTop').innerHTML = d.top.length ? '<div class="space-y-3.5">' + d.top.map((t, i) =>
    '<div><div class="flex justify-between gap-2 text-sm"><span class="truncate text-main font-medium">' + esc(t.title) + '</span><b class="text-main tabular">' + t.count + '</b></div>' +
    '<div class="infra35-bar !bg-[var(--surface-3)] mt-1.5"><span style="width:' + Math.round(t.count / max * 100) + '%;background:' + (i ? 'var(--accent-2)' : 'var(--accent)') + ';opacity:' + (1 - i * .13) + '"></span></div></div>').join('') + '</div>'
    : '<p class="text-sm text-muted">Belum ada data.</p>';

  const accent = cssVar('--accent'), soft = cssVar('--accent-2'), amber = cssVar('--amber');
  makeChart('chTrend', { type: 'line', data: { labels: d.trend.labels, datasets: [
    { label: 'Akses Diberikan', data: d.trend.access, borderColor: accent, backgroundColor: accent + '22', fill: true, tension: .4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
    { label: 'Pesanan Masuk', data: d.trend.orders, borderColor: soft, backgroundColor: soft + '14', fill: true, tension: .4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2, borderDash: [5, 4] }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  const catK = Object.keys(d.categories);
  makeChart('chCat', { type: 'doughnut', data: { labels: catK.map(catLabel), datasets: [{ data: catK.map(c => d.categories[c]), backgroundColor: [accent, soft, amber, cssVar('--success'), '#94A3B8'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } } });
  refreshIcons();
};

/** Setujui/tolak pesanan dari dashboard (memakai dialog yang sama dengan menu Verifikasi Pesanan). */
function dashVerify(orderId, approve) {
  window._orders = window._orders || [];
  if (!window._orders.some(o => o.Order_ID === orderId)) {
    const d = AppState.a.dashboard || Admin.cached('dashboard') || { pendingList: [] };
    const o = d.pendingList.filter(x => x.orderId === orderId)[0];
    if (o) window._orders.push({ Order_ID: o.orderId, Email: o.email, Product: o.product, Amount: o.amount });
  }
  verifyOrder(orderId, approve);
}

/**
 * Kartu infrastruktur & kuota (Superadmin). v3.3: salinan lokal < 5 menit dipakai langsung;
 * server menyimpan hasilnya 10 menit. Tombol Segarkan (force) selalu menghitung ulang.
 */
async function loadSystemStatus(force) {
  const box = document.getElementById('sysBox');
  if (!box) return;
  const c = Admin.cached('systemStatus');
  if (c && !force) renderSystemStatus(c);
  else if (!c) box.innerHTML = '<div class="skeleton h-48"></div>';
  if (c && !force && Admin.isFresh('systemStatus', 300000)) return;
  const res = await api('systemStatus', { refresh: !!force });
  if (res.success) { Store.set(Admin.key('systemStatus'), { t: Date.now(), data: res.data }); renderSystemStatus(res.data); }
}

const SB_STATUS = {
  'sehat': ['Sehat', ''], 'waspada': ['Waspada', 'is-warn'], 'hampir-penuh': ['Hampir Penuh', 'is-bad'], 'lambat': ['Lambat', 'is-warn'],
  'gagal': ['Gagal Terhubung', 'is-bad'], 'sql-belum-dijalankan': ['SQL belum dijalankan', 'is-bad'], 'belum-diatur': ['Belum diatur', 'is-off']
};

function renderSystemStatus(s) {
  const box = document.getElementById('sysBox');
  if (!box) return;
  const tone = p => p > 90 ? 'is-bad' : p > 75 ? 'is-warn' : '';
  const emailUsed = Math.max(0, 100 - Math.min(s.email.remaining, 100));
  const drPct = s.drive.limit ? s.drive.used / s.drive.limit * 100 : 0;
  const wa = s.wa || {}, trig = s.triggers || {}, perf = s.perf || {}, props = s.properties || {};
  const sb = s.supabase || {}, engine = (s.database && s.database.engine) || sb.engine || 'sheets';
  const problems = [];

  const emailTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="mail" class="w-4 h-4"></i> Kuota Email</b><span class="infra35-st' + (s.email.remaining < 20 ? ' is-warn' : '') + '">' + (s.email.remaining < 20 ? 'Menipis' : 'Aman') + '</span></div>' +
    '<p class="infra35-num">' + s.email.remaining + ' <small>sisa hari ini</small></p><div class="infra35-bar"><span class="' + (emailUsed > 80 ? 'is-warn' : '') + '" style="width:' + emailUsed + '%"></span></div>' +
    '<p class="infra35-note">' + esc(s.email.note) + '</p></div>';
  if (s.email.remaining < 20) problems.push('kuota email');

  let waTile;
  if (!wa.configured) waTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp (Fonnte)</b><span class="infra35-st is-off">Belum diatur</span></div>' +
    '<p class="infra35-note">Token Fonnte belum diisi.</p><button class="btn-onblue self-start" onclick="go(\'admin/notif\')">Konfigurasi</button></div>';
  else if (wa.ok) waTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp (Fonnte)</b><span class="infra35-st' + (wa.deviceStatus === 'connect' ? '' : ' is-bad') + '">' + (wa.deviceStatus === 'connect' ? 'Online' : esc(wa.deviceStatus || 'Terputus')) + '</span></div>' +
    '<p class="infra35-num">' + esc(wa.quota || '—') + ' <small>sisa kuota</small></p><div class="infra35-bar"><span class="is-ok" style="width:100%"></span></div>' +
    '<p class="infra35-note">' + esc(wa.package || '') + ' · ' + esc(wa.device || '') + (wa.expired ? ' · aktif s/d ' + esc(wa.expired) : '') + '</p></div>';
  else { waTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp (Fonnte)</b><span class="infra35-st is-bad">Gagal</span></div><p class="infra35-note">' + esc(wa.reason || 'Gagal membaca device') + '</p></div>'; problems.push('WhatsApp'); }
  if (wa.configured && wa.ok && wa.deviceStatus !== 'connect') problems.push('device WhatsApp');

  const driveTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="hard-drive" class="w-4 h-4"></i> Google Drive</b><span class="infra35-st ' + tone(drPct) + '">' + (drPct > 90 ? 'Hampir penuh' : 'Aman') + '</span></div>' +
    '<p class="infra35-num">' + fmtBytes(s.drive.used) + ' <small>/ ' + (s.drive.limit ? fmtBytes(s.drive.limit) : 'tak terbatas') + '</small></p><div class="infra35-bar"><span class="' + tone(drPct) + '" style="width:' + drPct.toFixed(1) + '%"></span></div>' +
    '<p class="infra35-note">' + drPct.toFixed(1) + '% terpakai · berkas materi & bukti transfer</p></div>';
  if (drPct > 90) problems.push('Drive');

  // Database: Supabase (mesin aktif / sudah diatur) atau Google Sheets
  let dbTile;
  if (engine === 'supabase' || sb.configured) {
    const st = SB_STATUS[sb.status] || [sb.status || '—', 'is-off'];
    const pct = Number(sb.usedPct) || 0;
    dbTile = '<div class="infra35-tile is-db"><div class="infra35-t"><b><i data-lucide="database" class="w-4 h-4" style="color:#3ECF8E"></i> Supabase' + (engine === 'supabase' ? '' : ' <small class="font-normal" style="color:#94A3B8">(belum aktif)</small>') + '</b><span class="infra35-st ' + st[1] + '">' + esc(st[0]) + '</span></div>' +
      (sb.ok ? '<p class="infra35-num">' + fmtBytes(sb.dbBytes) + ' <small>/ ' + sb.limitMb + ' MB</small></p><div class="infra35-bar"><span class="is-db ' + tone(pct) + '" style="width:' + Math.min(pct, 100).toFixed(1) + '%"></span></div>' +
        '<div class="infra35-kv"><span><b>' + pct.toFixed(1) + '%</b>terpakai</span><span><b>' + Number(sb.rows || 0).toLocaleString('id-ID') + '</b>baris data</span>' +
        '<span><b>' + (sb.connections || 0) + ' / ' + (sb.maxConnections || '—') + '</b>koneksi</span><span><b>' + (sb.latencyMs || 0) + ' ms</b>latensi</span></div>'
        : '<p class="infra35-note">' + esc(sb.status === 'belum-diatur' ? 'Isi SUPABASE_URL & SUPABASE_SERVICE_KEY di Script Properties.' : sb.status === 'sql-belum-dijalankan' ? 'Jalankan SETUP_SUPABASE.sql di SQL Editor Supabase.' : (sb.error || 'Tidak bisa terhubung.')) + '</p>') +
      (sb.maintenance ? '<p class="infra35-note" style="color:#FCD34D">⚠️ Mode perawatan aktif (migrasi berjalan) — penyimpanan data ditahan sementara.</p>' : '') +
      (sb.dashboardUrl ? '<div class="flex gap-2 flex-wrap"><button class="btn-onblue" onclick="showDbDetail()">Detail tabel</button><button class="btn-onblue" onclick="openLink(' + jsArg(sb.dashboardUrl) + ')">Buka Supabase</button></div>' : '') + '</div>';
    if (engine === 'supabase' && (!sb.ok || pct > 90)) problems.push('database');
  } else {
    const dbPct = s.database.cells / s.database.limit * 100;
    dbTile = '<div class="infra35-tile"><div class="infra35-t"><b><i data-lucide="sheet" class="w-4 h-4"></i> Database Sheets</b><span class="infra35-st ' + tone(dbPct) + '">' + (dbPct > 90 ? 'Hampir penuh' : 'Sehat') + '</span></div>' +
      '<p class="infra35-num">' + dbPct.toFixed(2) + '% <small>dari 10 jt sel</small></p><div class="infra35-bar"><span class="' + tone(dbPct) + '" style="width:' + Math.min(dbPct, 100).toFixed(2) + '%"></span></div>' +
      '<p class="infra35-note">' + s.database.cells.toLocaleString('id-ID') + ' sel · ' + s.database.sheets.length + ' sheet</p>' +
      '<button class="btn-onblue self-start" onclick="showDbDetail()">Detail per sheet</button></div>';
    if (dbPct > 90) problems.push('database');
  }

  const needTrig = !trig.blastWorker || !trig.maintenance || (trig.keepWarm === false && !trig.keepWarmOff);
  if (needTrig) problems.push('trigger otomatis');
  const sessLine = props.tokenMode === 'hmac' ? 'Token HMAC aktif' : props.sessions + ' sesi aktif';
  box.innerHTML = '<section class="infra35"><div class="infra35-h"><div class="flex items-center gap-3"><span class="quick35-ico" style="background:rgba(255,255,255,.08);color:#fff"><i data-lucide="server" class="w-4 h-4"></i></span>' +
      '<div><h3>Status Infrastruktur & Pemakaian Kuota</h3><p>Email, WhatsApp, penyimpanan Drive, dan kesehatan database · dicek ' + timeAgo(s.checkedAt) + '</p></div></div>' +
      '<span class="infra35-ok' + (problems.length ? (problems.indexOf('database') > -1 ? ' is-bad' : ' is-warn') : '') + '">' + (problems.length ? 'Perlu dicek: ' + esc(problems.join(', ')) : 'Semua Sistem Normal') + '</span></div>' +
    '<div class="infra35-grid">' + emailTile + waTile + driveTile + dbTile + '</div>' +
    '<div class="infra35-foot"><span class="inline-flex items-center gap-1.5" style="color:' + (props.tokenMode === 'hmac' ? '#6EE7B7' : '#FCD34D') + '"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> ' + esc(sessLine) + '</span>' +
      '<span>Trigger:</span><code>' + (trig.keepWarm ? '✓' : '✗') + ' keepWarm</code><code>' + (trig.blastWorker ? '✓' : '✗') + ' blastWorker</code><code>' + (trig.maintenance ? '✓' : '✗') + ' dailyMaintenance</code>' +
      '<span>' + (s.blast ? s.blast.running : 0) + ' blast berjalan' + (perf.notifQueue ? ' · ' + perf.notifQueue + ' notifikasi antre' : '') + '</span>' +
      '<span>Database: <b style="color:#E2E8F0">' + (engine === 'supabase' ? 'Supabase' : 'Google Sheets') + '</b></span>' +
      (needTrig ? '<button class="btn-onblue" onclick="installTriggers(this)">Pasang Trigger</button>' : '') +
      '<span class="ml-auto">Server v' + esc(s.version || '?') + '</span></div>' +
  '</section>';
  AppState.sys = s;
  refreshIcons();
}

function showDbDetail() {
  const s = AppState.sys; if (!s) return;
  const sb = s.supabase || {};
  if ((s.database.engine === 'supabase' || sb.configured) && sb.tables) {
    return Swal.fire({ title: 'Database Supabase', width: 680, html: '<table class="w-full text-sm text-left"><thead><tr><th class="py-1">Tabel</th><th>Baris</th><th>Ukuran</th></tr></thead><tbody>' +
      sb.tables.map(x => '<tr class="border-t border-app"><td class="py-1.5">' + esc(x.name) + '</td><td>' + Number(x.rows).toLocaleString('id-ID') + '</td><td>' + fmtBytes(x.bytes) + '</td></tr>').join('') +
      '</tbody></table><p class="text-xs text-muted mt-3">Total ' + fmtBytes(sb.dbBytes) + ' dari batas ' + sb.limitMb + ' MB (ubah batas lewat Script Property SUPABASE_DB_LIMIT_MB sesuai paket Supabase Anda).</p>' +
      (sb.dashboardUrl ? '<button class="btn-ghost !w-auto mt-3" onclick="openLink(' + jsArg(sb.dashboardUrl) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> Buka Dashboard Supabase</button>' : ''), didOpen: refreshIcons });
  }
  Swal.fire({ title: 'Ukuran Database', width: 640, html: '<table class="w-full text-sm text-left"><thead><tr><th class="py-1">Sheet</th><th>Baris data</th><th>Sel</th></tr></thead><tbody>' +
    s.database.sheets.map(x => '<tr class="border-t border-app"><td class="py-1.5">' + esc(x.name) + '</td><td>' + x.rows.toLocaleString('id-ID') + '</td><td>' + x.cells.toLocaleString('id-ID') + '</td></tr>').join('') +
    '</tbody></table><p class="text-xs text-muted mt-3">Batas Google Sheets: 10.000.000 sel per spreadsheet.</p>' +
    (s.database.url ? '<button class="btn-ghost !w-auto mt-3" onclick="openLink(' + jsArg(s.database.url) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> Buka Spreadsheet</button>' : ''), didOpen: refreshIcons });
}

async function installTriggers(btn) {
  const res = await withBusy(btn, 'Memasang…', () => api('installTriggers'));
  if (toastRes(res)) loadSystemStatus(true);
}

/**
 * Pembaruan realtime aktivitas (polling ringan: hanya baris baru).
 * v3.3 adaptif: `ms` saat Anda aktif, 4× lebih jarang (maks. 60 dtk) bila tidak ada interaksi > 2 menit,
 * berhenti saat tab tersembunyi. Tik pertama ikut tergabung dalam batch pembuka panel.
 */
const Live = {
  since: null, boxId: null, rows: [], busy: false,
  start(boxId, ms) {
    this.boxId = boxId;
    const active = ms || 10000, idle = Math.max(active * 4, 60000);
    Activity.reset('live');
    this.tick();
    clearInterval(AppState.timers.live);
    AppState.timers.live = setInterval(() => { if (Activity.due('live', active, idle)) this.tick(); }, Math.min(active, 15000));
  },
  stop() { clearInterval(AppState.timers.live); },
  async tick() {
    if (this.busy) return;                         // jaringan lambat: jangan menumpuk permintaan
    this.busy = true;
    let res;
    try { res = await apiQ('logsSince', { since: this.since || new Date(Date.now() - 7 * 86400000).toISOString() }); }
    finally { this.busy = false; }
    if (!res || !res.success) return;
    this.since = res.data.serverTime;
    if (res.data.logs.length) { this.rows = res.data.logs.concat(this.rows).slice(0, 60); }
    const box = document.getElementById(this.boxId);
    if (box && this.boxId === 'dashActivity') {
      box.innerHTML = this.rows.length ? this.rows.slice(0, 30).map((l, i) => logRow(l, i < res.data.logs.length)).join('') : '<p class="text-sm text-muted">Belum ada aktivitas.</p>';
      refreshIcons();
    }
    if (typeof Logs !== 'undefined') Logs.onLive(res.data.logs, res.data.activeTotal);
  }
};
function logRow(l, fresh) {
  const c = /FAILED|REJECT|BLOCK|DELETE/.test(l.action) ? 'var(--error)' : /ORDER|LEAD/.test(l.action) ? 'var(--warning)' : /ATTEND|APPROVE|REDEEM/.test(l.action) ? 'var(--success)' : 'var(--accent)';
  return '<div class="act35-row log-row' + (fresh ? ' is-new' : '') + '" style="--c:' + c + ';border:0;padding-left:0">' +
    '<div class="min-w-0 flex-1"><p class="text-sm text-main"><b>' + esc(ACTION_LABELS[l.action] || l.action) + '</b> <span class="text-muted">· ' + esc(l.email) + '</span></p>' +
    '<small class="block truncate">' + esc(l.detail) + ' · ' + timeAgo(l.time) + '</small></div></div>';
}


// ════════════════════════════════════════════════════════════
// PRODUK — Kelas · Aplikasi · Dokumen (v3.5: AI Link dihapus dari menu; produk lama tetap bisa diubah)
// Status: Active (dijual) · Paused (tampil, checkout ditutup) · Draft (arsip). Hapus permanen: khusus Superadmin.
// ════════════════════════════════════════════════════════════
const PF = { cat: 'all', status: 'all' };

adminRoute('products', {
  title: 'Produk',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Manajemen Produk', 'Kelas, Aplikasi, dan Dokumen. Nonaktifkan sementara agar tidak bisa dibeli, arsipkan, atau hapus permanen.',
      '<button class="btn-primary !w-auto" onclick="openProductForm()"><i data-lucide="plus" class="w-4 h-4"></i> Produk Baru</button>') +
    '<div class="app-card rounded-2xl p-5 mb-5 flex flex-wrap gap-4 items-end">' +
      '<div class="min-w-[180px]"><label class="form-label">Kategori</label><select id="pfCatF" class="form-input" onchange="PF.cat=this.value;ADMIN_RENDER.productsAdmin(AppState.a.productsAdmin)"><option value="all">Semua</option><option>Kelas</option><option>Aplikasi</option><option value="Document">Dokumen</option></select></div>' +
      '<div class="min-w-[160px]"><label class="form-label">Status</label><select id="pfStF" class="form-input" onchange="PF.status=this.value;ADMIN_RENDER.productsAdmin(AppState.a.productsAdmin)"><option value="all">Semua</option><option value="Active">Aktif (dijual)</option><option value="Paused">Checkout ditutup</option><option value="Draft">Arsip</option></select></div>' +
      '<p id="pfCount" class="text-sm text-muted ml-auto"></p></div>' +
    '<div class="app-card rounded-2xl p-5 overflow-x-auto"><table id="tblProducts" class="display w-full"><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Isi & Pemilik</th><th>Status</th><th>Aksi</th></tr></thead><tbody></tbody></table></div></div>',
  show: () => Admin.load('productsAdmin')
});

ADMIN_RENDER.productsAdmin = function (all) {
  if (!document.getElementById('tblProducts') || !all) return;
  const list = all.filter(p => !p.customReqId);          // paket Aplikasi Custom dikelola dari menu Aplikasi Custom
  const sel = document.getElementById('pfCatF');            // v3.5: opsi "AI Link" hanya muncul bila masih ada produk lama
  if (sel && list.some(p => p.Category === 'AI Link') && !sel.querySelector('option[value="AI Link"]')) sel.insertAdjacentHTML('beforeend', '<option value="AI Link">AI Link (lama)</option>');
  const rows = list.filter(p => (PF.cat === 'all' || p.Category === PF.cat) && (PF.status === 'all' || p.Status === PF.status));
  document.getElementById('pfCount').textContent = rows.length + ' dari ' + list.length + ' produk';
  buildTable('tblProducts', {
    data: rows, columns: [
      { data: null, render: (p, t) => t !== 'display' ? p.Title + ' ' + (p.Tagline || p.Description) :
        '<div class="prod-cell"><div class="prod-thumb">' + img(p.thumbnail, '', 'style="width:100%;height:100%;object-fit:cover"', 'IMG') + '</div>' +
        '<div class="min-w-0"><p class="font-semibold text-main line-clamp-2" title="' + esc(p.Title) + '">' + esc(p.Title) + '</p>' +
        '<p class="text-xs text-muted line-clamp-1" title="' + esc(p.Tagline || p.Description) + '">' + esc(shortText(p.Tagline || p.Description, 70)) + '</p></div></div>' },
      { data: 'Category', render: c => '<span class="badge ' + badgeClassFor(c) + '">' + esc(catLabel(c)) + '</span>' },
      { data: 'Price', render: (v, t) => t === 'display' ? esc(fmtMoney(v)) : v },
      { data: null, render: (p, t) => t !== 'display' ? Number(p.owners) || 0 : '<div class="prod-meta">' + (p.Category === 'Kelas' ? p.episodeCount + ' ep · ' + p.resourceCount + ' materi' : p.Category === 'Aplikasi' ? (p.slides.length + p.previewVideos.length) + ' preview · ' + p.resourceCount + ' materi' : p.Category === 'Document' ? (p.Drive_File_ID ? '1 utama + ' : '') + p.resourceCount + ' berkas' : '—') +
        '<br><b>' + (Number(p.owners) || 0) + '</b> pemilik</div>' },
      { data: null, render: (p, t) => t !== 'display' ? p.Status : '<div class="flex items-center gap-1.5">' + productStatusBadge(p.Status) + (p.isPublic ? '<i data-lucide="globe" class="w-4 h-4 text-accent" title="Tampil di halaman publik"></i>' : '') + '</div>' },
      { data: null, orderable: false, render: p => '<div class="flex gap-1.5"><button class="btn-icon" title="Ubah" onclick="openProductForm(' + jsArg(p.Product_ID) + ')"><i data-lucide="pencil" class="w-4 h-4"></i></button>' +
        (p.Status === 'Active' ? '<button class="btn-icon" title="Tutup checkout sementara (tetap tampil)" onclick="setProductStatus(' + jsArg(p.Product_ID) + ',\'Paused\')"><i data-lucide="pause-circle" class="w-4 h-4"></i></button>'
                               : '<button class="btn-icon" title="Aktifkan & buka penjualan" style="color:var(--success)" onclick="setProductStatus(' + jsArg(p.Product_ID) + ',\'Active\')"><i data-lucide="play-circle" class="w-4 h-4"></i></button>') +
        (p.Status !== 'Draft' ? '<button class="btn-icon" title="Arsipkan (sembunyikan)" onclick="setProductStatus(' + jsArg(p.Product_ID) + ',\'Draft\')"><i data-lucide="archive" class="w-4 h-4"></i></button>' : '') +
        (isSuper() ? '<button class="btn-icon" title="Hapus permanen" style="color:var(--error)" onclick="deleteProduct(' + jsArg(p.Product_ID) + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' : '') + '</div>' }
    ]
  });
};

function productStatusBadge(s) {
  if (s === 'Paused') return '<span class="badge badge-paused"><span class="dot"></span>Checkout ditutup</span>';
  if (s === 'Draft') return '<span class="badge badge-document"><span class="dot"></span>Arsip</span>';
  return statusBadge(s);
}

async function setProductStatus(id, status) {
  if (status === 'Draft') {
    const r = await Swal.fire({ title: 'Arsipkan produk?', text: 'Produk disembunyikan dari katalog. Akses member yang sudah ada tetap aman.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Arsipkan', cancelButtonText: 'Batal' });
    if (!r.isConfirmed) return;
  }
  if (status === 'Paused') {
    const r = await Swal.fire({ title: 'Tutup checkout sementara?', html: '<p class="text-sm text-left">Produk <b>tetap tampil</b> di katalog & halaman depan dengan label <i>"Penjualan ditutup sementara"</i>, tetapi <b>tidak bisa dibeli</b>. ' +
      'Member yang sudah memiliki tetap bisa membuka materinya. Kode akses yang sudah dibagikan tetap bisa ditukarkan.</p>', icon: 'question', showCancelButton: true, confirmButtonText: 'Tutup Checkout', cancelButtonText: 'Batal' });
    if (!r.isConfirmed) return;
  }
  // Optimistic UI: ubah status di tabel dulu
  const list = AppState.a.productsAdmin || [];
  const p = list.filter(x => x.Product_ID === id)[0];
  const prev = p && p.Status;
  if (p) { p.Status = status; ADMIN_RENDER.productsAdmin(list); }
  const res = await api('setProductStatus', { productId: id, status: status });
  if (!toastRes(res) && p) { p.Status = prev; ADMIN_RENDER.productsAdmin(list); }
  else Admin.fetch('productsAdmin');
}

/** v3.5 — Hapus produk permanen (Superadmin). Wajib ketik ulang judul. Riwayat pesanan/akses & berkas Drive tidak ikut terhapus. */
async function deleteProduct(id) {
  const p = (AppState.a.productsAdmin || []).filter(x => x.Product_ID === id)[0];
  if (!p) return;
  const r = await Swal.fire({
    title: 'Hapus produk permanen?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus Permanen', cancelButtonText: 'Batal', focusCancel: true,
    customClass: { confirmButton: 'swal-danger' },
    html: '<div class="text-left text-sm space-y-2"><p>Baris produk <b>' + esc(p.Title) + '</b> akan dihapus dari database dan tidak bisa dikembalikan.</p>' +
      '<p class="text-muted">Yang <b>tetap aman</b>: riwayat pesanan, data akses ' + (Number(p.owners) || 0) + ' pemilik, kode akses, dan berkas di Google Drive. ' +
      'Jika hanya ingin berhenti menjual, pilih <b>Tutup checkout</b> atau <b>Arsipkan</b>.</p>' +
      '<label class="form-label mt-3">Ketik ulang judul produk untuk konfirmasi</label><input id="delConfirm" class="form-input" autocomplete="off" placeholder="' + esc(p.Title) + '"></div>',
    preConfirm: () => {
      const v = document.getElementById('delConfirm').value.trim();
      if (v !== String(p.Title).trim()) return Swal.showValidationMessage('Judul tidak sama persis.');
      return v;
    }
  });
  if (!r.isConfirmed) return;
  Swal.fire({ title: 'Menghapus…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  const res = await api('deleteProduct', { productId: id, confirmTitle: r.value });
  Swal.close();
  if (toastRes(res)) { AppState.a.productsAdmin = (AppState.a.productsAdmin || []).filter(x => x.Product_ID !== id); ADMIN_RENDER.productsAdmin(AppState.a.productsAdmin); Admin.fetchMany(['productsAdmin', 'dashboard']); }
}

// ── Form produk (SweetAlert2 besar) ──
const F = { thumb: {}, episodes: [], resources: [], slides: [], pvideos: [], doc: null, cat: 'Kelas' };

/**
 * Form produk. opts.custom = pengajuan Aplikasi Custom → mode "Serah Terima":
 * kategori terkunci Aplikasi, privat untuk customer, tanpa harga/Lynk/publik (v3.2).
 */
function openProductForm(id, opts) {
  opts = opts || {};
  const cr = opts.custom || null;
  const p = cr ? (opts.product || null) : (id ? (AppState.a.productsAdmin || []).filter(x => x.Product_ID === id)[0] : null);
  F.cat = cr ? 'Aplikasi' : (p ? p.Category : 'Kelas');
  F.thumb = { mode: p ? p.Thumbnail_Mode : 'youtube', fileId: p ? p.Thumbnail_File_ID : '', url: p ? p.Thumbnail_URL : '' };
  F.episodes = p ? JSON.parse(JSON.stringify(p.episodes || [])) : [];
  F.resources = p ? JSON.parse(JSON.stringify(p.resources || [])) : [];
  F.slides = p ? JSON.parse(JSON.stringify(p.slidesRaw || [])) : [];
  F.pvideos = p ? JSON.parse(JSON.stringify(p.previewVideosRaw || [])) : [];
  F.doc = p && p.Drive_File_ID ? { fileId: p.Drive_File_ID, name: 'Berkas tersimpan di Drive' } : null;
  if (!F.episodes.length) F.episodes.push({ id: '', title: '', url: '', duration: '' });

  const cats = [['Kelas', 'Kelas (video series)'], ['Aplikasi', 'Aplikasi'], ['Document', 'Dokumen']].concat(F.cat === 'AI Link' ? [['AI Link', 'AI Link (lama)']] : []);   // v3.5
  const field = (id2, label, val, ph, type) => '<div><label class="form-label" for="' + id2 + '">' + label + '</label><input id="' + id2 + '" type="' + (type || 'text') + '" class="form-input" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';

  const hideCss = cr ? ' style="display:none"' : '';
  Swal.fire({
    title: cr ? (p ? 'Ubah Paket Serah Terima' : 'Serahkan Aplikasi Custom') : (p ? 'Ubah Produk' : 'Produk Baru'), width: 860, showCancelButton: true, focusConfirm: false,
    confirmButtonText: cr ? (p ? 'Simpan & Kirim Pembaruan' : 'Kirim ke Customer') : (p ? 'Simpan Perubahan' : 'Tambah Produk'), cancelButtonText: 'Batal',
    html: '<div class="pform">' +
      (cr ? '<div class="notice"><i data-lucide="lock" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1 text-left">Paket khusus untuk <b>' + esc(cr.fullName) + '</b> (' + esc(cr.email) + ') — <b>' + esc(cr.id) + '</b>. ' +
        'Tidak tampil di katalog/halaman publik; otomatis masuk menu <b>Kelas Saya</b> milik customer.</p></div>' : '') +
      '<div class="grid2">' + field('fTitle', 'Judul *', p ? p.Title : (cr ? cr.title : ''), 'Nama produk') +
        '<div><label class="form-label" for="fCat">Kategori *</label><select id="fCat" class="form-input"' + (cr ? ' disabled' : '') + '>' + cats.map(c => '<option value="' + c[0] + '"' + (F.cat === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') + '</select></div></div>' +
      field('fTag', 'Tagline singkat', p && p.Tagline, cr ? 'mis. Aplikasi absensi guru berbasis Google Sheets' : 'Satu kalimat yang menjual') +
      '<div><label class="form-label" for="fDesc">Deskripsi</label><textarea id="fDesc" class="form-input" rows="3"' + (cr ? ' placeholder="Gambaran aplikasi, fitur utama, cara pakai singkat"' : '') + '>' + esc(p ? p.Description : '') + '</textarea></div>' +
      '<div class="grid3" id="pfRowPrice"' + hideCss + '>' + field('fPrice', 'Harga (Rp)', p ? p.Price : 0, '0 = gratis', 'number') +
        '<div><label class="form-label" for="fStatus">Status</label><select id="fStatus" class="form-input"><option value="Active"' + (!p || p.Status === 'Active' ? ' selected' : '') + '>Aktif — dijual</option><option value="Paused"' + (p && p.Status === 'Paused' ? ' selected' : '') + '>Tampil, checkout ditutup</option><option value="Draft"' + (p && p.Status === 'Draft' ? ' selected' : '') + '>Arsip (disembunyikan)</option></select></div>' +
        field('fSort', 'Urutan tampil', p && p.Sort_Order ? p.Sort_Order : '', '1, 2, 3…', 'number') + '</div>' +
      '<div class="grid2" id="pfRowLynk"' + hideCss + '>' + field('fLynk', 'Link checkout Lynk.id', p && p.Lynk_URL, 'https://lynk.id/…') +
        '<div><label class="form-label">Tampil di halaman Open Access</label><label class="switch mt-2"><input type="checkbox" id="fPublic"' + (p ? (p.isPublic ? ' checked' : '') : ' checked') + '><span></span> Publik</label></div></div>' +
      '<div id="boxWa">' + field('fWa', 'Link WhatsApp Group (khusus pemilik produk ini)', p && p.WA_Group_URL, 'https://chat.whatsapp.com/…') + '</div>' +

      // Thumbnail 3 mode (perilaku v2.0 dipertahankan)
      '<div><label class="form-label">Thumbnail Cover</label><div class="mode-tabs" id="fThumbTabs">' +
        '<button type="button" class="mode-tab" data-mode="youtube" onclick="setThumbMode(\'youtube\')">Dari YouTube</button>' +
        '<button type="button" class="mode-tab" data-mode="upload" onclick="setThumbMode(\'upload\')">Upload Gambar</button>' +
        '<button type="button" class="mode-tab" data-mode="url" onclick="setThumbMode(\'url\')">URL Manual</button></div>' +
        '<div class="thumb-grid"><div class="thumb-preview" id="fThumbPrev">Belum ada gambar</div><div>' +
          '<div id="fThumbUp" hidden><div class="dropzone" id="fThumbDrop"><i data-lucide="image-plus" class="w-6 h-6 mx-auto mb-1"></i><p class="text-[13px] font-semibold">Klik atau seret gambar</p><p class="text-[11px]">JPG/PNG/WEBP · maks 5 MB</p></div><input type="file" id="fThumbFile" class="hidden" accept="image/*"><p id="fThumbInfo" class="text-xs text-muted mt-2"></p></div>' +
          '<div id="fThumbUrlBox" hidden><input id="fThumbUrl" class="form-input" placeholder="https://… (link berbagi Google Drive otomatis dikonversi)" value="' + esc(F.thumb.url) + '" oninput="refreshThumb()"></div>' +
          '<p id="fThumbYt" class="text-[13px] text-muted" hidden>Diambil otomatis dari video pertama (episode pertama untuk Kelas, video preview pertama untuk Aplikasi).</p>' +
        '</div></div></div>' +

      // Aplikasi: preview publik
      '<div id="boxApp" class="pf-section"><p class="pf-title"><i data-lucide="images" class="w-4 h-4"></i> Preview Aplikasi (' + (cr ? 'terlihat oleh customer' : 'terlihat publik') + ')</p>' +
        '<div class="flex items-center justify-between"><label class="form-label !m-0">Slide Gambar</label><div class="flex gap-1.5"><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addSlide(\'upload\')">+ Upload</button><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addSlide(\'url\')">+ URL</button></div></div>' +
        '<div id="fSlides" class="grid gap-2 mt-2"></div>' +
        '<div class="flex items-center justify-between mt-4"><label class="form-label !m-0">Video Preview (YouTube)</label><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addVideo(\'pvideos\')">+ Video</button></div>' +
        '<div id="fPvideos" class="grid gap-2 mt-2"></div>' +
        '<p class="pf-title mt-5"><i data-lucide="lock" class="w-4 h-4"></i> Isi Terkunci (hanya pembeli)</p>' +
        '<label class="form-label">File Source Code / berkas utama (maks 25 MB)' + (cr ? ' *' : '') + '</label><div class="dropzone" id="fSrcDrop"><i data-lucide="file-archive" class="w-6 h-6 mx-auto mb-1"></i><p class="text-[13px] font-semibold">Klik atau seret berkas</p><p class="text-[11px]">ZIP, RAR, TXT, MD, kode sumber, PDF, DOCX, dll.</p></div><input type="file" id="fSrcFile" class="hidden"><p id="fSrcInfo" class="text-xs mt-2 text-accent"></p>' +
        (cr ? '<label class="form-label mt-3" for="fSrcLink">…atau tempel link Google Drive file ZIP (untuk berkas &gt; 25 MB)</label><input id="fSrcLink" class="form-input" placeholder="https://drive.google.com/file/d/…" value="">' +
          '<p class="text-[11px] text-muted mt-1">Atur akses file: "Siapa saja yang memiliki link".</p>' : '') +
      '</div>' +

      // Kelas & Aplikasi: video + materi
      '<div id="boxVideo" class="pf-section"><div class="flex items-center justify-between"><label class="form-label !m-0" id="lblEp">Daftar Episode *</label><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addVideo(\'episodes\')">+ Tambah</button></div>' +
        '<div id="fEpisodes" class="grid gap-2 mt-2"></div></div>' +

      '<div id="boxDoc" class="pf-section"><label class="form-label">Dokumen Utama (opsional, maks 25 MB)</label><div class="dropzone" id="fDocDrop"><i data-lucide="upload-cloud" class="w-6 h-6 mx-auto mb-1"></i><p class="text-[13px] font-semibold">Klik atau seret berkas</p><p class="text-[11px]">Semua format: PDF, DOCX, PPTX, XLSX, MD, TXT, ZIP, kode sumber…</p></div><input type="file" id="fDocFile" class="hidden"><p id="fDocInfo" class="text-xs mt-2 text-accent"></p>' +
        '<p class="text-[11px] text-muted mt-2">Tambahkan berkas lain sebanyak apa pun di bagian <b>Berkas & Materi</b> di bawah (mis. bank PRD siap unduh).</p></div>' +

      // v3.5: materi/berkas — Kelas, Aplikasi & Dokumen; semua format; banyak berkas sekaligus
      '<div id="boxRes" class="pf-section"><div class="flex flex-wrap items-center justify-between gap-2"><label class="form-label !m-0" id="lblRes">Materi Penunjang</label><div class="flex gap-1.5"><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addRes(\'link\')">+ Link</button><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="addRes(\'file\')">+ Berkas</button><button type="button" class="btn-primary !w-auto !py-1 !px-2 !text-xs" onclick="addResFiles()">+ Unggah Banyak</button></div></div>' +
        '<p class="text-[11px] text-muted mt-1">Semua format didukung (ZIP, TXT, MD, PDF, DOCX, PPTX, XLSX, kode sumber, gambar…, maks 25 MB/berkas). Berkas <b>TXT/MD/kode</b> bisa dibuka & disalin langsung oleh member. URL link tidak pernah terlihat member.</p>' +
        '<div id="fResources" class="grid gap-2 mt-2"></div></div>' +
      '<div id="boxLink" class="pf-section">' + field('fLink', 'Link AI (GEMS / GPTs / Claude) *', p && p.External_Link, 'https://…') + '</div>' +
      (cr ? '<div class="pf-section"><label class="form-label" for="fCustNote">Catatan serah terima untuk customer</label><textarea id="fCustNote" class="form-input" rows="3" placeholder="Langkah instalasi singkat, akun demo, masa garansi revisi, dll.">' + esc((cr.delivery && cr.delivery.note) || '') + '</textarea></div>' : '') +
    '</div>',
    didOpen: () => {
      document.getElementById('fCat').addEventListener('change', syncProductForm);
      bindDropzone(document.getElementById('fThumbDrop'), document.getElementById('fThumbFile'), uploadThumbFile);
      bindDropzone(document.getElementById('fDocDrop'), document.getElementById('fDocFile'), f => uploadDocInto(f, 'fDocInfo', p && p.Product_ID));
      bindDropzone(document.getElementById('fSrcDrop'), document.getElementById('fSrcFile'), f => uploadDocInto(f, 'fSrcInfo', p && p.Product_ID));
      syncProductForm(); renderVideoRows('episodes'); renderVideoRows('pvideos'); renderResRows(); renderSlides();
      setThumbMode(F.thumb.mode || 'url');
      if (F.doc) { document.getElementById('fDocInfo').textContent = '✓ ' + F.doc.name; document.getElementById('fSrcInfo').textContent = '✓ ' + F.doc.name; }
      if (cr && F.doc) { const l = document.getElementById('fSrcLink'); if (l) l.value = 'https://drive.google.com/file/d/' + F.doc.fileId + '/view'; }
      refreshIcons();
    },
    preConfirm: () => {
      collectRows();
      const cat = document.getElementById('fCat').value;
      const title = document.getElementById('fTitle').value.trim();
      if (title.length < 3) return Swal.showValidationMessage('Judul minimal 3 karakter.');
      const price = Number(document.getElementById('fPrice').value);
      if (isNaN(price) || price < 0) return Swal.showValidationMessage('Harga tidak valid.');
      const eps = F.episodes.filter(e => e.url && e.url.trim());
      if (cat === 'Kelas' && !eps.length) return Swal.showValidationMessage('Kelas butuh minimal satu episode YouTube.');
      const badRes = F.resources.filter(r => r.title && (r.type === 'link' ? !/^https?:\/\//i.test(r.url || '') : !r.fileId))[0];
      if ((cat === 'Kelas' || cat === 'Aplikasi' || cat === 'Document') && badRes) return Swal.showValidationMessage('Materi "' + badRes.title + '" belum lengkap.');
      if (F.resources.some(r => r._busy)) return Swal.showValidationMessage('Tunggu, masih ada berkas yang sedang diunggah.');
      const link = document.getElementById('fLink').value.trim();
      if (cat === 'AI Link' && !/^https?:\/\//i.test(link)) return Swal.showValidationMessage('Link AI harus diawali https://');
      for (const k of ['fLynk', 'fWa']) { const v = document.getElementById(k).value.trim(); if (v && !/^https?:\/\//i.test(v)) return Swal.showValidationMessage('Link harus diawali https://'); }
      let zipId = F.doc ? F.doc.fileId : '';
      if (cr) {
        const lnk = document.getElementById('fSrcLink').value.trim();
        if (lnk) { const idFromLink = driveIdOf(lnk); if (!idFromLink) return Swal.showValidationMessage('Link Google Drive ZIP tidak valid.'); zipId = idFromLink; }
        if (!zipId) return Swal.showValidationMessage('Lampirkan file source code (.zip) — unggah atau tempel link Google Drive.');
      }
      return {
        Product_ID: p ? p.Product_ID : '', Title: title, Category: cat, Tagline: document.getElementById('fTag').value.trim(),
        Description: document.getElementById('fDesc').value.trim(), Price: price, Status: document.getElementById('fStatus').value,
        Sort_Order: Number(document.getElementById('fSort').value) || 0, Lynk_URL: document.getElementById('fLynk').value.trim(),
        Is_Public: document.getElementById('fPublic').checked, WA_Group_URL: document.getElementById('fWa').value.trim(),
        Thumbnail_Mode: F.thumb.mode, Thumbnail_File_ID: F.thumb.fileId,
        Thumbnail_URL: F.thumb.mode === 'url' ? document.getElementById('fThumbUrl').value.trim() : F.thumb.url,
        episodes: eps, resources: F.resources.filter(r => r.title).map(r => ({ id: r.id, type: r.type, title: r.title, url: r.url, fileId: r.fileId, fileName: r.fileName || '' })), slides: F.slides.filter(s => s.fileId || s.url),
        previewVideos: F.pvideos.filter(v => v.url && v.url.trim()), External_Link: link, Drive_File_ID: zipId,
        _note: cr ? document.getElementById('fCustNote').value.trim() : ''
      };
    }
  }).then(async r => {
    if (!r.isConfirmed) return;
    if (cr) return submitCustomDelivery(cr, r.value);
    Swal.fire({ title: 'Menyimpan…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await api('saveProduct', r.value);
    Swal.close();
    if (toastRes(res)) Admin.fetch('productsAdmin');
    else openProductFormRetry(r.value, res.message);
  });
}
function openProductFormRetry(v, msg) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: msg }); }

function syncProductForm() {
  const v = document.getElementById('fCat').value;
  F.cat = v;
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('boxVideo', v === 'Kelas' || v === 'Aplikasi'); show('boxApp', v === 'Aplikasi');
  show('boxDoc', v === 'Document'); show('boxLink', v === 'AI Link'); show('boxWa', v === 'Kelas' || v === 'Aplikasi');
  show('boxRes', v === 'Kelas' || v === 'Aplikasi' || v === 'Document');                   // v3.5
  const lr = document.getElementById('lblRes'); if (lr) lr.textContent = v === 'Document' ? 'Berkas Dokumen Tambahan' : 'Materi Penunjang';
  document.getElementById('lblEp').textContent = v === 'Aplikasi' ? 'Video Panduan Instalasi (terkunci)' : 'Daftar Episode *';
  const yt = document.querySelector('#fThumbTabs [data-mode="youtube"]');
  yt.style.display = (v === 'Kelas' || v === 'Aplikasi') ? '' : 'none';
  if (yt.style.display === 'none' && F.thumb.mode === 'youtube') setThumbMode('url');
  refreshThumb();
}
function setThumbMode(mode) {
  F.thumb.mode = mode;
  document.querySelectorAll('#fThumbTabs .mode-tab').forEach(b => b.classList.toggle('is-active', b.dataset.mode === mode));
  document.getElementById('fThumbUp').hidden = mode !== 'upload';
  document.getElementById('fThumbUrlBox').hidden = mode !== 'url';
  document.getElementById('fThumbYt').hidden = mode !== 'youtube';
  refreshThumb();
}
function ytId(url) {
  const s = String(url || '').trim();
  const pats = [/youtu\.be\/([A-Za-z0-9_-]{11})/, /[?&]v=([A-Za-z0-9_-]{11})/, /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/, /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/, /youtube\.com\/live\/([A-Za-z0-9_-]{11})/];
  for (const re of pats) { const m = s.match(re); if (m) return m[1]; }
  return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : '';
}
function driveToThumb(url) {
  const m = String(url || '').match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/) || String(url || '').match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]{10,})/);
  return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000' : url;
}
function refreshThumb() {
  const box = document.getElementById('fThumbPrev');
  if (!box) return;
  collectRows();
  let src = '';
  if (F.thumb.mode === 'upload' && F.thumb.fileId) src = 'https://drive.google.com/thumbnail?id=' + F.thumb.fileId + '&sz=w800';
  else if (F.thumb.mode === 'url') { const el = document.getElementById('fThumbUrl'); src = driveToThumb(el ? el.value.trim() : F.thumb.url); }
  else if (F.thumb.mode === 'youtube') {
    const first = (F.cat === 'Aplikasi' ? F.pvideos.concat(F.episodes) : F.episodes).filter(e => e.url)[0];
    const id = first ? ytId(first.url) : '';
    src = id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }
  box.innerHTML = src ? img(src, 'Pratinjau') : 'Belum ada gambar';
}
async function uploadThumbFile(file) {
  const info = document.getElementById('fThumbInfo');
  info.innerHTML = '<span class="spinner-inline"></span> Mengunggah…';
  try {
    const res = await uploadFile('thumb', file);
    if (!res.success) throw new Error(res.message);
    F.thumb.fileId = res.data.fileId; F.thumb.mode = 'upload';
    info.style.color = 'var(--success)'; info.textContent = '✓ ' + res.data.fileName;
    refreshThumb();
  } catch (e) { info.style.color = 'var(--error)'; info.textContent = e.message; }
}
async function uploadDocInto(file, infoId, pid) {
  const info = document.getElementById(infoId);
  info.style.color = 'var(--text-muted)'; info.innerHTML = '<span class="spinner-inline"></span> Mengunggah ' + esc(file.name) + '…';
  try {
    const res = await uploadFile('doc', file, { productId: pid || '' });
    if (!res.success) throw new Error(res.message);
    F.doc = { fileId: res.data.fileId, name: res.data.fileName + ' (' + res.data.fileSize + ')' };
    info.style.color = 'var(--success)'; info.textContent = '✓ ' + F.doc.name;
  } catch (e) { info.style.color = 'var(--error)'; info.textContent = e.message; }
}

// Editor daftar video (episodes / pvideos)
function renderVideoRows(key) {
  const box = document.getElementById(key === 'episodes' ? 'fEpisodes' : 'fPvideos');
  if (!box) return;
  const list = F[key];
  if (!list.length) { box.innerHTML = '<p class="text-[13px] text-muted">Belum ada video.</p>'; return; }
  box.innerHTML = list.map((ep, i) => '<div class="builder-row"><span class="builder-handle">' + (i + 1) + '</span>' +
    '<div class="grid gap-1.5 flex-1 min-w-0"><input class="form-input" data-list="' + key + '" data-i="' + i + '" data-f="title" placeholder="Judul" value="' + esc(ep.title || '') + '">' +
    '<div class="grid grid-cols-[1fr_96px] gap-1.5"><input class="form-input" data-list="' + key + '" data-i="' + i + '" data-f="url" placeholder="https://youtu.be/…" value="' + esc(ep.url || '') + '" oninput="refreshThumb()">' +
    (key === 'episodes' ? '<input class="form-input" data-list="' + key + '" data-i="' + i + '" data-f="duration" placeholder="12:30" value="' + esc(ep.duration || '') + '">' : '<span></span>') + '</div></div>' +
    '<div class="grid gap-1"><button type="button" class="btn-icon" onclick="moveRow(\'' + key + '\',' + i + ',-1)"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>' +
    '<button type="button" class="btn-icon" onclick="moveRow(\'' + key + '\',' + i + ',1)"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>' +
    '<button type="button" class="btn-icon" onclick="removeRow(\'' + key + '\',' + i + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>').join('');
  refreshIcons();
}
function renderResRows() {
  const box = document.getElementById('fResources');
  if (!box) return;
  if (!F.resources.length) { box.innerHTML = '<p class="text-[13px] text-muted">Belum ada materi.</p>'; return; }
  box.innerHTML = F.resources.map((r, i) => {
    const isFile = r.type === 'file';
    return '<div class="builder-row"><span class="builder-handle"><i data-lucide="' + (isFile ? 'file-text' : 'link') + '" class="w-3 h-3"></i></span>' +
      '<div class="grid gap-1.5 flex-1 min-w-0"><input class="form-input" data-list="resources" data-i="' + i + '" data-f="title" placeholder="Judul materi" value="' + esc(r.title || '') + '">' +
      (isFile ? '<div class="flex gap-2 items-center"><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="pickResFile(' + i + ')"><i data-lucide="upload" class="w-3.5 h-3.5"></i> Pilih Berkas</button>' +
        '<span id="resInfo' + i + '" class="text-xs truncate" style="color:' + (r.fileId ? 'var(--success)' : 'var(--text-muted)') + '">' + (r._busy ? '<span class="spinner-inline"></span> Mengunggah…' : r.fileId ? '✓ ' + esc(r.fileName || 'Berkas tersimpan') : 'Belum ada berkas') + '</span></div>'
              : '<input class="form-input" data-list="resources" data-i="' + i + '" data-f="url" placeholder="https://…" value="' + esc(r.url || '') + '">') + '</div>' +
      '<div class="grid gap-1"><button type="button" class="btn-icon" onclick="moveRow(\'resources\',' + i + ',-1)"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>' +
      '<button type="button" class="btn-icon" onclick="removeRow(\'resources\',' + i + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
  }).join('');
  refreshIcons();
}
function renderSlides() {
  const box = document.getElementById('fSlides');
  if (!box) return;
  if (!F.slides.length) { box.innerHTML = '<p class="text-[13px] text-muted">Belum ada slide.</p>'; return; }
  box.innerHTML = F.slides.map((s, i) => {
    const src = s.fileId ? 'https://drive.google.com/thumbnail?id=' + s.fileId + '&sz=w400' : driveToThumb(s.url);
    return '<div class="builder-row"><div class="w-20 h-14 rounded-lg overflow-hidden flex-none bg-surface-2">' + (src ? img(src, '', 'style="width:100%;height:100%;object-fit:cover"') : '') + '</div>' +
      '<div class="grid gap-1.5 flex-1 min-w-0">' + (s.fileId ? '<p class="text-xs" style="color:var(--success)">✓ Gambar terunggah</p>'
        : '<input class="form-input" data-list="slides" data-i="' + i + '" data-f="url" placeholder="https://… URL gambar" value="' + esc(s.url || '') + '" onchange="collectRows();renderSlides()">') +
      '<input class="form-input" data-list="slides" data-i="' + i + '" data-f="caption" placeholder="Keterangan (opsional)" value="' + esc(s.caption || '') + '"></div>' +
      '<div class="grid gap-1"><button type="button" class="btn-icon" onclick="moveRow(\'slides\',' + i + ',-1)"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>' +
      '<button type="button" class="btn-icon" onclick="removeRow(\'slides\',' + i + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
  }).join('');
  refreshIcons();
}
function collectRows() {
  document.querySelectorAll('.swal2-popup [data-list]').forEach(el => {
    const list = F[el.dataset.list], i = +el.dataset.i;
    if (list && list[i]) list[i][el.dataset.f] = el.value;
  });
}
function rerender(key) { if (key === 'resources') renderResRows(); else if (key === 'slides') renderSlides(); else renderVideoRows(key); refreshThumb(); }
function addVideo(key) { collectRows(); F[key].push({ id: '', title: '', url: '', duration: '' }); rerender(key); }
function addRes(type) { collectRows(); F.resources.push({ id: '', type: type, title: '', url: '', fileId: '' }); rerender('resources'); }
function removeRow(key, i) { collectRows(); F[key].splice(i, 1); rerender(key); }
function moveRow(key, i, dir) { collectRows(); const j = i + dir; if (j < 0 || j >= F[key].length) return; const t = F[key][i]; F[key][i] = F[key][j]; F[key][j] = t; rerender(key); }
async function addSlide(mode) {
  collectRows();
  if (mode === 'url') { F.slides.push({ id: '', url: '', fileId: '', caption: '' }); return renderSlides(); }
  const file = await pickFile('image/*');
  if (!file) return;
  showToast('Mengunggah', file.name, 'info');
  const res = await uploadFile('thumb', file).catch(e => ({ success: false, message: e.message }));
  if (!res.success) return showToast('Gagal', res.message, 'error');
  collectRows();
  F.slides.push({ id: '', fileId: res.data.fileId, url: '', caption: '' });
  renderSlides();
}
async function pickResFile(i) {
  collectRows();
  const file = await pickFile('*/*');                                 // v3.5: semua format (ZIP/TXT/MD/PDF/DOCX/PPT/…)
  if (!file) return;
  const r = F.resources[i];
  if (!r) return;
  r._busy = true; renderResRows();
  const res = await uploadFile('doc', file).catch(e => ({ success: false, message: e.message }));
  r._busy = false;
  if (!res.success) { renderResRows(); const info = document.getElementById('resInfo' + F.resources.indexOf(r)); if (info) { info.style.color = 'var(--error)'; info.textContent = res.message; } return; }
  collectRows();
  r.fileId = res.data.fileId; r.fileName = res.data.fileName || file.name;
  if (!r.title) r.title = file.name;
  renderResRows();
}

/** v3.5 — pilih banyak berkas sekaligus → masing-masing jadi satu baris materi, diunggah berurutan. */
async function addResFiles() {
  collectRows();
  const files = await pickFiles('*/*', true);
  if (!files.length) return;
  const rows = files.map(f => ({ id: '', type: 'file', title: f.name.replace(/\.[^.]+$/, ''), url: '', fileId: '', fileName: f.name, _busy: true, _file: f }));
  F.resources.push.apply(F.resources, rows);
  renderResRows();
  let okN = 0;
  for (const r of rows) {
    const res = await uploadFile('doc', r._file).catch(e => ({ success: false, message: e.message }));
    collectRows();
    r._busy = false; delete r._file;
    if (res.success) { r.fileId = res.data.fileId; r.fileName = res.data.fileName || r.fileName; okN++; }
    else r._err = res.message;
    renderResRows();
    const info = document.getElementById('resInfo' + F.resources.indexOf(r));
    if (r._err && info) { info.style.color = 'var(--error)'; info.textContent = r._err; }
  }
  showToast(okN === rows.length ? 'Berkas terunggah' : 'Sebagian gagal', okN + ' dari ' + rows.length + ' berkas berhasil diunggah.', okN === rows.length ? 'success' : 'warning');
}
