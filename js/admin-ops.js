/**
 * ============================================================
 * admin-ops.js — Blast WA/Email, Log Realtime, Notifikasi & Fonnte,
 * Import & Migrasi, Pengaturan
 * ============================================================
 */

// ════════════════════════════════════════════════════════════
// BLAST WA / EMAIL (batch 20/50 otomatis)
// ════════════════════════════════════════════════════════════
const AUDIENCE_OPTS = [
  ['members_all', 'Semua member aktif'], ['members_product', 'Pemilik produk tertentu'], ['members_incomplete', 'Member yang datanya belum lengkap'],
  ['leads', 'Non-member (lead Open Access)'], ['custom', 'Daftar manual (email / no. WA)'], ['bootcamp', 'Peserta Bootcamp (semua bootcamp)']
];

adminRoute('blast', {
  title: 'Blast',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Blast WhatsApp & Email', 'Kirim info terbaru ke member/non-member secara bertahap: 20 atau 50 orang per putaran, otomatis.') +
    '<div id="blastWarn"></div>' +
    '<div class="grid xl:grid-cols-[1fr_1.1fr] gap-6">' +
      '<form class="app-card rounded-2xl p-6 space-y-4 h-fit" onsubmit="createBlast(event)">' +
        '<h3 class="font-semibold text-main">Kampanye Baru</h3>' +
        '<div><label class="form-label">Judul kampanye *</label><input id="bTitle" class="form-input" required placeholder="Info Bootcamp Oktober"></div>' +
        '<div class="grid2"><div><label class="form-label">Kanal</label><select id="bChannel" class="form-input" onchange="syncBlastForm()"><option value="wa">WhatsApp (Fonnte)</option><option value="email">Email</option><option value="both">WhatsApp + Email</option></select></div>' +
        '<div><label class="form-label">Sasaran</label><select id="bAud" class="form-input" onchange="syncBlastForm()">' + AUDIENCE_OPTS.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div></div>' +
        '<div id="bAudProd" class="product-picker" style="display:none"></div>' +
        '<div id="bAudLeads" style="display:none"><label class="form-label">Status lead</label><div class="flex flex-wrap gap-3">' + ['Baru', 'Dihubungi', 'Tertarik', 'Tidak Tertarik'].map(s => '<label class="switch"><input type="checkbox" class="bLeadSt" value="' + s + '" ' + (s !== 'Tidak Tertarik' ? 'checked' : '') + '><span></span> ' + s + '</label>').join('') + '</div></div>' +
        '<div id="bAudCustom" style="display:none"><label class="form-label">Daftar penerima (satu per baris)</label><textarea id="bCustom" class="form-input" rows="4" placeholder="087818485245\nnama@email.com"></textarea></div>' +
        '<div id="bSubjBox" style="display:none"><label class="form-label">Subjek email *</label><input id="bSubject" class="form-input" placeholder="Kabar terbaru dari kami"></div>' +
        '<div><label class="form-label">Pesan *</label><textarea id="bMsg" class="form-input" rows="7" required placeholder="Halo {nama}, ..."></textarea>' +
          '<p class="text-xs text-muted mt-1">Variabel: <code>{nama}</code> <code>{email}</code> <code>{wa}</code> <code>{app}</code>. Format WA: *tebal*, _miring_.</p></div>' +
        '<div class="grid2"><div><label class="form-label">Per putaran</label><div class="seg w-full"><button type="button" data-b="20" class="is-active" onclick="setBatch(20)">20 orang</button><button type="button" data-b="50" onclick="setBatch(50)">50 orang</button></div></div>' +
        '<div><label class="form-label">Jeda antar putaran</label><select id="bInterval" class="form-input"><option value="5">5 menit</option><option value="10" selected>10 menit</option><option value="15">15 menit</option><option value="30">30 menit</option><option value="60">1 jam</option></select></div></div>' +
        '<div id="bPreview" class="notice"><i data-lucide="users" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1">Klik "Hitung Penerima" untuk melihat jumlah sasaran.</p><button type="button" class="btn-ghost !w-auto !py-1.5" onclick="previewBlast(this)">Hitung Penerima</button></div>' +
        '<button type="submit" class="btn-primary w-full"><i data-lucide="send" class="w-4 h-4"></i> Mulai Blast</button>' +
      '</form>' +
      '<div class="space-y-4"><div class="flex items-center justify-between"><h3 class="font-semibold text-main">Kampanye</h3><span class="live-dot">AUTO</span></div><div id="blastList" class="space-y-4">' + skeletonRows(3) + '</div></div>' +
    '</div></div>',
  show: () => {
    Admin.load('blastAdmin');
    if (!AppState.a.productsAdmin) Admin.load('productsAdmin');
    syncBlastForm();
    // v3.3 adaptif: 20 dtk bila ada kampanye berjalan, 90 dtk bila tidak; lebih jarang saat tidak ada interaksi
    Activity.reset('blast');
    clearInterval(AppState.timers.blast);
    AppState.timers.blast = setInterval(() => {
      const d = AppState.a.blastAdmin, live = !!(d && d.campaigns && d.campaigns.some(c => c.status === 'Running' || c.status === 'Waiting'));
      if (Activity.due('blast', live ? 20000 : 90000, live ? 60000 : 300000)) Admin.fetch('blastAdmin');
    }, 10000);
  },
  leave: () => clearInterval(AppState.timers.blast)
});

