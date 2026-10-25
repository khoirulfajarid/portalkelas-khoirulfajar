/**
 * ============================================================
 * member.js — Portal Member (v3.5: desain biru Stitch)
 * Beranda (sambutan, ringkasan, katalog + sidebar), Kelas Saya, Panduan,
 * Pesanan, Helpdesk (knowledge base), Ruang Kelas/Aplikasi/Dokumen,
 * penampil teks/kode "Lihat & Salin", Checkout, Gerbang Kelengkapan Data,
 * Popup Pengumuman (global di dashboard · khusus di dalam kelas tertentu).
 * ============================================================
 */

const MEMBER_MENU = [
  { id: 'home', icon: 'layout-grid', label: 'Beranda' },
  { id: 'library', icon: 'graduation-cap', label: 'Kelas Saya' },
  { id: 'bootcamp', icon: 'calendar-days', label: 'Bootcamp' },          // v3.4: jadwal, link pertemuan & absensi
  { id: 'karya', icon: 'trophy', label: 'Pameran Karya' },                 // v3.4: ajukan testimoni karya
  { id: 'guides', icon: 'book-open', label: 'Panduan' },                   // v3.5: panduan juga di dalam portal member
  { id: 'custom', icon: 'wand-sparkles', label: 'Aplikasi Custom' },
  { id: 'orders', icon: 'receipt', label: 'Pesanan' },
  { id: 'helpdesk', icon: 'life-buoy', label: 'Helpdesk' }
];

const Member = {
  _loading: null,
  _lastFetch: 0,

  /** Bootstrap 1 panggilan: tampil dari cache dulu, lalu segarkan di latar. */
  refresh() {
    if (this._loading) return this._loading;
    this._loading = swr(userKey('boot'), 'memberBootstrap', {}, (d, fromCache, changed) => {
      AppState.m = d;
      if (fromCache || changed) { rememberBrand(d.settings); Member.renderMounted(); }   // data sama → tidak render ulang
      if (!fromCache) { Member._lastFetch = Date.now(); Member.showAnnouncements(); }
    }, { onError: res => Member.renderError(res.message) }).finally(() => { this._loading = null; });
    return this._loading;
  },

  /** Belum ada data sama sekali & server gagal → tampilkan tombol Coba lagi (bukan skeleton selamanya). */
  renderError(msg) {
    if (AppState.m) return;
    ['homeRoot', 'libraryRoot', 'ordersRoot', 'helpRoot', 'customRoot', 'guidesRoot'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = errorState(msg, 'Member.retry()');
    });
    refreshIcons();
  },
  retry() {
    ['homeRoot', 'libraryRoot', 'ordersRoot', 'helpRoot', 'customRoot', 'guidesRoot'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = skeletonRows(4); });
    this.refresh();
  },

  /** Render ulang halaman member yang sudah pernah dibuka. */
  renderMounted() {
    renderTopnav();
    if (document.getElementById('homeRoot')) renderHome();
    if (document.getElementById('libraryRoot')) renderLibrary();
    if (document.getElementById('ordersRoot')) renderOrders();
    if (document.getElementById('helpRoot')) renderHelpdesk();
    if (document.getElementById('guidesRoot')) renderMemberGuides();                                            // v3.5
    if (document.getElementById('customRoot') && typeof renderCustomList === 'function') renderCustomList();
    if (document.getElementById('customDetailRoot') && typeof renderCustomDetail === 'function') renderCustomDetail();
    if (document.getElementById('bootRoot') && typeof renderMyBootcamp === 'function') renderMyBootcamp();      // v3.4
    if (document.getElementById('karyaRoot') && typeof renderKarya === 'function') renderKarya();
  },

  /** Segarkan diam-diam bila data sudah > 60 detik (dipanggil saat pindah halaman). */
  softRefresh() { if (Date.now() - this._lastFetch > 60000) this.refresh(); },

  profile() { return (AppState.m && AppState.m.profile) || { complete: false }; },

  /**
   * v3.5 — Pengumuman global (Semua member / Pemilik produk / Data belum lengkap) muncul di dashboard portal.
   * Pengumuman bertarget KELAS hanya muncul saat member membuka ruang kelas yang dipilih Admin.
   */
  showAnnouncements() {
    const list = (AppState.m && AppState.m.announcements) || [];
    Ann.push(list.filter(a => a.audience !== 'class'));
    if (AppState.currentPage === 'product' && AppState.detailId) Member.showClassAnnouncements(AppState.detailId);
  },
  showClassAnnouncements(productId) {
    const list = ((AppState.m && AppState.m.announcements) || []).filter(a => a.audience === 'class' && (a.productIds || []).indexOf(String(productId)) > -1);
    Ann.push(list);
  }
};

/** Antrean popup pengumuman: satu per satu, tidak menimpa dialog lain yang sedang terbuka. */
const Ann = {
  q: [], busy: false,
  seenOnce() { return Store.get(userKey('annSeen'), []); },
  seenSession() { try { return JSON.parse(sessionStorage.getItem('dph3:annSession') || '[]'); } catch (e) { return []; } },
  isSeen(a) { return a.showMode === 'every' ? Ann.seenSession().indexOf(a.id) > -1 : Ann.seenOnce().indexOf(a.id) > -1; },
  mark(a) {
    if (a.showMode === 'every') { const l = Ann.seenSession(); l.push(a.id); try { sessionStorage.setItem('dph3:annSession', JSON.stringify(l)); } catch (e) { /* */ } }
    else { const l = Ann.seenOnce(); l.push(a.id); Store.set(userKey('annSeen'), l); }
  },
  push(list) {
    (list || []).forEach(a => { if (!Ann.isSeen(a) && !Ann.q.some(x => x.id === a.id)) Ann.q.push(a); });
    if (!Ann.busy) Ann.next();
  },
  next() {
    if (!Ann.q.length) { Ann.busy = false; return; }
    Ann.busy = true;
    if (window.Swal && Swal.isVisible()) { setTimeout(Ann.next, 1500); return; }      // tunggu dialog lain ditutup dulu
    const a = Ann.q.shift();
    Ann.mark(a);
    Ann.show(a).then(() => setTimeout(Ann.next, 250));
  },
  show(a) {
    const cls = a.audience === 'class';
    const prodTitle = cls ? (((AppState.m && AppState.m.catalog) || []).filter(p => (a.productIds || []).indexOf(p.Product_ID) > -1).map(p => p.Title)[0] || '') : '';
    return Swal.fire({
      width: 560, showCloseButton: true, showConfirmButton: !!(a.ctaUrl && a.ctaLabel), confirmButtonText: a.ctaLabel || 'OK',
      showCancelButton: true, cancelButtonText: 'Tutup',
      html: '<div style="text-align:left">' +
        '<span class="badge ' + (cls ? 'badge-video' : 'badge-warning') + ' mb-3"><i data-lucide="megaphone" class="w-3.5 h-3.5"></i> ' + (cls ? 'Info Kelas' + (prodTitle ? ' · ' + esc(prodTitle) : '') : 'Pengumuman') + '</span>' +
        (a.image ? '<div class="rounded-xl overflow-hidden mb-4">' + img(a.image, a.title, 'style="width:100%"') + '</div>' : '') +
        '<h3 class="text-xl font-bold text-main">' + esc(a.title) + '</h3>' +
        '<p class="mt-2 text-[15px] text-muted whitespace-pre-line">' + esc(a.body) + '</p></div>',
      didOpen: refreshIcons
    }).then(r => { if (r.isConfirmed && a.ctaUrl) openLink(a.ctaUrl); });
  }
};
/** Buka ulang pengumuman dari pita di beranda. */
function openAnnouncement(id) {
  const a = ((AppState.m && AppState.m.announcements) || []).filter(x => x.id === id)[0];
  if (a) Ann.show(a);
}
function dismissAnnStrip(id) {
  try { sessionStorage.setItem('dph3:annStrip', id); } catch (e) { /* */ }
  const el = document.getElementById('annStrip'); if (el) el.remove();
}


// ════════════════════════════════════════════════════════════
// TOPNAV MEMBER
// ════════════════════════════════════════════════════════════
function renderTopnav() {
  const nav = document.getElementById('topnav');
  if (!nav || nav.hidden) return;
  const s = (AppState.m && AppState.m.settings) || {};
  const pending = ((AppState.m && AppState.m.orders) || []).filter(o => o.Status === 'Pending').length;
  const links = MEMBER_MENU.map(m => '<button type="button" class="topnav-link" data-nav="' + m.id + '" onclick="go(\'' + m.id + '\')">' +
    '<i data-lucide="' + m.icon + '" class="w-4 h-4 inline -mt-0.5 mr-1"></i>' + m.label +
    (m.id === 'orders' ? '<span class="nav-badge" data-badge="orders"' + (pending ? '' : ' hidden') + '>' + pending + '</span>' : '') + '</button>').join('');
  document.getElementById('topnavBrand').innerHTML = brandLogoHtml(30) + '<span class="truncate">' + esc(s.appName || Store.get('brandName', '') || 'Digital Product Hub') + '</span>';
  document.getElementById('topnavMenu').innerHTML = links;
  document.getElementById('topnavMobile').innerHTML = links;
  const p = Member.profile();
  document.getElementById('avatar').textContent = initial(p.nickname || AppState.email);
  document.getElementById('avatar').title = (p.nickname || '') + ' · ' + (AppState.email || '');
  updateActiveNav(AppState.currentPage);
  refreshIcons();
}


// ════════════════════════════════════════════════════════════
// BERANDA (sambutan · ringkasan · katalog · sidebar · pameran karya)
// ════════════════════════════════════════════════════════════
registerPage('home', {
  title: 'Beranda',
  template: () => '<div class="page-wrap" id="homeRoot"><div class="skeleton h-28 w-full mb-5"></div><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + skeletonCards(6) + '</div></div>',
  show: () => { if (AppState.m) renderHome(); Member.softRefresh(); }
});

const HOME_CATS = [['Kelas', 'Kelas', 'graduation-cap'], ['Aplikasi', 'Aplikasi', 'app-window'], ['Document', 'Dokumen', 'file-text']];
const HomeQ = { q: '' };

/** v3.5: AI Link dihapus dari katalog. Produk AI Link lama yang sudah dimiliki tetap bisa dibuka. */
function homeCatalog() { return ((AppState.m && AppState.m.catalog) || []).filter(p => p.Category !== 'AI Link' || p.owned); }

