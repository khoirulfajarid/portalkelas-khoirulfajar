/**
 * ============================================================
 * v36.js — Digital Product Hub v3.6 (publik & portal member)
 *  A. Kartu Bootcamp banner + Modal Detail · Testimoni Alumni (slideshow + flip-card)
 *     Ruang Belajar Bootcamp: kurikulum per pertemuan, presensi, checklist materi,
 *     penampil materi, tugas, kuesioner, portofolio, sertifikat (unduh PNG/PDF)
 *     Halaman Verifikasi Sertifikat #/verifikasi/<kode>
 *  C. Jalur Belajar (rekomendasi urutan kelas) #/jalur
 * Modul ini hanya MENAMBAH. Fungsi lama yang diganti tampilannya (bootcampCard, renderMyBootcamp)
 * didefinisikan ulang di sini dengan nama yang sama agar pemanggil lama tetap bekerja.
 * ============================================================
 */

const V36 = { rooms: {}, tab: {}, open: {}, busy: {}, paths: null, pathSel: 0, testi: [] };
const MAT_ICON = { doc: 'book-open', file: 'file-text', link: 'link', video: 'play-circle', replay: 'radio', text: 'notebook-pen', task: 'clipboard-check' };
const SUB_BADGE = { Menunggu: ['badge-warning', 'Menunggu diperiksa'], Disetujui: ['badge-success', 'Disetujui'], Revisi: ['badge-error', 'Perlu revisi'] };
const LEVEL_TONE = ['is-green', 'is-blue', 'is-amber', 'is-violet', 'is-rose', 'is-slate'];