let BATCH = 20;
function setBatch(n) { BATCH = n; document.querySelectorAll('[data-b]').forEach(b => b.classList.toggle('is-active', +b.dataset.b === n)); }
function syncBlastForm() {
  const aud = document.getElementById('bAud'); if (!aud) return;
  const ch = document.getElementById('bChannel').value;
  document.getElementById('bSubjBox').style.display = ch === 'wa' ? 'none' : '';
  document.getElementById('bAudProd').style.display = aud.value === 'members_product' ? '' : 'none';
  document.getElementById('bAudLeads').style.display = aud.value === 'leads' ? '' : 'none';
  document.getElementById('bAudCustom').style.display = aud.value === 'custom' ? '' : 'none';
  const pp = document.getElementById('bAudProd');
  if (!pp.dataset.ready && (AppState.a.productsAdmin || []).length) {
    pp.innerHTML = AppState.a.productsAdmin.map(p => '<label class="picker-row"><input type="checkbox" class="bProd" value="' + esc(p.Product_ID) + '"><span class="text-sm">' + esc(p.Title) + '</span></label>').join('');
    pp.dataset.ready = '1';
  }
}
function audienceDetail() {
  const aud = document.getElementById('bAud').value;
  if (aud === 'members_product') return Array.from(document.querySelectorAll('.bProd:checked')).map(c => c.value).join(',');
  if (aud === 'leads') return Array.from(document.querySelectorAll('.bLeadSt:checked')).map(c => c.value).join(',');
  if (aud === 'custom') return document.getElementById('bCustom').value;
  return '';
}
async function previewBlast(btn) {
  const res = await withBusy(btn, 'Menghitung…', () => api('blastPreview', { audience: document.getElementById('bAud').value, audienceDetail: audienceDetail() }));
  if (!res.success) return showToast('Gagal', res.message, 'error');
  const d = res.data, ch = document.getElementById('bChannel').value;
  const n = ch === 'wa' ? d.withWa : ch === 'email' ? d.withEmail : d.total;
  const rounds = Math.ceil(n / BATCH), mins = (rounds - 1) * Number(document.getElementById('bInterval').value);
  document.querySelector('#bPreview p').innerHTML = '<b>' + n + '</b> penerima (dari ' + d.total + ' sasaran; ' + d.withWa + ' punya WA, ' + d.withEmail + ' punya email) · ' +
    rounds + ' putaran · perkiraan selesai ±' + (mins < 60 ? mins + ' menit' : (mins / 60).toFixed(1) + ' jam') + '.';
}
async function createBlast(e) {
  e.preventDefault();
  const v = { title: document.getElementById('bTitle').value.trim(), channel: document.getElementById('bChannel').value, audience: document.getElementById('bAud').value,
    audienceDetail: audienceDetail(), subject: document.getElementById('bSubject').value.trim(), message: document.getElementById('bMsg').value.trim(),
    batchSize: BATCH, intervalMin: Number(document.getElementById('bInterval').value) };
  if (v.audience === 'members_product' && !v.audienceDetail) return showToast('Pilih produk', 'Centang minimal satu produk.', 'warning');
  const r = await Swal.fire({ title: 'Mulai blast?', html: '<p class="text-sm">Pesan akan dikirim <b>' + BATCH + ' orang per putaran</b>, jeda ' + v.intervalMin + ' menit, otomatis di latar.</p>' +
    '<div class="text-left mt-3 p-3 rounded-lg bg-surface-2 text-sm whitespace-pre-line">' + esc(v.message.replace(/\{nama\}/gi, 'Rina')) + '</div>', showCancelButton: true, confirmButtonText: 'Mulai', cancelButtonText: 'Batal' });
  if (!r.isConfirmed) return;
  const res = await withBusy(e.submitter, 'Menyusun antrean…', () => api('createBlast', v));
  if (toastRes(res)) { e.target.reset(); setBatch(20); syncBlastForm(); Admin.fetch('blastAdmin'); }
}

ADMIN_RENDER.blastAdmin = function (d) {
  const box = document.getElementById('blastList');
  if (!box || !d) return;
  const warn = [];
  if (!d.fonnteConfigured) warn.push('Token Fonnte belum diisi — blast WhatsApp belum bisa dipakai.');
  if (!d.triggerOk) warn.push('Trigger otomatis belum terpasang — blast hanya jalan saat tombol "Kirim Sekarang" ditekan.');
  document.getElementById('blastWarn').innerHTML = warn.length ? '<div class="notice notice-warning mb-6"><i data-lucide="alert-triangle" class="w-5 h-5 flex-none"></i><div class="flex-1 text-sm">' + warn.map(esc).join('<br>') +
    '</div><button class="btn-ghost !w-auto" onclick="go(\'admin/notif\')">Atur</button></div>' : '<div class="notice mb-6"><i data-lucide="mail" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1">Sisa kuota email hari ini: <b>' + d.emailQuota + '</b> penerima. Blast email yang melebihi kuota otomatis dilanjutkan besok.</p></div>';
  box.innerHTML = d.campaigns.length ? d.campaigns.map(c => {
    const done = c.sent + c.failed, pct = c.total ? done / c.total * 100 : 0;
    const chIcon = c.channel === 'wa' ? 'message-circle' : c.channel === 'email' ? 'mail' : 'send';
    return '<div class="app-card rounded-2xl p-5"><div class="flex flex-wrap items-start gap-3"><div class="stat-icon"><i data-lucide="' + chIcon + '" class="w-5 h-5"></i></div>' +
      '<div class="flex-1 min-w-[200px]"><p class="font-semibold text-main">' + esc(c.title) + '</p><p class="text-xs text-muted">' + esc((AUDIENCE_OPTS.filter(o => o[0] === c.audience)[0] || [0, c.audience])[1]) +
      ' · ' + c.batchSize + '/putaran · jeda ' + c.intervalMin + ' mnt · ' + fmtDateTime(c.createdAt) + '</p></div>' + statusBadge(c.status) + '</div>' +
      '<div class="mt-4">' + bar(pct, 'var(--accent)') + '<div class="flex flex-wrap justify-between text-xs text-muted mt-1.5"><span>✅ ' + c.sent + ' terkirim · ❌ ' + c.failed + ' gagal · ' + (c.total - done) + ' antre</span><span>' + pct.toFixed(0) + '%</span></div>' +
      '<p class="text-xs text-muted mt-1">' + esc(c.lastNote) + (c.status === 'Running' && c.nextRunAt ? ' · putaran berikut ' + fmtDateTime(c.nextRunAt) : '') + '</p></div>' +
      '<div class="flex flex-wrap gap-2 mt-4">' +
        (['Running', 'Waiting'].indexOf(c.status) > -1 ? '<button class="btn-ghost !w-auto !py-1.5" onclick="controlBlast(' + jsArg(c.id) + ',\'pause\')"><i data-lucide="pause" class="w-4 h-4"></i> Jeda</button>' : '') +
        (c.status === 'Paused' ? '<button class="btn-ghost !w-auto !py-1.5" onclick="controlBlast(' + jsArg(c.id) + ',\'resume\')"><i data-lucide="play" class="w-4 h-4"></i> Lanjutkan</button>' : '') +
        (['Running', 'Waiting', 'Paused'].indexOf(c.status) > -1 ? '<button class="btn-primary !w-auto !py-1.5" onclick="controlBlast(' + jsArg(c.id) + ',\'run\',this)"><i data-lucide="zap" class="w-4 h-4"></i> Kirim Putaran Sekarang</button>' +
          '<button class="btn-ghost !w-auto !py-1.5" onclick="controlBlast(' + jsArg(c.id) + ',\'cancel\')"><i data-lucide="square" class="w-4 h-4"></i> Batalkan</button>' : '') +
        (c.failed ? '<button class="btn-ghost !w-auto !py-1.5" onclick="controlBlast(' + jsArg(c.id) + ',\'retry\')"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Ulang yang Gagal</button>' : '') +
        '<button class="btn-ghost !w-auto !py-1.5" onclick="showQueue(' + jsArg(c.id) + ',' + jsArg(c.title) + ')"><i data-lucide="list" class="w-4 h-4"></i> Penerima</button>' +
        (['Done', 'Cancelled'].indexOf(c.status) > -1 ? '<button class="btn-icon" title="Hapus" onclick="controlBlast(' + jsArg(c.id) + ',\'delete\')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' : '') +
      '</div></div>';
  }).join('') : emptyState('send', 'Belum ada kampanye', 'Buat kampanye pertama Anda di sebelah kiri.');
  refreshIcons();
};