function renderHome() {
  const root = document.getElementById('homeRoot');
  if (!root || !AppState.m) return;
  const d = AppState.m, s = d.settings || {}, prof = d.profile || {};
  const catalog = homeCatalog();
  const cats = HOME_CATS.filter(c => catalog.some(p => p.Category === c[0]));
  if (AppState.catalogFilter !== 'all' && !cats.some(c => c[0] === AppState.catalogFilter)) AppState.catalogFilter = 'all';
  const f = AppState.catalogFilter;
  const name = prof.nickname || String(AppState.email || '').split('@')[0];

  // Pita pengumuman terbaru (pengumuman kelas tidak ditampilkan di sini)
  let stripId = ''; try { stripId = sessionStorage.getItem('dph3:annStrip') || ''; } catch (e) { /* */ }
  const ann = (d.announcements || []).filter(a => a.audience !== 'class')[0];
  const strip = ann && ann.id !== stripId
    ? '<div class="ann-strip" id="annStrip"><span class="ann-strip-ico"><i data-lucide="megaphone" class="w-4 h-4"></i></span>' +
      '<p class="flex-1 min-w-0 truncate"><b>Pengumuman:</b> ' + esc(ann.title) + '</p>' +
      '<button class="link35 whitespace-nowrap" onclick="openAnnouncement(' + jsArg(ann.id) + ')">Lihat</button>' +
      '<button class="icon-btn !w-8 !h-8" title="Sembunyikan" onclick="dismissAnnStrip(' + jsArg(ann.id) + ')"><i data-lucide="x" class="w-4 h-4"></i></button></div>'
    : '';

  const lastId = Store.get(userKey('lastProduct'), '');
  const last = lastId && catalog.filter(p => p.Product_ID === lastId && p.owned)[0];
  const welcome =
    '<section class="welcome35">' +
      '<div class="min-w-0">' +
        (prof.complete ? '<span class="welcome35-chip"><i data-lucide="badge-check" class="w-3.5 h-3.5" style="color:var(--success)"></i> Profil Lengkap & Terverifikasi</span>'
                       : '<span class="welcome35-chip" style="color:#B45309"><i data-lucide="user-round-pen" class="w-3.5 h-3.5"></i> Profil belum lengkap</span>') +
        '<h1>Selamat datang kembali, ' + esc(name) + '!</h1>' +
        '<p>Kelola pembelajaran Anda, cek jadwal bootcamp, atau jelajahi katalog produk digital terbaru.</p>' +
      '</div>' +
      '<div class="flex flex-wrap gap-2">' +
        (!prof.complete ? '<button class="btn-amber is-solid btn-glow" onclick="openProfileDialog()"><i data-lucide="user-check" class="w-4 h-4"></i> Lengkapi Data</button>' : '') +
        '<button class="btn-primary !w-auto' + (prof.complete ? ' btn-glow' : '') + '" onclick="' + (last ? 'go(\'product\',' + jsArg(last.Product_ID) + ')' : 'go(\'library\')') + '"><i data-lucide="play-circle" class="w-4 h-4"></i> ' + (last ? 'Lanjut Belajar' : 'Kelas Saya') + '</button>' +
        '<button class="btn-ghost !w-auto" onclick="scrollToId(\'homeCatalog\')"><i data-lucide="compass" class="w-4 h-4"></i> Katalog</button>' +
      '</div>' +
    '</section>';

  // Ringkasan: akses · bootcamp · pesanan
  const owned = catalog.filter(p => p.owned).length;
  const mine = ((d.bootcamp || {}).mine || []).filter(b => b.status !== 'Ditolak');
  const b0 = mine[0], ses0 = (b0 && b0.sessions) || [], hadir0 = ses0.filter(x => x.attendedAt).length;
  const pend = (d.orders || []).filter(o => o.Status === 'Pending').length;
  const stats =
    '<div class="mstats">' +
      mstat('library', 'Inventaris Akses', '<span data-count="' + owned + '">' + owned + '</span> Produk Dimiliki', '<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Siap dipelajari', 'go(\'library\')') +
      mstat('presentation', 'Program Bootcamp', '<span data-count="' + mine.length + '">' + mine.length + '</span> Bootcamp Aktif',
        ses0.length ? '<span class="mini-bar"><span style="width:' + Math.round(hadir0 / ses0.length * 100) + '%"></span></span> <span class="text-muted">Hadir ' + hadir0 + '/' + ses0.length + '</span>' : '<i data-lucide="calendar-days" class="w-3.5 h-3.5"></i> Lihat jadwal', 'go(\'bootcamp\')') +
      mstat('receipt', 'Status Pesanan', '<span data-count="' + pend + '">' + pend + '</span> Menunggu', pend ? '<i data-lucide="clock" class="w-3.5 h-3.5"></i> Sedang diverifikasi Admin' : '<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Tidak ada pesanan tertunda', 'go(\'orders\')') +
    '</div>';

  const chips = '<div class="filter35" id="homeChips">' +
    [['all', 'Semua', 'layout-grid']].concat(cats).map(c =>
      '<button class="chip' + (f === c[0] ? ' chip-active' : '') + '" data-cat="' + esc(c[0]) + '" onclick="AppState.catalogFilter=' + jsArg(c[0]) + ';renderHomeGrid()"><i data-lucide="' + c[2] + '" class="w-3.5 h-3.5"></i> ' + esc(c[1]) +
      ' <span class="chip-count">' + (c[0] === 'all' ? catalog.length : catalog.filter(p => p.Category === c[0]).length) + '</span></button>').join('') +
    '<div class="search35"><i data-lucide="search" class="w-4 h-4"></i><input id="homeSearch" type="search" placeholder="Cari materi & alat…" value="' + esc(HomeQ.q) + '"></div></div>';

  const show = d.showcase || [];
  const showHtml = show.length
    ? '<div class="mt-12"><div class="sec35-row mb-5"><div><p class="sec35-eyebrow">Showcase</p><h2 class="text-xl font-bold text-main tracking-tight mt-1">Pameran Karya Member</h2>' +
      '<p class="text-sm text-muted mt-1">Karya terbaik para member — jadikan inspirasi!</p></div><button class="link35" onclick="go(\'karya\')">Lihat semua <i data-lucide="arrow-right" class="w-4 h-4"></i></button></div>' +
      '<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">' + show.slice(0, 6).map(showcaseCard).join('') + '</div></div>'
    : '';

  root.innerHTML = strip + welcome +
    (!prof.complete ? '<div class="notice notice-warning mb-6"><i data-lucide="user-round-pen" class="w-5 h-5 flex-none"></i>' +
      '<div class="flex-1 min-w-0"><p class="font-semibold">Lengkapi data Anda</p><p class="text-sm opacity-90">Nama panggilan & No. WhatsApp wajib diisi sebelum membuka materi kelas.</p></div>' +
      '<button class="btn-primary !w-auto" onclick="openProfileDialog()">Lengkapi</button></div>' : '') +
    stats +
    '<div class="home35"><div class="min-w-0" id="homeCatalog">' + chips + '<div id="homeGrid" class="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"></div>' + showHtml + '</div>' +
      homeSidebar(d, s, prof) + '</div>';
  document.getElementById('homeSearch').addEventListener('input', debounce(e => { HomeQ.q = e.target.value; renderHomeGrid(); }, 180));
  renderHomeGrid();
  Slides.scan(root);
  refreshIcons();
}

function mstat(icon, label, value, sub, onclick) {
  return '<button type="button" class="mstat spot" onclick="' + onclick + '"><div class="min-w-0"><p class="mstat-lbl">' + esc(label) + '</p><p class="mstat-val">' + value + '</p>' +
    '<p class="mstat-sub">' + sub + '</p></div><span class="mstat-ico"><i data-lucide="' + icon + '" class="w-5 h-5"></i></span></button>';
}

function renderHomeGrid() {
  const grid = document.getElementById('homeGrid');
  if (!grid || !AppState.m) return;
  const f = AppState.catalogFilter, q = HomeQ.q.trim().toLowerCase();
  const list = homeCatalog().filter(p => (f === 'all' || p.Category === f) && (!q || (p.Title + ' ' + (p.Tagline || '') + ' ' + (p.Description || '')).toLowerCase().indexOf(q) > -1));
  grid.innerHTML = list.length ? list.map(productCardHtml).join('')
    : '<div class="sm:col-span-2 xl:col-span-3">' + emptyState(q ? 'search-x' : 'package-open', q ? 'Tidak ditemukan' : 'Belum ada produk', q ? 'Coba kata kunci lain.' : 'Produk untuk kategori ini belum tersedia.') + '</div>';
  document.querySelectorAll('#homeChips .chip').forEach(b => b.classList.toggle('chip-active', b.dataset.cat === f));
  refreshIcons();
}

function homeSidebar(d, s, prof) {
  const quick = (icon, t, sub, fn) => '<button type="button" class="quick35" onclick="' + fn + '"><span class="quick35-ico"><i data-lucide="' + icon + '" class="w-4 h-4"></i></span>' +
    '<span class="min-w-0 flex-1"><b>' + esc(t) + '</b><small>' + esc(sub) + '</small></span><i data-lucide="chevron-right" class="w-4 h-4 text-muted"></i></button>';
  const guides = ((d.guides || {}).list || []).length;
  return '<aside class="home35-side">' +
    '<div class="side35"><div class="flex items-center gap-3"><span class="avatar" style="width:46px;height:46px;font-size:16px;border-color:var(--border)">' + esc(initial(prof.nickname || AppState.email)) + '</span>' +
      '<div class="min-w-0"><p class="font-bold text-main truncate">' + esc(prof.fullName || prof.nickname || 'Member') + '</p><p class="text-xs text-muted truncate">' + esc(AppState.email || '') + '</p></div></div>' +
      '<div class="idrow mt-3"><span>WhatsApp</span><b>' + esc(prof.whatsapp || '—') + '</b></div>' +
      '<button class="btn-ghost w-full mt-3" onclick="openProfileDialog()"><i data-lucide="user-cog" class="w-4 h-4"></i> Pengaturan Akun</button></div>' +
    '<div class="side35"><p class="side35-title">Akses Cepat Member</p>' +
      quick('trophy', 'Ajukan Karya', 'Pamerkan portofolio Anda', 'go(\'karya\')') +
      (s.customEnabled ? quick('wand-sparkles', 'Order Aplikasi Custom', 'Kebutuhan aplikasi khusus', 'go(\'custom\')') : '') +
      quick('book-open', 'Panduan', guides ? guides + ' dokumen & video tutorial' : 'Dokumen & video tutorial', 'go(\'guides\')') +
      quick('life-buoy', 'Helpdesk & CS', 'Solusi kendala & kontak Admin', 'go(\'helpdesk\')') +
      quick('key-round', 'Redeem Kode Akses', 'Punya kode dari Lynk.id?', 'openRedeemDialog()') +
    '</div>' +
    (s.waGroupUrl ? '<div class="side35 is-vip"><p class="font-bold text-main flex items-center gap-2"><i data-lucide="users" class="w-4 h-4 text-accent"></i> Grup Komunitas Member</p>' +
      '<p class="text-sm text-muted mt-1">Diskusi, info kelas terbaru, dan saling bantu sesama member.</p>' +
      '<button class="btn-primary w-full mt-3" onclick="openLink(AppState.m.settings.waGroupUrl)"><i data-lucide="message-circle" class="w-4 h-4"></i> Gabung Grup</button></div>' : '') +
    (s.testimoniUrl ? '<div class="side35"><p class="font-bold text-main flex items-center gap-2"><i data-lucide="star" class="w-4 h-4" style="color:var(--amber)"></i> Testimoni Member</p>' +
      '<p class="text-sm text-muted mt-1">Lihat pengalaman & hasil para member kami.</p>' +
      '<button class="btn-ghost w-full mt-3" onclick="openLink(AppState.m.settings.testimoniUrl)"><i data-lucide="external-link" class="w-4 h-4"></i> ' + esc(s.testimoniLabel || 'Lihat Testimoni') + '</button></div>' : '') +
  '</aside>';
}