/** Data v3.6 sebuah bootcamp dari daftar (b.v36) atau dari ruang belajar (sudah rata). */
function bv(b) { return (b && b.v36) || b || {}; }
function stars36(n) { n = Math.round(Number(n) || 0); if (!n) return ''; let s = ''; for (let i = 1; i <= 5; i++) s += '<i data-lucide="star" class="w-3.5 h-3.5' + (i <= n ? ' is-on' : '') + '"></i>'; return '<span class="stars36">' + s + '</span>'; }
function avatar36(photo, name, size) {
  const st = 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size / 2.5) + 'px';
  return photo ? '<span class="av36" style="' + st + '">' + img(photo, name, '', initial(name)) + '</span>' : '<span class="av36 is-ph" style="' + st + '">' + esc(initial(name)) + '</span>';
}
function fmtWibShort(iso) { const w = wib(iso); return w ? w.date + ' · ' + w.time + ' WIB' : '—'; }
function wibInput(iso) { const w = wib(iso); if (!w) return ''; const d = w.d; return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0') + 'T' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
function fromWibInput(v) { return v ? new Date(v + ':00+07:00').toISOString() : ''; }
function isMineBoot(id) { return AppState.role === ROLE_MEMBER && AppState.m && AppState.m.bootcamp && (AppState.m.bootcamp.mine || []).some(x => x.id === id && x.status !== 'Ditolak'); }


// ════════════════════════════════════════════════════════════
// 1. KARTU BOOTCAMP BANNER (publik & portal member) — poster utuh di tengah
// ════════════════════════════════════════════════════════════
function bootcampCard(b) {
  const x = bv(b), ses = b.sessions || [], mine = isMineBoot(b.id);
  const ribbon = x.highlightLabel || (b.regOpen ? 'Pendaftaran Dibuka' : (b.quotaLabel || ''));
  const start = ses.length ? fmtWib(ses[0].startAt, true) : (b.schedule || '');
  const sum = x.summary || b.description || '';
  const cta = mine
    ? '<button class="btn-primary flex-1" onclick="event.stopPropagation();go(\'bootcamp\',' + jsArg(b.id) + ')"><i data-lucide="door-open" class="w-4 h-4"></i> Ruang Belajar</button>'
    : b.ctaUrl ? '<button class="btn-primary flex-1" onclick="event.stopPropagation();openLink(' + jsArg(b.ctaUrl) + ')"><i data-lucide="arrow-right" class="w-4 h-4"></i> ' + esc(b.ctaLabel || 'Daftar') + '</button>'
    : b.regOpen ? '<button class="btn-primary flex-1" onclick="event.stopPropagation();openBootcampRegister(' + jsArg(b.id) + ')"><i data-lucide="key-round" class="w-4 h-4"></i> Daftar</button>' : '';
  return '<article class="bc36 spot reveal" onclick="openBootcampDetail(' + jsArg(b.id) + ')" tabindex="0" onkeydown="if(event.key===\'Enter\')openBootcampDetail(' + jsArg(b.id) + ')">' +
    '<div class="bc36-media">' +
      (b.poster ? '<div class="bc36-blur" style="background-image:url(\'' + esc(String(b.poster).replace(/'/g, '%27')) + '\')"></div>' + img(b.poster, b.title, 'class="bc36-poster"', 'Bootcamp')
                : '<div class="bc36-noimg"><i data-lucide="calendar-days" class="w-10 h-10"></i><b>' + esc(b.title) + '</b></div>') +
      (ribbon ? '<span class="bc36-ribbon"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ' + esc(ribbon) + '</span>' : '') +
      '<span class="bc36-chip"><i data-lucide="calendar-range" class="w-3.5 h-3.5"></i> ' + (ses.length ? ses.length + ' pertemuan' : 'Bootcamp') + '</span>' +
      (x.ended ? '<span class="bc36-chip is-end">Selesai · Arsip Belajar</span>' : '') +
    '</div>' +
    '<div class="bc36-body">' +
      '<h3 class="bc36-title">' + esc(b.title) + '</h3>' +
      (start ? '<p class="bc36-meta"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ' + esc(ses.length ? 'Mulai ' + start : start) + '</p>' : '') +
      (sum ? '<p class="bc36-sum">' + esc(sum) + '</p>' : '') +
      '<div class="bc36-foot">' + (b.priceLabel ? '<span class="price35">' + esc(b.priceLabel) + '</span>' : '<span></span>') +
        (x.totalMaterials ? '<span class="bc36-mini"><i data-lucide="layers" class="w-3.5 h-3.5"></i> ' + x.totalMaterials + ' materi' + (x.totalTasks ? ' · ' + x.totalTasks + ' tugas' : '') + '</span>' : '') + '</div>' +
      '<div class="bc36-actions"><button class="btn-ghost flex-1" onclick="event.stopPropagation();openBootcampDetail(' + jsArg(b.id) + ')"><i data-lucide="eye" class="w-4 h-4"></i> Lihat Detail</button>' + cta + '</div>' +
    '</div></article>';
}

function findBootAny(id) {
  const pool = [].concat((AppState.pub && AppState.pub.bootcamps) || [], (AppState.m && AppState.m.bootcamp && AppState.m.bootcamp.open) || [], (AppState.m && AppState.m.bootcamp && AppState.m.bootcamp.mine) || []);
  return pool.filter(b => b.id === id)[0] || null;
}
function testimonialsAll() { return (AppState.pub && AppState.pub.testimonials) || []; }

/** Modal detail bootcamp: poster, deskripsi lengkap, jadwal, garis besar kurikulum, syarat, testimoni alumni. */
async function openBootcampDetail(id) {
  let b = findBootAny(id);
  if (!b && typeof Public !== 'undefined') { await Public.prefetch(true); b = findBootAny(id); }
  if (!b) return showToast('Bootcamp tidak ditemukan', '', 'warning');
  const x = bv(b), ses = b.sessions || [], outline = x.outline || [], mine = isMineBoot(b.id);
  const fam = x.family || b.id, testi = testimonialsAll().filter(t => t.family === fam).slice(0, 8);
  const rows = ses.map((s, i) => {
    const o = outline.filter(z => z.id === s.id)[0] || {};
    return '<li class="bd36-ses"><span class="bd36-no">' + (i + 1) + '</span><div class="min-w-0 flex-1"><p class="font-semibold text-main">' + esc(s.title) + '</p>' +
      '<p class="text-xs text-muted">' + esc(fmtWib(s.startAt, true)) + (s.endAt ? '–' + esc(fmtWibTime(s.endAt)) + ' WIB' : '') + '</p></div>' +
      ((o.materials || o.tasks) ? '<span class="bd36-cnt">' + (o.materials ? o.materials + ' materi' : '') + (o.materials && o.tasks ? ' · ' : '') + (o.tasks ? o.tasks + ' tugas' : '') + '</span>' : '') + '</li>';
  }).join('');
  const cta = mine ? '<button class="btn-primary !w-auto" onclick="Swal.close();go(\'bootcamp\',' + jsArg(b.id) + ')"><i data-lucide="door-open" class="w-4 h-4"></i> Masuk Ruang Belajar</button>'
    : (b.ctaUrl ? '<button class="btn-primary !w-auto" onclick="openLink(' + jsArg(b.ctaUrl) + ')"><i data-lucide="shopping-bag" class="w-4 h-4"></i> ' + esc(b.ctaLabel || 'Daftar Bootcamp') + '</button>' : '') +
      (b.regOpen ? '<button class="btn-ghost !w-auto" onclick="Swal.close();openBootcampRegister(' + jsArg(b.id) + ')"><i data-lucide="key-round" class="w-4 h-4"></i> Sudah punya token? Daftar</button>' : '') +
      (!b.ctaUrl && !b.regOpen ? '<button class="btn-ghost !w-auto" onclick="askAdmin(\'WhatsApp\',' + jsArg('Bootcamp: ' + b.title) + ')"><i data-lucide="message-circle" class="w-4 h-4"></i> Tanya Admin</button>' : '');
  Swal.fire({
    width: 980, showConfirmButton: false, showCloseButton: true, customClass: { popup: 'bd36-pop' },
    html: '<div class="bd36">' +
      '<div class="bd36-poster">' + (b.poster ? '<div class="bc36-blur" style="background-image:url(\'' + esc(String(b.poster).replace(/\'/g, '%27')) + '\')"></div>' + img(b.poster, b.title, 'onclick="previewImage(this.src,' + jsArg(b.title) + ')"', 'Bootcamp') : '<div class="bc36-noimg"><i data-lucide="calendar-days" class="w-12 h-12"></i></div>') + '</div>' +
      '<div class="bd36-info text-left">' +
        '<div class="flex flex-wrap gap-2">' + (x.highlightLabel ? '<span class="badge badge-warning">' + esc(x.highlightLabel) + '</span>' : '') +
          (b.regOpen ? '<span class="badge badge-success">Pendaftaran dibuka</span>' : '') + (x.ended ? '<span class="badge badge-document">Selesai · Arsip Belajar</span>' : '') + '</div>' +
        '<h2 class="bd36-title">' + esc(b.title) + '</h2>' +
        (x.summary ? '<p class="bd36-sum">' + esc(x.summary) + '</p>' : '') +
        (b.description ? '<p class="bd36-desc">' + esc(b.description) + '</p>' : '') +
        '<div class="bd36-facts">' +
          (b.priceLabel ? '<div><span>Investasi</span><b>' + esc(b.priceLabel) + '</b></div>' : '') +
          (ses.length ? '<div><span>Pertemuan</span><b>' + ses.length + '× live (WIB)</b></div>' : (b.schedule ? '<div><span>Jadwal</span><b>' + esc(b.schedule) + '</b></div>' : '')) +
          (x.totalMaterials ? '<div><span>Materi</span><b>' + x.totalMaterials + ' materi' + (x.totalTasks ? ' · ' + x.totalTasks + ' tugas' : '') + '</b></div>' : '') +
          (b.quotaLabel ? '<div><span>Kuota</span><b>' + esc(b.quotaLabel) + '</b></div>' : '') + '</div>' +
        ((b.accessTitles || []).length ? '<p class="bd36-h">Akses kelas yang didapat</p><ul class="bd36-list">' + b.accessTitles.map(t => '<li><i data-lucide="check-circle-2" class="w-4 h-4"></i> ' + esc(t) + '</li>').join('') + '</ul>' : '') +
        (ses.length ? '<p class="bd36-h">Kurikulum & jadwal</p><ol class="bd36-sess">' + rows + '</ol>' : '') +
        ((b.requirements || []).length ? '<p class="bd36-h">Syarat pendaftaran</p><ul class="bd36-list">' + b.requirements.map(r => '<li><i data-lucide="paperclip" class="w-4 h-4"></i> ' + esc(r.label) + (r.required ? '' : ' <small class="text-muted">(opsional)</small>') + '</li>').join('') + '</ul>' : '') +
        '<p class="bd36-h">Yang Anda dapatkan</p><ul class="bd36-list"><li><i data-lucide="infinity" class="w-4 h-4"></i> Akses materi seumur hidup setelah bootcamp selesai</li><li><i data-lucide="award" class="w-4 h-4"></i> Sertifikat dengan QR verifikasi setelah menyelesaikan syarat</li></ul>' +
        '<div class="bd36-cta">' + cta + '</div>' +
      '</div></div>' +
      (testi.length ? '<div class="bd36-testi text-left"><p class="bd36-h">Kata alumni</p><div class="testi36-row">' + testi.map(testiCard).join('') + '</div></div>' : ''),
    didOpen: el => { refreshIcons(); Slides.scan(el); testiBind(el); }
  });
}


// ════════════════════════════════════════════════════════════
// 2. TESTIMONI ALUMNI — slideshow karya + flip-card kesan-pesan
// ════════════════════════════════════════════════════════════
function testiCard(t) {
  const shots = (t.shots || []).filter(Boolean);
  return '<article class="tf36" data-tf>' +
    '<div class="tf36-inner">' +
      '<div class="tf36-face tf36-front">' +
        '<div class="tf36-shots">' + (shots.length > 1 ? Slides.html(shots, t.title, 'Karya') : img(shots[0], t.title, '', 'Karya')) +
          (t.featured ? '<span class="tf36-feat"><i data-lucide="star" class="w-3.5 h-3.5"></i> Unggulan</span>' : '') + '</div>' +
        '<div class="tf36-who">' + avatar36(t.photo, t.name, 44) + '<div class="min-w-0 flex-1"><p class="tf36-name">' + esc(t.name) + '</p><p class="tf36-job">' + esc([t.profession, t.bootTitle].filter(Boolean).join(' · ')) + '</p></div>' + stars36(t.rating) + '</div>' +
        '<p class="tf36-work"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ' + esc(t.title) + '</p>' +
        '<p class="tf36-quote">“' + esc(t.testimony) + '”</p>' +
        '<button type="button" class="tf36-flip" data-flip><i data-lucide="message-square-quote" class="w-4 h-4"></i> Baca kesan lengkap</button>' +
      '</div>' +
      '<div class="tf36-face tf36-back">' +
        '<div class="tf36-who">' + avatar36(t.photo, t.name, 52) + '<div class="min-w-0 flex-1"><p class="tf36-name">' + esc(t.name) + '</p><p class="tf36-job">' + esc(t.profession || '') + '</p></div></div>' +
        stars36(t.rating) +
        '<div class="tf36-full">“' + esc(t.testimony) + '”</div>' +
        '<p class="tf36-job mt-2">Alumni ' + esc(t.bootTitle || 'Bootcamp') + '</p>' +
        '<div class="tf36-back-act">' + (t.demoUrl ? '<button type="button" class="btn-white !py-2" onclick="event.stopPropagation();openLink(' + jsArg(t.demoUrl) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> Lihat Demo</button>' : '') +
          '<button type="button" class="btn-outline-white !py-2" data-flip><i data-lucide="images" class="w-4 h-4"></i> Lihat Karya</button></div>' +
      '</div>' +
    '</div></article>';
}
/** Flip-card: tombol membalik kartu; klik gambar membuka pratinjau besar. */
function testiBind(root) {
  (root || document).querySelectorAll('[data-tf]:not([data-tfb])').forEach(card => {
    card.setAttribute('data-tfb', '1');
    card.addEventListener('click', e => {
      if (e.target.closest('[data-flip]')) { e.stopPropagation(); card.classList.toggle('is-flipped'); return; }
      const im = e.target.closest('.tf36-shots img');
      if (im && !card.classList.contains('is-flipped')) previewImage(im.src, card.querySelector('.tf36-work') ? card.querySelector('.tf36-work').textContent.trim() : 'Karya');
    });
  });
}
/** Seksi Testimoni Alumni di halaman depan (dipanggil renderExplore). */
function testiSectionHtml() {
  const list = testimonialsAll();
  if (!list.length) return '';
  return '<section id="secTesti" class="sec35"><div class="sec35-head is-center"><p class="sec35-eyebrow">Testimoni Alumni Bootcamp</p><h2 class="sec35-title">Karya Nyata Para Lulusan</h2>' +
    '<p class="sec35-sub">Hasil proyek akhir dan kesan-pesan peserta. Geser gambar untuk melihat karya, balik kartu untuk membaca ceritanya.</p></div>' +
    '<div class="testi36-grid">' + list.map(testiCard).join('') + '</div></section>';
}
document.addEventListener('DOMContentLoaded', () => {
  new MutationObserver(() => { if (document.querySelector('[data-tf]:not([data-tfb])')) testiBind(); }).observe(document.body, { childList: true, subtree: true });
});


// ════════════════════════════════════════════════════════════
// 3. VERIFIKASI SERTIFIKAT (publik) — #/verifikasi/<kode>
// ════════════════════════════════════════════════════════════
registerPage('verifikasi', {
  layout: 'public', auth: 'public', title: 'Verifikasi Sertifikat',
  template: () => '<div class="page-wrap"><div class="ver36" id="verRoot"></div></div>',
  show: (el, code) => verifyCert(code || '')
});
async function verifyCert(code) {
  const root = document.getElementById('verRoot'); if (!root) return;
  const form = '<form class="ver36-form" onsubmit="event.preventDefault();go(\'verifikasi\',this.code.value.trim().toUpperCase())">' +
    '<input name="code" class="form-input mono" placeholder="CRT-2610-XXXXXX" value="' + esc(code) + '" autocapitalize="characters" aria-label="Kode sertifikat">' +
    '<button class="btn-primary !w-auto"><i data-lucide="search-check" class="w-4 h-4"></i> Periksa</button></form>';
  const head = '<div class="ver36-head"><span class="ver36-ico"><i data-lucide="shield-check" class="w-7 h-7"></i></span><div><p class="sec35-eyebrow">Verifikasi Keaslian</p><h1 class="page-title">Sertifikat Bootcamp</h1>' +
    '<p class="page-sub">Pindai QR pada sertifikat atau ketik kodenya untuk memastikan sertifikat asli.</p></div></div>';
  if (!code) { root.innerHTML = head + form; refreshIcons(); return; }
  root.innerHTML = head + form + '<div class="ver36-card">' + skeletonRows(3) + '</div>';
  const res = await api('certVerify', { code: code });
  if (AppState.currentPage !== 'verifikasi') return;
  let card;
  if (!res.success) card = '<div class="ver36-card is-bad"><i data-lucide="shield-x" class="w-10 h-10"></i><div><p class="ver36-st">Tidak terverifikasi</p><p class="text-sm">' + esc(res.message) + '</p></div></div>';
  else {
    const d = res.data;
    card = '<div class="ver36-card ' + (d.valid ? 'is-ok' : 'is-bad') + '"><i data-lucide="' + (d.valid ? 'badge-check' : 'shield-alert') + '" class="w-10 h-10"></i><div class="min-w-0 flex-1">' +
      '<p class="ver36-st">' + (d.valid ? 'Sertifikat ASLI & berlaku' : 'Sertifikat telah DICABUT') + '</p>' +
      '<dl class="ver36-dl"><dt>Nama</dt><dd>' + esc(d.name) + '</dd><dt>Program</dt><dd>' + esc(d.bootTitle) + '</dd><dt>Diterbitkan</dt><dd>' + esc(d.issuedText) + '</dd><dt>Kode</dt><dd class="mono">' + esc(d.code) + '</dd><dt>Penerbit</dt><dd>' + esc(d.appName) + '</dd></dl></div></div>';
  }
  root.innerHTML = head + form + card;
  refreshIcons();
}


// ════════════════════════════════════════════════════════════
// 4. PORTAL MEMBER — DAFTAR BOOTCAMP SAYA (kartu banner + progres)
// ════════════════════════════════════════════════════════════
registerPage('bootcamp', {
  title: 'Bootcamp',
  template: () => '<div class="page-wrap" id="bootRoot">' + skeletonRows(5) + '</div>',
  show: (el, id) => {
    clearInterval(AppState.timers.boot);
    if (id) { openRoom(id); }
    else { V36.roomId = null; if (AppState.m) renderMyBootcamp(); }
    Member.softRefresh();
    AppState.timers.boot = setInterval(() => {
      if (document.visibilityState !== 'visible' || AppState.currentPage !== 'bootcamp') return;
      if (AppState.currentParam) renderRoomHeadClock(); else renderMyBootcamp();
    }, 30000);
  },
  leave: () => clearInterval(AppState.timers.boot)
});

function roomCache(id) { return Store.get(userKey('room:' + id), null); }

function renderMyBootcamp() {
  const root = document.getElementById('bootRoot');
  if (!root || !AppState.m || (AppState.currentPage === 'bootcamp' && AppState.currentParam)) return;
  const d = AppState.m.bootcamp || { mine: [], open: [] };
  const mine = (d.mine || []).filter(b => b.status !== 'Ditolak');
  root.innerHTML =
    '<div class="flex flex-wrap items-end justify-between gap-3 mb-6"><div class="min-w-0"><p class="sec35-eyebrow">Kurikulum & Materi Belajar</p>' +
      '<h1 class="page-title mt-1">Bootcamp Saya</h1><p class="page-sub">Masuk ke ruang belajar untuk presensi, mempelajari materi tiap pertemuan, mengerjakan tugas, dan mengunduh sertifikat.</p></div>' +
      '<span class="pill35"><span class="live-dot"></span> Sekarang: <b class="tabular">' + esc(fmtWibTime(new Date().toISOString())) + ' WIB</b></span></div>' +
    (mine.length ? '<div class="my36-grid">' + mine.map(myBootCard).join('') + '</div>'
      : emptyState('calendar-days', 'Belum mengikuti bootcamp', 'Daftar bootcamp di bawah ini memakai token akses yang Anda terima setelah pembelian.')) +
    ((d.mine || []).some(b => b.status === 'Ditolak') ? '<p class="text-xs text-muted mt-4">Pendaftaran yang tidak disetujui Admin tidak ditampilkan. Hubungi Admin bila ada pertanyaan.</p>' : '') +
    (d.open.length ? '<div class="mt-14"><div class="sec35-head"><p class="sec35-eyebrow">Program Tersedia</p><h2 class="sec35-title">Bootcamp yang Bisa Anda Ikuti</h2>' +
      '<p class="sec35-sub">Klik kartu untuk melihat detail lengkap & kurikulum.</p></div>' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + d.open.map(bootcampCard).join('') + '</div></div>' : '');
  refreshIcons();
}

function myBootCard(b) {
  const x = bv(b), ses = b.sessions || [], c = roomCache(b.id), comp = c && c.data && c.data.completion;
  const hadir = ses.filter(s => s.attendedAt).length;
  const pct = comp ? comp.pct : (ses.length ? Math.round(hadir / ses.length * 100) : 0), C = 150.8;
  const waiting = b.accessMode === 'approval' && b.status !== 'Disetujui';
  const now = Date.now(), live = ses.filter(s => now >= Date.parse(s.startAt) - 30 * 60000 && now <= (Date.parse(s.endAt) || Date.parse(s.attendUntil))) [0];
  const next = live || ses.filter(s => Date.parse(s.startAt) > now)[0];
  const certOk = c && c.data && c.data.certificate;
  return '<article class="my36 spot reveal" onclick="go(\'bootcamp\',' + jsArg(b.id) + ')" tabindex="0">' +
    '<div class="my36-media">' + (b.poster ? '<div class="bc36-blur" style="background-image:url(\'' + esc(String(b.poster).replace(/\'/g, '%27')) + '\')"></div>' + img(b.poster, b.title, 'class="bc36-poster"', 'Bootcamp') : '<div class="bc36-noimg"><i data-lucide="calendar-days" class="w-10 h-10"></i></div>') +
      (live ? '<span class="bc36-ribbon is-live"><span class="live-dot"></span> LIVE sekarang</span>' : (x.highlightLabel ? '<span class="bc36-ribbon">' + esc(x.highlightLabel) + '</span>' : '')) + '</div>' +
    '<div class="my36-body"><div class="flex items-start gap-3"><div class="min-w-0 flex-1">' +
      '<div class="flex flex-wrap gap-1.5 mb-1.5">' + (waiting ? '<span class="badge badge-warning">Menunggu verifikasi</span>' : (x.ended ? '<span class="badge badge-document">Selesai · Arsip Belajar</span>' : '<span class="badge badge-success">Berjalan</span>')) +
        (certOk ? '<span class="badge badge-ai"><i data-lucide="award" class="w-3 h-3"></i> Bersertifikat</span>' : '') + '</div>' +
      '<h3 class="bc36-title">' + esc(b.title) + '</h3>' +
      '<p class="bc36-meta"><i data-lucide="calendar-clock" class="w-3.5 h-3.5"></i> ' + (next ? (live ? 'Sedang berlangsung: ' : 'Berikutnya: ') + esc(next.title) + ' · ' + esc(fmtWib(next.startAt, true)) : (ses.length ? 'Semua pertemuan selesai' : 'Jadwal menyusul')) + '</p></div>' +
      '<div class="ring36" title="Progres kelulusan"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" class="ring36-bg"/><circle cx="28" cy="28" r="24" class="ring36-fg" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg><b>' + pct + '%</b></div></div>' +
      '<div class="my36-stats"><span><i data-lucide="user-check" class="w-3.5 h-3.5"></i> Hadir ' + hadir + '/' + ses.length + '</span>' +
        (x.totalMaterials ? '<span><i data-lucide="layers" class="w-3.5 h-3.5"></i> ' + x.totalMaterials + ' materi</span>' : '') + (x.totalTasks ? '<span><i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> ' + x.totalTasks + ' tugas</span>' : '') + '</div>' +
      '<button class="btn-primary w-full mt-3" onclick="event.stopPropagation();go(\'bootcamp\',' + jsArg(b.id) + ')"><i data-lucide="door-open" class="w-4 h-4"></i> Masuk Ruang Belajar</button>' +
    '</div></article>';
}


// ════════════════════════════════════════════════════════════
// 5. RUANG BELAJAR BOOTCAMP (#/bootcamp/<id>)
// ════════════════════════════════════════════════════════════
async function openRoom(id) {
  V36.roomId = id;
  const root = document.getElementById('bootRoot');
  const c = roomCache(id);
  if (c && c.data) { V36.rooms[id] = c.data; renderRoom(); } else if (root) root.innerHTML = '<div class="skeleton h-48 w-full mb-6"></div>' + skeletonRows(6);
  const res = await api('bootcampRoom', { bootId: id });
  if (V36.roomId !== id || AppState.currentParam !== id) return;
  if (!res.success) {
    if (!V36.rooms[id] && root) { root.innerHTML = '<button class="text-sm text-muted inline-flex items-center gap-1 mb-4" onclick="go(\'bootcamp\')"><i data-lucide="arrow-left" class="w-4 h-4"></i> Bootcamp Saya</button>' + emptyState('lock', 'Ruang belajar tidak dapat dibuka', res.message); refreshIcons(); }
    else if (!res.network) showToast('Gagal memuat', res.message, 'error');
    return;
  }
  V36.rooms[id] = res.data;
  Store.set(userKey('room:' + id), { t: Date.now(), data: res.data });
  renderRoom();
}
function room() { return V36.rooms[V36.roomId] || null; }
function saveRoom() { const r = room(); if (r) Store.set(userKey('room:' + V36.roomId), { t: Date.now(), data: r }); }
function allMats(r) { return (r.sessions || []).reduce((a, s) => a.concat(s.materials || []), []).concat(r.general || []); }
function findMat(id) { const r = room(); return r ? allMats(r).filter(m => m.id === id)[0] : null; }

function renderRoom() {
  const root = document.getElementById('bootRoot'), r = room();
  if (!root || !r) return;
  const b = r.boot, ses = r.sessions || [], now = Date.now();
  const tab = V36.tab[b.id] || 'kurikulum';
  const comp = r.completion, pct = comp ? comp.pct : 0, C = 263.9;
  const endOf = s => Date.parse(s.endAt) || Date.parse(s.attendUntil) || 0;
  const live = ses.filter(s => now >= Date.parse(s.startAt) - 30 * 60000 && now <= endOf(s))[0];
  const next = live || ses.filter(s => Date.parse(s.startAt) > now)[0];
  const st = r.locked ? ['Menunggu verifikasi bukti', 'clock'] : b.status === 'Disetujui' ? ['Peserta Terverifikasi', 'badge-check'] : ['Peserta Terdaftar', 'user-check'];
  const hero = '<section class="bhero35 rm36-hero"><div class="min-w-0">' +
      '<div class="flex flex-wrap gap-2"><span class="bhero35-tag"><i data-lucide="' + st[1] + '" class="w-3.5 h-3.5"></i> ' + esc(st[0]) + '</span>' +
        (b.ended ? '<span class="bhero35-tag is-amber"><i data-lucide="infinity" class="w-3.5 h-3.5"></i> Selesai · Akses seumur hidup</span>' : '') +
        (r.certificate ? '<span class="bhero35-tag is-amber"><i data-lucide="award" class="w-3.5 h-3.5"></i> Bersertifikat</span>' : '') + '</div>' +
      '<h2>' + esc(b.title) + '</h2>' + ((b.summary || b.description) ? '<p class="line-clamp-2">' + esc(b.summary || b.description) + '</p>' : '') +
      (b.note && b.status !== 'Disetujui' ? '<p class="mt-2 text-sm font-semibold" style="color:#FDE68A">Catatan Admin: ' + esc(b.note) + '</p>' : '') +
      (next && !r.locked ? '<div class="live35">' + (live ? '<span class="live35-badge">LIVE</span>' : '<span class="bhero35-tag"><i data-lucide="calendar-clock" class="w-3.5 h-3.5"></i> Berikutnya</span>') +
        '<div class="min-w-0 flex-1"><p class="text-[11px] font-bold uppercase tracking-wider" style="color:#BFDBFE">' + esc(fmtWib(next.startAt, true)) + '</p><p class="font-bold truncate">Sesi ' + esc(next.no) + ': ' + esc(next.title) + '</p></div>' +
        (next.zoomUrl ? '<button class="btn-white !py-2" onclick="openLink(' + jsArg(next.zoomUrl) + ')"><i data-lucide="video" class="w-4 h-4"></i> ' + (live ? 'Masuk Zoom' : 'Link Zoom') + '</button>' : '') + '</div>' : '') +
    '</div>' +
    (comp ? '<div class="ring35"><svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="42" fill="none" stroke-width="9"/>' +
      '<circle class="ring-fg" cx="50" cy="50" r="42" fill="none" stroke-width="9" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg>' +
      '<span class="ring35-val">' + pct + '%</span><div><p class="text-sm font-bold">' + (comp.allDone ? 'Siap sertifikat 🎉' : 'Progres kelulusan') + '</p><p class="text-[11px]" style="color:#BFDBFE">' + comp.items.filter(i => i.done).length + ' dari ' + comp.items.length + ' syarat</p></div></div>' : '') +
  '</section>';
  const back = '<button class="text-sm text-muted inline-flex items-center gap-1 mb-4" onclick="go(\'bootcamp\')"><i data-lucide="arrow-left" class="w-4 h-4"></i> Bootcamp Saya</button>';
  if (r.locked) {
    root.innerHTML = back + hero + '<div class="notice mt-2"><i data-lucide="lock" class="w-5 h-5 flex-none"></i><div class="text-sm text-left">Kurikulum, materi, tugas, dan link pertemuan dibuka setelah bukti pendaftaran Anda <b>disetujui Admin</b>. Kami akan memberi kabar lewat WhatsApp/email.</div></div>' +
      '<div class="tl35 mt-6">' + ses.map(s => '<div class="tl35-item is-upcoming"><span class="tl35-dot">' + s.no + '</span><div><p class="font-semibold text-main">' + esc(s.title) + '</p><p class="text-xs text-muted">' + esc(fmtWib(s.startAt, true)) + '</p></div></div>').join('') + '</div>';
    refreshIcons(); return;
  }
  const waitTasks = allMats(r).filter(m => m.type === 'task' && m.submission && m.submission.status === 'Revisi').length;
  const tabs = [['kurikulum', 'Kurikulum & Materi', 'layers', 'Kurikulum'], ['evaluasi', 'Evaluasi & Portofolio', 'clipboard-list', 'Evaluasi'], ['sertifikat', 'Sertifikat', 'award', 'Sertifikat']];
  root.innerHTML = back + hero +
    '<div class="seg rm36-tabs mb-5" role="tablist">' + tabs.map(t => '<button role="tab" class="' + (tab === t[0] ? 'is-active' : '') + '" onclick="rmTab36(' + jsArg(t[0]) + ')"><i data-lucide="' + t[2] + '" class="w-4 h-4"></i> <span class="rm36-tl">' + t[1] + '</span><span class="rm36-ts">' + t[3] + '</span>' +
      (t[0] === 'kurikulum' && waitTasks ? ' <span class="nav-badge">' + waitTasks + '</span>' : '') + (t[0] === 'sertifikat' && comp && comp.allDone && !r.certificate ? ' <span class="nav-badge">!</span>' : '') + '</button>').join('') + '</div>' +
    '<div class="grid lg:grid-cols-3 gap-6"><div class="lg:col-span-2 min-w-0" id="rmMain"></div><aside class="space-y-4" id="rmSide"></aside></div>';
  if (tab === 'kurikulum') renderCurriculum(); else if (tab === 'evaluasi') renderEvalPortfolio(); else renderCertTab();
  renderRoomSide();
  refreshIcons();
}
function rmTab36(t) { V36.tab[V36.roomId] = t; renderRoom(); }
function renderRoomHeadClock() { const r = room(); if (r) renderRoom(); }

function renderRoomSide() {
  const box = document.getElementById('rmSide'), r = room(); if (!box || !r) return;
  const comp = r.completion;
  box.innerHTML =
    (comp ? '<div class="side35"><p class="font-bold text-main flex items-center gap-2 mb-3"><i data-lucide="list-checks" class="w-4 h-4 text-accent"></i> Syarat Sertifikat</p>' +
      '<ul class="req36">' + comp.items.map(i => '<li class="' + (i.done ? 'is-done' : '') + '"><i data-lucide="' + (i.done ? 'check-circle-2' : 'circle-dashed') + '" class="w-4 h-4"></i><div><b>' + esc(i.label) + '</b><small>' + esc(i.detail) + '</small></div></li>').join('') + '</ul>' +
      '<button class="' + (comp.allDone || r.certificate ? 'btn-primary btn-glow' : 'btn-ghost') + ' w-full mt-3" onclick="rmTab36(\'sertifikat\')"><i data-lucide="award" class="w-4 h-4"></i> ' + (r.certificate ? 'Unduh Sertifikat' : comp.allDone ? 'Ambil Sertifikat' : 'Lihat Detail Syarat') + '</button></div>' : '') +
    '<div class="side35"><p class="font-bold text-main flex items-center gap-2 mb-3"><i data-lucide="folder-open" class="w-4 h-4 text-accent"></i> Kelas Bootcamp</p>' +
      ((r.boot.access || []).length ? r.boot.access.map(a => a.owned
        ? '<button type="button" class="quick35" onclick="go(\'product\',' + jsArg(a.id) + ')"><span class="quick35-ico"><i data-lucide="play-circle" class="w-4 h-4"></i></span><span class="min-w-0 flex-1"><b class="truncate">' + esc(a.title) + '</b><small>Akses aktif — buka kelas</small></span><i data-lucide="arrow-right" class="w-4 h-4 text-muted"></i></button>'
        : '<div class="quick35"><span class="quick35-ico"><i data-lucide="lock" class="w-4 h-4"></i></span><span class="min-w-0 flex-1"><b class="truncate">' + esc(a.title) + '</b><small>Dibuka setelah bukti disetujui</small></span></div>').join('')
        : '<p class="text-sm text-muted">Tidak ada kelas tambahan.</p>') + '</div>' +
    '<div class="help35"><p class="font-bold text-main flex items-center gap-2"><i data-lucide="circle-help" class="w-4 h-4 text-accent"></i> Butuh bantuan?</p>' +
      '<p class="text-sm text-muted mt-1">Kendala absen, materi, atau tugas? Tanyakan langsung ke Admin.</p>' +
      '<button class="link35 mt-2" onclick="contactAdmin(' + jsArg('Bootcamp: ' + r.boot.title) + ')">Hubungi Admin <i data-lucide="arrow-right" class="w-4 h-4"></i></button></div>';
}

// ── 5a. Kurikulum per pertemuan ──
function renderCurriculum() {
  const box = document.getElementById('rmMain'), r = room(); if (!box || !r) return;
  const now = Date.now(), ses = r.sessions || [], bid = r.boot.id;
  const curOpen = V36.open[bid] || {};
  const firstOpen = (ses.filter(s => !s.attendedAt && Date.parse(s.startAt) - 86400000 < now)[0] || ses[0] || {}).id;
  const list = ses.map(s => {
    const mats = s.materials || [], doneN = mats.filter(m => m.type === 'task' ? (m.submission && m.submission.status === 'Disetujui') : m.checkedAt).length;
    const from = Date.parse(s.attendFrom), until = Date.parse(s.attendUntil), end = Date.parse(s.endAt) || until, start = Date.parse(s.startAt);
    const isLive = now >= start - 30 * 60000 && now <= end, open = curOpen[s.id] !== undefined ? curOpen[s.id] : s.id === firstOpen;
    let att;
    if (s.attendedAt) att = '<span class="v4-att is-ok"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Hadir · ' + esc(fmtWibTime(s.attendedAt)) + '</span>';
    else if (now >= from && now <= until) att = '<button class="btn-success v4-pulse !py-1.5" onclick="event.stopPropagation();roomAttend(' + jsArg(s.id) + ',this)"><i data-lucide="fingerprint" class="w-4 h-4"></i> Absen Sekarang</button>';
    else if (now < from) att = '<span class="v4-att"><i data-lucide="lock" class="w-3.5 h-3.5"></i> Absen dibuka ' + esc(fmtWib(s.attendFrom, false)) + '</span>';
    else att = '<span class="v4-att is-miss">Tidak hadir</span>';
    return '<section class="ses36' + (open ? ' is-open' : '') + (isLive ? ' is-live' : '') + (s.attendedAt ? ' is-done' : '') + '" data-ses="' + esc(s.id) + '">' +
      '<button type="button" class="ses36-head" onclick="toggleSes(' + jsArg(s.id) + ')" aria-expanded="' + open + '">' +
        '<span class="tl35-dot">' + (s.attendedAt ? '<i data-lucide="check" class="w-4 h-4"></i>' : isLive ? '<i data-lucide="radio" class="w-4 h-4"></i>' : s.no) + '</span>' +
        '<span class="min-w-0 flex-1 text-left"><span class="tl35-meta"><span class="tl35-chip">Pertemuan ' + s.no + '</span>' + (isLive ? ' <span class="live-dot">LIVE</span>' : '') + '</span>' +
          '<b class="ses36-title">' + esc(s.title) + '</b><small class="ses36-date">' + esc(fmtWib(s.startAt, true)) + (s.endAt ? '–' + esc(fmtWibTime(s.endAt)) + ' WIB' : '') + '</small></span>' +
        (mats.length ? '<span class="ses36-prog"><span class="mini-bar"><span style="width:' + Math.round(doneN / mats.length * 100) + '%"></span></span><small>' + doneN + '/' + mats.length + '</small></span>' : '') +
        '<i data-lucide="chevron-down" class="w-5 h-5 ses36-chev"></i></button>' +
      '<div class="ses36-body">' +
        '<div class="ses36-att"><div class="min-w-0 flex-1"><p class="text-xs font-bold text-muted uppercase tracking-wider">Presensi</p><p class="text-xs text-muted">Jendela absen ' + esc(fmtWibTime(s.attendFrom)) + '–' + esc(fmtWibTime(s.attendUntil)) + ' WIB</p></div>' +
          (s.zoomUrl && now <= end + 3600000 ? '<button class="' + (isLive ? 'btn-primary btn-glow' : 'btn-ghost') + ' !w-auto !py-1.5" onclick="openLink(' + jsArg(s.zoomUrl) + ')"><i data-lucide="video" class="w-4 h-4"></i> ' + (isLive ? 'Masuk Zoom' : 'Link Zoom') + '</button>' : '') + att + '</div>' +
        (mats.length ? '<ul class="mat36-list">' + mats.map(matRow).join('') + '</ul>' : '<p class="text-sm text-muted py-3">Materi pertemuan ini akan ditambahkan Admin.</p>') +
      '</div></section>';
  }).join('');
  const gen = (r.general || []).length ? '<section class="ses36 is-open"><div class="ses36-head is-static"><span class="tl35-dot"><i data-lucide="library" class="w-4 h-4"></i></span><span class="min-w-0 flex-1 text-left"><b class="ses36-title">Materi Umum</b><small class="ses36-date">Bahan belajar tambahan</small></span></div>' +
    '<div class="ses36-body"><ul class="mat36-list">' + r.general.map(matRow).join('') + '</ul></div></section>' : '';
  box.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-2 mb-3"><div><h3 class="text-lg font-bold text-main">Kurikulum & Materi Belajar</h3>' +
    '<p class="text-xs text-muted">Lakukan presensi, pelajari materi tiap pertemuan, lalu tandai <b>Selesai</b>. Materi tetap bisa dibuka kapan pun.</p></div></div>' +
    (ses.length || gen ? '<div class="ses36-list">' + list + gen + '</div>' : emptyState('layers', 'Kurikulum belum tersedia', 'Admin sedang menyiapkan materi bootcamp ini.'));
  refreshIcons();
}
function toggleSes(id) {
  const r = room(), bid = r.boot.id; V36.open[bid] = V36.open[bid] || {};
  const el = document.querySelector('.ses36[data-ses="' + id + '"]'); if (!el) return;
  const open = !el.classList.contains('is-open'); el.classList.toggle('is-open', open); V36.open[bid][id] = open;
  const h = el.querySelector('.ses36-head'); if (h) h.setAttribute('aria-expanded', open);
}
function matRow(m) {
  if (m.locked) return '<li class="mat36 is-locked"><span class="mat36-ico"><i data-lucide="lock" class="w-4 h-4"></i></span><div class="min-w-0 flex-1"><p class="mat36-title">' + esc(m.title) + '</p><p class="mat36-sub">Tayang ' + esc(fmtWib(m.publishAt, true)) + '</p></div></li>';
  const isTask = m.type === 'task', sub = m.submission, done = isTask ? (sub && sub.status === 'Disetujui') : !!m.checkedAt;
  const right = isTask
    ? (sub ? '<span class="badge ' + SUB_BADGE[sub.status][0] + '">' + SUB_BADGE[sub.status][1] + '</span>' : '<span class="badge badge-document">Belum dikirim</span>') +
      '<button class="btn-' + (sub && sub.status !== 'Revisi' ? 'ghost' : 'primary') + ' !w-auto !py-1.5" onclick="openTask(' + jsArg(m.id) + ')"><i data-lucide="' + (sub ? (sub.status === 'Revisi' ? 'refresh-cw' : 'eye') : 'send') + '" class="w-4 h-4"></i> ' + (sub ? (sub.status === 'Revisi' ? 'Kirim Ulang' : 'Lihat') : 'Kerjakan') + '</button>'
    : '<button class="btn-ghost !w-auto !py-1.5" onclick="openMaterial(' + jsArg(m.id) + ')"><i data-lucide="' + (m.type === 'video' || m.type === 'replay' ? 'play' : m.type === 'link' ? 'external-link' : 'eye') + '" class="w-4 h-4"></i> Buka</button>' +
      '<label class="chk36" title="Tandai selesai dipelajari" onclick="event.stopPropagation()"><input type="checkbox"' + (m.checkedAt ? ' checked' : '') + ' onchange="toggleCheck(' + jsArg(m.id) + ',this)"><span><i data-lucide="check" class="w-3.5 h-3.5"></i></span><small>Selesai</small></label>';
  return '<li class="mat36' + (done ? ' is-done' : '') + (isTask ? ' is-task' : '') + '" data-mat="' + esc(m.id) + '">' +
    '<span class="mat36-ico t-' + esc(m.type) + '"><i data-lucide="' + (MAT_ICON[m.type] || 'file') + '" class="w-4 h-4"></i></span>' +
    '<div class="min-w-0 flex-1 cursor-pointer" onclick="' + (isTask ? 'openTask' : 'openMaterial') + '(' + jsArg(m.id) + ')"><p class="mat36-title">' + esc(m.title) + '</p>' +
      '<p class="mat36-sub">' + esc(m.label || '') + (m.required ? '' : ' · opsional') + (isTask && m.dueAt ? ' · tenggat ' + esc(fmtWib(m.dueAt, false)) : '') + (m.fileName ? ' · ' + esc(m.fileName) : '') + '</p></div>' +
    '<div class="mat36-act">' + right + '</div></li>';
}

async function toggleCheck(matId, input) {
  const m = findMat(matId), r = room(); if (!m || !r) return;
  const want = !!input.checked, prev = m.checkedAt;
  m.checkedAt = want ? new Date().toISOString() : '';                 // tampil instan
  recalcLocal(r); updateMatRow(matId); renderRoomSide();
  const res = await api('bootcampCheck', { bootId: r.boot.id, matId: matId, checked: want });
  if (!res.success) { m.checkedAt = prev; recalcLocal(r); updateMatRow(matId); renderRoomSide(); showToast('Belum tersimpan', res.message, 'warning'); return; }
  m.checkedAt = res.data.checkedAt; saveRoom();
}
function updateMatRow(matId) {
  const li = document.querySelector('.mat36[data-mat="' + matId + '"]'), m = findMat(matId);
  if (li && m) { const tmp = document.createElement('ul'); tmp.innerHTML = matRow(m); li.replaceWith(tmp.firstChild); refreshIcons(); }
  const r = room(); if (!r) return;
  r.sessions.forEach(s => {
    const el = document.querySelector('.ses36[data-ses="' + s.id + '"] .ses36-prog'); if (!el) return;
    const mats = s.materials || [], d = mats.filter(x => x.type === 'task' ? (x.submission && x.submission.status === 'Disetujui') : x.checkedAt).length;
    el.innerHTML = '<span class="mini-bar"><span style="width:' + Math.round(d / mats.length * 100) + '%"></span></span><small>' + d + '/' + mats.length + '</small>';
  });
}
/** Hitung ulang syarat checklist di browser (instan); angka resmi tetap dihitung server saat sertifikat diminta. */
function recalcLocal(r) {
  if (!r.completion) return;
  const it = r.completion.items.filter(i => i.key === 'checklist')[0];
  if (it) {
    const req = allMats(r).filter(m => m.type !== 'task' && m.required);
    it.value = req.filter(m => m.checkedAt).length; it.total = req.length; it.done = it.value >= it.total;
    it.detail = it.total ? it.value + ' dari ' + it.total + ' materi' : 'Belum ada materi wajib';
  }
  const fr = r.completion.items.map(i => i.total ? Math.min((i.need || i.total) ? i.value / (i.need || i.total) : 1, 1) : 1);
  r.completion.pct = Math.round(fr.reduce((s, x) => s + x, 0) / fr.length * 100);
  r.completion.allDone = r.completion.items.every(i => i.done);
}

async function roomAttend(sessionId, btn) {
  const r = room(); if (!r) return;
  const res = await withBusy(btn, 'Mencatat…', () => api('bootcampAttend', { bootId: r.boot.id, sessionId: sessionId }));
  if (!res.success) return showToast('Belum bisa absen', res.message, 'warning');
  showToast('Absensi tercatat ✅', res.message, 'success');
  const s = r.sessions.filter(x => x.id === sessionId)[0];
  if (s) s.attendedAt = res.data.attendedAt;
  const it = r.completion && r.completion.items.filter(i => i.key === 'attend')[0];
  if (it) { it.value = r.sessions.filter(x => x.attendedAt).length; it.done = it.value >= it.need; it.detail = it.value + ' dari ' + it.total + ' pertemuan · minimal ' + it.need; recalcLocal(r); }
  saveRoom(); renderRoom();
  Member.refresh();
}

// ── 5b. Penampil materi ──
function openMaterial(matId) {
  const m = findMat(matId); if (!m || m.locked) return;
  if (m.type === 'task') return openTask(matId);
  let body = '';
  if (m.embed) body = '<div class="mv36-video"><iframe src="' + esc(m.embed) + '" title="' + esc(m.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
  else if (m.isImage && m.image) body = '<div class="text-center">' + img(m.image, m.title, 'style="max-height:68dvh;margin:0 auto;border-radius:12px"') + '</div>';
  else if (m.preview) body = '<div class="mv36-doc"><iframe src="' + esc(m.preview) + '" title="' + esc(m.title) + '" loading="lazy"></iframe></div>';
  const text = m.body ? '<div class="mv36-text">' + esc(m.body) + '</div>' : '';
  const acts = (m.url ? '<button class="btn-primary !w-auto" onclick="openLink(' + jsArg(m.url) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> Buka Link</button>' : '') +
    (m.download ? '<button class="btn-ghost !w-auto" onclick="openLink(' + jsArg(m.download) + ')"><i data-lucide="download" class="w-4 h-4"></i> Unduh</button>' : '') +
    (m.preview && !m.embed ? '<button class="btn-ghost !w-auto" onclick="openLink(' + jsArg(m.preview.replace('/preview', '/view')) + ')"><i data-lucide="maximize-2" class="w-4 h-4"></i> Tab Baru</button>' : '') +
    (m.type === 'text' ? '<button class="btn-ghost !w-auto" onclick="copyText(' + jsArg(m.body || '') + ')"><i data-lucide="copy" class="w-4 h-4"></i> Salin</button>' : '') +
    '<button class="' + (m.checkedAt ? 'btn-success' : 'btn-ghost') + ' !w-auto" id="mvChk" onclick="mvToggle(' + jsArg(m.id) + ')"><i data-lucide="' + (m.checkedAt ? 'check-circle-2' : 'circle') + '" class="w-4 h-4"></i> ' + (m.checkedAt ? 'Sudah Dipelajari' : 'Tandai Selesai') + '</button>';
  Swal.fire({ width: m.embed || m.preview ? 1000 : 720, showConfirmButton: false, showCloseButton: true,
    html: '<div class="mv36 text-left"><p class="text-xs font-bold text-accent uppercase tracking-wider"><i data-lucide="' + (MAT_ICON[m.type] || 'file') + '" class="w-3.5 h-3.5 inline"></i> ' + esc(m.label || '') + '</p>' +
      '<h3 class="text-xl font-bold text-main mt-1 mb-3">' + esc(m.title) + '</h3>' + body + text +
      (!body && !text && m.url ? '<p class="text-sm text-muted">Materi ini berupa tautan eksternal.</p>' : '') +
      '<div class="mv36-act">' + acts + '</div></div>', didOpen: refreshIcons });
}
async function mvToggle(matId) {
  const m = findMat(matId); if (!m) return;
  const fake = { checked: !m.checkedAt };
  await toggleCheck(matId, fake);
  const b = document.getElementById('mvChk');
  if (b) { b.className = (m.checkedAt ? 'btn-success' : 'btn-ghost') + ' !w-auto'; b.innerHTML = '<i data-lucide="' + (m.checkedAt ? 'check-circle-2' : 'circle') + '" class="w-4 h-4"></i> ' + (m.checkedAt ? 'Sudah Dipelajari' : 'Tandai Selesai'); refreshIcons(); }
}

// ── 5c. Tugas ──
const TK = { keep: [], files: [], busy: false };
function openTask(matId) {
  const m = findMat(matId); if (!m || m.locked) return;
  const sub = m.submission, o = m.options || {}, approved = sub && sub.status === 'Disetujui';
  TK.m = m; TK.keep = sub ? sub.files.map(f => f.fileId) : []; TK.files = []; TK.busy = false;
  const late = m.dueAt && Date.parse(m.dueAt) < Date.now();
  Swal.fire({ width: 760, showConfirmButton: false, showCloseButton: true, allowOutsideClick: () => !TK.busy,
    html: '<div class="tk36 text-left"><p class="text-xs font-bold text-accent uppercase tracking-wider">Tugas</p><h3 class="text-xl font-bold text-main mt-1">' + esc(m.title) + '</h3>' +
      '<div class="flex flex-wrap gap-2 mt-2">' + (sub ? '<span class="badge ' + SUB_BADGE[sub.status][0] + '">' + SUB_BADGE[sub.status][1] + '</span>' : '<span class="badge badge-document">Belum dikirim</span>') +
        (m.dueAt ? '<span class="badge ' + (late && !sub ? 'badge-error' : 'badge-video') + '"><i data-lucide="alarm-clock" class="w-3 h-3"></i> Tenggat ' + esc(fmtWib(m.dueAt, true)) + '</span>' : '') + '</div>' +
      '<div class="tk36-ins">' + esc(m.body || '') + '</div>' +
      (sub && sub.feedback ? '<div class="tk36-fb ' + (sub.status === 'Revisi' ? 'is-rev' : '') + '"><i data-lucide="message-square-text" class="w-4 h-4 flex-none"></i><div><b>Catatan Admin</b><p>' + esc(sub.feedback) + '</p></div></div>' : '') +
      '<div id="tkForm"></div><p id="tkErr" class="v4-err" hidden></p>' +
      (approved ? '' : '<div class="v4-foot"><span class="text-xs text-muted">' + (sub ? 'Dikirim ' + esc(fmtWib(sub.submittedAt, true)) : 'Jawaban bisa dikirim ulang selama belum disetujui.') + '</span>' +
        '<button id="tkSend" class="btn-primary !w-auto" onclick="sendTask()"><i data-lucide="send" class="w-4 h-4"></i> ' + (sub ? 'Kirim Ulang' : 'Kirim Tugas') + '</button></div>') + '</div>',
    didOpen: () => { renderTaskForm(); refreshIcons(); } });
}
function renderTaskForm() {
  const box = document.getElementById('tkForm'), m = TK.m; if (!box || !m) return;
  const sub = m.submission, o = m.options || {}, ro = sub && sub.status === 'Disetujui';
  const kept = sub ? sub.files.filter(f => TK.keep.indexOf(f.fileId) > -1) : [];
  const nFiles = kept.length + TK.files.length;
  box.innerHTML = '<div class="v4-form mt-3">' +
    (o.text ? '<div><label class="form-label" for="tkText">Jawaban</label><textarea id="tkText" class="form-input" rows="5"' + (ro ? ' readonly' : '') + ' placeholder="Tulis jawaban atau penjelasan Anda…">' + esc(TK.text !== undefined ? TK.text : (sub ? sub.answer : '')) + '</textarea></div>' : '') +
    (o.link ? '<div><label class="form-label" for="tkLink">Link hasil (mis. Google Sheets / Apps Script / Drive)</label><input id="tkLink" class="form-input" type="url"' + (ro ? ' readonly' : '') + ' value="' + esc(TK.link !== undefined ? TK.link : (sub ? sub.link : '')) + '" placeholder="https://…"></div>' : '') +
    (o.file ? '<div><label class="form-label">Berkas (maks ' + o.maxFiles + ', ≤ 10 MB/berkas)</label><div class="v4-files">' +
      kept.map(f => '<div class="v4-file">' + (f.isImage ? '<img src="' + esc(f.image) + '" alt="">' : '<i data-lucide="file-text" class="w-6 h-6"></i>') + '<button type="button" class="truncate text-left" onclick="openLink(' + jsArg(f.preview) + ')">' + esc(f.name) + '</button>' + (ro ? '' : '<button type="button" onclick="tkDropKeep(' + jsArg(f.fileId) + ')" aria-label="Hapus">×</button>') + '</div>').join('') +
      TK.files.map((f, i) => '<div class="v4-file">' + (f.url ? '<img src="' + f.url + '" alt="">' : '<i data-lucide="file-text" class="w-6 h-6"></i>') + '<span class="truncate">' + esc(f.file.name) + '</span><button type="button" onclick="TK.files.splice(' + i + ',1);tkCollect();renderTaskForm()" aria-label="Hapus">×</button></div>').join('') +
      (!ro && nFiles < o.maxFiles ? '<button type="button" class="v4-add" onclick="tkAdd()"><i data-lucide="upload" class="w-5 h-5"></i>Pilih berkas<small>' + nFiles + '/' + o.maxFiles + '</small></button>' : '') + '</div></div>' : '') +
    '</div>';
  refreshIcons();
}
function tkCollect() { const t = document.getElementById('tkText'), l = document.getElementById('tkLink'); if (t) TK.text = t.value; if (l) TK.link = l.value.trim(); }
function tkDropKeep(id) { tkCollect(); TK.keep = TK.keep.filter(x => x !== id); renderTaskForm(); }
async function tkAdd() {
  tkCollect();
  const picked = await pickFiles('*/*', true), max = TK.m.options.maxFiles;
  for (const f of picked) {
    const kept = TK.m.submission ? TK.m.submission.files.filter(x => TK.keep.indexOf(x.fileId) > -1).length : 0;
    if (kept + TK.files.length >= max) { showToast('Maksimal ' + max + ' berkas', '', 'warning'); break; }
    if (/\.(exe|msi|bat|cmd|com|scr|pif|cpl|vbs|vbe|wsf|wsh|ps1|hta|jse|lnk|reg)$/i.test(f.name)) { showToast('Jenis berkas tidak diizinkan', f.name, 'warning'); continue; }
    if (f.size > 10 * 1048576 && !/^image\//.test(f.type)) { showToast('Berkas terlalu besar', f.name + ' (maks 10 MB)', 'warning'); continue; }
    TK.files.push({ file: f, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' });
  }
  renderTaskForm();
}
async function sendTask() {
  tkCollect();
  const m = TK.m, r = room(), err = document.getElementById('tkErr'), btn = document.getElementById('tkSend');
  const fail = msg => { err.textContent = msg; err.hidden = false; };
  const text = (TK.text || '').trim(), link = (TK.link || '').trim();
  if (link && !/^https?:\/\//i.test(link)) return fail('Link harus diawali https://');
  if (!text && !link && !TK.keep.length && !TK.files.length) return fail('Isi jawaban tugas terlebih dahulu.');
  TK.busy = true; btn.disabled = true; btn.innerHTML = '<span class="spinner-inline"></span> Mengirim…';
  try {
    const files = [];
    for (const it of TK.files) { const f = /^image\//.test(it.file.type) ? await compressImage(it.file, 1800, 0.85) : it.file; files.push({ name: f.name, mimeType: f.type || 'application/octet-stream', base64: await fileToBase64(f) }); }
    const res = await api('bootcampSubmitTask', { bootId: r.boot.id, matId: m.id, answer: text, link: link, keepFileIds: TK.keep, files: files }, { timeout: 180000 });
    TK.busy = false;
    if (!res.success) { btn.disabled = false; btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Kirim'; refreshIcons(); return fail(res.message); }
    m.submission = res.data.submission; TK.text = TK.link = undefined; saveRoom();
    Swal.close(); showToast('Tugas terkirim ✅', res.message, 'success');
    if (V36.tab[r.boot.id] !== 'evaluasi' && V36.tab[r.boot.id] !== 'sertifikat') renderCurriculum(); else renderRoom();
  } catch (e) { TK.busy = false; btn.disabled = false; fail(e.message); }
}

// ── 5d. Kuesioner & portofolio ──
const PF36 = { keep: [], shots: [], photo: null, removePhoto: false, rating: 0 };
function renderEvalPortfolio() {
  const box = document.getElementById('rmMain'), r = room(); if (!box || !r) return;
  const f = r.evalForm || { questions: [] }, ev = r.evaluation, ans = (ev && ev.answers) || {}, pf = r.portfolio, rule = r.rules || {};
  const q = f.questions.map((x, i) => {
    let input = '';
    if (x.type === 'scale') input = '<div class="scale36" role="radiogroup">' + [1, 2, 3, 4, 5].map(n => '<label><input type="radio" name="q_' + esc(x.id) + '" value="' + n + '"' + (Number(ans[x.id]) === n ? ' checked' : '') + '><span>' + n + '</span></label>').join('') +
      '</div><div class="scale36-ends"><small>' + esc(x.scaleLow || 'Kurang') + '</small><small>' + esc(x.scaleHigh || 'Sangat baik') + '</small></div>';
    else if (x.type === 'choice') input = '<div class="choice36">' + x.options.map(o => '<label><input type="radio" name="q_' + esc(x.id) + '" value="' + esc(o) + '"' + (ans[x.id] === o ? ' checked' : '') + '><span>' + esc(o) + '</span></label>').join('') + '</div>';
    else if (x.type === 'long') input = '<textarea class="form-input" rows="3" name="q_' + esc(x.id) + '">' + esc(ans[x.id] || '') + '</textarea>';
    else input = '<input class="form-input" name="q_' + esc(x.id) + '" value="' + esc(ans[x.id] || '') + '">';
    return '<div class="q36"><p class="q36-l"><b>' + (i + 1) + '.</b> ' + esc(x.label) + (x.required ? ' <span class="req">*</span>' : '') + '</p>' + (x.help ? '<p class="text-xs text-muted">' + esc(x.help) + '</p>' : '') + input + '</div>';
  }).join('');
  if (!PF36.init || PF36.boot !== r.boot.id) { PF36.boot = r.boot.id; PF36.init = true; PF36.keep = pf ? pf.shots.map(s => s.fileId) : []; PF36.shots = []; PF36.photo = null; PF36.removePhoto = false; PF36.rating = pf ? pf.rating : 0; }
  const kept = pf ? pf.shots.filter(s => PF36.keep.indexOf(s.fileId) > -1) : [], n = kept.length + PF36.shots.length;
  const photoSrc = PF36.photo ? PF36.photo.url : (!PF36.removePhoto && pf && pf.photo ? pf.photo : '');
  const visTag = pf ? (pf.visibility === 'Publik' ? '<span class="badge badge-success"><i data-lucide="globe" class="w-3 h-3"></i> Tampil sebagai testimoni</span>' : '<span class="badge badge-document"><i data-lucide="archive" class="w-3 h-3"></i> Arsip kelulusan' + (r.testimonyMode === 'auto' ? '' : ' · menunggu kurasi') + '</span>') : '';
  box.innerHTML =
    '<div class="card36"><div class="card36-h"><span class="card36-ico"><i data-lucide="clipboard-list" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Kuesioner Evaluasi</h3><p>' + esc(f.intro || 'Bantu kami meningkatkan kualitas bootcamp berikutnya.') + '</p></div>' +
      (ev ? '<span class="badge badge-success">Sudah diisi</span>' : '') + '</div>' +
      (f.questions.length ? '<form id="evForm" onsubmit="event.preventDefault();sendEval(this)">' + q + '<p id="evErr" class="v4-err" hidden></p><div class="flex justify-end mt-3"><button class="btn-primary !w-auto"><i data-lucide="send" class="w-4 h-4"></i> ' + (ev ? 'Perbarui Jawaban' : 'Kirim Kuesioner') + '</button></div></form>'
        : '<p class="text-sm text-muted">Kuesioner belum disiapkan Admin.</p>') + '</div>' +
    '<div class="card36 mt-6"><div class="card36-h"><span class="card36-ico is-amber"><i data-lucide="trophy" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Portofolio Akhir & Kesan-Pesan</h3>' +
      '<p>Unggah ' + rule.portfolioMin + '–' + rule.portfolioMax + ' tangkapan layar karya/proyek akhir Anda dan tuliskan kesan-pesan. Karya terbaik dapat tampil sebagai testimoni di halaman depan.</p></div>' + visTag + '</div>' +
      '<div class="v4-form">' +
        '<div class="pf36-photo"><div class="pf36-av">' + (photoSrc ? '<img src="' + esc(photoSrc) + '" alt="Foto profil">' : '<i data-lucide="user-round" class="w-8 h-8"></i>') + '</div>' +
          '<div><p class="form-label !mb-1">Foto profil (opsional)</p><div class="flex flex-wrap gap-2"><button type="button" class="btn-ghost !w-auto !py-1.5" onclick="pfPhoto()"><i data-lucide="image-plus" class="w-4 h-4"></i> Pilih Foto</button>' +
          (photoSrc ? '<button type="button" class="btn-ghost !w-auto !py-1.5" onclick="pfCollect();PF36.photo=null;PF36.removePhoto=true;renderEvalPortfolio()"><i data-lucide="x" class="w-4 h-4"></i> Hapus</button>' : '') + '</div></div></div>' +
        '<div><label class="form-label" for="pfTitle">Judul karya *</label><input id="pfTitle" class="form-input" value="' + esc(PF36.title !== undefined ? PF36.title : (pf ? pf.title : '')) + '" placeholder="mis. Aplikasi Absensi Sekolah"></div>' +
        '<div><label class="form-label">Tangkapan layar karya * <small class="text-muted">(' + n + '/' + rule.portfolioMax + ', minimal ' + rule.portfolioMin + ')</small></label><div class="pf36-shots">' +
          kept.map(s => '<div class="pf36-shot"><img src="' + esc(s.image) + '" alt="" onclick="previewImage(this.src,\'Karya\')"><button type="button" onclick="pfCollect();PF36.keep=PF36.keep.filter(x=>x!==' + jsArg(s.fileId).replace(/"/g, '&quot;') + ');renderEvalPortfolio()" aria-label="Hapus">×</button></div>').join('') +
          PF36.shots.map((s, i) => '<div class="pf36-shot is-new"><img src="' + s.url + '" alt=""><button type="button" onclick="pfCollect();PF36.shots.splice(' + i + ',1);renderEvalPortfolio()" aria-label="Hapus">×</button></div>').join('') +
          (n < rule.portfolioMax ? '<button type="button" class="pf36-add" onclick="pfAdd()"><i data-lucide="image-plus" class="w-6 h-6"></i><span>Tambah</span></button>' : '') + '</div></div>' +
        '<div><label class="form-label" for="pfTesti">Kesan-pesan * <small class="text-muted" id="pfCount"></small></label><textarea id="pfTesti" class="form-input" rows="5" oninput="pfCountUpd()" placeholder="Ceritakan pengalaman belajar Anda, hasil yang Anda capai, dan saran untuk peserta berikutnya (minimal 50 karakter).">' + esc(PF36.testi !== undefined ? PF36.testi : (pf ? pf.testimony : '')) + '</textarea></div>' +
        '<div class="grid2"><div><p class="form-label">Rating bootcamp</p><div class="rate36">' + [1, 2, 3, 4, 5].map(i => '<button type="button" class="' + (i <= PF36.rating ? 'is-on' : '') + '" onclick="pfCollect();PF36.rating=' + i + ';renderEvalPortfolio()" aria-label="' + i + ' bintang"><i data-lucide="star" class="w-6 h-6"></i></button>').join('') + '</div></div>' +
          '<div><label class="form-label" for="pfDemo">Link demo (opsional)</label><input id="pfDemo" class="form-input" type="url" value="' + esc(PF36.demo !== undefined ? PF36.demo : (pf ? pf.demoUrl : '')) + '" placeholder="https://…"></div></div>' +
        '<p id="pfErr" class="v4-err" hidden></p>' +
        '<div class="flex flex-wrap items-center justify-between gap-2"><span class="text-xs text-muted">' + (pf ? 'Terakhir diperbarui ' + esc(fmtWib(pf.updatedAt || pf.submittedAt, true)) : '') + '</span>' +
          '<button id="pfSend" type="button" class="btn-primary !w-auto" onclick="sendPortfolio()"><i data-lucide="upload-cloud" class="w-4 h-4"></i> ' + (pf ? 'Perbarui Portofolio' : 'Kirim Portofolio') + '</button></div>' +
      '</div></div>';
  pfCountUpd(); refreshIcons();
}
function pfCollect() { const v = id => { const e = document.getElementById(id); return e ? e.value : undefined; }; PF36.title = v('pfTitle'); PF36.testi = v('pfTesti'); PF36.demo = v('pfDemo'); }
function pfCountUpd() { const t = document.getElementById('pfTesti'), c = document.getElementById('pfCount'); if (t && c) { const n = t.value.trim().length; c.textContent = '(' + n + ' karakter' + (n < 50 ? ', kurang ' + (50 - n) : ' ✓') + ')'; } }
async function pfAdd() {
  pfCollect();
  const r = room(), max = r.rules.portfolioMax, picked = await pickFiles('image/png,image/jpeg,image/webp', true);
  for (const f of picked) {
    if (PF36.keep.length + PF36.shots.length >= max) { showToast('Maksimal ' + max + ' tangkapan layar', '', 'warning'); break; }
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) { showToast('Harus gambar PNG/JPG/WEBP', f.name, 'warning'); continue; }
    PF36.shots.push({ file: f, url: URL.createObjectURL(f) });
  }
  renderEvalPortfolio();
}
async function pfPhoto() { pfCollect(); const f = (await pickFiles('image/png,image/jpeg,image/webp', false))[0]; if (!f) return; PF36.photo = { file: f, url: URL.createObjectURL(f) }; PF36.removePhoto = false; renderEvalPortfolio(); }
async function sendPortfolio() {
  pfCollect();
  const r = room(), err = document.getElementById('pfErr'), btn = document.getElementById('pfSend'), rule = r.rules;
  const fail = m => { err.textContent = m; err.hidden = false; };
  const total = PF36.keep.length + PF36.shots.length;
  if ((PF36.title || '').trim().length < 3) return fail('Judul karya minimal 3 karakter.');
  if (total < rule.portfolioMin || total > rule.portfolioMax) return fail('Unggah ' + rule.portfolioMin + '–' + rule.portfolioMax + ' tangkapan layar karya (sekarang ' + total + ').');
  if ((PF36.testi || '').trim().length < 50) return fail('Kesan-pesan minimal 50 karakter.');
  if (PF36.demo && !/^https?:\/\//i.test(PF36.demo.trim())) return fail('Link demo harus diawali https://');
  btn.disabled = true; btn.innerHTML = '<span class="spinner-inline"></span> Menyiapkan gambar…';
  try {
    const shots = [];
    for (const s of PF36.shots) { const f = await compressImage(s.file, 1600, 0.85); shots.push({ name: f.name, mimeType: f.type, base64: await fileToBase64(f) }); }
    let photo = null;
    if (PF36.photo) { const f = await compressImage(PF36.photo.file, 600, 0.85); photo = { name: f.name, mimeType: f.type, base64: await fileToBase64(f) }; }
    btn.innerHTML = '<span class="spinner-inline"></span> Mengirim…';
    const res = await api('bootcampSubmitPortfolio', { bootId: r.boot.id, title: PF36.title.trim(), testimony: PF36.testi.trim(), rating: PF36.rating, demoUrl: (PF36.demo || '').trim(),
      keepShots: PF36.keep, newShots: shots, photo: photo, removePhoto: PF36.removePhoto }, { timeout: 180000 });
    if (!res.success) { btn.disabled = false; btn.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> Kirim Portofolio'; refreshIcons(); return fail(res.message); }
    r.portfolio = res.data.portfolio; PF36.init = false;
    const it = r.completion && r.completion.items.filter(i => i.key === 'portfolio')[0];
    if (it) { it.done = r.portfolio.shots.length >= rule.portfolioMin; it.value = it.done ? 1 : 0; it.detail = r.portfolio.shots.length + ' tangkapan layar terunggah (minimal ' + rule.portfolioMin + ')'; recalcLocal(r); }
    saveRoom(); showToast('Portofolio tersimpan ✅', res.message, 'success'); renderRoom();
  } catch (e) { btn.disabled = false; fail(e.message); }
}
async function sendEval(form) {
  const r = room(), f = r.evalForm, err = document.getElementById('evErr'), answers = {};
  for (const q of f.questions) {
    const el = form.querySelector('[name="q_' + q.id + '"]:checked') || (q.type === 'short' || q.type === 'long' ? form.querySelector('[name="q_' + q.id + '"]') : null);
    const v = el ? (q.type === 'scale' ? Number(el.value) : el.value.trim()) : '';
    if (q.required && !v) { err.textContent = 'Pertanyaan "' + q.label + '" wajib diisi.'; err.hidden = false; return; }
    if (v) answers[q.id] = v;
  }
  const btn = form.querySelector('button');
  const res = await withBusy(btn, 'Mengirim…', () => api('bootcampSubmitEval', { bootId: r.boot.id, answers: answers }));
  if (!res.success) { err.textContent = res.message; err.hidden = false; return; }
  r.evaluation = res.data.evaluation;
  const it = r.completion && r.completion.items.filter(i => i.key === 'eval')[0];
  if (it) { it.done = true; it.value = 1; it.detail = 'Sudah diisi'; recalcLocal(r); }
  saveRoom(); showToast('Terima kasih! 🙏', res.message, 'success'); renderRoom();
}

// ── 5e. Sertifikat ──
function renderCertTab() {
  const box = document.getElementById('rmMain'), r = room(); if (!box || !r) return;
  const comp = r.completion, cert = r.certificate, ready = cert || (comp && comp.allDone);
  const verify = cert ? location.origin + location.pathname + '#/verifikasi/' + cert.code : '';
  box.innerHTML = '<div class="card36 cert36-card"><div class="card36-h"><span class="card36-ico is-amber"><i data-lucide="award" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Sertifikat Kelulusan</h3>' +
      '<p>Tombol unduh aktif setelah semua syarat di bawah terpenuhi. Sertifikat memuat QR untuk cek keaslian.</p></div></div>' +
    (r.certRevoked ? '<div class="notice is-warn"><i data-lucide="shield-alert" class="w-5 h-5 flex-none"></i><div class="text-sm text-left">Sertifikat Anda dicabut Admin.' + (r.certRevoked.note ? ' Catatan: ' + esc(r.certRevoked.note) : '') + '</div></div>' : '') +
    '<ul class="req36 is-big">' + (comp ? comp.items : []).map(i => '<li class="' + (i.done ? 'is-done' : '') + '"><i data-lucide="' + (i.done ? 'check-circle-2' : 'circle-dashed') + '" class="w-5 h-5"></i><div class="min-w-0 flex-1"><b>' + esc(i.label) + '</b><small>' + esc(i.detail) + '</small>' +
      (i.total > 1 && !i.na ? '<span class="mini-bar mt-1"><span style="width:' + Math.round(Math.min(i.value / (i.need || i.total), 1) * 100) + '%"></span></span>' : '') + '</div>' +
      (!i.done && (i.key === 'eval' || i.key === 'portfolio') ? '<button class="btn-ghost !w-auto !py-1.5" onclick="rmTab36(\'evaluasi\')">Lengkapi</button>' : !i.done && (i.key === 'checklist' || i.key === 'tasks' || i.key === 'attend') ? '<button class="btn-ghost !w-auto !py-1.5" onclick="rmTab36(\'kurikulum\')">Lihat</button>' : '') + '</li>').join('') + '</ul>' +
    (cert ? '<div class="cert36-done"><i data-lucide="badge-check" class="w-6 h-6"></i><div class="min-w-0 flex-1"><b>Sertifikat terbit ' + esc(fmtWib(cert.issuedAt, false)) + '</b><p class="mono text-sm">' + esc(cert.code) + '</p>' +
      '<button class="text-accent text-xs font-semibold" onclick="copyText(' + jsArg(verify) + ')">Salin link verifikasi</button></div></div>' : '') +
    '<div id="certPrev" class="cert36-prev" hidden></div>' +
    '<div class="flex flex-wrap gap-2 justify-end mt-4">' +
      (ready && !r.certRevoked ? '<button class="btn-ghost !w-auto" onclick="downloadCert(\'png\',this)"><i data-lucide="image" class="w-4 h-4"></i> Unduh PNG</button><button class="btn-primary btn-glow !w-auto" onclick="downloadCert(\'pdf\',this)"><i data-lucide="file-down" class="w-4 h-4"></i> Unduh Sertifikat (PDF)</button>'
        : '<button class="btn-ghost !w-auto" disabled title="Selesaikan semua syarat terlebih dahulu"><i data-lucide="lock" class="w-4 h-4"></i> Unduh Sertifikat</button>') + '</div></div>';
  refreshIcons();
}
async function downloadCert(fmt, btn) {
  const r = room(); if (!r) return;
  const res = await withBusy(btn, 'Menyiapkan…', async () => {
    const x = await api('bootcampCertificate', { bootId: r.boot.id }, { timeout: 120000 });
    if (x.success) await loadScript('js/v36-cert.js?v=' + FRONT_VERSION);
    return x;
  });
  if (!res.success) {
    if (res.data && res.data.completion) { r.completion = res.data.completion; saveRoom(); renderRoom(); }
    return Swal.fire({ icon: 'info', title: 'Belum bisa diunduh', text: res.message });
  }
  if (!r.certificate) { r.certificate = res.data.certificate; saveRoom(); renderCertTab(); }
  const d = res.data, verify = location.origin + location.pathname + '#/verifikasi/' + d.certificate.code;
  const name = 'Sertifikat_' + String(d.values.nama || 'Peserta').replace(/[^\w]+/g, '_') + '_' + d.certificate.code;
  try {
    const canvas = await CertRender.draw(d.design, d.assets, d.values, verify, { scale: 1 });
    const prev = document.getElementById('certPrev');
    if (prev) { prev.hidden = false; prev.innerHTML = ''; const im = new Image(); im.src = canvas.toDataURL('image/jpeg', 0.7); im.alt = 'Pratinjau sertifikat'; prev.appendChild(im); }
    await CertRender.save(canvas, fmt, name);
    showToast('Sertifikat diunduh 🎉', d.certificate.code, 'success');
  } catch (e) { showToast('Gagal membuat sertifikat', e.message, 'error'); }
}


// ════════════════════════════════════════════════════════════
// 6. C — JALUR BELAJAR (#/jalur) — rekomendasi urutan, tidak mengunci materi
// ════════════════════════════════════════════════════════════
registerPage('jalur', {
  title: 'Jalur Belajar',
  template: () => '<div class="page-wrap" id="jalurRoot">' + skeletonRows(5) + '</div>',
  show: () => {
    const c = Store.get(userKey('paths'), null);
    if (c && c.data) { V36.paths = c.data; renderPaths(); }
    swr(userKey('paths'), 'learningPaths', {}, d => { V36.paths = d; renderPaths(); }, { onError: res => { const r = document.getElementById('jalurRoot'); if (r && !V36.paths) { r.innerHTML = errorState(res.message, 'route()'); refreshIcons(); } } });
  }
});
function renderPaths() {
  const root = document.getElementById('jalurRoot'); if (!root || !V36.paths) return;
  const paths = V36.paths.paths || [];
  if (!paths.length) { root.innerHTML = '<h1 class="page-title">Jalur Belajar</h1>' + emptyState('route', 'Jalur belajar belum tersedia', 'Admin sedang menyusun rekomendasi urutan kelas. Sementara itu, buka Kelas Saya.'); refreshIcons(); return; }
  if (V36.pathSel >= paths.length) V36.pathSel = 0;
  const p = paths[V36.pathSel];
  let step = 0;
  const stages = p.stages.map((s, si) => '<section class="lp36-stage ' + LEVEL_TONE[si % LEVEL_TONE.length] + '">' +
    '<div class="lp36-sh"><span class="lp36-lv">' + esc(s.level) + '</span><small>' + s.owned + '/' + s.items.length + ' dimiliki</small></div>' + (s.desc ? '<p class="lp36-desc">' + esc(s.desc) + '</p>' : '') +
    '<div class="lp36-items">' + s.items.map(it => { step++; return pathItem(it, step); }).join('') + '</div></section>').join('<div class="lp36-arrow" aria-hidden="true"><i data-lucide="chevron-right" class="w-6 h-6"></i></div>');
  root.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-3 mb-5"><div class="min-w-0"><p class="sec35-eyebrow">Rekomendasi Urutan Belajar</p><h1 class="page-title mt-1">Jalur Belajar</h1>' +
    '<p class="page-sub">Ikuti urutan dari tahap awal sampai mahir agar belajar lebih terarah. Ini panduan — Anda tetap bebas membuka kelas yang sudah dimiliki kapan saja.</p></div></div>' +
    (paths.length > 1 ? '<div class="seg mb-5">' + paths.map((x, i) => '<button class="' + (i === V36.pathSel ? 'is-active' : '') + '" onclick="V36.pathSel=' + i + ';renderPaths()">' + esc(x.title) + '</button>').join('') + '</div>' : '') +
    '<div class="lp36-head spot"><div class="min-w-0 flex-1"><h2>' + esc(p.title) + '</h2>' + (p.description ? '<p>' + esc(p.description) + '</p>' : '') + '</div>' +
      '<div class="lp36-prog"><b>' + p.owned + '/' + p.total + '</b><small>kelas dimiliki</small><span class="mini-bar"><span style="width:' + p.pct + '%"></span></span></div></div>' +
    '<div class="lp36-board">' + stages + '</div>';
  refreshIcons();
}
function pathItem(it, n) {
  const owned = it.owned;
  return '<article class="lp36-item' + (owned ? ' is-owned' : ' is-locked') + '"' + (owned ? ' onclick="go(\'product\',' + jsArg(it.productId) + ')" tabindex="0" role="button"' : '') + '>' +
    '<span class="lp36-step">' + n + '</span>' +
    '<div class="lp36-thumb">' + img(it.thumbnail, it.title, '', catLabel(it.category)) + (owned ? '' : '<span class="lp36-lock"><i data-lucide="lock" class="w-4 h-4"></i></span>') + '</div>' +
    '<div class="min-w-0 flex-1"><span class="badge ' + badgeClassFor(it.category) + '">' + esc(catLabel(it.category)) + '</span>' +
      '<p class="lp36-title">' + esc(it.title) + '</p>' + (it.note ? '<p class="lp36-note"><i data-lucide="lightbulb" class="w-3.5 h-3.5"></i> ' + esc(it.note) + '</p>' : '') +
      (owned ? '<span class="lp36-cta is-own"><i data-lucide="play-circle" class="w-4 h-4"></i> Buka Kelas</span>'
        : '<div class="lp36-row"><span class="lp36-cta"><i data-lucide="lock" class="w-3.5 h-3.5"></i> Belum dimiliki</span><button type="button" class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="event.stopPropagation();openBuyDialog(' + jsArg(it.productId) + ')">Lihat Produk <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button></div>') +
    '</div></article>';
}