async function controlBlast(id, op, btn) {
  if (op === 'cancel' || op === 'delete') {
    const r = await Swal.fire({ title: op === 'cancel' ? 'Batalkan kampanye?' : 'Hapus kampanye & antreannya?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya', cancelButtonText: 'Tidak' });
    if (!r.isConfirmed) return;
  }
  const res = btn ? await withBusy(btn, 'Mengirim…', () => api('controlBlast', { id: id, op: op }, { timeout: 330000 })) : await api('controlBlast', { id: id, op: op });
  toastRes(res);
  Admin.fetch('blastAdmin');
}
async function showQueue(id, title) {
  Swal.fire({ title: esc(title), width: 820, html: '<div id="qBox">' + skeletonRows(4) + '</div>', showConfirmButton: false, showCloseButton: true });
  const res = await api('blastQueue', { id: id });
  const box = document.getElementById('qBox'); if (!box) return;
  if (!res.success) { box.innerHTML = esc(res.message); return; }
  box.innerHTML = '<div style="max-height:60vh;overflow:auto;text-align:left"><table class="w-full text-sm"><thead><tr class="text-muted text-xs"><th class="py-1 text-left">Nama</th><th class="text-left">WA / Email</th><th class="text-left">Status</th><th class="text-left">Keterangan</th></tr></thead><tbody>' +
    res.data.map(q => '<tr class="border-t border-app"><td class="py-1.5">' + esc(q.name || '—') + '</td><td class="text-xs">' + esc(q.whatsapp) + '<br>' + esc(q.email) + '</td><td>' + statusBadge(q.status) + '</td><td class="text-xs text-muted">' + esc(q.error || (q.sentAt ? fmtDateTime(q.sentAt) : '')) + '</td></tr>').join('') +
    '</tbody></table></div>';
}


// ════════════════════════════════════════════════════════════
// LOG AKTIVITAS REALTIME (tanpa batas 1.000, paginasi server)
// ════════════════════════════════════════════════════════════
const Logs = {
  f: { page: 1, pageSize: 100, action: '', role: '', q: '', from: '', to: '', archive: false },
  data: null, lastLive: null,
  load() {
    const box = document.getElementById('logTable');
    if (!box) return;
    box.style.opacity = '.55';
    api('logs', this.f).then(res => {
      box.style.opacity = '';
      if (!res.success) return showToast('Gagal', res.message, 'error');
      this.data = res.data; this.render();
    });
  },
  render() {
    const d = this.data; if (!d) return;
    document.getElementById('logKpi').innerHTML = kpi('Log Aktif', d.activeTotal.toLocaleString('id-ID'), 'database', cssVar('--accent'), 'Arsip: ' + d.archiveTotal.toLocaleString('id-ID')) +
      kpi('Hari Ini', d.summary.today, 'calendar-check', cssVar('--indigo')) + kpi('Pengguna Aktif Hari Ini', d.summary.users, 'users', cssVar('--success')) +
      kpi('Paling Sering', ACTION_LABELS[d.summary.top] || d.summary.top, 'bar-chart-3', cssVar('--warning'));
    document.getElementById('logTable').innerHTML = d.logs.length ? '<table class="log-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Peran</th><th>Aktivitas</th><th>Detail</th></tr></thead><tbody id="logBody">' +
      d.logs.map(l => this.row(l)).join('') + '</tbody></table>' : emptyState('activity', 'Tidak ada log', 'Belum ada aktivitas yang cocok dengan filter.');
    document.getElementById('logPager').innerHTML = '<span class="text-sm text-muted">' + d.total.toLocaleString('id-ID') + ' log · halaman ' + d.page + ' dari ' + d.pages + '</span>' +
      '<div class="flex gap-2"><button class="btn-ghost !w-auto !py-1.5" ' + (d.page <= 1 ? 'disabled' : '') + ' onclick="Logs.go(-1)">‹ Sebelumnya</button>' +
      '<button class="btn-ghost !w-auto !py-1.5" ' + (d.page >= d.pages ? 'disabled' : '') + ' onclick="Logs.go(1)">Berikutnya ›</button></div>';
    refreshIcons();
  },
  row(l, fresh) {
    return '<tr class="' + (fresh ? 'is-new' : '') + '"><td class="whitespace-nowrap text-xs">' + esc(fmtDateTime(l.time)) + '</td><td class="text-sm">' + esc(l.email) + '</td><td>' + esc(l.role) + '</td>' +
      '<td><span class="badge ' + (/FAILED|REJECT|BLOCK|DELETE/.test(l.action) ? 'badge-error' : /ORDER|LEAD|BLAST/.test(l.action) ? 'badge-warning' : 'badge-document') + '">' + esc(ACTION_LABELS[l.action] || l.action) + '</span></td>' +
      '<td class="text-sm text-muted">' + esc(l.detail) + '</td></tr>';
  },
  go(dir) { this.f.page += dir; this.load(); },
  apply() {
    this.f.action = document.getElementById('lgAction').value; this.f.role = document.getElementById('lgRole').value;
    this.f.q = document.getElementById('lgQ').value.trim(); this.f.from = document.getElementById('lgFrom').value; this.f.to = document.getElementById('lgTo').value;
    this.f.archive = document.getElementById('lgArchive').checked; this.f.page = 1; this.load();
  },
  /** Baris baru dari Live → disisipkan di atas bila berada di halaman 1 tanpa filter. */
  onLive(logs, activeTotal) {
    const ind = document.getElementById('logLive');
    if (ind) ind.textContent = 'Realtime · diperbarui ' + new Date().toLocaleTimeString('id-ID');
    if (!logs.length || !this.data || AppState.currentPage !== 'admin-logs') return;
    const f = this.f;
    if (f.page !== 1 || f.action || f.role || f.q || f.from || f.to || f.archive) return;
    const known = {}; this.data.logs.forEach(l => known[l.id] = true);
    const fresh = logs.filter(l => !known[l.id]);
    if (!fresh.length) return;
    this.data.logs = fresh.concat(this.data.logs).slice(0, f.pageSize);
    this.data.activeTotal = activeTotal || this.data.activeTotal + fresh.length;
    this.data.total = this.data.activeTotal;
    const body = document.getElementById('logBody');
    if (body) { body.insertAdjacentHTML('afterbegin', fresh.map(l => this.row(l, true)).join('')); while (body.children.length > f.pageSize) body.lastElementChild.remove(); }
    else this.render();
  }
};

