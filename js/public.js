/**
 * ============================================================
 * public.js — Halaman Open Access (#/explore), Login, Redeem, Lead
 * Bisa diakses tanpa login. Data publik di-cache (SWR).
 * ============================================================
 */

const Public = {
  loaded: false,

  /**
   * Muat data publik di latar (dipakai juga untuk logo & Client ID Google).
   * v3.3: member/admin yang sudah login hanya butuh logo & nama aplikasi → cukup diperbarui tiap 10 menit;
   * tamu tiap 15 detik (mencegah panggilan kembar). force = setelah Pengaturan disimpan.
   */
  prefetch(force) {
    const fresh = force === true ? 0 : (AppState.role ? 600000 : 15000);
    return swr('pub', 'publicBootstrap', {}, (d, fromCache, changed) => {
      AppState.pub = d;
      rememberBrand(d.settings);
      Public.loaded = true;
      if (AppState.currentPage === 'explore' && (fromCache || changed || !document.querySelector('#exploreRoot[data-ready]'))) renderExplore();
      if (AppState.currentPage === 'login') Login.initGoogle();
      renderPubnav();
      if (document.body.classList.contains('layout-admin') && typeof renderSidebarBrand === 'function') renderSidebarBrand();
    }, { toastError: false, fresh: fresh }).then(res => {
      Public.lastError = res && !res.success ? (res.message || 'Server tidak merespons.') : '';
      if (AppState.currentPage === 'login') Login.initGoogle();
      return res;
    });
  },
  lastError: ''
};

// ════════════════════════════════════════════════════════════
// NAV PUBLIK
// ════════════════════════════════════════════════════════════
function renderPubnav() {
  const s = (AppState.pub && AppState.pub.settings) || {};
  const nav = document.getElementById('pubnav');
  if (!nav || nav.hidden) return;
  nav.querySelector('.pub-brand').innerHTML = brandLogoHtml(32) + '<span class="truncate">' + esc(s.appName || Store.get('brandName', '') || 'Digital Product Hub') + '</span>';
  refreshIcons();
}

function scrollToId(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }


// ════════════════════════════════════════════════════════════
// SLIDESHOW OTOMATIS (v3.5) — kartu karya berganti gambar sendiri
// Satu pengatur waktu untuk semua kartu; hanya kartu yang terlihat & tidak disorot yang berganti.
// ════════════════════════════════════════════════════════════
const Slides = {
  ms: 3800, timer: null, bound: new WeakSet(), io: null,
  html(list, alt, fb) {
    list = (list || []).filter(Boolean).slice(0, 8);
    if (list.length < 2) return img(list[0], alt, '', fb);
    return '<div class="slides35" style="--slide-ms:' + Slides.ms + 'ms">' +
      list.map((u, i) => img(u, alt, i ? '' : 'class="is-on"', fb)).join('') +
      '<div class="slides35-dots">' + list.map((u, i) => '<span class="' + (i ? '' : 'is-on') + '" data-i="' + i + '"></span>').join('') + '</div>' +
      '<span class="slides35-bar"></span></div>';
  },
  scan(root) {
    (root || document).querySelectorAll('.slides35').forEach(el => {
      if (Slides.bound.has(el)) return;
      Slides.bound.add(el);
      el.addEventListener('pointerenter', () => { el._hold = true; el.classList.remove('is-playing'); });
      el.addEventListener('pointerleave', () => { el._hold = false; Slides.bar(el); });
      el.querySelectorAll('.slides35-dots span').forEach(d => d.addEventListener('click', e => { e.stopPropagation(); Slides.go(el, +d.dataset.i); }));
      if (!Slides.io && 'IntersectionObserver' in window) Slides.io = new IntersectionObserver(ents => ents.forEach(en => { en.target._vis = en.isIntersecting; Slides.bar(en.target); }), { threshold: .3 });
      if (Slides.io) Slides.io.observe(el); else el._vis = true;
    });
    if (!Slides.timer && document.querySelector('.slides35')) Slides.timer = setInterval(Slides.tick, Slides.ms);
  },
  bar(el) { el.classList.toggle('is-playing', !!el._vis && !el._hold); },
  go(el, i) {
    const imgs = el.querySelectorAll(':scope > img'), dots = el.querySelectorAll('.slides35-dots span');
    if (!imgs.length) return;
    i = (i + imgs.length) % imgs.length; el._i = i;
    imgs.forEach((m, k) => m.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
  },
  tick() {
    if (document.visibilityState !== 'visible') return;
    document.querySelectorAll('.slides35').forEach(el => { if (el._vis && !el._hold) Slides.go(el, (el._i || 0) + 1); });
  }
};


// ════════════════════════════════════════════════════════════
// HALAMAN OPEN ACCESS (v3.5: desain biru — hero video, angka berjalan, kartu interaktif)
// ════════════════════════════════════════════════════════════
registerPage('explore', {
  layout: 'public', auth: 'public', title: 'Aplikasi & Kelas',
  template: () => '<div id="exploreRoot"><div class="hero35 no-stats"><div class="hero35-inner"><div><div class="skeleton h-6 w-48" style="opacity:.25"></div><div class="skeleton h-12 w-full mt-5" style="opacity:.25"></div><div class="skeleton h-12 w-3/4 mt-3" style="opacity:.25"></div></div></div></div>' +
    '<div class="page-wrap"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' + skeletonCards(4) + '</div></div></div>',
  show: () => { if (AppState.pub) renderExplore(); }
});

const PUB = { cat: 'all' };
const PUB_CATS = [['Kelas', 'Kelas'], ['Aplikasi', 'Aplikasi'], ['Document', 'Dokumen']];   // v3.5: AI Link dihapus dari menu

/** Produk publik (aplikasi + kelas + dokumen) dalam urutan katalog. AI Link tidak ditampilkan lagi. */
function pubProducts() {
  const d = AppState.pub || {};
  return [].concat(d.apps || [], d.classes || []).filter(p => p.Category !== 'AI Link')
    .sort((a, b) => ((a.Sort_Order || 9999) - (b.Sort_Order || 9999)) || String(a.Title).localeCompare(String(b.Title)));
}

function heroVideoSrc(id) {
  return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + encodeURIComponent(id) +
    '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0';
}
/** Video latar hanya bila Admin mengisinya, dan tidak untuk mode hemat data / kurangi animasi. */
function heroVideoAllowed() {
  const c = navigator.connection || {};
  return !c.saveData && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function renderExplore() {
  const root = document.getElementById('exploreRoot');
  if (!root || !AppState.pub) return;
  const d = AppState.pub, s = d.settings || {}, hero = s.hero || {};
  const prods = pubProducts(), boots = d.bootcamps || [], shows = d.showcase || [];
  const guides = (d.guides && d.guides.list) || [], scfg = d.showcaseConfig || {};
  const st = d.stats || {};

  // ── Hero ──
  const stats = hero.showStats === false ? [] : [
    ['users', st.members, 'Member Aktif', 'Bergabung di portal'],
    ['package', st.products, 'Produk Digital', 'Kelas, aplikasi & dokumen'],
    ['calendar-days', st.bootcamps, 'Program Bootcamp', 'Kelas live terjadwal'],
    ['trophy', st.karya, 'Karya Dipamerkan', 'Hasil nyata para member']
  ].filter(x => Number(x[1]) > 0);
  const vid = hero.videoId && heroVideoAllowed() ? hero.videoId : '';
  const cover = (() => {
    const a = prods.filter(p => p.Category === 'Aplikasi' && ((p.slides || [])[0] || p.thumbnail))[0];
    if (a) return (a.slides && a.slides[0] && a.slides[0].image) || a.thumbnail;
    const k = prods.filter(p => p.thumbnail)[0] || shows.filter(x => x.image)[0];
    return k ? (k.thumbnail || k.image) : '';
  })();
  const nextBoot = boots.filter(b => (b.sessions || []).length)[0];
  const trust = ['Akses instan setelah redeem kode', 'Materi & source code bisa diunduh', s.adminWhatsApp ? 'Dibantu Admin via WhatsApp' : '']
    .filter(Boolean).map(t => '<span><i data-lucide="check-circle-2" class="w-4 h-4"></i> ' + esc(t) + '</span>').join('');

  const heroHtml =
    '<section class="hero35' + (stats.length ? '' : ' no-stats') + '" style="--vid-op:' + ((hero.videoOpacity == null ? 35 : hero.videoOpacity) / 100) + ';--shade:' + ((hero.overlay == null ? 72 : hero.overlay) / 100) + '">' +
      (vid ? '<div class="hero35-video" data-vid="' + esc(vid) + '" aria-hidden="true"></div><div class="hero35-shade"></div>' : '') +
      '<div class="hero35-inner">' +
        '<div class="min-w-0">' +
          '<span class="hero35-kicker"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ' + esc(hero.kicker || s.appName || 'Digital Product Hub') + '</span>' +
          '<h1 class="hero35-title">' + esc(s.exploreTitle || 'Aplikasi & Kelas Siap Pakai') + '</h1>' +
          '<p class="hero35-sub">' + esc(s.exploreSubtitle || s.appDescription || '') + '</p>' +
          '<div class="hero35-cta">' +
            (prods.length ? '<button class="btn-white" onclick="scrollToId(\'secApps\')"><i data-lucide="rocket" class="w-4 h-4"></i> Jelajahi Produk</button>' : '') +
            (boots.length ? '<button class="btn-outline-white" onclick="scrollToId(\'secClass\')"><i data-lucide="calendar-days" class="w-4 h-4"></i> Lihat Bootcamp</button>' : '') +
            '<button class="btn-outline-white" onclick="askAdmin(\'WhatsApp\', \'Info umum\')"><i data-lucide="message-circle" class="w-4 h-4"></i> Hubungi Kami</button>' +
          '</div>' +
          '<div class="hero35-trust">' + trust + '</div>' +
        '</div>' +
        (cover ? '<div class="hero35-visual"><div class="hero35-card">' + img(cover, s.appName || 'Produk', '', 'Produk') + '</div>' +
          (st.members ? '<div class="hero35-float"><div class="flex items-center gap-3"><span class="stat35-ico" style="background:#DCFCE7;color:#047857"><i data-lucide="users" class="w-4 h-4"></i></span>' +
            '<div><p class="text-xs text-muted">Komunitas member</p><p class="font-bold text-main"><span data-count="' + Number(st.members) + '">' + Number(st.members).toLocaleString('id-ID') + '</span> aktif</p></div></div></div>' : '') +
          (nextBoot ? '<div class="hero35-float b"><div class="flex items-center gap-3"><span class="stat35-ico" style="background:#FEF3C7;color:#B45309"><i data-lucide="calendar-clock" class="w-4 h-4"></i></span>' +
            '<div class="min-w-0"><p class="text-xs text-muted">Bootcamp berikutnya</p><p class="font-bold text-main text-sm truncate" style="max-width:190px">' + esc(nextBoot.title) + '</p></div></div></div>' : '') +
        '</div>' : '') +
      '</div>' +
    '</section>' +
    (stats.length ? '<div class="stats35" style="--n:' + stats.length + '">' + stats.map((x, i) =>
      '<div class="stat35 spot reveal reveal-d' + Math.min(i, 3) + '"><div class="stat35-top"><span class="stat35-ico"><i data-lucide="' + x[0] + '" class="w-4 h-4"></i></span>' +
        '<span class="stat35-num" data-count="' + Number(x[1]) + '">' + Number(x[1]).toLocaleString('id-ID') + '</span></div>' +
        '<p class="stat35-lbl">' + esc(x[2]) + '</p><p class="stat35-sub">' + esc(x[3]) + '</p></div>').join('') + '</div>' : '');

  // ── Produk (filter kategori di sisi browser) ──
  const cats = PUB_CATS.filter(c => prods.some(p => p.Category === c[0]));
  if (PUB.cat !== 'all' && !cats.some(c => c[0] === PUB.cat)) PUB.cat = 'all';
  const prodHtml = prods.length
    ? '<section id="secApps" class="sec35">' + sec35Head('Eksplorasi Katalog', 'Produk Digital Unggulan', 'Kelas video, aplikasi siap pakai, dan dokumen. Lihat preview, lalu dapatkan aksesnya lewat Lynk.id.', true) +
      (cats.length > 1 ? '<div class="filter35 justify-center" id="pubCats">' + [['all', 'Semua']].concat(cats).map(c =>
        '<button class="chip' + (PUB.cat === c[0] ? ' chip-active' : '') + '" data-cat="' + esc(c[0]) + '" onclick="PUB.cat=' + jsArg(c[0]) + ';renderPubProducts()">' + esc(c[1]) +
        ' <span class="chip-count">' + (c[0] === 'all' ? prods.length : prods.filter(p => p.Category === c[0]).length) + '</span></button>').join('') + '</div>' : '') +
      '<div id="pubGrid" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"></div></section>'
    : '';

  const bootHtml = boots.length
    ? '<section id="secClass" class="sec35">' +
        '<div class="sec35-row sec35-head"><div>' + '<p class="sec35-eyebrow">Program Intensif</p><h2 class="sec35-title">Bootcamp & Kelas Live</h2>' +
        '<p class="sec35-sub">Belajar terjadwal bersama mentor. Daftar lewat Lynk.id, lalu masuk dengan token akses yang Anda terima.</p></div></div>' +
        '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + boots.map(bootcampCard).join('') + '</div></section>'
    : '';

  const showHtml = shows.length
    ? '<section id="secShow" class="sec35 is-band"><div class="sec35-wrap">' +
        '<div class="sec35-head"><p class="sec35-eyebrow">Showcase Portofolio</p><h2 class="sec35-title">' + esc(scfg.title || 'Pameran Karya Member') + '</h2>' +
        '<p class="sec35-sub">' + esc(scfg.subtitle || 'Hasil karya terbaik para member kami.') + '</p></div>' +
        showcaseMarquee(shows, scfg.speed) + '</div></section>'
    : '';

  const guideHtml = guides.length
    ? '<section id="secGuide" class="sec35">' + sec35Head('Dokumentasi & Tutorial', d.guides.title || 'Panduan Praktis', d.guides.subtitle || '', true) +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + guides.map(guideCard).join('') + '</div></section>'
    : '';

  const customHtml = s.customEnabled
    ? '<section id="secCustom" class="cta35" style="margin-top:4.5rem"><div class="cta35-inner">' +
        '<div class="min-w-0"><p class="cta35-eyebrow">Jasa Pembuatan Aplikasi</p><h2>Butuh Aplikasi Custom untuk Bisnis Anda?</h2>' +
        '<p>' + esc(s.customIntro || 'Ajukan kebutuhan Anda — harga eksklusif, hemat, atau ajukan anggaran sendiri.') + '</p>' +
        '<div class="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs" style="color:#BFDBFE"><span>✓ Harga eksklusif / hemat / ajukan sendiri</span><span>✓ Estimasi jadwal jelas</span><span>✓ Source code .zip + video tutorial</span></div></div>' +
        '<div class="flex flex-wrap gap-3"><button class="btn-amber is-solid btn-glow" onclick="startCustomOrder()"><i data-lucide="wand-sparkles" class="w-4 h-4"></i> Ajukan Aplikasi</button>' +
        '<button class="btn-outline-white" onclick="openRegisterDialog()"><i data-lucide="user-plus" class="w-4 h-4"></i> Daftar Member</button></div>' +
      '</div></section>'
    : '';

  const accessHtml =
    '<section class="sec35">' + sec35Head('Akses Member', 'Sudah Beli di Lynk.id?', 'Masukkan kode akses untuk membuka kelas & materi di portal member.', true) +
      '<div class="access35">' +
        accessCard('key-round', 'is-amber', 'Redeem Kode Akses', 'Tukarkan kode dari Lynk.id — akun dibuat otomatis.', '<button class="btn-amber is-solid w-full" onclick="openRedeemDialog()"><i data-lucide="key-round" class="w-4 h-4"></i> Redeem Kode</button>') +
        accessCard('log-in', '', 'Masuk Portal Member', 'Lanjutkan belajar dengan email yang sudah terdaftar.', '<button class="btn-primary btn-glow w-full" onclick="go(\'login\')"><i data-lucide="log-in" class="w-4 h-4"></i> Masuk Portal</button>') +
        accessCard('user-plus', 'is-green', 'Daftar Member', 'Belum punya akun? Daftar dan tunggu persetujuan Admin.', '<button class="btn-ghost w-full" onclick="openRegisterDialog()"><i data-lucide="user-plus" class="w-4 h-4"></i> Daftar Sekarang</button>') +
      '</div>' +
      (s.testimoniUrl ? '<div class="quote35 mt-10 spot reveal"><div class="flex items-center gap-1 text-[#F59E0B]">' + '<i data-lucide="star" class="w-4 h-4"></i>'.repeat(5) + '</div>' +
        '<p class="mt-3 text-lg font-semibold text-main">Apa kata member kami?</p><p class="text-sm text-muted mt-1">Baca pengalaman nyata para member yang sudah belajar & memakai produk kami.</p>' +
        '<button class="btn-primary !w-auto mt-5" onclick="openLink(' + jsArg(s.testimoniUrl) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> ' + esc(s.testimoniLabel || 'Lihat Testimoni') + '</button></div>' : '') +
      '<div class="ask-band mt-8">' +
        '<p class="font-semibold text-main">Masih ragu? Tanya langsung ke Admin</p>' +
        '<div class="flex flex-wrap gap-2">' +
          (s.adminWhatsApp ? '<button class="btn-wa" onclick="askAdmin(\'WhatsApp\', \'Info umum\')"><i data-lucide="message-circle" class="w-4 h-4"></i> WhatsApp</button>' : '') +
          (s.adminEmail ? '<button class="btn-ghost !w-auto" onclick="askAdmin(\'Email\', \'Info umum\')"><i data-lucide="mail" class="w-4 h-4"></i> Email</button>' : '') +
        '</div>' +
      '</div>' +
    '</section>';

  const footHtml = '<footer class="foot35"><div class="foot35-inner"><div class="flex items-center gap-2.5">' + brandLogoHtml(28) + '<b>' + esc(s.appName || 'Digital Product Hub') + '</b></div>' +
    '<span>© ' + new Date().getFullYear() + ' ' + esc(s.appName || '') + '. Seluruh hak cipta dilindungi.</span>' +
    '<div class="flex gap-4">' + (guides.length ? '<button onclick="scrollToId(\'secGuide\')">Panduan</button>' : '') +
      '<button onclick="askAdmin(\'WhatsApp\', \'Bantuan\')">Bantuan</button><button onclick="go(\'login\')">Masuk</button></div></div></footer>';

  const empty = (!prods.length && !boots.length && !shows.length && !guides.length && !s.customEnabled)
    ? '<div class="page-wrap">' + emptyState('package-open', 'Belum ada yang dipamerkan', 'Admin belum menambahkan aplikasi, kelas, atau karya member.') + '</div>' : '';

  // Video latar dipertahankan saat halaman dirender ulang (tidak memutar ulang dari awal)
  const oldVid = root.querySelector('.hero35-video');
  root.innerHTML = heroHtml + prodHtml + bootHtml + showHtml + guideHtml + customHtml + empty + accessHtml + footHtml;
  const slot = root.querySelector('.hero35-video');
  if (slot) {
    if (oldVid && oldVid.dataset.vid === slot.dataset.vid && oldVid.firstChild) slot.replaceWith(oldVid);
    else slot.innerHTML = '<iframe src="' + esc(heroVideoSrc(slot.dataset.vid)) + '" title="Video latar" tabindex="-1" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }
  root.dataset.ready = '1';
  renderPubProducts();
  initMarquees(root);
  Slides.scan(root);
  refreshIcons();
  const navG = document.getElementById('navGuides'); if (navG) navG.hidden = !guides.length;
}

function renderPubProducts() {
  const grid = document.getElementById('pubGrid');
  if (!grid) return;
  const list = pubProducts().filter(p => PUB.cat === 'all' || p.Category === PUB.cat);
  grid.innerHTML = list.map(pubProductCard).join('');
  document.querySelectorAll('#pubCats .chip').forEach(b => b.classList.toggle('chip-active', b.dataset.cat === PUB.cat));
  refreshIcons();
}

function sec35Head(eyebrow, title, sub, center) {
  return '<div class="sec35-head' + (center ? ' is-center' : '') + '">' + (eyebrow ? '<p class="sec35-eyebrow">' + esc(eyebrow) + '</p>' : '') +
    '<h2 class="sec35-title">' + esc(title) + '</h2>' + (sub ? '<p class="sec35-sub">' + esc(sub) + '</p>' : '') + '</div>';
}
function accessCard(icon, tone, title, sub, btn) {
  return '<div class="access35-card spot reveal"><div class="access35-ico ' + tone + '"><i data-lucide="' + icon + '" class="w-5 h-5"></i></div>' +
    '<h3 class="text-lg font-bold text-main mt-2">' + esc(title) + '</h3><p class="text-sm text-muted flex-1">' + esc(sub) + '</p><div class="mt-2">' + btn + '</div></div>';
}

function sectionHead(icon, title, sub) {
  return '<div class="flex items-start gap-3 mb-6 mt-10"><div class="stat-icon"><i data-lucide="' + icon + '" class="w-5 h-5"></i></div>' +
    '<div><h2 class="text-2xl font-bold tracking-tight text-main">' + esc(title) + '</h2><p class="text-sm text-muted mt-1">' + esc(sub) + '</p></div></div>';
}

function ribbonClass(c) { return c === 'Aplikasi' ? 'is-app' : c === 'Document' ? 'is-doc' : ''; }

/** Kartu produk halaman depan (v3.5). Produk "Paused" tetap tampil, tombol beli diganti "Tanya Admin". */
function pubProductCard(p) {
  const isApp = p.Category === 'Aplikasi', open = p.checkoutOpen !== false;
  const cover = isApp ? ((p.slides && p.slides[0] && p.slides[0].image) || p.thumbnail) : p.thumbnail;
  const nPrev = (p.slides || []).length + (p.previewVideos || []).length;
  const meta = isApp ? (nPrev ? '<i data-lucide="images" class="w-3.5 h-3.5"></i> ' + nPrev + ' preview' : '')
    : (p.episodeCount ? '<i data-lucide="list-video" class="w-3.5 h-3.5"></i> ' + p.episodeCount + ' episode'
      : (p.resourceCount ? '<i data-lucide="paperclip" class="w-3.5 h-3.5"></i> ' + p.resourceCount + ' berkas' : ''));
  const ask = '<button class="btn-ghost w-full" onclick="askAdmin(\'WhatsApp\', ' + jsArg(catLabel(p.Category) + ': ' + p.Title) + ')"><i data-lucide="message-circle" class="w-4 h-4"></i> Tanya Admin</button>';
  let cta;
  if (isApp) cta = '<div class="grid grid-cols-2 gap-2"><button class="btn-ghost" onclick="openAppPreview(' + jsArg(p.Product_ID) + ')"><i data-lucide="eye" class="w-4 h-4"></i> Preview</button>' +
    (open && p.Lynk_URL ? '<button class="btn-primary" onclick="openLink(' + jsArg(p.Lynk_URL) + ')"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Beli</button>'
      : '<button class="btn-primary" onclick="askAdmin(\'WhatsApp\', ' + jsArg('Aplikasi: ' + p.Title) + ')"><i data-lucide="message-circle" class="w-4 h-4"></i> Tanya</button>') + '</div>';
  else cta = open && p.Lynk_URL ? '<button class="btn-primary w-full" onclick="openLink(' + jsArg(p.Lynk_URL) + ')"><i data-lucide="ticket" class="w-4 h-4"></i> ' + (p.Category === 'Kelas' ? 'Join Kelas' : 'Dapatkan') + '</button>' : ask;
  return '<article class="product-card spot reveal">' +
    '<div class="product-thumb' + (isApp ? ' cursor-pointer" onclick="openAppPreview(' + jsArg(p.Product_ID) + ')"' : '"') + '>' + img(cover, p.Title, '', catLabel(p.Category)) +
      '<span class="ribbon ' + ribbonClass(p.Category) + '">' + esc(catLabel(p.Category)) + '</span>' +
      (meta ? '<span class="thumb-meta">' + meta + '</span>' : '') + '</div>' +
    '<div class="p-5 flex flex-col flex-1">' +
      '<h3 class="text-[16.5px] font-semibold leading-snug text-main line-clamp-2">' + esc(p.Title) + '</h3>' +
      '<p class="mt-2 text-sm text-muted line-clamp-2 flex-1">' + esc(p.Tagline || p.Description) + '</p>' +
      '<div class="mt-4 mb-3">' + (open ? '<span class="price35">' + esc(fmtMoney(p.Price)) + '</span>' : '<span class="closed-tag"><i data-lucide="pause-circle" class="w-3.5 h-3.5"></i> Penjualan ditutup sementara</span>') + '</div>' +
      cta +
    '</div></article>';
}
// Nama lama tetap ada (dipakai modul lain / cache halaman lama)
function publicAppCard(p) { return pubProductCard(p); }
function publicClassCard(p) { return pubProductCard(p); }

function bootcampCard(b) {
  const ses = b.sessions || [];
  return '<article class="boot35 spot reveal">' +
    '<div class="boot35-head' + (b.poster ? ' has-img' : '') + '">' + (b.poster ? '<div class="boot35-bg">' + img(b.poster, b.title, '', 'Bootcamp') + '</div>' : '') +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
        (ses.length ? '<span class="boot35-pill"><i data-lucide="calendar-days" class="w-3.5 h-3.5"></i> ' + ses.length + ' sesi</span>' : '<span class="boot35-pill"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Bootcamp</span>') +
        (b.regOpen ? '<span class="boot35-pill is-open">Pendaftaran Dibuka</span>' : (b.quotaLabel ? '<span class="boot35-pill is-hot">' + esc(b.quotaLabel) + '</span>' : '')) + '</div>' +
      '<h3 class="text-[17px] font-bold leading-snug mt-6" style="color:#fff">' + esc(b.title) + '</h3>' +
    '</div>' +
    '<div class="boot35-body">' +
      (b.schedule ? '<p class="boot35-li"><i data-lucide="clock" class="w-4 h-4"></i> ' + esc(b.schedule) + '</p>' : '') +
      (ses.length ? '<p class="boot35-li"><i data-lucide="calendar-days" class="w-4 h-4"></i> Mulai ' + esc(fmtWib(ses[0].startAt, true)) + '</p>' : '') +
      ((b.accessTitles || []).length ? '<p class="boot35-li"><i data-lucide="graduation-cap" class="w-4 h-4"></i> Akses kelas: ' + esc(b.accessTitles.join(', ')) + '</p>' : '') +
      (b.description ? '<p class="text-sm text-muted whitespace-pre-line line-clamp-3">' + esc(b.description) + '</p>' : '') +
      '<div class="flex-1"></div>' +
      '<div class="flex flex-wrap items-center gap-2 mt-1">' +
        (b.priceLabel ? '<span class="price35">' + esc(b.priceLabel) + '</span>' : '') +
        (b.quotaLabel && b.regOpen ? '<span class="badge badge-warning">' + esc(b.quotaLabel) + '</span>' : '') +
      '</div>' +
      (b.ctaUrl ? '<button class="btn-primary w-full mt-2" onclick="openLink(' + jsArg(b.ctaUrl) + ')"><i data-lucide="arrow-right" class="w-4 h-4"></i> ' + esc(b.ctaLabel || 'Daftar Bootcamp') + '</button>'
                : (b.regOpen ? '' : '<button class="btn-ghost w-full mt-2" onclick="askAdmin(\'WhatsApp\', ' + jsArg('Bootcamp: ' + b.title) + ')"><i data-lucide="message-circle" class="w-4 h-4"></i> Tanya Admin</button>')) +
      (b.regOpen ? '<button class="btn-ghost w-full" onclick="openBootcampRegister(' + jsArg(b.id) + ')"><i data-lucide="key-round" class="w-4 h-4"></i> Sudah punya token? Daftar Bootcamp</button>' : '') +
    '</div></article>';
}

/** Gambar karya: sampul + galeri → slideshow otomatis bila lebih dari satu (v3.5). */
function showcaseImages(s) {
  const gal = (s.gallery || []).filter(Boolean);
  if (s.image && gal.indexOf(s.image) === -1) return [s.image].concat(gal);
  return gal.length ? gal : [s.image];
}

function showcaseCard(s) {
  const pics = showcaseImages(s);
  return '<article class="product-card spot">' +
    '<div class="product-thumb cursor-pointer" onclick="openShowcase(' + jsArg(s.id) + ')">' + Slides.html(pics, s.title, 'Karya') +
      (s.featured ? '<span class="owned-badge is-feat"><i data-lucide="award" class="w-3.5 h-3.5"></i> Unggulan</span>' : '') +
      (pics.length > 1 ? '<span class="owned-badge v4-count"><i data-lucide="images" class="w-3.5 h-3.5"></i> ' + pics.length + '</span>' : '') +
      (s.videoEmbed ? '<span class="play-dot"><i data-lucide="play" class="w-5 h-5"></i></span>' : '') + '</div>' +
    '<div class="p-5 flex flex-col flex-1">' +
      '<h3 class="text-[16px] font-semibold leading-snug text-main line-clamp-2">' + esc(s.title) + '</h3>' +
      '<p class="mt-2 text-sm text-muted line-clamp-2 flex-1">' + (s.story || s.description ? esc(s.story || s.description) : '') + '</p>' +
      '<div class="v4-member mt-4 pt-4 border-t border-app">' + memberAvatar(s, 36) + '<div class="min-w-0"><p class="text-sm font-semibold text-main truncate">' + esc(s.memberName || 'Member') + '</p>' +
        '<p class="text-xs text-muted truncate">' + esc([s.profession, s.className ? 'Alumni ' + s.className : ''].filter(Boolean).join(' · ')) + '</p></div></div>' +
    '</div></article>';
}

/** Detail karya (dipakai di publik & portal member). */
function openShowcase(id) {
  const list = (AppState.m && AppState.m.showcase) || (AppState.pub && AppState.pub.showcase) || [];
  const s = list.filter(x => x.id === id)[0];
  if (!s) return;
  const gal = showcaseImages(s).filter(Boolean);
  Swal.fire({
    width: 860, showConfirmButton: !!s.demoUrl, confirmButtonText: 'Buka Demo', showCloseButton: true,
    html: '<div style="text-align:left">' +
      (gal.length ? appPreviewHtml({ slides: gal.map(u => ({ image: u, caption: '' })), previewVideos: [], Title: s.title }) : '') +
      (s.videoEmbed ? '<div class="video-frame' + (gal.length ? ' mt-4' : '') + '"><iframe src="' + esc(s.videoEmbed) + '" allowfullscreen allow="encrypted-media; picture-in-picture"></iframe></div>' : '') +
      '<div class="v4-member mt-4">' + memberAvatar(s, 52) + '<div class="min-w-0"><p class="font-semibold text-main">' + esc(s.memberName || 'Member') + '</p>' +
        '<p class="text-sm text-muted">' + esc([s.profession, s.className ? 'Alumni ' + s.className : ''].filter(Boolean).join(' · ')) + '</p></div></div>' +
      '<h3 class="mt-4 text-xl font-bold text-main">' + esc(s.title) + '</h3>' +
      '<p class="mt-3 text-[15px] text-muted whitespace-pre-line">' + esc(s.story || s.description) + '</p></div>',
    didOpen: () => { initCarousel(document.querySelector('.swal2-popup .carousel'), { auto: 4000 }); refreshIcons(); }   // v3.5: slideshow otomatis
  }).then(r => { if (r.isConfirmed) openLink(s.demoUrl); });
}

/** Preview Aplikasi: slide gambar + video YouTube. Dipakai publik & member. */
function openAppPreview(productId) {
  const pool = [].concat((AppState.pub && AppState.pub.apps) || [], (AppState.m && AppState.m.catalog) || []);
  const p = pool.filter(x => x.Product_ID === productId)[0];
  if (!p) return;
  const loggedMember = AppState.role === ROLE_MEMBER;
  Swal.fire({
    width: 920, showCloseButton: true,
    showConfirmButton: !!(p.Lynk_URL || loggedMember),
    confirmButtonText: loggedMember ? (p.owned ? 'Buka Aplikasi' : 'Beli / Redeem Kode') : 'Beli di Lynk.id',
    html: '<div style="text-align:left">' + appPreviewHtml(p) +
      '<h3 class="mt-4 text-xl font-bold text-main">' + esc(p.Title) + '</h3>' +
      '<p class="mt-2 text-[15px] text-muted whitespace-pre-line">' + esc(p.Description) + '</p>' +
      '<p class="mt-3 font-bold text-accent">' + esc(fmtMoney(p.Price)) + '</p></div>',
    didOpen: () => { initCarousel(document.querySelector('.swal2-popup .carousel')); refreshIcons(); }
  }).then(r => {
    if (!r.isConfirmed) return;
    if (!loggedMember) openLink(p.Lynk_URL);
    else if (p.owned) go('product', p.Product_ID);
    else openBuyDialog(p.Product_ID);
  });
}

function appPreviewHtml(p) {
  const slides = p.slides || [], vids = p.previewVideos || [];
  let html = '';
  if (slides.length) {
    html += '<div class="carousel" data-index="0">' +
      '<div class="carousel-track">' + slides.map(s => '<figure class="carousel-slide">' + img(s.image, s.caption || p.Title, 'onclick="previewImage(this.src,' + jsArg(s.caption || p.Title) + ')"') +
        (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') + '</figure>').join('') + '</div>' +
      (slides.length > 1 ? '<button type="button" class="carousel-btn prev" aria-label="Sebelumnya"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>' +
        '<button type="button" class="carousel-btn next" aria-label="Berikutnya"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>' +
        '<div class="carousel-dots">' + slides.map((s, i) => '<span class="' + (i ? '' : 'is-active') + '"></span>').join('') + '</div>' : '') +
      '</div>';
  }
  if (vids.length) {
    html += '<div class="grid gap-3 mt-4 ' + (vids.length > 1 ? 'sm:grid-cols-2' : '') + '">' + vids.map(v =>
      '<div><div class="video-frame"><iframe src="' + esc(v.url) + '" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture"></iframe></div>' +
      (v.title ? '<p class="text-sm font-medium text-main mt-2">' + esc(v.title) + '</p>' : '') + '</div>').join('') + '</div>';
  }
  if (!html) html = '<div class="rounded-xl overflow-hidden">' + img(p.thumbnail, p.Title, 'style="width:100%"') + '</div>';
  return html;
}

function initCarousel(el, opt) {
  if (!el) return;
  const track = el.querySelector('.carousel-track'), n = track.children.length;
  const dots = el.querySelectorAll('.carousel-dots span');
  const set = i => {
    i = (i + n) % n; el.dataset.index = i;
    track.style.transform = 'translateX(-' + (i * 100) + '%)';
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
  };
  const prev = el.querySelector('.prev'), next = el.querySelector('.next');
  if (prev) prev.onclick = () => set(+el.dataset.index - 1);
  if (next) next.onclick = () => set(+el.dataset.index + 1);
  dots.forEach((d, k) => d.onclick = () => set(k));
  let x0 = null;
  track.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) set(+el.dataset.index + (dx < 0 ? 1 : -1)); x0 = null; });
  // v3.5: putar otomatis (berhenti saat disorot/disentuh, berhenti sendiri saat dialog ditutup)
  if (opt && opt.auto && n > 1) {
    let hold = false;
    el.addEventListener('pointerenter', () => { hold = true; });
    el.addEventListener('pointerleave', () => { hold = false; });
    el.addEventListener('touchstart', () => { hold = true; setTimeout(() => { hold = false; }, 6000); }, { passive: true });
    const t = setInterval(() => { if (!el.isConnected) return clearInterval(t); if (!hold && document.visibilityState === 'visible') set(+el.dataset.index + 1); }, opt.auto);
  }
}


// ════════════════════════════════════════════════════════════
// TANYA ADMIN (lead capture non-member → CRM)
// ════════════════════════════════════════════════════════════
async function askAdmin(channel, interest) {
  const s = (AppState.pub && AppState.pub.settings) || (AppState.m && AppState.m.settings) || {};
  if (channel === 'WhatsApp' && !s.adminWhatsApp) channel = 'Email';
  if (channel === 'Email' && !s.adminEmail) { showToast('Kontak belum diatur', 'Admin belum mengisi kontak.', 'warning'); return; }
  const saved = Store.get('lead', {});
  const r = await Swal.fire({
    title: 'Tanya Admin', confirmButtonText: 'Lanjut ke ' + channel, showCancelButton: true, cancelButtonText: 'Batal', focusConfirm: false,
    html: '<div style="text-align:left;display:grid;gap:12px">' +
      '<p class="text-sm text-muted">Isi data singkat agar Admin bisa membantu Anda lebih cepat.</p>' +
      '<div><label class="form-label" for="ldName">Nama</label><input id="ldName" class="form-input" value="' + esc(saved.name || '') + '" placeholder="Nama Anda"></div>' +
      '<div><label class="form-label" for="ldWa">No. WhatsApp</label><input id="ldWa" class="form-input" inputmode="tel" autocomplete="tel" value="' + esc(saved.whatsapp || '') + '" placeholder="0878… atau +60…"><p class="text-xs text-muted mt-1">' + esc(WA_HINT) + '</p></div>' +
      '<div><label class="form-label" for="ldEmail">Email (opsional)</label><input id="ldEmail" type="email" class="form-input" value="' + esc(saved.email || '') + '" placeholder="nama@email.com"></div>' +
      '<div><label class="form-label" for="ldMsg">Pertanyaan</label><textarea id="ldMsg" class="form-input" rows="2">' + esc(interest && interest !== 'Info umum' ? 'Halo Admin, saya tertarik dengan ' + interest.replace(/^[^:]+:\s*/, '') + '.' : 'Halo Admin, saya ingin bertanya.') + '</textarea></div></div>',
    preConfirm: () => {
      const name = document.getElementById('ldName').value.trim();
      const wa = normWa(document.getElementById('ldWa').value);
      const email = document.getElementById('ldEmail').value.trim();
      if (name.length < 2) return Swal.showValidationMessage('Nama wajib diisi.');
      if (!isValidWa(wa)) return Swal.showValidationMessage(WA_INVALID);
      return { name: name, whatsapp: wa, email: email, msg: document.getElementById('ldMsg').value.trim() };
    }
  });
  if (!r.isConfirmed) return;
  const v = r.value;
  Store.set('lead', { name: v.name, whatsapp: v.whatsapp, email: v.email });
  // Buka tab dulu (sinkron, masih dalam klik user) agar tidak diblokir popup blocker. Email → aplikasi email, tanpa tab kosong.
  const win = channel === 'WhatsApp' ? window.open('', '_blank') : null;
  if (win) try { win.opener = null; } catch (e) { /* */ }
  const text = v.msg + '\n\nNama: ' + v.name + '\nWA: ' + v.whatsapp + (v.email ? '\nEmail: ' + v.email : '') + (interest ? '\nMinat: ' + interest : '');
  const url = channel === 'WhatsApp'
    ? waLink(s.adminWhatsApp, text)
    : 'mailto:' + s.adminEmail + '?subject=' + encodeURIComponent('Pertanyaan: ' + (interest || 'Info')) + '&body=' + encodeURIComponent(text);
  api('submitLead', { name: v.name, whatsapp: v.whatsapp, email: v.email, channel: channel, interest: interest || '' })
    .then(res => { if (!res.success && !res.network) showToast('Catatan', res.message, 'warning'); });
  if (win) win.location.href = url; else openLink(url);             // tidak pernah mengganti tab portal
}


// ════════════════════════════════════════════════════════════
// LOGIN (Member email · Superadmin Google OAuth)
// ════════════════════════════════════════════════════════════
const Login = {
  tab: 'member',
  historyKey: 'emailHistory',
  getHistory() { return Store.get(this.historyKey, []).slice(0, 5); },
  pushHistory(email) {
    const list = this.getHistory().filter(e => e !== email); list.unshift(email);
    Store.set(this.historyKey, list.slice(0, 5));
  },
  removeHistory(email) { Store.set(this.historyKey, this.getHistory().filter(e => e !== email)); this.renderHistory(); },
  clearHistory() { Store.del(this.historyKey); this.renderHistory(); },
  renderHistory() {
    const box = document.getElementById('emailHistory');
    if (!box) return;
    const list = this.getHistory();
    box.innerHTML = list.length
      ? '<p class="text-xs text-muted mb-1.5 flex items-center justify-between">Pernah masuk di perangkat ini <button type="button" class="text-xs underline" onclick="Login.clearHistory()">Hapus semua</button></p>' +
        list.map(e => '<div class="hist-row"><button type="button" class="hist-pick" onclick="Login.pick(' + jsArg(e) + ')"><i data-lucide="history" class="w-3.5 h-3.5"></i> ' + esc(e) + '</button>' +
          '<button type="button" class="hist-del" title="Hapus" onclick="Login.removeHistory(' + jsArg(e) + ')"><i data-lucide="x" class="w-3.5 h-3.5"></i></button></div>').join('')
      : '';
    refreshIcons();
  },
  pick(email) { const i = document.querySelector('#formMember input[data-email]'); if (i) { i.value = email; i.focus(); } },
  switchTab(t) {
    this.tab = t;
    document.getElementById('tabMember').classList.toggle('login-tab-active', t === 'member');
    document.getElementById('tabAdmin').classList.toggle('login-tab-active', t === 'admin');
    document.getElementById('formMember').hidden = t !== 'member';
    document.getElementById('formAdmin').hidden = t !== 'admin';
    if (t === 'admin') { this.initGoogle(); warmUpServer('admin'); }   // v3.3: data panel admin disiapkan selagi login Google
  },
  async submitMember(e) {
    e.preventDefault();
    const input = document.querySelector('#formMember input[data-email]');
    const email = input.value.trim().toLowerCase();
    const btn = e.submitter || document.querySelector('#formMember button[type=submit]');
    const res = await withBusy(btn, 'Memeriksa…', () => api('loginMember', { email: email }));
    if (!res.success) {
      const code = res.data && res.data.code;
      if (code === 'NOT_REGISTERED') {
        Swal.fire({
          icon: 'warning', title: 'Email tidak terdaftar', text: res.message, showDenyButton: true, showCancelButton: true,
          confirmButtonText: 'Redeem Kode Akses', denyButtonText: 'Daftar Member', cancelButtonText: 'Coba email lain'
        }).then(r => { if (r.isConfirmed) openRedeemDialog(email); else if (r.isDenied) openRegisterDialog(email); });
      } else if (code === 'PENDING') {
        Swal.fire({ icon: 'info', title: 'Menunggu persetujuan', text: res.message, confirmButtonText: 'OK', showDenyButton: true, denyButtonText: 'Tanya Admin' })
          .then(r => { if (r.isDenied) askAdmin('WhatsApp', 'Status pendaftaran ' + email); });
      } else if (code === 'REJECTED') {
        Swal.fire({ icon: 'warning', title: 'Pendaftaran belum disetujui', text: res.message, showDenyButton: true, showCancelButton: true,
          confirmButtonText: 'Ajukan Ulang', denyButtonText: 'Tanya Admin', cancelButtonText: 'Tutup' })
          .then(r => { if (r.isConfirmed) openRegisterDialog(email, 'Perbaiki data Anda lalu kirim ulang pendaftaran.'); else if (r.isDenied) askAdmin('WhatsApp', 'Status pendaftaran ' + email); });
      } else Swal.fire({ icon: 'error', title: 'Gagal masuk', text: res.message });
      return;
    }
    this.pushHistory(email);
    onMemberLogin(res.data);
    showToast('Berhasil masuk', res.message, 'success');
  },
  initGoogle() {
    const box = document.getElementById('gsiButton');
    if (!box) return;
    const cid = AppState.pub && AppState.pub.googleClientId;
    const retryBtn = '<button type="button" class="btn-ghost !w-auto !py-1.5 mt-3" onclick="Login.retryGoogle()"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Coba lagi</button>';
    const diag = (title, msg) => { box.innerHTML = '<div class="notice notice-error text-left"><i data-lucide="alert-triangle" class="w-5 h-5 flex-none"></i><div class="flex-1 text-sm"><b>' + esc(title) + '</b><br>' + msg + '</div></div>' + '<div class="text-center">' + retryBtn + '</div>'; box.style.flexDirection = 'column'; refreshIcons(); };
    if (!cid) {
      if (Public.lastError) return diag('Tidak bisa terhubung ke server (Apps Script)', esc(Public.lastError) + '<br>Periksa <code>GAS_URL</code> di <code>js/config.js</code> dan pastikan deploy Web App: <i>Execute as: Me</i>, <i>Who has access: Anyone</i>.');
      if (AppState.pub) return diag('Google Client ID belum diisi di server', 'Isi <code>INITIAL_GOOGLE_CLIENT_ID</code> di Kode.gs, jalankan fungsi <code>setGoogleClientId()</code>, lalu klik Coba lagi.');
      box.innerHTML = '<p class="text-sm text-muted text-center"><span class="spinner-inline"></span> Memuat Sign in with Google…</p>';
      clearTimeout(Login._t); Login._t = setTimeout(() => { if (!(AppState.pub && AppState.pub.googleClientId) && !Public.lastError) diag('Server lambat merespons', 'Belum ada jawaban dari Apps Script setelah 20 detik.'); }, 20000);
      return;
    }
    if (!window.google || !google.accounts || !google.accounts.id) {
      Login._gsiWait = (Login._gsiWait || 0) + 1;
      if (Login._gsiWait > 40) return diag('Skrip Google tidak termuat', 'Matikan ad-blocker/ekstensi privasi untuk situs ini, lalu muat ulang halaman.');
      setTimeout(() => Login.initGoogle(), 400); return;
    }
    if (box.dataset.ready === cid) return;
    google.accounts.id.initialize({ client_id: cid, callback: Login.onGoogle, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup' });
    box.innerHTML = '';
    google.accounts.id.renderButton(box, { theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 300, locale: 'id' });
    box.dataset.ready = cid;
  },
  retryGoogle() {
    const box = document.getElementById('gsiButton'); if (box) { box.dataset.ready = ''; box.style.flexDirection = ''; }
    Store.del('pub'); Public.lastError = ''; Login._gsiWait = 0; AppState.pub = null;
    Login.initGoogle(); Public.prefetch();
  },
  async onGoogle(resp) {
    const box = document.getElementById('gsiStatus');
    if (box) box.innerHTML = '<span class="spinner-inline"></span> Memverifikasi akun Google…';
    const res = await api('loginSuperadmin', { credential: resp.credential });
    if (box) box.innerHTML = '';
    if (!res.success) { Swal.fire({ icon: 'error', title: 'Akses ditolak', text: res.message }); return; }
    saveSession(res.data);
    showToast('Selamat datang', res.data.name, 'success');
    AdminLibs.ready();
    try { await AdminBundle.ready(); } catch (e) { return; }
    Admin.boot();
    go('admin/dashboard');
  }
};

registerPage('login', {
  layout: 'public', auth: 'guest', title: 'Masuk',
  template: () =>
    '<div class="min-h-[calc(100dvh-64px)] flex items-center justify-center px-4 py-10 dot-grid">' +
      '<div class="w-full max-w-md">' +
        '<div class="app-card rounded-2xl overflow-hidden">' +
          '<div class="px-8 pt-8 pb-6 text-center">' +
            '<div id="loginBrand" class="mx-auto w-14 h-14"></div>' +
            '<h1 class="mt-4 text-2xl font-bold tracking-tight text-main">Selamat Datang</h1>' +
            '<p class="mt-1 text-sm text-muted">Masuk untuk mengakses kelas & aplikasi Anda.</p>' +
          '</div>' +
          '<div class="px-8"><div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2">' +
            '<button type="button" id="tabMember" onclick="Login.switchTab(\'member\')" class="login-tab login-tab-active">Member</button>' +
            '<button type="button" id="tabAdmin" onclick="Login.switchTab(\'admin\')" class="login-tab">Admin / Superadmin</button>' +
          '</div></div>' +
          '<form id="formMember" class="px-8 py-6 space-y-4" onsubmit="Login.submitMember(event)" autocomplete="off">' +
            '<div><label class="form-label">Email Terdaftar</label>' +
            '<input data-email name="m_' + Math.random().toString(36).slice(2, 8) + '" type="email" required autocomplete="off" autocapitalize="off" spellcheck="false" ' +
              'data-lpignore="true" data-1p-ignore data-form-type="other" class="form-input" placeholder="nama@email.com">' +
            '<p class="mt-1.5 text-xs text-muted">Gunakan email yang Anda pakai saat membeli / redeem kode.</p>' +
            '<div id="emailHistory" class="mt-3"></div></div>' +
            '<button type="submit" class="btn-primary w-full"><i data-lucide="log-in" class="w-4 h-4"></i> Masuk sebagai Member</button>' +
            '<button type="button" onclick="openRedeemDialog()" class="btn-ghost w-full"><i data-lucide="key-round" class="w-4 h-4"></i> Punya Kode Akses? Redeem di sini</button>' +
            '<p class="text-center text-xs text-muted">Belum punya akun? <button type="button" class="text-accent font-semibold" onclick="openRegisterDialog()">Daftar sebagai member</button></p>' +
          '</form>' +
          '<div id="formAdmin" class="px-8 py-6 space-y-4" hidden>' +
            '<div class="text-center"><div class="w-12 h-12 mx-auto rounded-2xl grid place-items-center" style="background:var(--accent-soft);color:var(--accent)"><i data-lucide="shield-check" class="w-6 h-6"></i></div>' +
            '<p class="mt-3 text-sm text-muted">Khusus Superadmin & Tim Admin. Masuk dengan akun Google yang terdaftar (OAuth 2.0).</p></div>' +
            '<div id="gsiButton" class="flex justify-center min-h-[44px]"></div>' +
            '<p id="gsiStatus" class="text-center text-sm text-muted"></p>' +
          '</div>' +
          '<div class="px-8 pb-6 text-center"><button type="button" class="text-sm text-muted hover:text-main inline-flex items-center gap-1" onclick="go(\'explore\')"><i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali ke beranda</button></div>' +
        '</div>' +
      '</div>' +
    '</div>',
  show: () => {
    document.getElementById('loginBrand').innerHTML = brandLogoHtml(56);
    Login.renderHistory();
    warmUpServer(Login.tab === 'admin' ? 'admin' : 'pub');   // v3.3: cache akses & katalog siap sebelum tombol Masuk ditekan
    if (Login.tab === 'admin') Login.initGoogle();
  }
});

function onMemberLogin(d) {
  saveSession(d);
  const next = Store.get('afterLogin', '');
  if (next) Store.del('afterLogin');
  if (d.boot) {
    // v3.2: data beranda ikut di respons login → langsung tampil, tanpa panggilan kedua ke server
    AppState.m = d.boot;
    Store.set(userKey('boot'), { t: Date.now(), h: hashData(d.boot), data: d.boot });
    Member._lastFetch = Date.now();
    rememberBrand(d.boot.settings);
    go(next && Pages[next] ? next : 'home');
    Member.renderMounted();
    Member.showAnnouncements();
    return;
  }
  AppState.m = AppState.m || Store.get(userKey('boot'), { data: null }).data;
  go(next && Pages[next] ? next : 'home');
  Member.refresh();
}


// ════════════════════════════════════════════════════════════
// REDEEM KODE (tanpa login → akun dibuat otomatis)
// ════════════════════════════════════════════════════════════
async function openRedeemDialog(prefillEmail) {
  const logged = AppState.role === ROLE_MEMBER;
  if (!logged) warmUpServer('pub');
  const r = await Swal.fire({
    title: 'Redeem Kode Akses', confirmButtonText: 'Tukarkan Kode', showCancelButton: true, cancelButtonText: 'Batal', focusConfirm: false,
    html: '<div style="text-align:left;display:grid;gap:12px">' +
      '<p class="text-sm text-muted">Masukkan kode yang Anda terima setelah membeli di Lynk.id.</p>' +
      '<div><label class="form-label" for="rdCode">Kode Akses</label><input id="rdCode" class="form-input mono" style="text-transform:uppercase" placeholder="LYNK-XXXXX-X" autocomplete="off"></div>' +
      (logged ? '' : '<div><label class="form-label" for="rdEmail">Email Anda</label><input id="rdEmail" type="email" class="form-input" value="' + esc(typeof prefillEmail === 'string' ? prefillEmail : '') + '" placeholder="nama@email.com" autocomplete="off">' +
        '<p class="text-xs text-muted mt-1">Email ini menjadi akun login Anda. Pastikan penulisannya benar.</p></div>') + '</div>',
    preConfirm: () => {
      const code = document.getElementById('rdCode').value.trim().toUpperCase();
      const email = logged ? AppState.email : (document.getElementById('rdEmail').value || '').trim().toLowerCase();
      if (!code) return Swal.showValidationMessage('Kode wajib diisi.');
      if (!logged && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Swal.showValidationMessage('Email tidak valid.');
      Swal.showLoading();
      return api('redeem', { code: code, email: email }).then(res => {
        if (!res.success && res.data && res.data.code === 'BOOTCAMP_TOKEN') { setTimeout(() => openBootcampRegister(res.data.bootId, { token: code, email: email }), 50); return { bootcamp: true }; }
        if (!res.success) { Swal.hideLoading(); Swal.showValidationMessage(res.message); return false; }
        return res;
      });
    },
    allowOutsideClick: () => !Swal.isLoading()
  });
  if (!r.isConfirmed || !r.value || r.value.bootcamp) return;
  const res = r.value, d = res.data;
  if (d.token) { Login.pushHistory(d.email); saveSession(d); }
  await Swal.fire({ icon: 'success', title: d.isNew ? 'Akun dibuat & akses aktif!' : 'Berhasil!', text: res.message, confirmButtonText: 'Buka Sekarang' });
  forgetDetail(d.productId);
  if (AppState.role === ROLE_MEMBER) { await Member.refresh(); go('product', d.productId); }
}