function productCardHtml(p) {
  const locked = !p.owned, open = p.checkoutOpen !== false, isApp = p.Category === 'Aplikasi';
  let meta = '';
  if (p.Category === 'Kelas' && p.episodeCount) meta = '<span class="inline-flex items-center gap-1"><i data-lucide="list-video" class="w-3.5 h-3.5"></i> ' + p.episodeCount + ' episode</span>';
  if (isApp) { const n = (p.slides || []).length + (p.previewVideos || []).length; if (n) meta = '<span class="inline-flex items-center gap-1"><i data-lucide="images" class="w-3.5 h-3.5"></i> ' + n + ' preview</span>'; }
  if (p.resourceCount) meta += '<span class="inline-flex items-center gap-1 ml-3"><i data-lucide="paperclip" class="w-3.5 h-3.5"></i> ' + p.resourceCount + ' materi</span>';

  let cta;
  if (!locked) cta = '<button class="btn-primary w-full mt-4" onclick="go(\'product\',' + jsArg(p.Product_ID) + ')"><i data-lucide="' + iconFor(p.Category) + '" class="w-4 h-4"></i> ' + (p.Category === 'Kelas' ? 'Buka Ruang Belajar' : 'Akses Produk') + '</button>';
  else if (p.pending) cta = '<button class="btn-ghost w-full mt-4" onclick="go(\'orders\')"><i data-lucide="clock" class="w-4 h-4"></i> Menunggu Verifikasi</button>';
  else if (!open) cta = (isApp ? '<button class="btn-ghost w-full mt-4" onclick="openAppPreview(' + jsArg(p.Product_ID) + ')"><i data-lucide="eye" class="w-4 h-4"></i> Preview</button>' : '') +
    '<button class="btn-ghost w-full ' + (isApp ? 'mt-2' : 'mt-4') + '" title="Penjualan ditutup sementara" onclick="openBuyDialog(' + jsArg(p.Product_ID) + ')"><i data-lucide="pause-circle" class="w-4 h-4"></i> Penjualan Ditutup</button>';
  else if (isApp) cta = '<div class="grid grid-cols-2 gap-2 mt-4"><button class="btn-ghost" onclick="openAppPreview(' + jsArg(p.Product_ID) + ')"><i data-lucide="eye" class="w-4 h-4"></i> Preview</button>' +
    '<button class="btn-primary" onclick="openBuyDialog(' + jsArg(p.Product_ID) + ')"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Beli</button></div>';
  else cta = '<button class="btn-ghost w-full mt-4" onclick="openBuyDialog(' + jsArg(p.Product_ID) + ')"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Beli / Redeem Kode</button>';

  const clickThumb = !locked ? 'go(\'product\',' + jsArg(p.Product_ID) + ')' : (isApp ? 'openAppPreview(' + jsArg(p.Product_ID) + ')' : '');
  return '<article class="product-card spot' + (locked ? ' is-locked' : (p.Category === 'Kelas' ? ' is-owned-class' : '')) + '">' +
    '<div class="product-thumb' + (clickThumb ? ' cursor-pointer' : '') + '"' + (clickThumb ? ' onclick="' + clickThumb + '"' : '') + '>' + img(p.thumbnail, p.Title, '', catLabel(p.Category)) +
      '<span class="ribbon ' + ribbonClass(p.Category) + '">' + esc(catLabel(p.Category)) + '</span>' +
      (locked ? '<div class="lock-overlay"><div class="lock-badge"><i data-lucide="' + (p.pending ? 'clock' : 'lock') + '" class="w-6 h-6"></i></div></div>' +
                '<span class="owned-badge"><i data-lucide="' + (p.pending ? 'clock' : 'lock') + '" class="w-3.5 h-3.5"></i> ' + (p.pending ? 'Diproses' : 'Terkunci') + '</span>'
              : '<span class="owned-badge"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Dimiliki</span>') +
    '</div>' +
    '<div class="p-5 flex flex-col flex-1">' +
      '<div class="flex items-center justify-between gap-2"><span class="badge ' + badgeClassFor(p.Category) + '">' + esc(catLabel(p.Category)) + '</span>' +
      (locked ? (open ? '<span class="price35 !text-[15px]">' + esc(fmtMoney(p.Price)) + '</span>' : '<span class="closed-tag">Ditutup</span>') : '') + '</div>' +
      '<h3 class="mt-3 text-[17px] font-semibold leading-snug text-main line-clamp-2">' + esc(p.Title) + '</h3>' +
      '<p class="mt-2 text-sm text-muted line-clamp-2 flex-1">' + esc(p.Tagline || p.Description) + '</p>' +
      (meta ? '<p class="mt-3 text-xs text-muted flex items-center flex-wrap">' + meta + '</p>' : '') + cta +
    '</div></article>';
}


// ════════════════════════════════════════════════════════════
// KELAS SAYA (pustaka) & PESANAN
// ════════════════════════════════════════════════════════════
registerPage('library', {
  title: 'Kelas Saya',
  template: () => '<div class="page-wrap" id="libraryRoot"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' + skeletonCards(4) + '</div></div>',
  show: () => { if (AppState.m) renderLibrary(); Member.softRefresh(); }
});

function renderLibrary() {
  const root = document.getElementById('libraryRoot');
  if (!root || !AppState.m) return;
  const owned = AppState.m.catalog.filter(p => p.owned);
  root.innerHTML = '<div class="mb-6"><p class="sec35-eyebrow">Member Portal</p><h1 class="page-title mt-1">Kelas Saya</h1><p class="page-sub">Semua kelas, aplikasi & dokumen yang sudah Anda miliki.</p></div>' +
    (owned.length ? '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' + owned.map(productCardHtml).join('') + '</div>'
      : emptyState('library', 'Belum ada kelas', 'Beli produk atau redeem kode akses dari Lynk.id untuk mulai belajar.') +
        '<div class="flex justify-center gap-3 mt-4"><button class="btn-primary !w-auto" onclick="openRedeemDialog()"><i data-lucide="key-round" class="w-4 h-4"></i> Redeem Kode</button>' +
        '<button class="btn-ghost !w-auto" onclick="go(\'home\')">Lihat Katalog</button></div>');
  refreshIcons();
}

registerPage('orders', {
  title: 'Pesanan Saya',
  template: () => '<div class="page-wrap" id="ordersRoot">' + skeletonRows(4) + '</div>',
  show: () => { if (AppState.m) renderOrders(); Member.softRefresh(); }
});

function renderOrders() {
  const root = document.getElementById('ordersRoot');
  if (!root || !AppState.m) return;
  const orders = AppState.m.orders || [], s = AppState.m.settings || {};
  const st = { Pending: ['is-pending', 'badge-warning', 'Menunggu Verifikasi', 'clock'], Approved: ['is-approved', 'badge-success', 'Disetujui', 'check-circle-2'], Rejected: ['is-rejected', 'badge-error', 'Ditolak', 'x-circle'] };
  root.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-3 mb-6"><div><p class="sec35-eyebrow">Member Portal</p><h1 class="page-title mt-1">Pesanan Saya</h1><p class="page-sub">Riwayat pembelian & status verifikasi.</p></div>' +
    (s.adminWhatsApp || s.adminEmail ? '<button class="btn-ghost !w-auto" onclick="contactAdmin(\'Pertanyaan pesanan\')"><i data-lucide="life-buoy" class="w-4 h-4"></i> Hubungi Admin</button>' : '') + '</div>' +
    (orders.length ? '<div class="space-y-4">' + orders.map(o => {
      const x = st[o.Status] || st.Pending;
      return '<div class="order-card ' + x[0] + '">' +
        '<div class="flex-1 min-w-[200px]"><p class="mono text-xs text-muted">' + esc(o.Order_ID) + '</p>' +
        '<p class="mt-1 font-semibold text-main">' + esc(o.Product) + '</p>' +
        '<p class="text-sm text-muted mt-1">' + esc(fmtMoney(o.Amount)) + ' · ' + esc(o.Channel) + ' · ' + esc(fmtDateTime(o.Created_At)) + '</p>' +
        (o.Status === 'Rejected' && o.Note ? '<p class="text-sm mt-2" style="color:var(--error)">Alasan: ' + esc(o.Note) + '</p>' : '') + '</div>' +
        '<span class="badge ' + x[1] + '"><i data-lucide="' + x[3] + '" class="w-3.5 h-3.5"></i> ' + x[2] + '</span>' +
        '<div class="flex gap-2">' +
          (o.proofUrl ? '<button class="btn-icon" title="Bukti transfer" onclick="previewDocument(' + jsArg(o.proofUrl) + ',\'\',\'Bukti Transfer\')"><i data-lucide="image" class="w-4 h-4"></i></button>' : '') +
          (o.Status === 'Approved' ? '<button class="btn-primary !w-auto !py-2" onclick="go(\'product\',' + jsArg(o.Product_ID) + ')">Buka</button>' : '') +
          (o.Status === 'Rejected' ? '<button class="btn-primary !w-auto !py-2" onclick="startCheckout(' + jsArg(o.Product_ID) + ')">Ajukan Ulang</button>' : '') +
        '</div></div>';
    }).join('') + '</div>'
      : emptyState('receipt', 'Belum ada pesanan', 'Pesanan pembelian Anda akan tampil di sini.'));
  refreshIcons();
}