adminRoute('logs', {
  title: 'Log Aktivitas',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Log Aktivitas', 'Semua aktivitas tercatat tanpa batas. Log lama dipindah ke arsip, tidak dihapus.',
      '<span id="logLive" class="live-dot">Realtime</span><button class="btn-ghost !w-auto" onclick="archiveLogs()"><i data-lucide="archive" class="w-4 h-4"></i> Arsipkan Semua</button>') +
    '<div id="logKpi" class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"></div>' +
    '<div class="app-card rounded-2xl p-5 mb-4 grid md:grid-cols-6 gap-3 items-end">' +
      '<div class="md:col-span-2"><label class="form-label">Cari</label><input id="lgQ" class="form-input" placeholder="email, detail…"></div>' +
      '<div><label class="form-label">Aktivitas</label><select id="lgAction" class="form-input"><option value="">Semua</option>' + Object.keys(ACTION_LABELS).map(k => '<option value="' + k + '">' + ACTION_LABELS[k] + '</option>').join('') + '</select></div>' +
      '<div><label class="form-label">Peran</label><select id="lgRole" class="form-input"><option value="">Semua</option><option>Customer</option><option>Superadmin</option><option>Guest</option><option>Admin</option></select></div>' +
      '<div><label class="form-label">Dari</label><input id="lgFrom" type="date" class="form-input"></div>' +
      '<div><label class="form-label">Sampai</label><input id="lgTo" type="date" class="form-input"></div>' +
      '<label class="switch md:col-span-3"><input type="checkbox" id="lgArchive"><span></span> Tampilkan log arsip</label>' +
      '<div class="md:col-span-3 flex gap-2 md:justify-end"><button class="btn-ghost !w-auto" onclick="Logs.f={page:1,pageSize:100};[\'lgQ\',\'lgAction\',\'lgRole\',\'lgFrom\',\'lgTo\'].forEach(i=>document.getElementById(i).value=\'\');document.getElementById(\'lgArchive\').checked=false;Logs.load()">Reset</button>' +
      '<button class="btn-primary !w-auto" onclick="Logs.apply()"><i data-lucide="filter" class="w-4 h-4"></i> Terapkan</button></div></div>' +
    '<div class="app-card rounded-2xl p-5"><div id="logTable" class="overflow-x-auto">' + skeletonRows(8) + '</div><div id="logPager" class="flex flex-wrap items-center justify-between gap-3 mt-4"></div></div></div>',
  mount: () => { document.getElementById('lgQ').addEventListener('keydown', e => { if (e.key === 'Enter') Logs.apply(); }); },
  show: () => { Logs.load(); Live.since = new Date().toISOString(); Live.start('logTable', 10000); },
  leave: () => Live.stop()
});

async function archiveLogs() {
  const r = await Swal.fire({ title: 'Arsipkan semua log aktif?', text: 'Log dipindahkan ke sheet Activity_Log_Archive (tidak dihapus) agar sheet aktif tetap ringan.', icon: 'question', showCancelButton: true, confirmButtonText: 'Arsipkan', cancelButtonText: 'Batal' });
  if (!r.isConfirmed) return;
  if (toastRes(await api('archiveLogs'))) Logs.load();
}


// ════════════════════════════════════════════════════════════
// NOTIFIKASI & WHATSAPP GATEWAY (Fonnte)
// ════════════════════════════════════════════════════════════
adminRoute('notif', {
  title: 'Notifikasi',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Notifikasi & WA Gateway', 'Atur kanal Email dan WhatsApp (Fonnte), serta kejadian yang dikirimi notifikasi.') +
    '<div id="notifBox">' + skeletonRows(6) + '</div></div>',
  show: () => Admin.load('notifConfig')
});

ADMIN_RENDER.notifConfig = function (d) {
  const box = document.getElementById('notifBox');
  if (!box || !d) return;
  const c = d.config;
  const events = d.events || [];
  const tog = (ch, k, label) => '<label class="switch"><input type="checkbox" data-ch="' + ch + '" data-k="' + k + '"' + (c[ch][k] ? ' checked' : '') + '><span></span> ' + label + '</label>';
  const mini = (ch, k) => '<label class="switch switch-sm" title="' + (ch === 'email' ? 'Email' : 'WhatsApp') + '"><input type="checkbox" data-ch="' + ch + '" data-k="' + k + '"' + (c[ch][k] ? ' checked' : '') + ' onchange="notifCount()"><span></span></label>';
  const group = (target, title, icon) => {
    const list = events.filter(e => e.target === target);
    return '<div class="app-card rounded-2xl p-6"><div class="flex flex-wrap items-center justify-between gap-3 mb-3"><h3 class="font-semibold text-main inline-flex items-center gap-2"><i data-lucide="' + icon + '" class="w-5 h-5 text-accent"></i> ' + title + ' <span class="text-xs text-muted font-normal">(' + list.length + ' notifikasi)</span></h3>' +
      '<div class="flex gap-2"><button class="btn-ghost !w-auto !py-1.5 !text-xs" onclick="notifBulk(\'' + target + '\',true)">Aktifkan semua</button><button class="btn-ghost !w-auto !py-1.5 !text-xs" onclick="notifBulk(\'' + target + '\',false)">Nonaktifkan semua</button></div></div>' +
      '<div class="notif-table"><div class="notif-row notif-head"><span>Kejadian</span><span>Email</span><span>WhatsApp</span></div>' +
      list.map(e => '<div class="notif-row" data-target="' + target + '"><span class="min-w-0"><b class="text-sm text-main">' + esc(e.label) + '</b><small class="mono">' + esc(e.key) + '</small></span>' + mini('email', e.key) + mini('wa', e.key) + '</div>').join('') + '</div></div>';
  };
  box.innerHTML = '<div class="grid xl:grid-cols-2 gap-6">' +
    '<div class="app-card rounded-2xl p-6"><div class="flex items-center justify-between"><h3 class="font-semibold text-main inline-flex items-center gap-2"><i data-lucide="mail" class="w-5 h-5 text-accent"></i> Email (Gmail)</h3>' + tog('email', 'enabled', '<b>Kanal aktif</b>') + '</div>' +
      '<p class="text-sm text-muted mt-2">Sisa kuota hari ini: <b>' + d.emailQuota + '</b> penerima (akun @gmail.com: 100/hari). Aktif: <b id="ncEmail">0</b> dari ' + events.length + ' notifikasi.</p>' +
      '<div class="flex gap-2 mt-5"><input id="tEmail" class="form-input" placeholder="Email tujuan tes" value="' + esc(d.adminEmail) + '"><button class="btn-ghost !w-auto" onclick="testNotif(\'email\',this)">Kirim Tes</button></div></div>' +
    '<div class="app-card rounded-2xl p-6"><div class="flex items-center justify-between"><h3 class="font-semibold text-main inline-flex items-center gap-2"><i data-lucide="message-circle" class="w-5 h-5" style="color:#25D366"></i> WhatsApp (Fonnte)</h3>' + tog('wa', 'enabled', '<b>Kanal aktif</b>') + '</div>' +
      '<p class="text-sm text-muted mt-2">Aktif: <b id="ncWa">0</b> dari ' + events.length + ' notifikasi.</p>' +
      '<div class="grid gap-3 mt-4"><div><label class="form-label">Token API Fonnte</label><input id="nfToken" class="form-input mono" type="password" autocomplete="new-password" placeholder="' + (d.fonnteConfigured ? 'Tersimpan: ' + esc(d.fonnteTokenMasked) + ' — isi untuk mengganti' : 'Tempel token dari dashboard Fonnte') + '">' +
        '<p class="text-xs text-muted mt-1">Token disimpan aman di Script Properties (bukan di Sheets). Isi "-" untuk menghapus.</p></div>' +
      '<div><label class="form-label">No. WhatsApp Admin (penerima notifikasi Admin)</label><input id="nfAdminWa" class="form-input" inputmode="tel" value="' + esc(d.adminWhatsApp) + '" placeholder="087818485245"></div></div>' +
      '<div class="flex gap-2 mt-5"><input id="tWa" class="form-input" placeholder="No. WA tujuan tes" value="' + esc(d.adminWhatsApp) + '"><button class="btn-ghost !w-auto" onclick="testNotif(\'wa\',this)">Kirim Tes</button></div></div>' +
    '</div>' +
    '<div class="notice mt-6"><i data-lucide="info" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1">Daftar di bawah adalah <b>semua notifikasi otomatis</b> yang dipakai aplikasi. Notifikasi terkirim hanya bila <b>kanal aktif</b> dan sakelar kejadiannya <b>aktif</b>. Blast WA/Email diatur terpisah di menu Blast.</p></div>' +
    '<div class="grid 2xl:grid-cols-2 gap-6 mt-6">' + group('member', 'Notifikasi ke Member / Customer', 'user') + group('admin', 'Notifikasi ke Admin', 'shield') + '</div>' +
    '<div class="sticky-save"><button class="btn-primary !w-auto" onclick="saveNotif(this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan Konfigurasi</button></div>';
  notifCount();
  refreshIcons();
};
function notifCount() {
  const n = ch => document.querySelectorAll('#notifBox .notif-row [data-ch="' + ch + '"]:checked').length;
  const e = document.getElementById('ncEmail'), w = document.getElementById('ncWa');
  if (e) e.textContent = n('email'); if (w) w.textContent = n('wa');
}
function notifBulk(target, on) {
  document.querySelectorAll('#notifBox .notif-row[data-target="' + target + '"] [data-ch]').forEach(i => i.checked = on);
  notifCount();
}
async function saveNotif(btn) {
  const cfg = { email: {}, wa: {} };
  document.querySelectorAll('#notifBox [data-ch]').forEach(i => cfg[i.dataset.ch][i.dataset.k] = i.checked);
  const wa = normWa(document.getElementById('nfAdminWa').value);
  if (wa && !isValidWa(wa)) return showToast('WA admin tidak valid', WA_HINT, 'error');
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveNotifConfig', Object.assign(cfg, { adminWhatsApp: wa, fonnteToken: document.getElementById('nfToken').value.trim() })));
  if (toastRes(res)) { Admin.fetch('notifConfig'); Store.del(Admin.key('systemStatus')); }
}
async function testNotif(ch, btn) {
  const target = ch === 'wa' ? normWa(document.getElementById('tWa').value) : document.getElementById('tEmail').value.trim();
  toastRes(await withBusy(btn, 'Mengirim…', () => api('testNotif', { channel: ch, target: target })));
}


// ════════════════════════════════════════════════════════════
// IMPORT & MIGRASI (Point 7)
// ════════════════════════════════════════════════════════════
const IMPORT_SHEETS = [['Users', 'Member'], ['Products', 'Produk'], ['Customer_Access', 'Akses Member'], ['Access_Keys', 'Kode Akses'], ['Orders', 'Pesanan'], ['Helpdesk', 'Helpdesk'], ['Settings', 'Pengaturan'], ['Activity_Log', 'Log Aktivitas']];
const IM = { csv: [] };

adminRoute('import', {
  title: 'Import & Migrasi',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Import & Migrasi Data', 'Pindahkan data dari aplikasi lama (v2) ke aplikasi baru. Spreadsheet lama hanya DIBACA — tidak diubah sama sekali.') +
    '<div class="grid xl:grid-cols-2 gap-6">' +
      '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main inline-flex items-center gap-2"><span class="step-dot !bg-[var(--accent)] !text-white">1</span> Dari Spreadsheet App Lama</h3>' +
        '<div><label class="form-label">URL / ID spreadsheet lama (DB_Digital_Product_Hub)</label><input id="imSrc" class="form-input" placeholder="https://docs.google.com/spreadsheets/d/…"></div>' +
        '<div><label class="form-label">Data yang diimpor</label><div class="grid grid-cols-2 gap-2">' + IMPORT_SHEETS.map(s => '<label class="switch"><input type="checkbox" class="imSheet" value="' + s[0] + '"' + (s[0] !== 'Activity_Log' ? ' checked' : '') + '><span></span> ' + s[1] + '</label>').join('') + '</div></div>' +
        '<label class="switch"><input type="checkbox" id="imWag" checked><span></span> Terapkan link WhatsApp Group lama ke semua Kelas yang belum punya link WAG</label>' +
        '<label class="switch"><input type="checkbox" id="imOverwrite"><span></span> Timpa produk/helpdesk yang sudah ada dengan data lama (umumnya TIDAK perlu)</label>' +
        '<div class="flex flex-wrap gap-2"><button class="btn-ghost !w-auto" onclick="runImport(true,this)"><i data-lucide="scan-search" class="w-4 h-4"></i> Pindai (Dry-run)</button>' +
        '<button class="btn-primary !w-auto" onclick="runImport(false,this)"><i data-lucide="database-zap" class="w-4 h-4"></i> Jalankan Import</button></div>' +
        '<p class="text-xs text-muted">Aman diulang berkali-kali: data yang sudah ada dilewati (tidak dobel). Jalankan ulang sebelum pindah total untuk menyalin member/pesanan baru dari app lama.</p>' +
        '<div id="imResult"></div></div>' +
      '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main inline-flex items-center gap-2"><span class="step-dot !bg-[var(--indigo)] !text-white">2</span> Dari File CSV (opsional)</h3>' +
        '<p class="text-sm text-muted">Untuk data dari luar, misalnya ekspor pembeli Lynk.id. Kolom: <code>email</code>, <code>nama</code>, <code>whatsapp</code>, <code>produk</code> (ID atau judul produk persis, pisahkan dengan <code>;</code> bila lebih dari satu).</p>' +
        '<button class="text-sm text-accent" onclick="downloadCsv(\'template_import_member.csv\',[[\'email\',\'nama\',\'whatsapp\',\'produk\'],[\'budi@email.com\',\'Budi\',\'087818485245\',\'Judul Kelas Anda\']])"><i data-lucide="download" class="w-4 h-4 inline"></i> Unduh template CSV</button>' +
        '<div class="dropzone" id="csvDrop"><i data-lucide="file-spreadsheet" class="w-7 h-7 mx-auto mb-2"></i><p class="text-sm font-semibold">Klik atau seret file .csv</p></div><input type="file" id="csvFile" accept=".csv,text/csv" class="hidden">' +
        '<div id="csvPreview"></div></div>' +
    '</div></div>',
  mount: () => bindDropzone(document.getElementById('csvDrop'), document.getElementById('csvFile'), readCsvFile),
  show: () => {}
});