function contactAdmin(topic) {
  const s = (AppState.m && AppState.m.settings) || {};
  const p = Member.profile();
  const text = 'Halo Admin, saya ' + (p.nickname || '') + ' (' + AppState.email + '). ' + (topic || '');
  if (s.adminWhatsApp) openLink(waLink(s.adminWhatsApp, text));
  else if (s.adminEmail) openLink('mailto:' + s.adminEmail + '?subject=' + encodeURIComponent(topic || 'Bantuan') + '&body=' + encodeURIComponent(text));
}


// ════════════════════════════════════════════════════════════
// PANDUAN DI PORTAL MEMBER (v3.5)
// ════════════════════════════════════════════════════════════
const GuideQ = { type: 'all', q: '' };
registerPage('guides', {
  title: 'Panduan',
  template: () => '<div class="page-wrap" id="guidesRoot"><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + skeletonCards(3) + '</div></div>',
  show: () => { if (AppState.m) renderMemberGuides(); Member.softRefresh(); }
});

function renderMemberGuides() {
  const root = document.getElementById('guidesRoot');
  if (!root || !AppState.m) return;
  const g = AppState.m.guides || { list: [] }, list = g.list || [];
  const nDoc = list.filter(x => x.type !== 'video').length, nVid = list.length - nDoc;
  root.innerHTML =
    '<div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6"><div><p class="sec35-eyebrow">Dokumentasi & Tutorial</p><h1 class="page-title mt-1">' + esc(g.title || 'Panduan') + '</h1>' +
      '<p class="page-sub">' + esc(g.subtitle || 'Dokumen dan video panduan untuk membantu Anda belajar & memakai produk.') + '</p></div></div>' +
    (list.length
      ? '<div class="filter35">' + [['all', 'Semua', 'layers', list.length], ['doc', 'Dokumen', 'file-text', nDoc], ['video', 'Video', 'play-circle', nVid]].filter(t => t[0] === 'all' || t[3]).map(t =>
          '<button class="chip' + (GuideQ.type === t[0] ? ' chip-active' : '') + '" onclick="GuideQ.type=' + jsArg(t[0]) + ';renderMemberGuides()"><i data-lucide="' + t[2] + '" class="w-3.5 h-3.5"></i> ' + t[1] + ' <span class="chip-count">' + t[3] + '</span></button>').join('') +
        '<div class="search35"><i data-lucide="search" class="w-4 h-4"></i><input id="guideSearch" type="search" placeholder="Cari panduan…" value="' + esc(GuideQ.q) + '"></div></div>' +
        '<div id="guideGrid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>'
      : emptyState('book-open', 'Belum ada panduan', 'Admin belum menambahkan panduan.'));
  const inp = document.getElementById('guideSearch');
  if (inp) inp.addEventListener('input', debounce(e => { GuideQ.q = e.target.value; renderGuideGrid(); }, 180));
  renderGuideGrid();
  refreshIcons();
}
function renderGuideGrid() {
  const box = document.getElementById('guideGrid');
  if (!box) return;
  const q = GuideQ.q.trim().toLowerCase();
  const list = ((AppState.m.guides || {}).list || []).filter(g => (GuideQ.type === 'all' || (GuideQ.type === 'video' ? g.type === 'video' : g.type !== 'video')) &&
    (!q || (g.title + ' ' + (g.description || '')).toLowerCase().indexOf(q) > -1));
  box.innerHTML = list.length ? list.map(guideCard).join('') : '<div class="sm:col-span-2 lg:col-span-3">' + emptyState('search-x', 'Tidak ditemukan', 'Coba kata kunci lain.') + '</div>';
  refreshIcons();
}


// ════════════════════════════════════════════════════════════
// HELPDESK — Knowledge Base (dikelompokkan per kategori master)
// ════════════════════════════════════════════════════════════
const Help = { cat: 'all', q: '' };

registerPage('helpdesk', {
  title: 'Helpdesk',
  template: () => '<div class="page-wrap" id="helpRoot">' + skeletonRows(6) + '</div>',
  show: () => { if (AppState.m) renderHelpdesk(); Member.softRefresh(); }
});

function renderHelpdesk() {
  const root = document.getElementById('helpRoot');
  if (!root || !AppState.m) return;
  const h = AppState.m.helpdesk || { articles: [], categories: [] }, s = AppState.m.settings || {};
  const count = c => h.articles.filter(a => a.Category === c).length;
  const cats = h.categories.filter(c => count(c.name));
  root.innerHTML =
    '<div class="kb35-hero"><div class="flex flex-wrap items-start justify-between gap-4"><div class="min-w-0"><p class="sec35-eyebrow">Knowledge Base & Solusi</p>' +
      '<h1 class="page-title mt-1">Pusat Bantuan & Helpdesk</h1><p class="page-sub">Temukan solusi cepat untuk kendala akses, materi, pembayaran, dan lainnya.</p></div>' +
      ((s.adminWhatsApp || s.adminEmail) ? '<button class="btn-primary !w-auto btn-glow" onclick="contactAdmin(\'Kendala: \' + (Help.cat===\'all\'?\'Umum\':Help.cat))"><i data-lucide="headset" class="w-4 h-4"></i> Tanya Admin</button>' : '') + '</div>' +
      '<div class="kb35-search"><i data-lucide="search" class="w-5 h-5"></i><input id="helpSearch" type="search" placeholder="Cari kendala, mis. &quot;video tidak muncul&quot;" value="' + esc(Help.q) + '"></div></div>' +
    '<div class="tiles35" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
      '<div class="tile35"><span class="tile35-ico"><i data-lucide="book-open-check" class="w-5 h-5"></i></span><div><p class="tile35-lbl">Total Solusi</p><p class="tile35-val"><span data-count="' + h.articles.length + '">' + h.articles.length + '</span> Artikel</p></div></div>' +
      '<div class="tile35"><span class="tile35-ico is-green"><i data-lucide="folders" class="w-5 h-5"></i></span><div><p class="tile35-lbl">Kategori</p><p class="tile35-val">' + cats.length + ' Topik</p></div></div>' +
      ((s.adminWhatsApp || s.adminEmail) ? '<div class="tile35 is-amber"><span class="tile35-ico"><i data-lucide="message-circle" class="w-5 h-5"></i></span><div><p class="tile35-lbl">Butuh bantuan langsung?</p><p class="tile35-val">Chat Admin</p></div></div>' : '') +
    '</div>' +
    '<div class="kb35-grid"><aside class="space-y-4"><div class="side35"><p class="side35-title">Kategori Bantuan</p>' +
      '<button class="kb35-cat' + (Help.cat === 'all' ? ' is-active' : '') + '" data-cat="all" onclick="Help.cat=\'all\';renderHelpList()"><i data-lucide="layers" class="w-4 h-4"></i> Semua Artikel <span class="n">' + h.articles.length + '</span></button>' +
      cats.map(c => '<button class="kb35-cat' + (Help.cat === c.name ? ' is-active' : '') + '" data-cat="' + esc(c.name) + '" onclick="Help.cat=' + jsArg(c.name) + ';renderHelpList()">' +
        '<i data-lucide="' + esc(c.icon) + '" class="w-4 h-4"></i> <span class="truncate">' + esc(c.name) + '</span><span class="n">' + count(c.name) + '</span></button>').join('') + '</div>' +
      '<div class="help35"><p class="font-bold text-main flex items-center gap-2"><i data-lucide="life-buoy" class="w-4 h-4 text-accent"></i> Masih ada kendala?</p>' +
        '<p class="text-sm text-muted mt-1">Hubungi Admin dan sebutkan kategori kendala Anda agar cepat ditangani.</p>' +
        '<button class="btn-primary w-full mt-3" onclick="contactAdmin(\'Kendala: \' + (Help.cat===\'all\'?\'Umum\':Help.cat))"><i data-lucide="message-circle" class="w-4 h-4"></i> Hubungi Admin</button></div></aside>' +
      '<div class="min-w-0"><div id="helpList"></div></div></div>';
  document.getElementById('helpSearch').addEventListener('input', debounce(e => { Help.q = e.target.value; renderHelpList(); }, 200));
  renderHelpList();
}

function renderHelpList() {
  const box = document.getElementById('helpList');
  if (!box) return;
  document.querySelectorAll('.kb35-cat').forEach(b => b.classList.toggle('is-active', (b.dataset.cat || 'all') === Help.cat));
  const q = Help.q.trim().toLowerCase();
  const list = ((AppState.m.helpdesk || {}).articles || []).filter(a =>
    (Help.cat === 'all' || a.Category === Help.cat) && (!q || (a.Question + ' ' + a.Solution).toLowerCase().indexOf(q) > -1));
  box.innerHTML = list.length ? '<div class="space-y-3">' + list.map(a =>
    '<details class="help-item app-card rounded-2xl"><summary><span class="badge badge-document">' + esc(a.Category) + '</span><span class="flex-1 font-semibold text-main">' + esc(a.Question) + '</span><i data-lucide="chevron-down" class="w-4 h-4 chev"></i></summary>' +
    '<div class="help-body"><p class="whitespace-pre-line text-[15px] leading-relaxed text-muted">' + esc(a.Solution) + '</p>' +
      (a.Image_URL ? '<div class="mt-4 rounded-xl overflow-hidden cursor-zoom-in max-w-xl" onclick="previewImage(' + jsArg(a.Image_URL) + ',' + jsArg(a.Question) + ')">' + img(a.Image_URL, a.Question, 'style="width:100%"') + '</div>' : '') +
      (a.Video_Embed ? '<div class="video-frame mt-4 max-w-2xl"><iframe src="' + esc(a.Video_Embed) + '" loading="lazy" allowfullscreen></iframe></div>' : '') +
    '</div></details>').join('') + '</div>'
    : emptyState('search-x', 'Tidak ada artikel', 'Coba kata kunci atau kategori lain.');
  refreshIcons();
}


// ════════════════════════════════════════════════════════════
// RUANG PRODUK (#/product/ID) — Kelas · Aplikasi · Dokumen (+ AI Link lama)
// ════════════════════════════════════════════════════════════
registerPage('product', {
  title: 'Ruang Belajar',
  template: () => '<div class="page-wrap"><div id="roomHead"></div><div id="detailRoot" class="grid lg:grid-cols-3 gap-6"></div></div>',
  show: (el, id) => openDetail(id)
});

/** Hapus cache detail produk (memori + perangkat) agar diambil ulang dari server. */
function forgetDetail(id) { delete AppState.detail[id]; if (AppState.detailAt) delete AppState.detailAt[id]; Store.del(userKey('det:' + id)); }