async function runImport(dry, btn) {
  const src = document.getElementById('imSrc').value.trim();
  if (!src) return showToast('Isi sumber', 'Tempel URL spreadsheet lama.', 'warning');
  const sheets = Array.from(document.querySelectorAll('.imSheet:checked')).map(c => c.value);
  if (!dry) {
    const r = await Swal.fire({ title: 'Jalankan import sekarang?', text: 'Data lama disalin ke database baru. Data lama tidak diubah.', icon: 'question', showCancelButton: true, confirmButtonText: 'Import', cancelButtonText: 'Batal' });
    if (!r.isConfirmed) return;
  }
  const res = await withBusy(btn, dry ? 'Memindai…' : 'Mengimpor…', () => api('importData', { source: src, sheets: sheets, dryRun: dry,
    applyWag: document.getElementById('imWag').checked, overwrite: document.getElementById('imOverwrite').checked }, { timeout: 330000 }));
  const box = document.getElementById('imResult');
  if (!res.success) { box.innerHTML = '<div class="notice notice-error"><i data-lucide="x-circle" class="w-5 h-5"></i><p class="text-sm">' + esc(res.message) + '</p></div>'; refreshIcons(); return; }
  const d = res.data, labels = {}; IMPORT_SHEETS.forEach(s => labels[s[0]] = s[1]);
  box.innerHTML = '<div class="notice ' + (dry ? '' : 'notice-success') + '"><i data-lucide="' + (dry ? 'scan-search' : 'check-circle-2') + '" class="w-5 h-5 flex-none"></i><div class="flex-1 text-sm"><b>' + esc(res.message) + '</b><br>Sumber: ' + esc(d.source.name) + '</div></div>' +
    '<table class="w-full text-sm mt-3"><thead><tr class="text-xs text-muted text-left"><th class="py-1">Data</th><th>Di app lama</th><th>' + (dry ? 'Akan ditambah' : 'Ditambah') + '</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' +
    Object.keys(d.report).map(k => { const r = d.report[k];
      if (k === 'Settings') return '<tr class="border-t border-app"><td class="py-1.5">Pengaturan</td><td colspan="4" class="text-xs">' + (r.fields.length ? esc(r.fields.join(', ')) : 'tidak ada yang perlu disalin') + '</td></tr>';
      if (r.missing) return '<tr class="border-t border-app"><td class="py-1.5">' + esc(labels[k] || k) + '</td><td colspan="4" class="text-xs text-muted">sheet tidak ada di sumber</td></tr>';
      return '<tr class="border-t border-app"><td class="py-1.5">' + esc(labels[k] || k) + '</td><td>' + r.source + '</td><td><b>' + r.inserted + '</b></td><td>' + r.updated + '</td><td>' + r.skipped + '</td></tr>'; }).join('') + '</tbody></table>' +
    (d.warnings.length ? '<ul class="mt-3 text-xs text-muted list-disc pl-5 space-y-1">' + d.warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '');
  refreshIcons();
  if (!dry) { ['crm', 'productsAdmin', 'dashboard', 'helpdeskAdmin', 'keysAdmin', 'ordersAdmin'].forEach(k => Store.del(Admin.key(k))); Admin.fetch('dashboard'); }
}

async function readCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return showToast('CSV kosong', 'Minimal 1 baris data.', 'warning');
  const h = rows[0].map(x => x.trim().toLowerCase());
  const idx = k => h.indexOf(k);
  if (idx('email') === -1) return showToast('Kolom email tidak ditemukan', 'Baris pertama harus berisi judul kolom.', 'error');
  IM.csv = rows.slice(1).map(r => ({ email: (r[idx('email')] || '').trim(), nama: idx('nama') > -1 ? (r[idx('nama')] || '').trim() : '',
    whatsapp: idx('whatsapp') > -1 ? (r[idx('whatsapp')] || '').trim() : '', produk: idx('produk') > -1 ? (r[idx('produk')] || '').trim() : '' })).filter(r => r.email);
  document.getElementById('csvPreview').innerHTML = '<p class="text-sm"><b>' + IM.csv.length + '</b> baris siap diimpor dari ' + esc(file.name) + '</p>' +
    '<div class="max-h-60 overflow-auto mt-2"><table class="w-full text-xs"><tbody>' + IM.csv.slice(0, 20).map(r => '<tr class="border-t border-app"><td class="py-1">' + esc(r.email) + '</td><td>' + esc(r.nama) + '</td><td class="mono">' + esc(r.whatsapp) + '</td><td>' + esc(r.produk) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<button class="btn-primary !w-auto mt-3" onclick="submitCsv(this)"><i data-lucide="upload" class="w-4 h-4"></i> Import ' + IM.csv.length + ' baris</button>';
  refreshIcons();
}
async function submitCsv(btn) {
  const res = await withBusy(btn, 'Mengimpor…', () => api('importCsv', { rows: IM.csv }, { timeout: 330000 }));
  if (!res.success) return showToast('Gagal', res.message, 'error');
  const d = res.data;
  Swal.fire({ icon: 'success', title: 'Import CSV selesai', html: '<p>' + d.newUsers + ' member baru · ' + d.newAccess + ' akses baru · ' + d.updatedProfiles + ' profil dilengkapi</p>' +
    (d.errors.length ? '<div class="text-left text-xs mt-3 max-h-52 overflow-auto p-3 rounded-lg bg-surface-2">' + d.errors.map(esc).join('<br>') + '</div>' : '') });
  Store.del(Admin.key('crm'));
  Admin.fetchMany(['crm', 'dashboard']);             // v3.3: 1 panggilan batch
}


// ════════════════════════════════════════════════════════════
// PENGATURAN
// ════════════════════════════════════════════════════════════
adminRoute('settings', {
  title: 'Pengaturan',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Pengaturan', 'Identitas aplikasi, hero halaman depan, channel pembayaran, Tim Admin, database, dan backup.') + '<div id="setBox">' + skeletonRows(8) + '</div></div>',
  show: () => { Admin.load('settingsAdmin'); Admin.load('adminTeam'); }
});

ADMIN_RENDER.settingsAdmin = function (s) {
  const box = document.getElementById('setBox');
  if (!box || !s) return;
  AppState.banks = JSON.parse(JSON.stringify(s.banks || []));
  const f = (id, label, val, ph, hint) => '<div><label class="form-label" for="' + id + '">' + label + '</label><input id="' + id + '" class="form-input" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '">' + (hint ? '<p class="text-xs text-muted mt-1">' + hint + '</p>' : '') + '</div>';
  box.innerHTML = '<div class="grid xl:grid-cols-2 gap-6">' +
    '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main">Identitas Aplikasi</h3>' +
      f('sName', 'Nama aplikasi *', s.appName) + '<div><label class="form-label">Deskripsi</label><textarea id="sDesc" class="form-input" rows="2">' + esc(s.appDescription) + '</textarea></div>' +
      imageField('sLogo', 'Logo', '', s.logo) + f('sEmail', 'Email kontak Admin', s.adminEmail, 'admin@email.com') +
      '<p class="text-xs text-muted">No. WhatsApp Admin diatur di menu <button class="text-accent" onclick="go(\'admin/notif\')">Notifikasi</button>.</p></div>' +
    '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main">Halaman Utama & Open Access</h3>' +
      f('sTesti', 'Link Web Testimoni', s.testimoniUrl, 'https://…', 'Menggantikan banner grup WhatsApp di beranda member & tampil di halaman publik.') +
      f('sTestiLbl', 'Teks tombol testimoni', s.testimoniLabel, 'Lihat Testimoni Member') +
      f('sExTitle', 'Judul halaman Open Access', s.exploreTitle) +
      '<div><label class="form-label">Subjudul</label><textarea id="sExSub" class="form-input" rows="2">' + esc(s.exploreSubtitle) + '</textarea></div>' +
      f('sLynk', 'Link toko Lynk.id (opsional)', s.lynkStoreUrl, 'https://lynk.id/username') +
      f('sWaGroup', 'Link Grup Komunitas Member (opsional)', s.waGroupUrl, 'https://chat.whatsapp.com/… atau https://t.me/…', 'Tampil sebagai kartu "Gabung Grup" di beranda portal — <b>hanya untuk member yang sudah login</b>. Grup khusus per kelas tetap diatur di menu Produk.') +
      '<div class="notice"><i data-lucide="globe" class="w-5 h-5 flex-none"></i><p class="text-sm flex-1">Alamat halaman publik:<br><span class="mono text-xs break-all">' + esc(location.origin + location.pathname + '#/explore') + '</span></p>' +
        '<button class="btn-icon" onclick="copyText(' + jsArg(location.origin + location.pathname + '#/explore') + ')"><i data-lucide="copy" class="w-4 h-4"></i></button></div></div>' +
    heroSettingsCard(s.hero || {}) +
    '<div class="app-card rounded-2xl p-6 space-y-4"><div class="flex items-center justify-between"><h3 class="font-semibold text-main">Channel Pembayaran</h3><button class="btn-ghost !w-auto !py-1.5" onclick="AppState.banks.push({type:\'Bank\',name:\'\',number:\'\',holder:\'\'});renderBanks()">+ Tambah</button></div><div id="bankList" class="space-y-2"></div></div>' +
    '<div class="app-card rounded-2xl p-6 space-y-4"><div class="flex items-center justify-between gap-2"><h3 class="font-semibold text-main">Tim Admin Portal Kelas</h3><span class="role35">Role: Admin</span></div>' +
      '<p class="text-sm text-muted">Admin membantu mengelola Produk, Kode Akses, Pesanan, CRM, Bootcamp, Pameran Karya, Panduan, Pengumuman & Helpdesk. ' +
      'Tidak bisa membuka Pengaturan, Notifikasi/Fonnte, Blast, Log, Import, Aplikasi Custom, maupun menghapus produk permanen. Daftar disimpan aman di Script Properties.</p>' +
      '<div id="teamBox">' + skeletonRows(2) + '</div></div>' +
    dbSettingsCard(s) +
  '</div><div class="sticky-save flex justify-end mt-6"><button class="btn-primary !w-auto btn-glow" onclick="saveSettings(this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan</button></div>';
  refreshImageField('sLogo'); renderBanks(); heroPreview(); refreshIcons();
  if (AppState.a.adminTeam) ADMIN_RENDER.adminTeam(AppState.a.adminTeam);
};