async function openDetail(id) {
  const box = document.getElementById('detailRoot');
  if (!id) return go('library');
  AppState.detailId = id;
  AppState.episode = 0;
  AppState.roomTab = 'about';
  const stored = AppState.detail[id] ? null : Store.get(userKey('det:' + id), null);   // v3.2: tersimpan di perangkat
  if (stored && stored.data) { AppState.detail[id] = stored.data; AppState.detailAt = AppState.detailAt || {}; AppState.detailAt[id] = stored.t; }
  const cached = AppState.detail[id];
  if (cached) {
    renderDetail(cached);
    AppState.detailAt = AppState.detailAt || {};
    if (cached.owned && !cached.needProfile && Date.now() - (AppState.detailAt[id] || 0) < 120000) return;   // masih segar (< 2 menit) → tanpa ke server
  } else {
    const sum = AppState.m && AppState.m.catalog.filter(p => p.Product_ID === id)[0];
    renderRoomHead(sum || null);
    box.innerHTML = '<div class="lg:col-span-2 space-y-6"><div class="skeleton" style="aspect-ratio:16/9"></div><div class="skeleton h-28"></div></div><div class="skeleton h-80"></div>';
    if (sum) document.title = sum.Title + ' · ' + appTitle();
  }
  const res = await api('productDetail', { productId: id });
  if (AppState.detailId !== id) return;                       // pengguna sudah pindah halaman
  if (!res.success) { if (!cached) box.innerHTML = '<div class="lg:col-span-3">' + emptyState('alert-circle', 'Tidak dapat dibuka', res.message) + '</div>'; refreshIcons(); return; }
  const same = cached && hashData(cached) === hashData(res.data);
  AppState.detail[id] = res.data;
  AppState.detailAt = AppState.detailAt || {}; AppState.detailAt[id] = Date.now();
  Store.set(userKey('det:' + id), { t: Date.now(), data: res.data });
  if (!same) renderDetail(res.data);                           // isi sama → video yang sedang diputar tidak di-reset
}

/** Remah roti + status akses di atas ruang belajar (v3.5). */
function renderRoomHead(p) {
  const el = document.getElementById('roomHead');
  if (!el) return;
  const eps = (p && p.episodes) || [], idx = Math.min(AppState.episode || 0, Math.max(eps.length - 1, 0));
  el.innerHTML = '<div class="room35-head"><div class="min-w-0"><nav class="crumbs35"><button onclick="go(\'home\')">Member Portal</button><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>' +
      '<button onclick="go(\'library\')">Kelas Saya</button>' + (p ? '<i data-lucide="chevron-right" class="w-3.5 h-3.5"></i><b class="truncate" style="max-width:340px">' + esc(p.Title) + '</b>' : '') + '</nav>' +
      (p && p.owned ? '<div class="flex flex-wrap gap-2 mt-2"><span class="pill35 is-ok"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Akses Aktif</span>' +
        (p.Category === 'Kelas' && eps.length ? '<span class="pill35"><i data-lucide="list-video" class="w-3.5 h-3.5"></i> Episode ' + (idx + 1) + ' / ' + eps.length + '</span>' : '') + '</div>' : '') +
    '</div><div class="flex flex-wrap gap-2">' +
      (p && p.waGroupUrl ? '<button class="btn-ghost !w-auto" onclick="openLink(AppState.detail[' + jsArg(p.Product_ID) + '].waGroupUrl)"><i data-lucide="users" class="w-4 h-4"></i> Grup Diskusi</button>' : '') +
      '<button class="btn-ghost !w-auto" onclick="history.length>1?history.back():go(\'library\')"><i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali</button>' +
    '</div></div>';
}

function renderDetail(p) {
  const box = document.getElementById('detailRoot');
  if (!box) return;
  document.title = p.Title + ' · ' + appTitle();
  renderRoomHead(p);

  if (!p.owned) {
    const open = p.checkoutOpen !== false;
    box.innerHTML = '<div class="lg:col-span-3 space-y-6">' +
      (p.Category === 'Aplikasi' ? '<div class="app-card rounded-2xl p-5">' + appPreviewHtml(p) + '</div>' : '') +
      '<div class="app-card rounded-2xl p-8 text-center"><div class="lock-badge mx-auto"><i data-lucide="lock" class="w-6 h-6"></i></div>' +
      '<h1 class="mt-4 text-2xl font-bold text-main">' + esc(p.Title) + '</h1><p class="mt-2 text-muted max-w-xl mx-auto whitespace-pre-line">' + esc(p.Description) + '</p>' +
      (open ? '<p class="mt-3 text-lg font-bold text-accent">' + esc(fmtMoney(p.Price)) + '</p>' : '<p class="mt-3"><span class="closed-tag"><i data-lucide="pause-circle" class="w-3.5 h-3.5"></i> Penjualan ditutup sementara</span></p>') +
      '<div class="flex flex-wrap justify-center gap-3 mt-5"><button class="btn-primary !w-auto" onclick="openBuyDialog(' + jsArg(p.Product_ID) + ')"><i data-lucide="' + (open ? 'shopping-cart' : 'key-round') + '" class="w-4 h-4"></i> ' + (open ? 'Beli / Redeem Kode' : 'Punya Kode Akses?') + '</button></div></div></div>';
    initCarousel(box.querySelector('.carousel'));
    refreshIcons(); return;
  }

  if (p.needProfile) {
    box.innerHTML = '<div class="lg:col-span-3"><div class="app-card rounded-2xl p-8 text-center max-w-xl mx-auto">' +
      '<div class="w-16 h-16 mx-auto rounded-2xl grid place-items-center" style="background:rgba(245,158,11,.14);color:var(--warning)"><i data-lucide="user-round-pen" class="w-8 h-8"></i></div>' +
      '<h1 class="mt-4 text-xl font-bold text-main">Lengkapi data dulu, ya</h1>' +
      '<p class="mt-2 text-sm text-muted">Untuk membuka <b>' + esc(p.Title) + '</b>, isi <b>Nama Panggilan</b> dan <b>No. WhatsApp</b> Anda. Data ini dipakai Admin untuk info kelas & grup diskusi.</p>' +
      '<button class="btn-primary !w-auto mt-6" onclick="openProfileDialog(' + jsArg(p.Product_ID) + ')"><i data-lucide="user-check" class="w-4 h-4"></i> Lengkapi Sekarang</button></div></div>';
    refreshIcons();
    openProfileDialog(p.Product_ID);
    return;
  }

  Store.set(userKey('lastProduct'), p.Product_ID);                 // v3.5: tombol "Lanjut Belajar" di beranda
  if (p.Category === 'Kelas') renderClassRoom(p);
  else if (p.Category === 'Aplikasi') renderAppRoom(p);
  else renderDocOrLink(p);
  Member.showClassAnnouncements(p.Product_ID);                   // v3.5: popup pengumuman khusus kelas ini
}

// ── Materi & berkas (v3.5: semua format; TXT/MD/kode → "Lihat & Salin") ──
function extClass(ext, isLink) {
  if (isLink) return 'is-link';
  ext = String(ext || '').toLowerCase();
  if (/^(md|markdown)$/.test(ext)) return 'is-md';
  if (/^(txt|gs|js|mjs|ts|json|html?|css|csv|tsv|sql|py|xml|ya?ml|ini|env|sh|log|php|java|kt|c|cpp|h|go|rb|rs)$/.test(ext)) return 'is-code';
  if (ext === 'pdf') return 'is-pdf';
  if (/^(docx?|odt|rtf)$/.test(ext)) return 'is-doc';
  if (/^(pptx?|odp|key)$/.test(ext)) return 'is-ppt';
  if (/^(xlsx?|ods)$/.test(ext)) return 'is-xls';
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return 'is-zip';
  if (/^(png|jpe?g|gif|webp|svg)$/.test(ext)) return 'is-img';
  return '';
}

/** Tombol materi: link TIDAK pernah ditampilkan — hanya tombol "Buka Materi". */
function resourcesHtml(res, productId) {
  if (!res.length) return '<p class="text-sm text-muted">Belum ada materi penunjang.</p>';
  window._res = res;
  const pid = productId || AppState.detailId;
  return res.map((r, i) => {
    const isFile = r.type === 'file', ext = isFile ? (r.ext || String(r.fileName || '').split('.').pop() || '') : '';
    const label = isFile ? (ext ? ext.slice(0, 4) : 'file') : '<i data-lucide="link-2" class="w-4 h-4"></i>';
    let act;
    if (!isFile) act = '<button class="btn-primary !w-auto !py-1.5 !px-3 !text-xs" onclick="openLink(_res[' + i + '].url)"><i data-lucide="external-link" class="w-3.5 h-3.5"></i> Buka Materi</button>';
    else if (r.isText) act = '<div class="flex gap-1.5"><button class="btn-copy35" onclick="openTextResource(' + jsArg(pid) + ',' + jsArg(r.id) + ',' + jsArg(r.title) + ')"><i data-lucide="code-xml" class="w-3.5 h-3.5"></i> Lihat & Salin</button>' +
      '<button class="btn-icon" title="Unduh" onclick="openLink(_res[' + i + '].url)"><i data-lucide="download" class="w-4 h-4"></i></button></div>';
    else act = '<div class="flex gap-1.5"><button class="btn-icon" title="Pratinjau" onclick="previewDocument(_res[' + i + '].previewUrl,_res[' + i + '].url,_res[' + i + '].title)"><i data-lucide="eye" class="w-4 h-4"></i></button>' +
      '<button class="btn-icon" title="Unduh" onclick="openLink(_res[' + i + '].url)"><i data-lucide="download" class="w-4 h-4"></i></button></div>';
    return '<div class="res35"><span class="ext35 ' + extClass(ext, !isFile) + '">' + (isFile ? esc(label) : label) + '</span>' +
      '<div class="min-w-0 flex-1"><p class="text-sm font-semibold text-main truncate">' + esc(r.title) + '</p>' +
      '<p class="text-xs text-muted truncate">' + (isFile ? esc((r.fileName || 'Berkas') + (r.fileSize ? ' · ' + r.fileSize : '')) + (r.isText ? ' · bisa disalin langsung' : '') : 'Tautan materi') + '</p></div>' + act + '</div>';
  }).join('');
}

function waGroupCard(p) {
  if (!p.waGroupUrl) return '';
  return '<div class="wa-banner"><div class="wa-icon"><i data-lucide="message-circle" class="w-5 h-5"></i></div>' +
    '<div class="flex-1 min-w-0"><p class="font-semibold text-main">Grup Diskusi Kelas</p><p class="text-sm text-muted">Khusus peserta ' + esc(p.Title) + '.</p></div>' +
    '<button class="btn-wa" onclick="openLink(AppState.detail[' + jsArg(p.Product_ID) + '].waGroupUrl)"><i data-lucide="users" class="w-4 h-4"></i> Gabung WhatsApp Group</button></div>';
}