// ── v3.5: HERO HALAMAN DEPAN — video YouTube sebagai latar + tingkat transparansi ──
function heroSettingsCard(h) {
  const rng = (id, label, val, hint) => '<div><label class="form-label" for="' + id + '">' + label + '</label><div class="range35"><input id="' + id + '" type="range" min="0" max="100" step="5" value="' + Number(val) + '" oninput="this.nextElementSibling.value=this.value+\'%\';heroPreview()"><output>' + Number(val) + '%</output></div>' +
    (hint ? '<p class="text-xs text-muted mt-1">' + hint + '</p>' : '') + '</div>';
  return '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main flex items-center gap-2"><i data-lucide="clapperboard" class="w-4 h-4 text-accent"></i> Hero Halaman Depan</h3>' +
    '<div class="hero-preview" id="heroPrev"><div class="shade"></div><p>Pratinjau hero</p></div>' +
    '<div><label class="form-label" for="hVideo">Video latar (link YouTube, opsional)</label><input id="hVideo" class="form-input" value="' + esc(h.videoUrl || '') + '" placeholder="https://youtu.be/… — kosongkan untuk latar biru polos" oninput="heroPreview()">' +
      '<p class="text-xs text-muted mt-1">Video diputar otomatis tanpa suara & berulang sebagai wallpaper. Tidak dimuat pada mode hemat data.</p></div>' +
    '<div class="grid2">' + rng('hOpacity', 'Kejelasan video', h.videoOpacity == null ? 35 : h.videoOpacity, 'Makin tinggi makin terlihat.') +
      rng('hOverlay', 'Lapisan biru (keterbacaan teks)', h.overlay == null ? 72 : h.overlay, 'Makin tinggi makin gelap/biru.') + '</div>' +
    '<div class="grid2"><div><label class="form-label" for="hKicker">Label kecil di atas judul</label><input id="hKicker" class="form-input" maxlength="60" value="' + esc(h.kicker || '') + '" placeholder="mis. Pusat Aset & Talenta Digital"></div>' +
      '<div><label class="form-label">Angka statistik berjalan</label><label class="switch mt-2"><input type="checkbox" id="hStats"' + (h.showStats === false ? '' : ' checked') + '><span></span> Tampilkan (member, produk, bootcamp, karya)</label></div></div>' +
  '</div>';
}
function heroPreview() {
  const box = document.getElementById('heroPrev');
  if (!box) return;
  const id = typeof ytId === 'function' ? ytId((document.getElementById('hVideo') || {}).value) : '';
  const op = Number((document.getElementById('hOpacity') || {}).value || 35) / 100, ov = Number((document.getElementById('hOverlay') || {}).value || 72) / 100;
  let im = box.querySelector('img');
  if (id) { if (!im) { im = document.createElement('img'); im.alt = ''; box.insertBefore(im, box.firstChild); } im.src = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg'; im.style.opacity = op; }
  else if (im) im.remove();
  box.querySelector('.shade').style.opacity = id ? ov : 1;
}

// ── v3.5: DATABASE & KEAMANAN (tanpa menampilkan rahasia apa pun) ──
function dbSettingsCard(s) {
  const db = s.database || {}, sb = db.engine === 'supabase';
  return '<div class="app-card rounded-2xl p-6 space-y-4"><h3 class="font-semibold text-main flex items-center gap-2"><i data-lucide="database" class="w-4 h-4 text-accent"></i> Database, Backup & Keamanan</h3>' +
    '<div class="idrow"><span>Mesin database aktif</span><b>' + (sb ? 'Supabase (PostgreSQL)' : 'Google Sheets') + '</b></div>' +
    (db.projectRef ? '<div class="idrow"><span>Project Supabase</span><b>' + esc(db.projectRef) + '</b></div>' : '') +
    '<div class="idrow"><span>Superadmin (Google)</span><b>' + esc(s.superadmin || '—') + '</b></div>' +
    '<div class="flex flex-wrap gap-2">' +
      (s.spreadsheetUrl ? '<button class="btn-ghost !w-auto" onclick="openLink(' + jsArg(s.spreadsheetUrl) + ')"><i data-lucide="sheet" class="w-4 h-4"></i> Buka Spreadsheet' + (sb ? ' (arsip)' : '') + '</button>' : '') +
      (db.dashboardUrl ? '<button class="btn-ghost !w-auto" onclick="openLink(' + jsArg(db.dashboardUrl) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> Dashboard Supabase</button>' : '') +
      '<button class="btn-ghost !w-auto" onclick="backupNow(this)"><i data-lucide="hard-drive-download" class="w-4 h-4"></i> Backup Sekarang</button></div>' +
    '<div class="notice"><i data-lucide="shield-check" class="w-5 h-5 flex-none"></i><div class="text-sm flex-1">' +
      '<p><b>Rahasia tersimpan di Script Properties</b> — kunci Supabase, token Fonnte, Client ID Google, dan kunci sesi tidak pernah dikirim ke browser.</p>' +
      '<p class="mt-1 text-muted">Migrasi/pindah database, audit & rotasi kunci dijalankan dari editor Apps Script: <code>cekKoneksiSupabase()</code>, <code>migrasiKeSupabase()</code>, <code>pindahKeSupabase()</code>, <code>auditKeamanan()</code>. Lihat PANDUAN-UPDATE-v3.5.</p></div></div>' +
  '</div>';
}

// ── v3.5: TIM ADMIN ──
ADMIN_RENDER.adminTeam = function (d) {
  const box = document.getElementById('teamBox');
  if (!box || !d) return;
  const list = d.team || [];
  box.innerHTML = (list.length ? list.map(t =>
    '<div class="team35' + (t.active ? '' : ' is-off') + '"><span class="cell-avatar">' + esc(initial(t.name || t.email)) + '</span>' +
      '<div class="min-w-0 flex-1"><p class="text-sm font-semibold text-main truncate">' + esc(t.name || t.email) + ' ' + (t.active ? '<span class="tag35 tone-green">Aktif</span>' : '<span class="tag35 tone-slate">Nonaktif</span>') + '</p>' +
      '<p class="text-xs text-muted truncate">' + esc(t.email) + (t.addedAt ? ' · ditambah ' + esc(fmtDate(t.addedAt)) : '') + '</p></div>' +
      '<button class="btn-icon" title="' + (t.active ? 'Nonaktifkan' : 'Aktifkan') + '" onclick="saveTeam(\'toggle\',' + jsArg(t.email) + ')"><i data-lucide="' + (t.active ? 'user-x' : 'user-check') + '" class="w-4 h-4"></i></button>' +
      '<button class="btn-icon" title="Hapus" style="color:var(--error)" onclick="saveTeam(\'remove\',' + jsArg(t.email) + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>').join('')
    : '<p class="text-sm text-muted">Belum ada admin. Tambahkan email Google orang yang membantu Anda.</p>') +
    (list.length < (d.max || 20) ? '<div class="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mt-3"><input id="tmEmail" type="email" class="form-input" placeholder="email.google@gmail.com"><input id="tmName" class="form-input" placeholder="Nama (opsional)">' +
      '<button class="btn-primary !w-auto" onclick="saveTeam(\'add\')"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah</button></div>' : '') +
    '<p class="text-xs text-muted mt-2">' + list.length + ' / ' + (d.max || 20) + ' admin · Admin masuk lewat tab <b>Admin / Superadmin</b> di halaman Masuk (Google).</p>';
  refreshIcons();
};
async function saveTeam(action, email) {
  let name = '';
  if (action === 'add') {
    email = (document.getElementById('tmEmail').value || '').trim().toLowerCase();
    name = (document.getElementById('tmName').value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showToast('Email tidak valid', 'Gunakan email akun Google.', 'warning');
  } else {
    const r = await Swal.fire({ title: action === 'remove' ? 'Hapus admin ini?' : 'Ubah status admin?', text: email + (action === 'remove' ? ' akan dikeluarkan dari semua perangkat.' : ''), icon: 'warning',
      showCancelButton: true, confirmButtonText: action === 'remove' ? 'Hapus' : 'Ya, ubah', cancelButtonText: 'Batal' });
    if (!r.isConfirmed) return;
  }
  const res = await api('saveAdminTeam', { action: action, email: email, name: name });
  if (toastRes(res)) Admin.ingest('adminTeam', res.data, true);
}

function renderBanks() {
  const box = document.getElementById('bankList'); if (!box) return;
  box.innerHTML = AppState.banks.length ? AppState.banks.map((b, i) => '<div class="builder-row"><div class="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">' +
    '<select class="form-input" onchange="AppState.banks[' + i + '].type=this.value"><option' + (b.type === 'Bank' ? ' selected' : '') + '>Bank</option><option' + (b.type === 'E-Wallet' ? ' selected' : '') + '>E-Wallet</option><option' + (b.type === 'QRIS' ? ' selected' : '') + '>QRIS</option></select>' +
    '<input class="form-input" placeholder="BCA / DANA" value="' + esc(b.name) + '" oninput="AppState.banks[' + i + '].name=this.value">' +
    '<input class="form-input mono" placeholder="Nomor" value="' + esc(b.number) + '" oninput="AppState.banks[' + i + '].number=this.value">' +
    '<input class="form-input" placeholder="Atas nama" value="' + esc(b.holder) + '" oninput="AppState.banks[' + i + '].holder=this.value"></div>' +
    '<button class="btn-icon" onclick="AppState.banks.splice(' + i + ',1);renderBanks()"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>').join('')
    : '<p class="text-sm text-muted">Belum ada channel. Tanpa channel, member diarahkan ke Lynk.id / Admin saat membeli.</p>';
  refreshIcons();
}
async function saveSettings(btn) {
  const logo = IMG.sLogo.fileId ? 'https://drive.google.com/thumbnail?id=' + IMG.sLogo.fileId + '&sz=w800' : IMG.sLogo.url;
  const v = { appName: document.getElementById('sName').value.trim(), appDescription: document.getElementById('sDesc').value.trim(), logo: logo,
    adminEmail: document.getElementById('sEmail').value.trim(), testimoniUrl: document.getElementById('sTesti').value.trim(), testimoniLabel: document.getElementById('sTestiLbl').value.trim(),
    exploreTitle: document.getElementById('sExTitle').value.trim(), exploreSubtitle: document.getElementById('sExSub').value.trim(), lynkStoreUrl: document.getElementById('sLynk').value.trim(),
    banks: AppState.banks.filter(b => b.name && b.number),
    waGroupUrl: document.getElementById('sWaGroup').value.trim(),                                   // v3.5
    hero: { videoUrl: document.getElementById('hVideo').value.trim(), videoOpacity: Number(document.getElementById('hOpacity').value),
      overlay: Number(document.getElementById('hOverlay').value), showStats: document.getElementById('hStats').checked, kicker: document.getElementById('hKicker').value.trim() } };
  if (v.hero.videoUrl && typeof ytId === 'function' && !ytId(v.hero.videoUrl)) return showToast('Link video tidak valid', 'Tempel tautan video YouTube.', 'warning');
  if (!v.appName) return showToast('Nama wajib diisi', '', 'error');
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveSettings', v));
  if (toastRes(res)) { Admin.fetch('settingsAdmin'); Public.prefetch(true); }
}
async function backupNow(btn) {
  const res = await withBusy(btn, 'Membuat backup…', () => api('backup', {}, { timeout: 180000 }));
  if (res.success) Swal.fire({ icon: 'success', title: 'Backup dibuat', text: res.data.name, confirmButtonText: 'Buka' }).then(r => { if (r.isConfirmed) openLink(res.data.url); });
  else showToast('Gagal', res.message, 'error');
}