function playlistHtml(eps, idx) {
  return eps.map((ep, i) => '<button type="button" class="episode-row' + (i === idx ? ' is-playing' : '') + '" data-title="' + esc(String(ep.title || '').toLowerCase()) + '" onclick="playEpisode(' + i + ')">' +
    '<span class="episode-num">' + (i === idx ? '<i data-lucide="play" class="w-3 h-3"></i>' : (i + 1)) + '</span>' +
    '<span class="min-w-0 flex-1"><span class="episode-title block truncate">' + esc(ep.title) + '</span>' +
    '<span class="episode-meta block">' + (ep.duration ? esc(ep.duration) : 'Episode ' + (i + 1)) + (i === idx ? ' • Sedang diputar' : '') + '</span></span></button>').join('');
}
function filterPlaylist(q) {
  q = String(q || '').trim().toLowerCase();
  document.querySelectorAll('#playlistBox .episode-row').forEach(r => { r.hidden = !!q && r.dataset.title.indexOf(q) === -1; });
}

/** Tab di bawah video (tanpa memuat ulang video saat berpindah tab). */
function roomTab(t) {
  AppState.roomTab = t;
  document.querySelectorAll('#roomTabs .tab35').forEach(b => b.classList.toggle('is-active', b.dataset.tab === t));
  document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== t; });
}

function renderClassRoom(p) {
  const box = document.getElementById('detailRoot');
  const eps = p.episodes || [], res = p.resources || [];
  const idx = Math.min(AppState.episode || 0, Math.max(eps.length - 1, 0));
  const cur = eps[idx], tab = AppState.roomTab === 'files' && res.length ? 'files' : 'about';
  const nText = res.filter(r => r.isText).length;
  box.innerHTML =
    '<div class="lg:col-span-2 space-y-6">' +
      (cur ? '<div class="app-card rounded-2xl overflow-hidden" style="background:#0B1324"><div class="video-frame !rounded-none"><iframe id="epFrame" src="' + esc(cur.url) + '" title="' + esc(cur.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div>'
           : emptyState('video-off', 'Belum ada episode', 'Admin belum menambahkan episode.')) +
      '<div class="app-card rounded-2xl p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0">' +
        (cur ? '<span class="tl35-chip">EPISODE ' + (idx + 1) + ' / ' + eps.length + '</span>' + (cur.duration ? ' <span class="text-xs text-muted">· Durasi ' + esc(cur.duration) + '</span>' : '') +
          '<h1 class="mt-2 text-xl md:text-2xl font-bold tracking-tight text-main">' + esc(cur.title) + '</h1><p class="text-sm text-muted mt-1">' + esc(p.Title) + '</p>'
             : '<h1 class="text-xl font-bold text-main">' + esc(p.Title) + '</h1>') +
        '</div>' + (eps.length > 1 ? '<div class="flex gap-2"><button class="btn-ghost !w-auto" onclick="playEpisode(' + (idx - 1) + ')"' + (idx === 0 ? ' disabled' : '') + '><i data-lucide="skip-back" class="w-4 h-4"></i> Sebelumnya</button>' +
        '<button class="btn-primary !w-auto" onclick="playEpisode(' + (idx + 1) + ')"' + (idx >= eps.length - 1 ? ' disabled' : '') + '>Selanjutnya <i data-lucide="skip-forward" class="w-4 h-4"></i></button></div>' : '') + '</div></div>' +
      '<div class="app-card rounded-2xl overflow-hidden"><div class="tabs35 px-3" id="roomTabs">' +
        '<button class="tab35' + (tab === 'about' ? ' is-active' : '') + '" data-tab="about" onclick="roomTab(\'about\')"><i data-lucide="notebook-text" class="w-4 h-4"></i> Ringkasan Kelas</button>' +
        '<button class="tab35' + (tab === 'files' ? ' is-active' : '') + '" data-tab="files" onclick="roomTab(\'files\')"><i data-lucide="folder-open" class="w-4 h-4"></i> Materi & File (' + res.length + ')</button>' +
      '</div>' +
      '<div class="p-6" data-pane="about"' + (tab === 'about' ? '' : ' hidden') + '><p class="text-[15px] leading-relaxed text-muted whitespace-pre-line">' + esc(p.Description || 'Belum ada deskripsi.') + '</p>' +
        (nText ? '<div class="notice mt-5"><i data-lucide="code-xml" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1"><b>' + nText + ' berkas kode/teks</b> bisa dibuka & disalin langsung di tab <b>Materi & File</b>.</p>' +
          '<button class="btn-primary !w-auto !py-1.5" onclick="roomTab(\'files\')">Buka</button></div>' : '') + '</div>' +
      '<div class="p-6 space-y-3" data-pane="files"' + (tab === 'files' ? '' : ' hidden') + '>' + resourcesHtml(res, p.Product_ID) + '</div></div>' +
      waGroupCard(p) +
    '</div>' +
    '<div class="lg:col-span-1 space-y-4"><div class="app-card rounded-2xl p-5 lg:sticky lg:top-24 playlist35">' +
      '<div class="playlist35-head mb-1"><h2 class="text-base font-semibold text-main">Daftar Episode</h2><span class="text-xs text-muted">' + eps.length + ' materi</span></div>' +
      '<p class="text-xs text-muted mb-3 truncate">' + esc(p.Title) + '</p>' +
      (eps.length > 1 ? '<div class="prog35 !mt-0 mb-3"><div class="prog35-row"><span>Posisi Anda</span><span>' + (idx + 1) + ' / ' + eps.length + '</span></div><div class="prog35-bar"><span style="width:' + Math.round((idx + 1) / eps.length * 100) + '%"></span></div></div>' : '') +
      (eps.length > 8 ? '<div class="search35 mb-3"><i data-lucide="search" class="w-4 h-4"></i><input type="search" placeholder="Cari episode…" oninput="filterPlaylist(this.value)"></div>' : '') +
      '<div class="playlist space-y-1" id="playlistBox">' + playlistHtml(eps, idx) + '</div></div>' +
      '<div class="help35"><p class="font-bold text-main flex items-center gap-2"><i data-lucide="circle-help" class="w-4 h-4 text-accent"></i> Butuh Bantuan?</p>' +
        '<p class="text-sm text-muted mt-1">Video tidak tampil atau materi tidak bisa dibuka? Cek Helpdesk atau hubungi Admin.</p>' +
        '<button class="link35 mt-2" onclick="go(\'helpdesk\')">Buka Helpdesk <i data-lucide="arrow-right" class="w-4 h-4"></i></button></div>' +
    '</div>';
  refreshIcons();
}

function playEpisode(i) {
  const p = AppState.detail[AppState.detailId];
  if (!p || i < 0 || i >= (p.episodes || []).length) return;
  AppState.episode = i;
  renderRoomHead(p);
  if (p.Category === 'Aplikasi') renderAppRoom(p); else renderClassRoom(p);
  const f = document.getElementById('epFrame');
  if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderAppRoom(p) {
  const box = document.getElementById('detailRoot');
  const eps = p.episodes || [];
  const idx = Math.min(AppState.episode || 0, Math.max(eps.length - 1, 0));
  const cur = eps[idx];
  box.innerHTML =
    '<div class="lg:col-span-2 space-y-6">' +
      '<div class="app-card rounded-2xl p-6"><span class="badge badge-app">Aplikasi</span>' +
        '<h1 class="mt-3 text-2xl font-bold tracking-tight text-main">' + esc(p.Title) + '</h1>' +
        '<p class="mt-3 text-[15px] leading-relaxed text-muted whitespace-pre-line">' + esc(p.Description) + '</p></div>' +
      (cur ? '<div class="app-card rounded-2xl overflow-hidden"><div class="px-5 pt-5 pb-3 flex items-center gap-2"><i data-lucide="monitor-play" class="w-5 h-5 text-accent"></i><h2 class="font-semibold text-main">Video Panduan Instalasi</h2></div>' +
        '<div class="video-frame !rounded-none"><iframe id="epFrame" src="' + esc(cur.url) + '" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
        (eps.length > 1 ? '<div class="p-4 playlist space-y-1">' + playlistHtml(eps, idx) + '</div>' : '<p class="p-4 text-sm font-medium text-main">' + esc(cur.title) + '</p>') + '</div>' : '') +
      '<div class="app-card rounded-2xl p-6"><div class="flex items-center gap-2 mb-4"><i data-lucide="folder-open" class="w-5 h-5 text-accent"></i><h2 class="text-lg font-semibold text-main">Dokumen & Materi</h2></div>' +
        '<div class="space-y-3">' + resourcesHtml(p.resources || [], p.Product_ID) + '</div></div>' +
      ((p.slides || []).length || (p.previewVideos || []).length ? '<div class="app-card rounded-2xl p-5"><h2 class="font-semibold text-main mb-3">Preview Aplikasi</h2>' + appPreviewHtml(p) + '</div>' : '') +
    '</div>' +
    '<div class="lg:col-span-1 space-y-4"><div class="app-card rounded-2xl p-6 space-y-4 lg:sticky lg:top-24">' +
      (p.fileUrl ? '<button class="btn-primary w-full btn-glow" onclick="openLink(AppState.detail[' + jsArg(p.Product_ID) + '].fileUrl)"><i data-lucide="download" class="w-4 h-4"></i> Download ' + (p.fileIsText ? 'Berkas' : 'Source Code') + '</button>' +
        (p.fileIsText ? '<button class="btn-ghost w-full" onclick="openTextResource(' + jsArg(p.Product_ID) + ',\'__main__\',' + jsArg(p.fileName || p.Title) + ')"><i data-lucide="code-xml" class="w-4 h-4"></i> Lihat & Salin Isi</button>' : '') +
        '<div><p class="stat-label mb-2">Detail Berkas</p>' + detailRow('file-archive', 'Nama', p.fileName || '—') + detailRow('hard-drive', 'Ukuran', p.fileSize || '—') + detailRow('history', 'Diperbarui', fmtDate(p.updatedAt)) + '</div>'
        : '<p class="text-sm text-muted">Source code akan tersedia di sini setelah diunggah Admin.</p>') +
      '</div>' + waGroupCard(p) + '</div>';
  initCarousel(box.querySelector('.carousel'));
  refreshIcons();
}

/** Dokumen: berkas utama + banyak berkas tambahan (bank PRD, template, dll.). AI Link lama tetap bisa dibuka. */
function renderDocOrLink(p) {
  const box = document.getElementById('detailRoot');
  const isDoc = p.Category === 'Document';
  const res = p.resources || [];
  const files = res.filter(r => r.type === 'file').length;
  let media;
  if (isDoc) {
    media = '<div class="app-card rounded-2xl overflow-hidden"><div class="relative" style="aspect-ratio:16/9;background:linear-gradient(135deg,var(--surface-2),var(--mint))">' + (p.thumbnail ? img(p.thumbnail, '', 'style="width:100%;height:100%;object-fit:cover;opacity:.45"') : '') +
      '<div class="absolute inset-0 grid place-items-center"><div class="flex flex-wrap justify-center gap-2">' +
      (p.fileUrl ? (p.fileIsText
          ? '<button class="btn-primary !w-auto" onclick="openTextResource(' + jsArg(p.Product_ID) + ',\'__main__\',' + jsArg(p.fileName || p.Title) + ')"><i data-lucide="code-xml" class="w-4 h-4"></i> Lihat & Salin Isi</button>'
          : '<button class="btn-primary !w-auto" onclick="previewDocument(AppState.detail[' + jsArg(p.Product_ID) + '].previewUrl,AppState.detail[' + jsArg(p.Product_ID) + '].fileUrl,' + jsArg(p.fileName || p.Title) + ')"><i data-lucide="eye" class="w-4 h-4"></i> Pratinjau Dokumen</button>')
        : (res.length ? '<button class="btn-primary !w-auto" onclick="scrollToId(\'docFiles\')"><i data-lucide="files" class="w-4 h-4"></i> Lihat ' + res.length + ' Berkas</button>' : '<p class="text-sm text-muted">Berkas belum diunggah Admin.</p>')) +
      '</div></div></div></div>';
  } else {
    media = '<div class="app-card rounded-2xl p-10 text-center"><div class="w-16 h-16 mx-auto rounded-2xl grid place-items-center" style="background:var(--indigo-soft);color:var(--indigo)"><i data-lucide="sparkles" class="w-8 h-8"></i></div>' +
      '<h3 class="mt-4 text-lg font-semibold text-main">Akses Link</h3><p class="mt-2 text-sm text-muted">Tautan terbuka di tab baru.</p>' +
      (p.externalLink ? '<button class="btn-primary !w-auto mt-6" onclick="openLink(AppState.detail[' + jsArg(p.Product_ID) + '].externalLink)"><i data-lucide="external-link" class="w-4 h-4"></i> Buka Sekarang</button>' : '<p class="mt-6 text-sm" style="color:var(--warning)">Link belum diisi Admin.</p>') + '</div>';
  }
  const side = isDoc
    ? (p.fileUrl ? '<button class="btn-primary w-full btn-glow" onclick="openLink(AppState.detail[' + jsArg(p.Product_ID) + '].fileUrl)"><i data-lucide="download" class="w-4 h-4"></i> Download Dokumen Utama</button>' +
        (p.fileIsText ? '<button class="btn-ghost w-full" onclick="openTextResource(' + jsArg(p.Product_ID) + ',\'__main__\',' + jsArg(p.fileName || p.Title) + ')"><i data-lucide="code-xml" class="w-4 h-4"></i> Lihat & Salin Isi</button>' : '') +
        '<div class="pt-2"><p class="stat-label mb-3">Dokumen Utama</p>' + detailRow('file-text', 'Nama', p.fileName || '—') + detailRow('hard-drive', 'Ukuran', p.fileSize || '—') + detailRow('history', 'Diperbarui', fmtDate(p.updatedAt)) + '</div>' : '') +
      '<div class="pt-2"><p class="stat-label mb-1">Isi Paket</p>' + detailRow('files', 'Berkas tambahan', files + ' berkas') + detailRow('link-2', 'Tautan', (res.length - files) + ' tautan') + '</div>'
    : '<p class="stat-label mb-1">Informasi</p>' + detailRow('tag', 'Kategori', catLabel(p.Category)) + detailRow('check-circle-2', 'Status', 'Sudah dimiliki');
  box.innerHTML = '<div class="lg:col-span-2 space-y-6">' + media + '<div class="app-card rounded-2xl p-6"><span class="badge ' + badgeClassFor(p.Category) + '">' + esc(catLabel(p.Category)) + '</span>' +
    '<h1 class="mt-3 text-2xl font-bold tracking-tight text-main">' + esc(p.Title) + '</h1><p class="mt-3 text-[15px] leading-relaxed text-muted whitespace-pre-line">' + esc(p.Description) + '</p></div>' +
    (isDoc && res.length ? '<div class="app-card rounded-2xl p-6" id="docFiles"><div class="flex flex-wrap items-center justify-between gap-2 mb-4"><div class="flex items-center gap-2"><i data-lucide="folder-open" class="w-5 h-5 text-accent"></i><h2 class="text-lg font-semibold text-main">Berkas Dokumen</h2></div>' +
      '<span class="badge badge-document">' + res.length + ' item</span></div><div class="space-y-3">' + resourcesHtml(res, p.Product_ID) + '</div></div>' : '') +
    '</div>' +
    '<div class="lg:col-span-1"><div class="app-card rounded-2xl p-6 space-y-4 lg:sticky lg:top-24">' + side + '</div></div>';
  refreshIcons();
}

function detailRow(icon, label, value) {
  return '<div class="flex items-start gap-3 py-2.5 border-t border-app first:border-t-0"><i data-lucide="' + esc(icon) + '" class="w-4 h-4 mt-0.5 text-muted"></i>' +
    '<div class="min-w-0"><p class="text-xs text-muted">' + esc(label) + '</p><p class="text-sm font-medium text-main break-words">' + esc(value) + '</p></div></div>';
}


// ════════════════════════════════════════════════════════════
// PENAMPIL TEKS / KODE — "Lihat & Salin" (v3.5)
// Isi berkas TXT/MD/kode dibaca lewat server (cek kepemilikan), ditampilkan apa adanya
// (di-escape → aman), lalu bisa disalin sekali klik atau diunduh.
// ════════════════════════════════════════════════════════════
const TXT = { cache: {} };

async function openTextResource(productId, resourceId, title) {
  const key = productId + '|' + resourceId;
  let d = TXT.cache[key];
  if (!d) {
    Swal.fire({ title: 'Membuka berkas…', text: title || '', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await api('resourceText', { productId: productId, resourceId: resourceId }, { timeout: 90000 });
    if (!res.success) {
      if (res.data && res.data.code === 'PROFILE') { Swal.close(); return openProfileDialog(productId); }
      return Swal.fire({ icon: 'warning', title: 'Tidak bisa ditampilkan', text: res.message });
    }
    d = TXT.cache[key] = res.data;
  }
  const isMd = /^(md|markdown)$/i.test(d.ext || '');
  const lines = String(d.text || '').replace(/\r\n?/g, '\n').split('\n');
  TXT.cur = d;
  Swal.fire({
    width: 1000, showConfirmButton: false, showCloseButton: true, customClass: { popup: 'txt-popup' },
    html: '<div style="text-align:left">' +
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-3" style="padding-right:2.5rem"><div class="min-w-0"><p class="text-xs text-muted">' + esc(title || '') + '</p>' +
        '<h3 class="text-lg font-bold text-main truncate">' + esc(d.fileName) + '</h3></div>' +
        (isMd ? '<div class="viewer35-tabs" id="txtTabs"><button class="is-active" data-v="read" onclick="txtView(\'read\')">Tampilan</button><button data-v="code" onclick="txtView(\'code\')">Kode</button></div>' : '') + '</div>' +
      (isMd ? '<div id="txtRead" class="md35 app-card rounded-xl p-5" style="max-height:62vh;overflow:auto">' + mdToHtml(d.text) + '</div>' : '') +
      '<div class="code35" id="txtCode"' + (isMd ? ' hidden' : '') + '><div class="code35-bar"><span class="code35-dots"><i></i><i></i><i></i></span><span class="code35-name">' + esc(d.fileName) + '</span>' +
        '<button type="button" class="code35-btn" onclick="txtWrap(this)"><i data-lucide="wrap-text" class="w-3.5 h-3.5"></i> Wrap</button></div>' +
        '<pre id="txtPre">' + (lines.length > 6000 ? esc(d.text) : lines.map(l => '<span class="ln">' + esc(l) + '</span>').join('')) + '</pre>' +
        '<div class="code35-foot"><span>' + lines.length.toLocaleString('id-ID') + ' baris · ' + fmtBytes(d.bytes) + '</span><span>' + esc((d.ext || 'txt').toUpperCase()) + '</span></div></div>' +
      '<div class="flex flex-wrap gap-2 mt-4"><button class="btn-copy35 !py-2.5 !px-4 !text-sm" id="txtCopy" onclick="txtCopy(this)"><i data-lucide="copy" class="w-4 h-4"></i> Salin Semua Isi</button>' +
        (d.downloadUrl ? '<button class="btn-ghost !w-auto" onclick="openLink(TXT.cur.downloadUrl)"><i data-lucide="download" class="w-4 h-4"></i> Unduh Berkas</button>' : '') + '</div></div>',
    didOpen: refreshIcons
  });
}
function txtView(v) {
  document.querySelectorAll('#txtTabs button').forEach(b => b.classList.toggle('is-active', b.dataset.v === v));
  const r = document.getElementById('txtRead'), c = document.getElementById('txtCode');
  if (r) r.hidden = v !== 'read'; if (c) c.hidden = v !== 'code';
}
function txtWrap(btn) { const pre = document.getElementById('txtPre'); if (pre) { pre.classList.toggle('is-wrap'); btn.classList.toggle('is-done', pre.classList.contains('is-wrap')); } }
function txtCopy(btn) {
  const text = (TXT.cur && TXT.cur.text) || '';
  const done = () => { btn.classList.add('is-done'); btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Tersalin!'; refreshIcons();
    setTimeout(() => { btn.classList.remove('is-done'); btn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i> Salin Semua Isi'; refreshIcons(); }, 2200); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}

/** Markdown → HTML sederhana & AMAN (teks di-escape dulu; tautan hanya http/https). */
function mdToHtml(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  let out = '', i = 0, list = '', para = [];
  const flushP = () => { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } };
  const flushL = () => { if (list) { out += '</' + list + '>'; list = ''; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      flushP(); flushL(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      out += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>'; i++; continue;
    }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { flushP(); flushL(); const n = Math.min(m[1].length, 3); out += '<h' + n + '>' + inline(m[2]) + '</h' + n + '>'; }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { flushP(); flushL(); out += '<hr>'; }
    else if ((m = l.match(/^\s*>\s?(.*)$/))) { flushP(); flushL(); out += '<blockquote>' + inline(m[1]) + '</blockquote>'; }
    else if ((m = l.match(/^\s*[-*+]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += '<li>' + inline(m[1]) + '</li>'; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += '<li>' + inline(m[1]) + '</li>'; }
    else if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flushP(); flushL();
      const row = s => s.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      out += '<table><thead><tr>' + row(l).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'; i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { out += '<tr>' + row(lines[i]).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'; i++; }
      out += '</tbody></table>'; continue;
    }
    else if (!l.trim()) { flushP(); flushL(); }
    else { flushL(); para.push(l); }
    i++;
  }
  flushP(); flushL();
  return out || '<p class="text-muted">(Berkas kosong)</p>';
}


// ════════════════════════════════════════════════════════════
// GERBANG KELENGKAPAN DATA (Nama panggilan + WA 08xx unik)
// ════════════════════════════════════════════════════════════
async function openProfileDialog(productId) {
  const p = Member.profile();
  const r = await Swal.fire({
    title: 'Lengkapi Data Member', confirmButtonText: 'Simpan & Buka Akses', showCancelButton: !!p.complete || !productId, cancelButtonText: 'Nanti',
    allowOutsideClick: false, focusConfirm: false,
    html: '<div style="text-align:left;display:grid;gap:12px">' +
      '<p class="text-sm text-muted">Data wajib diisi dengan benar. Satu nomor WhatsApp hanya untuk satu akun.</p>' +
      '<div><label class="form-label">Email</label><input class="form-input" value="' + esc(AppState.email) + '" disabled></div>' +
      '<div><label class="form-label" for="pfNick">Nama Panggilan *</label><input id="pfNick" class="form-input" maxlength="40" value="' + esc(p.nickname || '') + '" placeholder="mis. Rina"></div>' +
      '<div><label class="form-label" for="pfWa">No. WhatsApp *</label><input id="pfWa" class="form-input" inputmode="tel" autocomplete="tel" maxlength="22" value="' + esc(p.whatsapp || '') + '" placeholder="087818485245">' +
      '<p class="text-xs text-muted mt-1">Nomor Indonesia diawali <b>08</b> (contoh <span class="mono">087818485245</span>). Nomor luar negeri: awali dengan <b>+</b> dan kode negara, mis. <span class="mono">+60 12 345 6789</span>.</p></div></div>',
    preConfirm: () => {
      const nick = document.getElementById('pfNick').value.trim();
      const wa = normWa(document.getElementById('pfWa').value);
      if (nick.length < 2) return Swal.showValidationMessage('Nama panggilan minimal 2 karakter.');
      if (!isValidWa(wa)) return Swal.showValidationMessage(WA_INVALID);
      Swal.showLoading();
      return api('updateProfile', { nickname: nick, whatsapp: wa }).then(res => {
        if (!res.success) { Swal.hideLoading(); Swal.showValidationMessage(res.message); return false; }
        return res;
      });
    }
  });
  if (!r.isConfirmed || !r.value) return;
  AppState.m.profile = r.value.data.profile;
  Store.set(userKey('boot'), { t: Date.now(), data: AppState.m });
  showToast('Data tersimpan', r.value.message, 'success');
  renderTopnav();
  if (document.getElementById('homeRoot')) renderHome();
  if (productId) { forgetDetail(productId); openDetail(productId); }
}


// ════════════════════════════════════════════════════════════
// PEMBELIAN — pilihan: transfer manual · redeem kode · Lynk.id
// ════════════════════════════════════════════════════════════
const CO = { info: null, channel: null, proof: null, step: 1 };

async function openBuyDialog(productId) {
  const p = (AppState.m.catalog || []).filter(x => x.Product_ID === productId)[0];
  if (!p) return;
  if (p.checkoutOpen === false) {                                   // v3.5: produk dinonaktifkan sementara → tidak bisa checkout
    return Swal.fire({ icon: 'info', title: 'Penjualan ditutup sementara', text: 'Produk ini sedang tidak dijual. Jika Anda sudah memiliki kode akses, tetap bisa ditukarkan.',
      showDenyButton: true, showCancelButton: true, confirmButtonText: 'Redeem Kode', denyButtonText: 'Tanya Admin', cancelButtonText: 'Tutup' })
      .then(r => { if (r.isConfirmed) openRedeemDialog(); else if (r.isDenied) contactAdmin('Produk: ' + p.Title); });
  }
  const r = await Swal.fire({
    title: esc(p.Title), showCloseButton: true, showConfirmButton: false,
    html: '<p class="text-sm text-muted mb-4">' + esc(fmtMoney(p.Price)) + ' · pilih cara mendapatkan akses:</p><div style="display:grid;gap:10px">' +
      '<button class="btn-primary w-full" onclick="Swal.close();startCheckout(' + jsArg(productId) + ')"><i data-lucide="landmark" class="w-4 h-4"></i> Beli Sekarang (Transfer)</button>' +
      (p.Lynk_URL ? '<button class="btn-ghost w-full" onclick="Swal.close();openLink(' + jsArg(p.Lynk_URL) + ')"><i data-lucide="shopping-bag" class="w-4 h-4"></i> Beli via Lynk.id</button>' : '') +
      '<button class="btn-ghost w-full" onclick="Swal.close();openRedeemDialog()"><i data-lucide="key-round" class="w-4 h-4"></i> Saya Punya Kode Akses</button></div>',
    didOpen: refreshIcons
  });
  return r;
}

async function startCheckout(productId) {
  Swal.fire({ title: 'Menyiapkan pembayaran…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  const res = await api('checkoutInfo', { productId: productId });
  Swal.close();
  if (!res.success && res.data && res.data.code === 'CLOSED') return Swal.fire({ icon: 'info', title: 'Penjualan ditutup sementara', text: res.message });   // v3.5
  if (!res.success) return showToast('Gagal', res.message, 'error');
  const d = res.data;
  if (d.pendingOrder) {
    return Swal.fire({ icon: 'info', title: 'Pesanan masih diproses', text: 'Pesanan ' + d.pendingOrder.orderId + ' menunggu verifikasi Admin.', confirmButtonText: 'Lihat Pesanan' }).then(() => go('orders'));
  }
  if (!d.channels.length) {
    return Swal.fire({ icon: 'warning', title: 'Channel pembayaran belum tersedia', text: d.lynkUrl ? 'Silakan beli lewat Lynk.id.' : 'Hubungi Admin untuk pembelian.',
      confirmButtonText: d.lynkUrl ? 'Beli via Lynk.id' : 'Hubungi Admin' }).then(r => { if (r.isConfirmed) d.lynkUrl ? openLink(d.lynkUrl) : contactAdmin('Pembelian ' + d.productTitle); });
  }
  CO.info = d; CO.channel = null; CO.proof = null;
  document.getElementById('coProductName').textContent = d.productTitle;
  document.getElementById('coPrice').textContent = fmtMoney(d.price);
  document.getElementById('coSummary').innerHTML = detailRow('package', 'Produk', d.productTitle) + detailRow('mail', 'Email pemesan', AppState.email);
  document.getElementById('coChannels').innerHTML = d.channels.map((c, i) =>
    '<div class="channel-card" data-i="' + i + '" onclick="selectChannel(' + i + ')"><div class="channel-logo">' + esc(c.name.slice(0, 6)) + '</div>' +
    '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-main">' + esc(c.type) + ' · ' + esc(c.name) + '</p>' +
    '<p class="mono text-sm text-main">' + esc(c.number) + '</p><p class="text-xs text-muted">a.n. ' + esc(c.holder) + '</p></div>' +
    '<button class="btn-icon" title="Salin" onclick="event.stopPropagation();copyText(' + jsArg(c.number) + ')"><i data-lucide="copy" class="w-4 h-4"></i></button></div>').join('');
  document.getElementById('coProofPreview').innerHTML = '';
  document.getElementById('coNote').value = '';
  document.getElementById('coNext2').disabled = true;
  document.getElementById('coSubmit').disabled = true;
  bindDropzone(document.getElementById('coDrop'), document.getElementById('coFile'), handleProofUpload);
  coGoStep(1);
  document.getElementById('checkoutModal').hidden = false;
  document.body.style.overflow = 'hidden';
  refreshIcons();
}

function closeCheckout() { document.getElementById('checkoutModal').hidden = true; document.body.style.overflow = ''; }

function coGoStep(n) {
  CO.step = n;
  [1, 2, 3, 4].forEach(i => { document.getElementById('coStep' + i).hidden = i !== n; });
  document.querySelectorAll('#checkoutModal .step').forEach(s => {
    const k = +s.dataset.step;
    s.classList.toggle('is-active', k === n); s.classList.toggle('is-done', k < n);
  });
}

function selectChannel(i) {
  CO.channel = CO.info.channels[i];
  document.querySelectorAll('#coChannels .channel-card').forEach(c => c.classList.toggle('is-selected', +c.dataset.i === i));
  document.getElementById('coNext2').disabled = false;
}

async function handleProofUpload(file) {
  const box = document.getElementById('coProofPreview');
  if (!/^image\//.test(file.type) && file.type !== 'application/pdf') { box.innerHTML = '<p class="text-sm" style="color:var(--error)">Gunakan gambar JPG/PNG atau PDF.</p>'; return; }
  box.innerHTML = '<p class="text-sm text-muted"><span class="spinner-inline"></span> Mengunggah ' + esc(file.name) + '…</p>';
  document.getElementById('coSubmit').disabled = true;
  try {
    const res = await uploadFile('proof', file);
    if (!res.success) throw new Error(res.message);
    CO.proof = res.data;
    const local = /^image\//.test(file.type) ? URL.createObjectURL(file) : '';
    box.innerHTML = '<div class="resource-row">' + (local ? '<img src="' + local + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px">' : '<div class="resource-icon"><i data-lucide="file" class="w-4 h-4"></i></div>') +
      '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-main truncate">' + esc(file.name) + '</p><p class="text-xs" style="color:var(--success)">✓ Terunggah</p></div></div>';
    document.getElementById('coSubmit').disabled = false;
    refreshIcons();
  } catch (e) { box.innerHTML = '<p class="text-sm" style="color:var(--error)">' + esc(e.message) + '</p>'; }
}

async function submitOrder() {
  const btn = document.getElementById('coSubmit');
  const c = CO.channel;
  const res = await withBusy(btn, 'Mengirim…', () => api('createOrder', {
    productId: CO.info.productId, channel: c.type + ' ' + c.name, accountInfo: c.number + ' a.n. ' + c.holder,
    proofFileId: CO.proof.fileId, note: document.getElementById('coNote').value.trim()
  }));
  if (!res.success) return showToast('Gagal', res.message, 'error');
  document.getElementById('coOrderId').textContent = res.data.orderId;
  const s = (AppState.m && AppState.m.settings) || {};
  document.getElementById('coContactAdmin').onclick = e => { e.preventDefault(); contactAdmin('Konfirmasi pesanan ' + res.data.orderId); };
  document.getElementById('coContactAdmin').style.display = (s.adminWhatsApp || s.adminEmail) ? '' : 'none';
  coGoStep(4);
  Member.refresh();
}
