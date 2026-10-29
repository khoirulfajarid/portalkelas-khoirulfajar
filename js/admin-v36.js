/**
 * ============================================================
 * admin-v36.js — Panel Admin v3.6
 *  • Bootcamp → tab baru: Kurikulum & Materi (seret-lepas), Tugas (verifikasi satu/massal),
 *    Progres & Syarat, Evaluasi (penyusun kuesioner + hasil), Portofolio (kurasi + hapus permanen),
 *    Sertifikat (desainer seret-lepas + daftar terbit/cabut) · Duplikat bootcamp
 *  • Distribusi Akses (khusus Superadmin) · Jalur Belajar
 * ============================================================
 */

const BD36 = { data: {}, sel: {}, f: { task: '', st: 'Menunggu' }, cd: null, cdSel: null, form: null, drag: null };
const BD36_TABS = [['kurikulum', 'Kurikulum & Materi'], ['tugas', 'Tugas'], ['progres', 'Progres & Syarat'], ['evaluasi', 'Evaluasi'], ['portofolio', 'Portofolio'], ['sertifikat', 'Sertifikat']];
const MAT_TYPES36 = [['doc', 'Modul Bacaan', 'book-open'], ['file', 'Berkas', 'file-text'], ['link', 'Link Materi', 'link'], ['video', 'Video', 'play-circle'],
  ['replay', 'Rekaman Live', 'radio'], ['text', 'Catatan', 'notebook-pen'], ['task', 'Tugas', 'clipboard-check']];
const MAT_LABEL36 = {}; MAT_TYPES36.forEach(t => { MAT_LABEL36[t[0]] = t[1]; });

function bd36Key(tab) { return BD.id + '|' + tab; }
function bd36Body() { return document.getElementById('bdBody'); }
/** Muat data tab (tampil dari cache dulu bila ada). */
async function bd36Load(tab, action, extra) {
  const key = bd36Key(tab), id = BD.id;
  const c = Store.get(Admin.key('b36:' + key), null);
  if (c && c.data && !BD36.data[key]) BD36.data[key] = c.data;
  if (BD36.data[key]) BD36_RENDER[tab](); else { const b = bd36Body(); if (b) b.innerHTML = skeletonRows(5); }
  const res = await api(action, Object.assign({ bootId: id }, extra || {}));
  if (BD.id !== id) return res;
  if (!res.success) {
    const b = bd36Body();
    if (b && !BD36.data[key] && BD.tab === tab) { b.innerHTML = emptyState(res.data && res.data.code === 'SQL_V36' ? 'database' : 'alert-circle', 'Tidak dapat memuat', res.message); refreshIcons(); }
    else showToast('Gagal memuat', res.message, 'error');
    return res;
  }
  BD36.data[key] = res.data;
  Store.set(Admin.key('b36:' + key), { t: Date.now(), data: res.data });
  if (BD.tab === tab) BD36_RENDER[tab]();
  return res;
}
function bd36(tab) { return BD36.data[bd36Key(tab)] || null; }

const BD36_RENDER = {
  kurikulum() { const d = bd36('kurikulum'); if (!d) return bd36Load('kurikulum', 'bootcampCurriculum'); renderCurAdmin(d); },
  tugas() { const d = bd36('tugas'); if (!d) return bd36Load('tugas', 'bootcampSubmissions'); renderTasksAdmin(d); },
  progres() { const d = bd36('progres'); if (!d) return bd36Load('progres', 'bootcampProgress'); renderProgressAdmin(d); },
  evaluasi() { const d = bd36('evaluasi'); if (!d) return bd36Load('evaluasi', 'bootcampEvalResults'); renderEvalAdmin(d); },
  portofolio() { const d = bd36('portofolio'); if (!d) return bd36Load('portofolio', 'portfoliosAdmin'); renderPortAdmin(d); },
  sertifikat() { const d = bd36('kurikulum'); if (!d) return bd36Load('kurikulum', 'bootcampCurriculum').then(() => { if (BD.tab === 'sertifikat') BD36_RENDER.sertifikat(); }); renderCertAdmin(d); }
};
/** Dipanggil dari tab (admin-bootcamp.js): tampil instan dari cache lalu segarkan. */
function bd36Show(tab) {
  const map = { kurikulum: 'bootcampCurriculum', tugas: 'bootcampSubmissions', progres: 'bootcampProgress', evaluasi: 'bootcampEvalResults', portofolio: 'portfoliosAdmin', sertifikat: 'bootcampCurriculum' };
  const key = tab === 'sertifikat' ? 'kurikulum' : tab;
  const c = Store.get(Admin.key('b36:' + bd36Key(key)), null);
  if (c && c.data && !BD36.data[bd36Key(key)]) BD36.data[bd36Key(key)] = c.data;
  if (BD36.data[bd36Key(key)]) BD36_RENDER[tab]();
  const k = bd36Key(tab); BD36.at = BD36.at || {};
  if (BD36.data[bd36Key(key)] && Date.now() - (BD36.at[k] || 0) < 30000) return;     // baru saja dimuat → tidak ke server lagi
  BD36.at[k] = Date.now();
  bd36Load(key, map[tab]).then(() => { if (tab === 'sertifikat' && BD.tab === 'sertifikat') BD36_RENDER.sertifikat(); });
  if (tab === 'sertifikat') bd36LoadCerts();
}
function bd36Reload(tab) { const map = { kurikulum: 'bootcampCurriculum', tugas: 'bootcampSubmissions', progres: 'bootcampProgress', evaluasi: 'bootcampEvalResults', portofolio: 'portfoliosAdmin' }; return bd36Load(tab, map[tab]); }


// ════════════════════════════════════════════════════════════
// 1. KURIKULUM & MATERI
// ════════════════════════════════════════════════════════════
function renderCurAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'kurikulum') return;
  const cols = d.sessions.map(s => ({ id: s.id, title: 'Pertemuan ' + s.no + ' · ' + s.title, sub: fmtWib(s.startAt, true) })).concat([{ id: '', title: 'Materi Umum', sub: 'Tidak terikat pertemuan' }]);
  const mats = d.materials || [];
  box.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h3 class="text-lg font-bold text-main">Kurikulum & Materi Belajar</h3>' +
      '<p class="text-xs text-muted">Seret materi untuk mengubah urutan atau memindahkan ke pertemuan lain. Materi bertanda wajib masuk syarat checklist sertifikat.</p></div>' +
      '<div class="flex flex-wrap gap-2"><span class="badge badge-document">' + mats.filter(m => m.type !== 'task').length + ' materi</span><span class="badge badge-warning">' + mats.filter(m => m.type === 'task').length + ' tugas</span>' +
      '<button class="btn-ghost !w-auto" onclick="withBusy(this,\'Memuat…\',()=>bd36Reload(\'kurikulum\'))"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div></div>' +
    (!d.sessions.length ? '<div class="notice notice-warning mb-4"><i data-lucide="calendar-clock" class="w-5 h-5"></i><div class="text-sm flex-1">Bootcamp ini belum punya jadwal pertemuan. Tambahkan jadwal lewat tombol <b>Ubah</b> agar materi bisa disusun per pertemuan.</div></div>' : '') +
    '<div class="ad36-cols">' + cols.map(c => {
      const list = mats.filter(m => (m.sessionId || '') === c.id);
      return '<section class="ad36-ses"><div class="ad36-ses-h"><span class="bd36-no">' + (c.id ? esc(String(d.sessions.findIndex(s => s.id === c.id) + 1)) : '<i data-lucide="library" class="w-3.5 h-3.5"></i>') + '</span>' +
        '<div class="min-w-0 flex-1"><b class="truncate block">' + esc(c.title) + '</b><small>' + esc(c.sub) + ' · ' + list.length + ' item</small></div></div>' +
        '<div class="ad36-drop" data-ses="' + esc(c.id) + '" ondragover="matDragOver(event,this)" ondragleave="this.classList.remove(\'is-over\')" ondrop="matDrop(event,this)">' +
          (list.length ? list.map(admMatRow).join('') : '<p class="text-xs text-muted text-center py-3">Seret materi ke sini atau tambah baru.</p>') + '</div>' +
        '<button class="btn-ghost ad36-add !w-auto" onclick="openMaterialForm(null,' + jsArg(c.id) + ')"><i data-lucide="plus" class="w-4 h-4"></i> Tambah Materi / Tugas</button></section>';
    }).join('') + '</div>';
  refreshIcons();
}
function admMatRow(m) {
  return '<div class="ad36-mat' + (m.status === 'Hidden' ? ' is-hidden' : '') + '" draggable="true" data-id="' + esc(m.id) + '" ondragstart="matDragStart(event,this)" ondragend="matDragEnd(this)">' +
    '<i data-lucide="grip-vertical" class="w-4 h-4 ad36-grip"></i><span class="mat36-ico t-' + esc(m.type) + '"><i data-lucide="' + (MAT_ICON[m.type] || 'file') + '" class="w-4 h-4"></i></span>' +
    '<div class="min-w-0 flex-1"><p class="ad36-mat-t">' + esc(m.title) + '</p><p class="ad36-mat-s">' + esc(MAT_LABEL36[m.type] || m.type) + (m.required ? ' · wajib' : ' · opsional') +
      (m.status === 'Hidden' ? ' · disembunyikan' : '') + (m.publishAt && Date.parse(m.publishAt) > Date.now() ? ' · tayang ' + esc(fmtWibShort(m.publishAt)) : '') + (m.type === 'task' && m.dueAt ? ' · tenggat ' + esc(fmtWibShort(m.dueAt)) : '') + '</p></div>' +
    '<div class="ad36-acts"><span class="ad36-ud"><button title="Naik" onclick="matMove(' + jsArg(m.id) + ',-1)"><i data-lucide="chevron-up" class="w-3.5 h-3.5"></i></button>' +
    '<button title="Turun" onclick="matMove(' + jsArg(m.id) + ',1)"><i data-lucide="chevron-down" class="w-3.5 h-3.5"></i></button></span>' +
    '<button class="ad36-ib" title="Ubah" onclick="openMaterialForm(' + jsArg(m.id) + ')"><i data-lucide="pencil" class="w-4 h-4"></i></button>' +
    '<button class="ad36-ib is-del" title="Hapus" onclick="deleteMaterial36(' + jsArg(m.id) + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
}
function matDragStart(e, el) { BD36.drag = el.dataset.id; el.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', el.dataset.id); } catch (x) { /* */ } }
function matDragEnd(el) { el.classList.remove('is-drag'); document.querySelectorAll('.ad36-drop.is-over').forEach(z => z.classList.remove('is-over')); }
function matDragOver(e, zone) {
  if (!BD36.drag) return;
  e.preventDefault(); zone.classList.add('is-over');
  const el = document.querySelector('.ad36-mat[data-id="' + BD36.drag + '"]'); if (!el) return;
  const after = Array.from(zone.querySelectorAll('.ad36-mat:not(.is-drag)')).find(x => { const r = x.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  const ph = zone.querySelector('p'); if (ph) ph.remove();
  if (after) zone.insertBefore(el, after); else zone.appendChild(el);
}
function matDrop(e, zone) { e.preventDefault(); zone.classList.remove('is-over'); if (BD36.drag) { BD36.drag = null; saveMatOrder(); } }
function matMove(id, dir) {
  const el = document.querySelector('.ad36-mat[data-id="' + id + '"]'); if (!el) return;
  const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
  if (!sib || !sib.classList.contains('ad36-mat')) return;
  if (dir < 0) el.parentNode.insertBefore(el, sib); else el.parentNode.insertBefore(sib, el);
  saveMatOrder();
}
async function saveMatOrder() {
  const order = [];
  document.querySelectorAll('.ad36-drop').forEach(z => z.querySelectorAll('.ad36-mat').forEach((m, i) => order.push({ id: m.dataset.id, sessionId: z.dataset.ses, sort: (i + 1) * 10 })));
  const d = bd36('kurikulum');
  if (d) order.forEach(o => { const m = d.materials.filter(x => x.id === o.id)[0]; if (m) { m.sessionId = o.sessionId; m.sort = o.sort; } });
  if (d) d.materials.sort((a, b) => a.sort - b.sort);
  const res = await api('reorderMaterials', { bootId: BD.id, order: order });
  if (!res.success) { showToast('Urutan belum tersimpan', res.message, 'error'); bd36Reload('kurikulum'); return; }
  showToast('Urutan disimpan', '', 'success');
}
async function deleteMaterial36(id) {
  const d = bd36('kurikulum'), m = d && d.materials.filter(x => x.id === id)[0]; if (!m) return;
  const r = await Swal.fire({ title: 'Hapus "' + esc(m.title) + '"?', text: 'Berkas di Google Drive tidak ikut dihapus.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
  if (!r.isConfirmed) return;
  let res = await api('deleteMaterial', { id: id });
  if (!res.success && res.data && res.data.code === 'HAS_SUBMISSIONS') {
    const r2 = await Swal.fire({ icon: 'warning', title: 'Tugas sudah dikerjakan peserta', text: res.message, showDenyButton: true, showCancelButton: true, confirmButtonText: 'Sembunyikan saja', denyButtonText: 'Tetap hapus', cancelButtonText: 'Batal' });
    if (r2.isConfirmed) res = await api('saveMaterial', Object.assign({}, matPayload(m), { status: 'Hidden' }));
    else if (r2.isDenied) res = await api('deleteMaterial', { id: id, force: true });
    else return;
  }
  if (toastRes(res)) bd36Reload('kurikulum');
}
function matPayload(m) {
  return { bootId: BD.id, id: m.id, sessionId: m.sessionId, type: m.type, title: m.title, body: m.body, fileId: m.fileId, fileName: m.fileName, mime: m.mime, url: m.url,
    options: m.options, required: m.required, dueAt: m.dueAt, publishAt: m.publishAt, status: m.status, sort: m.sort };
}

const MF = { type: 'doc', file: null };
async function openMaterialForm(id, sessionId) {
  const d = bd36('kurikulum'); if (!d) return;
  const m = id ? d.materials.filter(x => x.id === id)[0] : null;
  MF.type = m ? m.type : 'doc'; MF.file = m && m.fileId ? { fileId: m.fileId, fileName: m.fileName, mime: m.mime } : null;
  const ses = m ? m.sessionId : (sessionId || '');
  const o = (m && m.options) || { text: true, link: false, file: true, maxFiles: 1 };
  const r = await Swal.fire({
    title: m ? 'Ubah ' + (m.type === 'task' ? 'Tugas' : 'Materi') : 'Tambah Materi / Tugas', width: 780, showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', focusConfirm: false,
    html: '<div class="pform text-left">' +
      '<div><label class="form-label">Jenis</label><div class="ad36-types" id="mfTypes">' + MAT_TYPES36.map(t => '<button type="button" class="ad36-type' + (MF.type === t[0] ? ' is-on' : '') + '" data-t="' + t[0] + '" onclick="mfType(\'' + t[0] + '\')"><i data-lucide="' + t[2] + '" class="w-5 h-5"></i>' + t[1] + '</button>').join('') + '</div></div>' +
      '<div class="grid2"><div><label class="form-label">Judul *</label><input id="mfTitle" class="form-input" value="' + esc(m ? m.title : '') + '" placeholder="mis. Modul 1 — Dasar Apps Script"></div>' +
        '<div><label class="form-label">Pertemuan</label><select id="mfSes" class="form-input">' + d.sessions.map(s => '<option value="' + esc(s.id) + '"' + (s.id === ses ? ' selected' : '') + '>Pertemuan ' + s.no + ' · ' + esc(s.title) + '</option>').join('') + '<option value=""' + (!ses ? ' selected' : '') + '>Materi Umum</option></select></div></div>' +
      '<div id="mfFile"><label class="form-label">Berkas (semua format, maks 25 MB) atau link Google Drive</label><div class="flex flex-wrap gap-2 items-center">' +
        '<button type="button" class="btn-ghost !w-auto" onclick="mfUpload()"><i data-lucide="upload" class="w-4 h-4"></i> Unggah Berkas</button><span id="mfFileInfo" class="text-xs text-muted">' + (MF.file ? '✓ ' + esc(MF.file.fileName || 'Berkas tersimpan') : 'Belum ada berkas') + '</span></div></div>' +
      '<div id="mfUrl"><label class="form-label" id="mfUrlLbl">Link</label><input id="mfUrlIn" class="form-input" value="' + esc(m ? m.url : '') + '" placeholder="https://…"><p class="text-xs text-muted mt-1" id="mfUrlHelp"></p></div>' +
      '<div><label class="form-label" id="mfBodyLbl">Deskripsi (opsional)</label><textarea id="mfBody" class="form-input" rows="4">' + esc(m ? m.body : '') + '</textarea></div>' +
      '<div id="mfTask" class="v4-sec"><p class="v4-sec-title"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Format jawaban tugas</p>' +
        '<div class="flex flex-wrap gap-4 text-sm"><label class="inline-flex items-center gap-2"><input type="checkbox" id="mfOT"' + (o.text ? ' checked' : '') + '> Teks</label>' +
        '<label class="inline-flex items-center gap-2"><input type="checkbox" id="mfOL"' + (o.link ? ' checked' : '') + '> Link</label>' +
        '<label class="inline-flex items-center gap-2"><input type="checkbox" id="mfOF"' + (o.file ? ' checked' : '') + '> Unggah berkas, maks <select id="mfOM" class="form-input !w-auto !py-1">' + [1, 2, 3].map(n => '<option' + (Number(o.maxFiles) === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
        '<div><label class="form-label">Tenggat (WIB, opsional)</label><input id="mfDue" type="datetime-local" class="form-input" value="' + esc(m ? wibInput(m.dueAt) : '') + '"></div></div>' +
      '<div class="grid2"><div><label class="form-label">Tayang mulai (WIB, opsional)</label><input id="mfPub" type="datetime-local" class="form-input" value="' + esc(m ? wibInput(m.publishAt) : '') + '"><p class="text-xs text-muted mt-1">Kosong = langsung tampil.</p></div>' +
        '<div><label class="form-label">Status</label><select id="mfStatus" class="form-input"><option value="Active"' + (!m || m.status !== 'Hidden' ? ' selected' : '') + '>Tampil</option><option value="Hidden"' + (m && m.status === 'Hidden' ? ' selected' : '') + '>Disembunyikan</option></select></div></div>' +
      '<label class="inline-flex items-center gap-2 text-sm font-semibold text-main"><input type="checkbox" id="mfReq"' + (!m || m.required ? ' checked' : '') + '> <span id="mfReqLbl">Wajib dipelajari (masuk syarat sertifikat)</span></label>' +
    '</div>',
    didOpen: () => { mfType(MF.type); refreshIcons(); },
    preConfirm: () => {
      const v = { bootId: BD.id, id: m ? m.id : '', type: MF.type, title: val('mfTitle'), sessionId: document.getElementById('mfSes').value, body: document.getElementById('mfBody').value,
        url: val('mfUrlIn'), fileId: MF.file ? MF.file.fileId : '', fileName: MF.file ? MF.file.fileName : '', mime: MF.file ? MF.file.mime : '', required: document.getElementById('mfReq').checked,
        publishAt: fromWibInput(val('mfPub')), status: document.getElementById('mfStatus').value };
      if (MF.type === 'task') { v.options = { text: document.getElementById('mfOT').checked, link: document.getElementById('mfOL').checked, file: document.getElementById('mfOF').checked, maxFiles: Number(document.getElementById('mfOM').value) }; v.dueAt = fromWibInput(val('mfDue')); }
      if (v.title.length < 2) return Swal.showValidationMessage('Judul materi wajib diisi.');
      if (v.url && !/^https?:\/\//i.test(v.url)) return Swal.showValidationMessage('Link harus diawali https://');
      if ((v.type === 'doc' || v.type === 'file') && !v.fileId && !v.url) return Swal.showValidationMessage('Unggah berkas atau isi link Google Drive.');
      if ((v.type === 'link' || v.type === 'video' || v.type === 'replay') && !v.url) return Swal.showValidationMessage('Isi link ' + (v.type === 'link' ? 'materi' : 'video') + '.');
      if (v.type === 'text' && v.body.trim().length < 2) return Swal.showValidationMessage('Isi catatan materi.');
      if (v.type === 'task' && v.body.trim().length < 5) return Swal.showValidationMessage('Tulis instruksi tugas.');
      if (v.type === 'task' && !v.options.text && !v.options.link && !v.options.file) return Swal.showValidationMessage('Pilih minimal satu format jawaban.');
      return v;
    }
  });
  if (!r.isConfirmed) return;
  const res = await api('saveMaterial', r.value);
  if (toastRes(res)) bd36Reload('kurikulum');
}
function mfType(t) {
  MF.type = t;
  document.querySelectorAll('#mfTypes .ad36-type').forEach(b => b.classList.toggle('is-on', b.dataset.t === t));
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('mfFile', t === 'doc' || t === 'file'); show('mfUrl', t !== 'text' && t !== 'task'); show('mfTask', t === 'task');
  const lbl = { doc: 'atau link dokumen (Google Drive / Docs)', file: 'atau link berkas', link: 'Link materi *', video: 'Link video * (YouTube / Google Drive / Vimeo)', replay: 'Link rekaman siaran langsung * (YouTube Live)' }[t] || 'Link';
  const help = { video: 'Video tampil langsung di ruang belajar (embed).', replay: 'Tempel link youtube.com/live/… atau youtu.be/… setelah siaran selesai.' }[t] || '';
  const L = document.getElementById('mfUrlLbl'); if (L) L.textContent = lbl;
  const H = document.getElementById('mfUrlHelp'); if (H) H.textContent = help;
  const B = document.getElementById('mfBodyLbl'); if (B) B.textContent = t === 'task' ? 'Instruksi tugas *' : t === 'text' ? 'Isi catatan *' : 'Deskripsi (opsional)';
  const R = document.getElementById('mfReqLbl'); if (R) R.textContent = t === 'task' ? 'Tugas wajib (dihitung bila syarat "tugas disetujui" aktif)' : 'Wajib dipelajari (masuk syarat checklist sertifikat)';
}
async function mfUpload() {
  const file = await pickFile('*/*'); if (!file) return;
  const info = document.getElementById('mfFileInfo');
  if (file.size > 25 * 1048576) { info.style.color = 'var(--error)'; info.textContent = 'Maksimal 25 MB.'; return; }
  info.innerHTML = '<span class="spinner-inline"></span> Mengunggah ' + esc(file.name) + '…';
  const res = await uploadFile('bootmat', file).catch(e => ({ success: false, message: e.message }));
  if (!res.success) { info.style.color = 'var(--error)'; info.textContent = res.message; return; }
  MF.file = { fileId: res.data.fileId, fileName: res.data.fileName, mime: file.type || '' };
  info.style.color = 'var(--success)'; info.textContent = '✓ ' + res.data.fileName + ' (' + res.data.fileSize + ')';
  const t = document.getElementById('mfTitle'); if (t && !t.value) t.value = file.name.replace(/\.[^.]+$/, '');
}


// ════════════════════════════════════════════════════════════
// 2. TUGAS — panel verifikasi (satu per satu & massal)
// ════════════════════════════════════════════════════════════
function renderTasksAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'tugas') return;
  const f = BD36.f;
  if (f.task && !d.tasks.some(t => t.id === f.task)) f.task = '';
  const subs = d.submissions.filter(s => (!f.task || s.matId === f.task) && (f.st === 'Semua' || s.status === f.st));
  const tmap = {}; d.tasks.forEach(t => { tmap[t.id] = t; });
  const sel = BD36.sel, selN = Object.keys(sel).filter(k => sel[k] && subs.some(s => s.id === k)).length;
  const pend = d.submissions.filter(s => s.status === 'Menunggu' && (!f.task || s.matId === f.task)).length;
  box.innerHTML = '<div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">' +
      kpi('Tugas', d.tasks.length, 'clipboard-check', cssVar('--accent')) + kpi('Menunggu Diperiksa', d.submissions.filter(s => s.status === 'Menunggu').length, 'clock', cssVar('--warning')) +
      kpi('Perlu Revisi', d.submissions.filter(s => s.status === 'Revisi').length, 'rotate-ccw', cssVar('--error')) + kpi('Disetujui', d.submissions.filter(s => s.status === 'Disetujui').length, 'badge-check', cssVar('--success')) + '</div>' +
    (d.tasks.length ? '<div class="flex flex-wrap items-center gap-2 mb-4"><select class="form-input !w-auto" onchange="BD36.f.task=this.value;BD36.sel={};renderTasksAdmin(bd36(\'tugas\'))"><option value="">Semua tugas</option>' +
      d.tasks.map(t => '<option value="' + esc(t.id) + '"' + (f.task === t.id ? ' selected' : '') + '>' + esc(t.sessionTitle + ' — ' + t.title) + '</option>').join('') + '</select>' +
      '<div class="seg">' + ['Menunggu', 'Revisi', 'Disetujui', 'Semua'].map(s => '<button class="' + (f.st === s ? 'is-active' : '') + '" onclick="BD36.f.st=\'' + s + '\';BD36.sel={};renderTasksAdmin(bd36(\'tugas\'))">' + s + '</button>').join('') + '</div>' +
      '<button class="btn-ghost !w-auto ml-auto" onclick="withBusy(this,\'Memuat…\',()=>bd36Reload(\'tugas\'))"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Segarkan</button></div>'
      : emptyState('clipboard-check', 'Belum ada tugas', 'Tambahkan materi bertipe Tugas di tab Kurikulum & Materi.')) +
    (d.tasks.length ? (subs.length ? subs.map(s => {
      const t = tmap[s.matId] || {}, can = s.status === 'Menunggu';
      return '<div class="ad36-sub">' + (can ? '<input type="checkbox" ' + (sel[s.id] ? 'checked' : '') + ' onchange="BD36.sel[' + jsArg(s.id).replace(/"/g, '&quot;') + ']=this.checked;renderTasksAdmin(bd36(\'tugas\'))" aria-label="Pilih">' : '<span style="width:18px"></span>') +
        '<div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><b class="text-main">' + esc(s.fullName || s.email) + '</b><span class="text-xs text-muted">' + esc(s.email) + '</span>' +
          '<span class="badge ' + SUB_BADGE[s.status][0] + '">' + esc(s.status) + '</span>' + (s.revisions ? '<span class="badge badge-document">revisi ke-' + s.revisions + '</span>' : '') + '</div>' +
          '<p class="text-xs text-muted mt-0.5">' + esc((t.sessionTitle ? t.sessionTitle + ' — ' : '') + (t.title || 'Tugas')) + ' · dikirim ' + esc(fmtWib(s.submittedAt, true)) + (t.dueAt && Date.parse(s.submittedAt) > Date.parse(t.dueAt) ? ' · <b style="color:var(--error)">terlambat</b>' : '') + '</p>' +
          (s.answer ? '<p class="text-sm text-main mt-1 line-clamp-2">' + esc(s.answer) + '</p>' : '') +
          '<div class="flex flex-wrap gap-2 mt-1">' + (s.link ? '<button class="text-accent text-xs font-semibold" onclick="openLink(' + jsArg(s.link) + ')"><i data-lucide="link" class="w-3 h-3 inline"></i> Link jawaban</button>' : '') +
            s.files.map(fl => '<button class="text-accent text-xs font-semibold" onclick="' + (fl.isImage ? 'previewImage(' + jsArg(fl.image) + ',' + jsArg(fl.name) + ')' : 'previewDocument(' + jsArg(fl.preview) + ',' + jsArg(fl.download) + ',' + jsArg(fl.name) + ')') + '"><i data-lucide="paperclip" class="w-3 h-3 inline"></i> ' + esc(fl.name) + '</button>').join('') + '</div>' +
          (s.feedback ? '<p class="text-xs mt-1" style="color:var(--text-muted)"><b>Catatan:</b> ' + esc(s.feedback) + '</p>' : '') + '</div>' +
        '<button class="btn-primary !w-auto !py-1.5" onclick="reviewTask36(' + jsArg(s.id) + ')"><i data-lucide="search-check" class="w-4 h-4"></i> Periksa</button></div>';
    }).join('') : emptyState('inbox', 'Tidak ada pengumpulan', f.st === 'Menunggu' ? 'Semua tugas sudah diperiksa 🎉' : 'Belum ada data untuk filter ini.')) : '') +
    (d.tasks.length && (selN || pend) ? '<div class="ad36-bulk"><i data-lucide="check-check" class="w-5 h-5"></i><span class="text-sm flex-1">' + (selN ? selN + ' tugas dipilih' : pend + ' tugas menunggu diperiksa') + '</span>' +
      (selN ? '<button class="btn-white !py-2" onclick="bulkApprove36(false,this)"><i data-lucide="check" class="w-4 h-4"></i> Setujui Terpilih</button>' : '') +
      (pend ? '<button class="btn-amber is-solid !py-2" onclick="bulkApprove36(true,this)"><i data-lucide="check-check" class="w-4 h-4"></i> Setujui Semua yang Menunggu' + (f.task ? ' (tugas ini)' : '') + '</button>' : '') + '</div>' : '');
  refreshIcons();
}
async function reviewTask36(subId) {
  const d = bd36('tugas'), s = d.submissions.filter(x => x.id === subId)[0]; if (!s) return;
  const t = d.tasks.filter(x => x.id === s.matId)[0] || {};
  const r = await Swal.fire({ width: 760, title: esc(t.title || 'Tugas'), showDenyButton: s.status !== 'Revisi', showConfirmButton: s.status !== 'Disetujui', showCancelButton: true,
    confirmButtonText: 'Setujui', denyButtonText: 'Minta Revisi', cancelButtonText: 'Tutup', focusConfirm: false,
    html: '<div class="text-left"><p class="text-sm"><b>' + esc(s.fullName || s.email) + '</b> · ' + esc(s.email) + '</p><p class="text-xs text-muted">Dikirim ' + esc(fmtWib(s.submittedAt, true)) + ' · status ' + esc(s.status) + '</p>' +
      (s.answer ? '<div class="mv36-text">' + esc(s.answer) + '</div>' : '') +
      (s.link ? '<p class="mt-3"><button class="btn-ghost !w-auto" onclick="openLink(' + jsArg(s.link) + ')"><i data-lucide="external-link" class="w-4 h-4"></i> ' + esc(shortText(s.link, 60)) + '</button></p>' : '') +
      (s.files.length ? '<div class="v4-files mt-3">' + s.files.map(f => '<div class="v4-file">' + (f.isImage ? '<img src="' + esc(f.image) + '" alt="" onclick="openLink(' + jsArg(f.preview) + ')">' : '<i data-lucide="file-text" class="w-6 h-6"></i>') + '<button type="button" class="truncate text-xs" onclick="openLink(' + jsArg(f.preview) + ')">' + esc(f.name) + '</button></div>').join('') + '</div>' : '') +
      '<label class="form-label mt-4">Catatan untuk peserta ' + (s.status === 'Revisi' ? '' : '(wajib bila minta revisi)') + '</label><textarea id="rvNote" class="form-input" rows="3" placeholder="mis. Bagus! / Tambahkan tangkapan layar hasil.">' + esc(s.feedback || '') + '</textarea></div>',
    didOpen: refreshIcons,
    preDeny: () => { const n = val('rvNote'); if (n.length < 3) { Swal.showValidationMessage('Tulis catatan revisi (minimal 3 karakter).'); return false; } return n; },
    preConfirm: () => val('rvNote') });
  if (r.isDismissed) return;
  const res = await api('reviewSubmission', { subId: subId, approve: r.isConfirmed, feedback: r.isConfirmed ? r.value || '' : r.value });
  if (toastRes(res)) { BD36.sel = {}; bd36Reload('tugas'); }
}
async function bulkApprove36(all, btn) {
  const d = bd36('tugas'), f = BD36.f;
  const ids = Object.keys(BD36.sel).filter(k => BD36.sel[k]);
  const n = all ? d.submissions.filter(s => s.status === 'Menunggu' && (!f.task || s.matId === f.task)).length : ids.length;
  const r = await Swal.fire({ icon: 'question', title: 'Setujui ' + n + ' tugas sekaligus?', text: 'Peserta tidak dikirimi notifikasi satu per satu.', showCancelButton: true, confirmButtonText: 'Setujui', cancelButtonText: 'Batal' });
  if (!r.isConfirmed) return;
  const res = await withBusy(btn, 'Menyimpan…', () => api('reviewSubmissionsBulk', all ? { bootId: BD.id, allPending: true, matId: f.task } : { bootId: BD.id, subIds: ids }));
  if (toastRes(res)) { BD36.sel = {}; bd36Reload('tugas'); }
}


// ════════════════════════════════════════════════════════════
// 3. PROGRES & SYARAT SERTIFIKAT
// ════════════════════════════════════════════════════════════
const REQ_COLS = [['attend', 'Presensi'], ['checklist', 'Checklist'], ['tasks', 'Tugas'], ['eval', 'Kuesioner'], ['portfolio', 'Portofolio']];
function renderProgressAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'progres') return;
  const s = d.summary, rl = d.rules, cols = REQ_COLS.filter(c => d.participants.some(p => p.items.some(i => i.key === c[0])) || (c[0] === 'attend'));
  box.innerHTML = '<div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">' + kpi('Peserta Aktif', s.total, 'users', cssVar('--accent')) + kpi('Syarat Lengkap', s.complete, 'list-checks', cssVar('--success')) +
      kpi('Bersertifikat', s.certified, 'award', cssVar('--amber')) + kpi('Rata-rata Progres', s.avgPct + '%', 'gauge', cssVar('--indigo')) + '</div>' +
    '<div class="card36 mb-5"><div class="card36-h"><span class="card36-ico"><i data-lucide="sliders-horizontal" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Syarat Penerbitan Sertifikat</h3><p>Tombol unduh sertifikat peserta aktif hanya bila semua syarat yang dicentang terpenuhi.</p></div></div>' +
      '<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">' +
        '<label class="ar36-pill !justify-between"><span>Presensi minimal</span><span><input id="rlAtt" type="number" min="0" max="100" class="form-input !w-20 !py-1 inline" value="' + rl.minAttendPct + '"> %</span></label>' +
        '<label class="ar36-pill"><input type="checkbox" id="rlChk"' + (rl.requireChecklist ? ' checked' : '') + '> Semua materi wajib dicentang</label>' +
        '<label class="ar36-pill"><input type="checkbox" id="rlEval"' + (rl.requireEval ? ' checked' : '') + '> Kuesioner evaluasi terisi</label>' +
        '<label class="ar36-pill"><input type="checkbox" id="rlPort"' + (rl.requirePortfolio ? ' checked' : '') + '> Portofolio & kesan-pesan</label>' +
        '<label class="ar36-pill"><input type="checkbox" id="rlTask"' + (rl.requireTasks ? ' checked' : '') + '> Semua tugas wajib disetujui</label>' +
        '<label class="ar36-pill !justify-between"><span>Tangkapan layar</span><span><input id="rlMin" type="number" min="1" max="10" class="form-input !w-16 !py-1 inline" value="' + rl.portfolioMin + '"> – <input id="rlMax" type="number" min="1" max="10" class="form-input !w-16 !py-1 inline" value="' + rl.portfolioMax + '"></span></label>' +
      '</div><div class="flex justify-end mt-3"><button class="btn-primary !w-auto" onclick="saveRules36(this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan Syarat</button></div></div>' +
    '<div class="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 class="text-base font-bold text-main">Progres per Peserta</h3><div class="flex gap-2">' +
      '<button class="btn-ghost !w-auto" onclick="exportProgress36()"><i data-lucide="download" class="w-4 h-4"></i> CSV</button>' +
      '<button class="btn-ghost !w-auto" onclick="withBusy(this,\'Memuat…\',()=>bd36Reload(\'progres\'))"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div></div>' +
    (d.participants.length ? '<div class="overflow-x-auto panel35 !p-0"><table class="ad36-matrix"><thead><tr><th>Peserta</th><th>Progres</th>' + cols.map(c => '<th>' + c[1] + '</th>').join('') + '<th>Sertifikat</th></tr></thead><tbody>' +
      d.participants.map(p => '<tr><td><b class="text-main">' + esc(p.fullName || p.email) + '</b><br><small class="text-muted">' + esc(p.email) + '</small></td>' +
        '<td style="min-width:120px"><b>' + p.pct + '%</b>' + bar(p.pct, p.allDone ? 'var(--success)' : 'var(--accent)') + '</td>' +
        cols.map(c => { const it = p.items.filter(i => i.key === c[0])[0]; if (!it) return '<td class="text-muted">—</td>';
          return '<td title="' + esc(it.detail) + '"><span class="' + (it.done ? 'ad36-ok' : 'ad36-no') + '"><i data-lucide="' + (it.done ? 'check-circle-2' : 'circle-dashed') + '" class="w-4 h-4 inline"></i></span> <small class="text-muted">' + (it.total > 1 ? it.value + '/' + (it.need || it.total) : '') + '</small></td>'; }).join('') +
        '<td>' + (p.cert ? '<button class="mono text-xs text-accent font-semibold" onclick="openLink(location.pathname+\'#/verifikasi/' + esc(p.cert) + '\')">' + esc(p.cert) + '</button>' : (p.allDone ? '<span class="badge badge-success">Siap</span>' : '<span class="text-xs text-muted">—</span>')) + '</td></tr>').join('') +
      '</tbody></table></div>' : emptyState('users', 'Belum ada peserta', 'Peserta yang terdaftar & tidak ditolak akan tampil di sini.'));
  refreshIcons();
}
async function saveRules36(btn) {
  const c = { minAttendPct: Number(val('rlAtt')), requireChecklist: document.getElementById('rlChk').checked, requireEval: document.getElementById('rlEval').checked,
    requirePortfolio: document.getElementById('rlPort').checked, requireTasks: document.getElementById('rlTask').checked, portfolioMin: Number(val('rlMin')), portfolioMax: Number(val('rlMax')) };
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveBootcampSettings', { bootId: BD.id, completion: c }));
  if (toastRes(res)) { bd36Reload('progres'); delete BD36.data[bd36Key('kurikulum')]; }
}
function exportProgress36() {
  const d = bd36('progres'); if (!d) return;
  downloadCsv('progres_' + d.bootcamp.title.replace(/[^\w]+/g, '_') + '.csv', [['Nama', 'Email', 'Status', 'Progres %'].concat(REQ_COLS.map(c => c[1]), ['Tugas disetujui', 'Kode sertifikat'])].concat(
    d.participants.map(p => [p.fullName, p.email, p.status, p.pct].concat(REQ_COLS.map(c => { const it = p.items.filter(i => i.key === c[0])[0]; return it ? (it.done ? 'Ya' : 'Belum') + ' (' + it.detail + ')' : '-'; }), [p.tasks.approved + '/' + p.tasks.total, p.cert]))));
}


// ════════════════════════════════════════════════════════════
// 4. EVALUASI — penyusun kuesioner + ringkasan hasil
// ════════════════════════════════════════════════════════════
function renderEvalAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'evaluasi') return;
  if (!BD36.form || BD36.formBoot !== BD.id) { BD36.form = JSON.parse(JSON.stringify(d.form || { intro: '', questions: [] })); BD36.formBoot = BD.id; }
  const F = BD36.form, QT = [['scale', 'Skala 1–5'], ['choice', 'Pilihan ganda'], ['short', 'Isian singkat'], ['long', 'Isian panjang']];
  box.innerHTML = '<div class="grid xl:grid-cols-2 gap-6"><div class="card36"><div class="card36-h"><span class="card36-ico"><i data-lucide="list-plus" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Kuesioner Evaluasi Akhir</h3><p>Wajib diisi peserta sebelum sertifikat bisa diunduh (bila syarat aktif).</p></div></div>' +
      '<label class="form-label">Pengantar</label><textarea class="form-input" rows="2" oninput="BD36.form.intro=this.value">' + esc(F.intro || '') + '</textarea>' +
      '<div class="grid gap-2 mt-3">' + F.questions.map((q, i) => '<div class="ad36-q"><div class="ad36-q-h"><b class="text-sm text-main">' + (i + 1) + '.</b>' +
          '<input class="form-input flex-1" value="' + esc(q.label) + '" placeholder="Pertanyaan" oninput="BD36.form.questions[' + i + '].label=this.value">' +
          '<button class="btn-icon !w-8 !h-8" title="Naik" onclick="qMove36(' + i + ',-1)"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>' +
          '<button class="btn-icon !w-8 !h-8" title="Hapus" onclick="BD36.form.questions.splice(' + i + ',1);renderEvalAdmin(bd36(\'evaluasi\'))"><i data-lucide="x" class="w-4 h-4"></i></button></div>' +
        '<div class="flex flex-wrap items-center gap-3 text-sm"><select class="form-input !w-auto !py-1" onchange="BD36.form.questions[' + i + '].type=this.value;renderEvalAdmin(bd36(\'evaluasi\'))">' + QT.map(t => '<option value="' + t[0] + '"' + (q.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select>' +
          '<label class="inline-flex items-center gap-1.5"><input type="checkbox"' + (q.required ? ' checked' : '') + ' onchange="BD36.form.questions[' + i + '].required=this.checked"> Wajib</label></div>' +
        (q.type === 'choice' ? '<input class="form-input" value="' + esc((q.options || []).join(', ')) + '" placeholder="Pilihan dipisah koma, mis. Sangat setuju, Setuju, Ragu" oninput="BD36.form.questions[' + i + '].options=this.value.split(\',\').map(x=>x.trim()).filter(Boolean)">' : '') +
        (q.type === 'scale' ? '<div class="grid2"><input class="form-input" value="' + esc(q.scaleLow || '') + '" placeholder="Label 1 (mis. Kurang)" oninput="BD36.form.questions[' + i + '].scaleLow=this.value"><input class="form-input" value="' + esc(q.scaleHigh || '') + '" placeholder="Label 5 (mis. Sangat baik)" oninput="BD36.form.questions[' + i + '].scaleHigh=this.value"></div>' : '') +
        '</div>').join('') + '</div>' +
      '<div class="flex flex-wrap gap-2 mt-3"><button class="btn-ghost !w-auto" onclick="BD36.form.questions.push({id:\'\',label:\'\',type:\'scale\',required:true,options:[]});renderEvalAdmin(bd36(\'evaluasi\'))"><i data-lucide="plus" class="w-4 h-4"></i> Pertanyaan</button>' +
        (F.questions.length ? '' : '<button class="btn-ghost !w-auto" onclick="evalTemplate36()"><i data-lucide="wand-sparkles" class="w-4 h-4"></i> Pakai Contoh</button>') +
        '<button class="btn-primary !w-auto ml-auto" onclick="saveEvalForm36(this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan Kuesioner</button></div></div>' +
    '<div class="card36"><div class="card36-h"><span class="card36-ico is-amber"><i data-lucide="bar-chart-3" class="w-5 h-5"></i></span><div class="min-w-0 flex-1"><h3>Hasil (' + d.respondents + ' dari ' + d.participants + ' peserta)</h3><p>Ringkasan jawaban peserta.</p></div>' +
      (d.respondents ? '<button class="btn-ghost !w-auto" onclick="exportEval36()"><i data-lucide="download" class="w-4 h-4"></i> CSV</button>' : '') + '</div>' +
      (d.results.length && d.respondents ? d.results.map(r => '<div class="q36"><p class="q36-l">' + esc(r.label) + ' <small class="text-muted">(' + r.answered + ' jawaban)</small></p>' +
        (r.type === 'scale' ? '<p class="text-2xl font-bold text-main">' + r.avg.toFixed(2).replace('.', ',') + ' <small class="text-sm text-muted">/ 5</small></p><div class="ad36-bars">' + r.dist.map((n, k) => '<div class="ad36-bar"><span>' + (k + 1) + (k === 0 && r.scaleLow ? ' · ' + esc(r.scaleLow) : k === 4 && r.scaleHigh ? ' · ' + esc(r.scaleHigh) : '') + '</span>' + bar(r.answered ? n / r.answered * 100 : 0) + '<b>' + n + '</b></div>').join('') + '</div>'
          : r.type === 'choice' ? '<div class="ad36-bars">' + Object.keys(r.counts).map(k => '<div class="ad36-bar"><span class="truncate">' + esc(k) + '</span>' + bar(r.answered ? r.counts[k] / r.answered * 100 : 0) + '<b>' + r.counts[k] + '</b></div>').join('') + '</div>'
          : '<div class="grid gap-1.5 max-h-60 overflow-y-auto">' + r.answers.map(a => '<p class="text-sm"><b>' + esc(a.name) + ':</b> ' + esc(a.text) + '</p>').join('') + '</div>') + '</div>').join('')
        : emptyState('inbox', 'Belum ada jawaban', 'Hasil tampil setelah peserta mengisi kuesioner.')) + '</div></div>';
  refreshIcons();
}
function qMove36(i, dir) { const Q = BD36.form.questions, j = i + dir; if (j < 0 || j >= Q.length) return; const t = Q[i]; Q[i] = Q[j]; Q[j] = t; renderEvalAdmin(bd36('evaluasi')); }
function evalTemplate36() {
  BD36.form.questions = [
    { id: '', label: 'Seberapa puas Anda dengan bootcamp ini secara keseluruhan?', type: 'scale', required: true, scaleLow: 'Kurang', scaleHigh: 'Sangat puas' },
    { id: '', label: 'Seberapa jelas penyampaian materi oleh mentor?', type: 'scale', required: true, scaleLow: 'Kurang jelas', scaleHigh: 'Sangat jelas' },
    { id: '', label: 'Apakah Anda akan merekomendasikan bootcamp ini?', type: 'choice', required: true, options: ['Ya, pasti', 'Mungkin', 'Tidak'] },
    { id: '', label: 'Materi yang paling bermanfaat', type: 'short', required: false },
    { id: '', label: 'Saran untuk bootcamp berikutnya', type: 'long', required: false }];
  renderEvalAdmin(bd36('evaluasi'));
}
async function saveEvalForm36(btn) {
  const F = BD36.form;
  if (F.questions.some(q => !String(q.label || '').trim())) return showToast('Lengkapi teks pertanyaan', '', 'warning');
  if (F.questions.some(q => q.type === 'choice' && (q.options || []).length < 2)) return showToast('Pilihan ganda butuh minimal 2 pilihan', '', 'warning');
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveBootcampSettings', { bootId: BD.id, evalForm: F }));
  if (toastRes(res)) { BD36.form = null; bd36Reload('evaluasi'); }
}
function exportEval36() {
  const d = bd36('evaluasi'); if (!d) return;
  const qs = d.form.questions;
  downloadCsv('evaluasi_' + BD.id.slice(0, 8) + '.csv', [['Nama', 'Email', 'Waktu'].concat(qs.map(q => q.label))].concat(d.raw.map(r => [r.name, r.email, fmtWib(r.submittedAt, true)].concat(qs.map(q => r.answers[q.id] === undefined ? '' : r.answers[q.id])))));
}


// ════════════════════════════════════════════════════════════
// 5. PORTOFOLIO — kurasi tayang/arsip, unggulan, hapus permanen
// ════════════════════════════════════════════════════════════
function renderPortAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'portofolio') return;
  const cur = bd36('kurikulum'), mode = cur && cur.settings ? cur.settings.testimonyMode : 'kurasi';
  const list = d.portfolios || [];
  box.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h3 class="text-lg font-bold text-main">Portofolio & Testimoni Alumni</h3>' +
      '<p class="text-xs text-muted">Pilih karya yang tampil di halaman depan (Publik) atau hanya sebagai arsip kelulusan.</p></div>' +
      '<div class="flex flex-wrap items-center gap-2"><label class="text-xs font-semibold text-muted">Karya baru:</label><select class="form-input !w-auto" onchange="saveTestiMode36(this.value)">' +
        '<option value="kurasi"' + (mode !== 'auto' ? ' selected' : '') + '>Menunggu kurasi Admin</option><option value="auto"' + (mode === 'auto' ? ' selected' : '') + '>Langsung tampil (otomatis)</option></select>' +
      '<button class="btn-ghost !w-auto" onclick="withBusy(this,\'Memuat…\',()=>bd36Reload(\'portofolio\'))"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div></div>' +
    (list.length ? '<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">' + list.map(p => '<article class="ad36-port' + (p.visibility === 'Publik' ? ' is-pub' : '') + '">' +
        '<div class="ad36-strip">' + p.shots.map(s => '<img src="' + esc(s) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onclick="previewImage(this.src,' + jsArg(p.title) + ')">').join('') + '</div>' +
        '<div class="p-4 flex flex-col gap-2 flex-1"><div class="flex items-center gap-2.5">' + avatar36(p.photo, p.name, 38) + '<div class="min-w-0 flex-1"><b class="text-main text-sm block truncate">' + esc(p.name) + '</b><small class="text-muted text-xs">' + esc(p.email) + '</small></div>' + stars36(p.rating) + '</div>' +
          '<p class="text-sm font-bold text-accent">' + esc(p.title) + '</p><p class="text-sm text-muted line-clamp-3">' + esc(p.testimony) + '</p>' +
          '<p class="text-xs text-muted">Diperbarui ' + esc(fmtWib(p.updatedAt || p.submittedAt, true)) + (p.curatedBy ? ' · dikurasi ' + esc(p.curatedBy) : '') + '</p>' +
          '<div class="flex flex-wrap items-center gap-2 mt-auto pt-2"><div class="ad36-seg2"><button class="' + (p.visibility !== 'Publik' ? 'is-on' : '') + '" onclick="curate36(' + jsArg(p.id) + ',{visibility:\'Arsip\'})">Arsip</button>' +
            '<button class="' + (p.visibility === 'Publik' ? 'is-on is-pub' : '') + '" onclick="curate36(' + jsArg(p.id) + ',{visibility:\'Publik\'})">Publik</button></div>' +
            '<button class="btn-icon !w-9 !h-9" title="' + (p.featured ? 'Hapus dari unggulan' : 'Jadikan unggulan') + '" onclick="curate36(' + jsArg(p.id) + ',{featured:' + !p.featured + '})" style="' + (p.featured ? 'color:#F59E0B' : '') + '"><i data-lucide="star" class="w-4 h-4"></i></button>' +
            (p.demoUrl ? '<button class="btn-icon !w-9 !h-9" title="Demo" onclick="openLink(' + jsArg(p.demoUrl) + ')"><i data-lucide="external-link" class="w-4 h-4"></i></button>' : '') +
            '<button class="btn-icon !w-9 !h-9 ml-auto" title="Hapus permanen" onclick="deletePort36(' + jsArg(p.id) + ')" style="color:var(--error)"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div></article>').join('') + '</div>'
      : emptyState('trophy', 'Belum ada portofolio', 'Peserta mengunggah portofolio akhir dari Ruang Belajar → Evaluasi & Portofolio.'));
  refreshIcons();
  if (!cur) bd36Load('kurikulum', 'bootcampCurriculum').then(() => { if (BD.tab === 'portofolio') renderPortAdmin(bd36('portofolio')); });
}
async function curate36(id, patch) {
  const d = bd36('portofolio'), p = d && d.portfolios.filter(x => x.id === id)[0];
  if (p) { if (patch.visibility) p.visibility = patch.visibility; if (patch.featured !== undefined) p.featured = patch.featured; renderPortAdmin(d); }
  const res = await api('curatePortfolio', Object.assign({ portId: id }, patch));
  if (!toastRes(res)) bd36Reload('portofolio');
}
async function saveTestiMode36(mode) { const res = await api('saveBootcampSettings', { bootId: BD.id, testimonyMode: mode }); if (toastRes(res)) { const c = bd36('kurikulum'); if (c) c.settings.testimonyMode = mode; } }
async function deletePort36(id) {
  const d = bd36('portofolio'), p = d.portfolios.filter(x => x.id === id)[0]; if (!p) return;
  const r = await Swal.fire({ icon: 'warning', title: 'Hapus permanen?', width: 560,
    html: '<p class="text-sm text-left">Portofolio <b>' + esc(p.title) + '</b> milik <b>' + esc(p.name) + '</b> beserta ' + (p.shotIds.length + (p.photoFileId ? 1 : 0)) + ' berkas gambarnya akan dihapus <b>permanen</b> dari database dan Google Drive. Tindakan ini tidak bisa dibatalkan. Sertifikat yang sudah terbit tetap sah.</p>' +
      '<label class="form-label mt-3 text-left">Ketik nama peserta untuk konfirmasi: <b>' + esc(p.name) + '</b></label><input id="dpName" class="form-input" autocomplete="off">',
    showCancelButton: true, confirmButtonText: 'Hapus Permanen', cancelButtonText: 'Batal', confirmButtonColor: '#DC2626',
    preConfirm: () => { const v = val('dpName'); if (v.trim().toLowerCase() !== String(p.name).trim().toLowerCase()) { Swal.showValidationMessage('Nama tidak cocok.'); return false; } return v; } });
  if (!r.isConfirmed) return;
  const res = await api('deletePortfolio', { portId: id, confirmName: r.value });
  if (toastRes(res)) bd36Reload('portofolio');
}


// ════════════════════════════════════════════════════════════
// 6. SERTIFIKAT — desainer seret-lepas + daftar terbit
// ════════════════════════════════════════════════════════════
const CD_FONT = { sans: 'Inter, sans-serif', serif: '"Playfair Display", Georgia, serif', script: '"Great Vibes", cursive', mono: 'monospace' };
function cdThumb(id) { return id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600' : ''; }
async function bd36LoadCerts() {
  const res = await api('certificatesAdmin', { bootId: BD.id });
  if (res.success) { BD36.data[bd36Key('certs')] = res.data; if (BD.tab === 'sertifikat') renderCertList36(); }
}
function renderCertAdmin(d) {
  const box = bd36Body(); if (!box || BD.tab !== 'sertifikat') return;
  if (!BD36.cd || BD36.cdBoot !== BD.id) { BD36.cd = JSON.parse(JSON.stringify(d.settings.cert)); BD36.cdBoot = BD.id; BD36.cdSel = null; }
  loadScript('js/v36-cert.js?v=' + FRONT_VERSION).then(() => CertRender.loadFonts());
  box.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h3 class="text-lg font-bold text-main">Desain Sertifikat</h3><p class="text-xs text-muted">Klik elemen untuk memilih, seret untuk memindahkan. Teks bisa memakai penanda {nama}, {bootcamp}, {tanggal}, {nomor}, {profesi}, {pertemuan}.</p></div>' +
      '<div class="flex flex-wrap gap-2"><button class="btn-ghost !w-auto" onclick="resetCert36()"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Desain Bawaan</button>' +
      '<button class="btn-ghost !w-auto" onclick="previewCert36(this)"><i data-lucide="eye" class="w-4 h-4"></i> Pratinjau sebagai Peserta Contoh</button>' +
      '<button class="btn-primary !w-auto" onclick="saveCert36(this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan Desain</button></div></div>' +
    '<div class="cd36"><div><div id="cdStage" class="cd36-stage ' + (BD36.cd.orientation === 'portrait' ? 'is-port' : 'is-land') + '"></div>' +
      '<div class="cd36-tip mt-3"><b>Panduan latar:</b> JPG/PNG, A4 ' + (BD36.cd.orientation === 'portrait' ? 'tegak 2480 × 3508 px' : 'mendatar 3508 × 2480 px') + ' (300 dpi) atau versi ringan ' + (BD36.cd.orientation === 'portrait' ? '1754 × 2480' : '2480 × 1754') + ' px, maks 5 MB. ' +
        'Biarkan area tengah polos agar teks terbaca. <b>Tanda tangan:</b> PNG latar transparan, ±1200 × 500 px. <b>Logo:</b> PNG transparan.</div></div>' +
      '<div class="cd36-side" id="cdSide"></div></div>' +
    '<div class="mt-8" id="certList36"></div>';
  renderCdStage(); renderCdSide(); renderCertList36(); refreshIcons();
}
function renderCdStage() {
  const st = document.getElementById('cdStage'); if (!st) return;
  const c = BD36.cd, sel = BD36.cdSel;
  const elx = (kind, i, o, inner, extraCls, style) => '<div class="cd36-el ' + (extraCls || '') + (sel && sel.k === kind && sel.i === i ? ' is-sel' : '') + '" data-k="' + kind + '" data-i="' + i + '" style="left:' + o.x + '%;top:' + o.y + '%;' + (style || '') + '" onpointerdown="cdDown(event,this)">' + inner + '</div>';
  st.style.setProperty('--cd-accent', c.accent || '#1E40AF');
  st.innerHTML = (c.bgFileId ? '<div class="cd36-bg" style="background-image:url(\'' + cdThumb(c.bgFileId) + '\');opacity:' + (c.bgOpacity / 100) + '"></div>' : (c.frame !== false ? '<div class="cd36-frame"></div>' : '')) +
    c.logos.map((l, i) => elx('logo', i, l, '<img src="' + cdThumb(l.fileId) + '" alt="logo" referrerpolicy="no-referrer">', '', 'width:' + l.w + '%')).join('') +
    c.texts.map((t, i) => elx('text', i, t, esc(t.text), 'al-' + (t.align || 'center'), 'font-size:' + t.size + 'cqw;color:' + t.color + ';font-weight:' + t.weight + ';font-family:' + CD_FONT[t.font || 'sans'] + ';' + (t.italic ? 'font-style:italic;' : '') + (t.spacing ? 'letter-spacing:' + t.spacing + 'em;' : ''))).join('') +
    c.signs.map((s, i) => elx('sign', i, s, '<img src="' + cdThumb(s.fileId) + '" alt="ttd" referrerpolicy="no-referrer"><div style="border-top:.15cqw solid #334155;margin-top:.3cqw;padding-top:.3cqw;text-align:center;font-size:1.4cqw;font-weight:700;color:#0F172A;font-family:Inter">' + esc(s.name || 'Nama') + '</div><div style="text-align:center;font-size:1.1cqw;color:#475569;font-family:Inter">' + esc(s.role || 'Jabatan') + '</div>', '', 'width:' + s.w + '%')).join('') +
    (c.qr.show ? elx('qr', 0, c.qr, '<div class="cd36-qr" style="width:' + c.qr.size + 'cqw">QR</div><div style="text-align:center;font-size:.85cqw;color:#475569;font-family:Inter;margin-top:.3cqw">' + esc(c.qr.label || '') + '</div>') : '');
}
function cdDown(e, el) {
  e.preventDefault();
  const k = el.dataset.k, i = Number(el.dataset.i), st = document.getElementById('cdStage'), R = st.getBoundingClientRect();
  BD36.cdSel = { k: k, i: i };
  const o = k === 'qr' ? BD36.cd.qr : BD36.cd[{ text: 'texts', logo: 'logos', sign: 'signs' }[k]][i];
  const sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
  document.querySelectorAll('.cd36-el.is-sel').forEach(x => x.classList.remove('is-sel')); el.classList.add('is-sel');
  const mv = ev => { o.x = Math.max(0, Math.min(100, Math.round((ox + (ev.clientX - sx) / R.width * 100) * 10) / 10)); o.y = Math.max(0, Math.min(100, Math.round((oy + (ev.clientY - sy) / R.height * 100) * 10) / 10)); el.style.left = o.x + '%'; el.style.top = o.y + '%'; };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); renderCdSide(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  renderCdSide();
}
function cdSelect(k, i) { BD36.cdSel = { k: k, i: i }; renderCdStage(); renderCdSide(); }
function cdObj() { const s = BD36.cdSel; if (!s) return null; return s.k === 'qr' ? BD36.cd.qr : (BD36.cd[{ text: 'texts', logo: 'logos', sign: 'signs' }[s.k]] || [])[s.i] || null; }
function cdSet(field, v, num) { const o = cdObj(); if (!o) return; o[field] = num ? Number(v) : v; renderCdStage(); }
function renderCdSide() {
  const box = document.getElementById('cdSide'); if (!box) return;
  const c = BD36.cd, s = BD36.cdSel, o = cdObj();
  const items = c.texts.map((t, i) => ['text', i, 'type', t.text]).concat(c.logos.map((l, i) => ['logo', i, 'image', 'Logo ' + (i + 1)]), c.signs.map((g, i) => ['sign', i, 'pen-line', 'TTD: ' + (g.name || 'Penanda tangan')]), c.qr.show ? [['qr', 0, 'qr-code', 'QR verifikasi']] : []);
  let props = '<p class="text-xs text-muted">Pilih elemen di pratinjau atau daftar untuk mengubahnya.</p>';
  if (o && s.k === 'text') props = '<label>Teks<input class="form-input" value="' + esc(o.text) + '" oninput="cdSet(\'text\',this.value);document.querySelectorAll(\'#cdSide .cd36-list button.is-sel span\').forEach(x=>x.textContent=this.value)"></label>' +
    '<div class="row"><label>Ukuran<input type="range" min="0.6" max="10" step="0.1" value="' + o.size + '" oninput="cdSet(\'size\',this.value,1)"></label><label>Warna<input type="color" value="' + esc(o.color) + '" oninput="cdSet(\'color\',this.value)"></label></div>' +
    '<div class="row"><label>Huruf<select class="form-input !py-1" onchange="cdSet(\'font\',this.value)">' + [['sans', 'Sans (Inter)'], ['serif', 'Serif elegan'], ['script', 'Tulisan tangan'], ['mono', 'Monospace']].map(f => '<option value="' + f[0] + '"' + (o.font === f[0] ? ' selected' : '') + '>' + f[1] + '</option>').join('') + '</select></label>' +
      '<label>Tebal<select class="form-input !py-1" onchange="cdSet(\'weight\',this.value,1)">' + [400, 500, 600, 700, 800].map(w => '<option' + (o.weight === w ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></label></div>' +
    '<div class="row"><label>Rata<select class="form-input !py-1" onchange="cdSet(\'align\',this.value)">' + [['center', 'Tengah'], ['left', 'Kiri'], ['right', 'Kanan']].map(a => '<option value="' + a[0] + '"' + (o.align === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></label>' +
      '<label>Spasi huruf<input type="range" min="0" max="0.6" step="0.02" value="' + (o.spacing || 0) + '" oninput="cdSet(\'spacing\',this.value,1)"></label></div>' +
    '<label class="!flex !flex-row items-center gap-2"><input type="checkbox"' + (o.italic ? ' checked' : '') + ' onchange="cdSet(\'italic\',this.checked)"> Miring</label>';
  else if (o && (s.k === 'logo' || s.k === 'sign')) props = '<label>Lebar<input type="range" min="3" max="40" step="0.5" value="' + o.w + '" oninput="cdSet(\'w\',this.value,1)"></label>' +
    (s.k === 'sign' ? '<label>Nama penanda tangan<input class="form-input" value="' + esc(o.name || '') + '" oninput="cdSet(\'name\',this.value)"></label><label>Jabatan<input class="form-input" value="' + esc(o.role || '') + '" oninput="cdSet(\'role\',this.value)"></label>' : '') +
    '<button class="btn-ghost !w-auto" onclick="cdReplaceImg()"><i data-lucide="replace" class="w-4 h-4"></i> Ganti Gambar</button>';
  else if (o && s.k === 'qr') props = '<label>Ukuran QR<input type="range" min="5" max="25" step="0.5" value="' + o.size + '" oninput="cdSet(\'size\',this.value,1)"></label><label>Label<input class="form-input" value="' + esc(o.label || '') + '" oninput="cdSet(\'label\',this.value)"></label>';
  box.innerHTML = '<div class="cd36-props"><p class="text-xs font-bold text-main uppercase tracking-wider">Halaman</p>' +
      '<div class="row"><label>Orientasi<select class="form-input !py-1" onchange="BD36.cd.orientation=this.value;renderCertAdmin(bd36(\'kurikulum\'))"><option value="landscape"' + (c.orientation !== 'portrait' ? ' selected' : '') + '>Mendatar</option><option value="portrait"' + (c.orientation === 'portrait' ? ' selected' : '') + '>Tegak</option></select></label>' +
        '<label>Warna bingkai<input type="color" value="' + esc(c.accent || '#1E40AF') + '" oninput="BD36.cd.accent=this.value;renderCdStage()"></label></div>' +
      '<div class="flex flex-wrap gap-2"><button class="btn-ghost !w-auto !py-1.5" onclick="cdUploadBg()"><i data-lucide="image-up" class="w-4 h-4"></i> ' + (c.bgFileId ? 'Ganti Latar' : 'Unggah Latar') + '</button>' +
        (c.bgFileId ? '<button class="btn-ghost !w-auto !py-1.5" onclick="BD36.cd.bgFileId=\'\';renderCdStage();renderCdSide()"><i data-lucide="x" class="w-4 h-4"></i> Hapus Latar</button>' : '') + '</div>' +
      (c.bgFileId ? '<label>Transparansi latar: ' + c.bgOpacity + '%<input type="range" min="10" max="100" step="5" value="' + c.bgOpacity + '" oninput="BD36.cd.bgOpacity=Number(this.value);this.parentNode.firstChild.textContent=\'Transparansi latar: \'+this.value+\'%\';renderCdStage()"></label>'
        : '<label class="!flex !flex-row items-center gap-2"><input type="checkbox"' + (c.frame !== false ? ' checked' : '') + ' onchange="BD36.cd.frame=this.checked;renderCdStage()"> Bingkai bawaan (tanpa latar)</label>') + '</div>' +
    '<div class="flex flex-wrap gap-2"><button class="btn-ghost !w-auto !py-1.5" onclick="BD36.cd.texts.push({id:\'t\'+Date.now().toString(36),text:\'Teks baru\',x:50,y:85,size:1.6,color:\'#334155\',weight:600,align:\'center\',font:\'sans\',italic:false,spacing:0});cdSelect(\'text\',BD36.cd.texts.length-1)"><i data-lucide="type" class="w-4 h-4"></i> Teks</button>' +
      '<button class="btn-ghost !w-auto !py-1.5" onclick="cdAddImg(\'logo\')"><i data-lucide="image-plus" class="w-4 h-4"></i> Logo</button>' +
      '<button class="btn-ghost !w-auto !py-1.5" onclick="cdAddImg(\'sign\')"><i data-lucide="pen-line" class="w-4 h-4"></i> Tanda Tangan</button>' +
      '<button class="btn-ghost !w-auto !py-1.5" onclick="BD36.cd.qr.show=!BD36.cd.qr.show;BD36.cdSel=null;renderCdStage();renderCdSide()"><i data-lucide="qr-code" class="w-4 h-4"></i> QR ' + (c.qr.show ? 'Aktif' : 'Mati') + '</button></div>' +
    '<div class="cd36-list">' + items.map(x => '<button class="' + (s && s.k === x[0] && s.i === x[1] ? 'is-sel' : '') + '" onclick="cdSelect(\'' + x[0] + '\',' + x[1] + ')"><i data-lucide="' + x[2] + '" class="w-4 h-4 flex-none"></i><span class="truncate flex-1">' + esc(x[3]) + '</span>' +
      (x[0] !== 'qr' ? '<i data-lucide="trash-2" class="w-4 h-4 text-muted" onclick="event.stopPropagation();cdRemove(\'' + x[0] + '\',' + x[1] + ')"></i>' : '') + '</button>').join('') + '</div>' +
    '<div class="cd36-props"><p class="text-xs font-bold text-main uppercase tracking-wider">' + (o ? 'Elemen terpilih' : 'Properti') + '</p>' + props + '</div>';
  refreshIcons();
}
function cdRemove(k, i) { BD36.cd[{ text: 'texts', logo: 'logos', sign: 'signs' }[k]].splice(i, 1); BD36.cdSel = null; renderCdStage(); renderCdSide(); }
async function cdUpload() {
  const file = await pickFile('image/png,image/jpeg,image/webp'); if (!file) return null;
  if (file.size > 5 * 1048576) { showToast('Gambar terlalu besar', 'Maksimal 5 MB.', 'warning'); return null; }
  showToast('Mengunggah…', file.name, 'info');
  const res = await uploadFile('certasset', file).catch(e => ({ success: false, message: e.message }));
  if (!res.success) { showToast('Gagal mengunggah', res.message, 'error'); return null; }
  return res.data.fileId;
}
async function cdUploadBg() { const id = await cdUpload(); if (!id) return; BD36.cd.bgFileId = id; renderCdStage(); renderCdSide(); }
async function cdAddImg(kind) {
  const id = await cdUpload(); if (!id) return;
  if (kind === 'logo') { BD36.cd.logos.push({ fileId: id, x: 50, y: 9, w: 10 }); cdSelect('logo', BD36.cd.logos.length - 1); }
  else { const n = BD36.cd.signs.length; BD36.cd.signs.push({ fileId: id, x: n ? 72 : 28, y: 84, w: 15, name: '', role: '' }); cdSelect('sign', n); }
}
async function cdReplaceImg() { const o = cdObj(); if (!o) return; const id = await cdUpload(); if (!id) return; o.fileId = id; renderCdStage(); }
async function saveCert36(btn) {
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveBootcampSettings', { bootId: BD.id, certConfig: BD36.cd }));
  if (toastRes(res)) { const d = bd36('kurikulum'); if (d) d.settings = res.data.settings; BD36.cd = JSON.parse(JSON.stringify(res.data.settings.cert)); renderCdStage(); renderCdSide(); }
}
async function resetCert36() {
  const r = await Swal.fire({ icon: 'question', title: 'Kembali ke desain bawaan?', text: 'Perubahan yang belum disimpan akan hilang.', showCancelButton: true, confirmButtonText: 'Ya', cancelButtonText: 'Batal' });
  if (!r.isConfirmed) return;
  BD36.cd = { orientation: 'landscape', bgFileId: '', bgOpacity: 100, frame: true, accent: '#1E40AF', texts: [
    { id: 't1', text: 'SERTIFIKAT', x: 50, y: 20, size: 5.2, color: '#1E3A8A', weight: 800, align: 'center', font: 'serif', italic: false, spacing: 0.25 },
    { id: 't2', text: 'Diberikan kepada', x: 50, y: 32, size: 1.8, color: '#475569', weight: 500, align: 'center', font: 'sans', italic: false, spacing: 0 },
    { id: 't3', text: '{nama}', x: 50, y: 44, size: 4.6, color: '#0F172A', weight: 700, align: 'center', font: 'script', italic: false, spacing: 0 },
    { id: 't4', text: 'atas keberhasilannya menyelesaikan program', x: 50, y: 55, size: 1.7, color: '#475569', weight: 500, align: 'center', font: 'sans', italic: false, spacing: 0 },
    { id: 't5', text: '{bootcamp}', x: 50, y: 62, size: 2.6, color: '#1E40AF', weight: 700, align: 'center', font: 'sans', italic: false, spacing: 0 },
    { id: 't6', text: '{tanggal} · No. {nomor}', x: 50, y: 70, size: 1.3, color: '#64748B', weight: 500, align: 'center', font: 'sans', italic: false, spacing: 0 }],
    logos: [], signs: [], qr: { show: true, x: 89, y: 82, size: 11, label: 'Pindai untuk verifikasi' } };
  BD36.cdSel = null; renderCertAdmin(bd36('kurikulum'));
}
async function previewCert36(btn) {
  await withBusy(btn, 'Menyiapkan…', async () => {
    await loadScript('js/v36-cert.js?v=' + FRONT_VERSION);
    const res = await api('certAssets', { bootId: BD.id, design: BD36.cd }, { timeout: 120000 });
    if (!res.success) return showToast('Gagal', res.message, 'error');
    const cv = await CertRender.draw(res.data.design, res.data.assets, res.data.values, location.origin + location.pathname + '#/verifikasi/' + res.data.values.nomor, { scale: 0.5 });
    Swal.fire({ width: 1100, showCloseButton: true, confirmButtonText: 'Tutup', title: 'Pratinjau Sertifikat (Peserta Contoh)',
      html: '<img src="' + cv.toDataURL('image/jpeg', 0.85) + '" alt="Pratinjau" style="width:100%;border-radius:10px;border:1px solid var(--border)"><p class="text-xs text-muted mt-2">Ini tampilan yang diunduh peserta (PNG/PDF A4). Desain belum disimpan sampai Anda menekan "Simpan Desain".</p>' });
  });
}
function renderCertList36() {
  const box = document.getElementById('certList36'); if (!box) return;
  const d = BD36.data[bd36Key('certs')];
  if (!d) { box.innerHTML = skeletonRows(2); return; }
  const list = d.certificates || [];
  box.innerHTML = '<div class="flex items-center justify-between gap-2 mb-3"><h3 class="text-base font-bold text-main">Sertifikat Terbit (' + list.length + ')</h3>' +
    (list.length ? '<button class="btn-ghost !w-auto" onclick="downloadCsv(\'sertifikat.csv\',[[\'Kode\',\'Nama\',\'Email\',\'Terbit\',\'Status\']].concat(BD36.data[bd36Key(\'certs\')].certificates.map(c=>[c.code,c.name,c.email,fmtWib(c.issuedAt,true),c.status])))"><i data-lucide="download" class="w-4 h-4"></i> CSV</button>' : '') + '</div>' +
    (list.length ? '<div class="overflow-x-auto panel35 !p-0"><table class="ad36-matrix"><thead><tr><th>Kode</th><th>Nama</th><th>Terbit</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(c =>
      '<tr><td class="mono text-xs">' + esc(c.code) + '</td><td><b class="text-main">' + esc(c.name) + '</b><br><small class="text-muted">' + esc(c.email) + '</small></td><td class="text-xs">' + esc(fmtWib(c.issuedAt, true)) + '</td>' +
      '<td>' + (c.status === 'Dicabut' ? '<span class="badge badge-error">Dicabut</span>' + (c.note ? '<br><small class="text-muted">' + esc(c.note) + '</small>' : '') : '<span class="badge badge-success">Valid</span>') + '</td>' +
      '<td class="text-right whitespace-nowrap"><button class="btn-icon !w-8 !h-8" title="Halaman verifikasi" onclick="openLink(location.pathname+\'#/verifikasi/' + esc(c.code) + '\')"><i data-lucide="external-link" class="w-4 h-4"></i></button>' +
        '<button class="btn-ghost !w-auto !py-1 !px-2 !text-xs" onclick="revokeCert36(' + jsArg(c.code) + ',' + (c.status === 'Dicabut') + ')">' + (c.status === 'Dicabut' ? 'Pulihkan' : 'Cabut') + '</button></td></tr>').join('') + '</tbody></table></div>'
      : '<p class="text-sm text-muted">Belum ada sertifikat terbit. Sertifikat dibuat otomatis saat peserta yang memenuhi syarat menekan tombol unduh.</p>');
  refreshIcons();
}
async function revokeCert36(code, restore) {
  let note = '';
  if (!restore) {
    const r = await Swal.fire({ icon: 'warning', title: 'Cabut sertifikat ' + esc(code) + '?', input: 'text', inputLabel: 'Alasan (tampil di catatan Admin)', showCancelButton: true, confirmButtonText: 'Cabut', cancelButtonText: 'Batal',
      inputValidator: v => (!v || v.trim().length < 3) ? 'Tulis alasan minimal 3 karakter.' : undefined });
    if (!r.isConfirmed) return; note = r.value;
  }
  const res = await api('revokeCertificate', { code: code, note: note, restore: restore });
  if (toastRes(res)) bd36LoadCerts();
}


// ════════════════════════════════════════════════════════════
// 7. DUPLIKAT BOOTCAMP (gelombang / batch baru)
// ════════════════════════════════════════════════════════════
async function openDuplicateBootcamp(id) {
  const b = (AppState.a.bootcampsAdmin || []).filter(x => x.id === id)[0] || (BD.data && BD.data.bootcamp && BD.data.bootcamp.id === id ? BD.data.bootcamp : null);
  if (!b) return;
  const first = (b.sessionsFull || [])[0];
  const m = String(b.title).match(/batch\s*(\d+)/i);
  const nextTitle = m ? b.title.replace(m[0], 'Batch ' + (Number(m[1]) + 1)) : b.title + ' (Batch Baru)';
  const r = await Swal.fire({ title: 'Duplikat Bootcamp', width: 620, showCancelButton: true, confirmButtonText: 'Duplikat', cancelButtonText: 'Batal', focusConfirm: false,
    html: '<div class="pform text-left"><p class="text-sm text-muted">Struktur kurikulum, materi, tugas, kuesioner, syarat, dan desain sertifikat ikut disalin. Peserta, presensi, dan jawaban <b>tidak</b> ikut. Hasilnya berstatus Draft tanpa token.</p>' +
      '<div><label class="form-label">Judul batch baru</label><input id="dupTitle" class="form-input" value="' + esc(nextTitle) + '"></div>' +
      (first ? '<div class="grid2"><div><label class="form-label">Pertemuan pertama batch baru</label><input id="dupDate" type="date" class="form-input" oninput="dupShift(' + jsArg(first.startAt) + ')"></div>' +
        '<div><label class="form-label">…atau geser jadwal (hari)</label><input id="dupDays" type="number" class="form-input" value="0"></div></div>' +
        '<p class="text-xs text-muted">Jadwal lama: mulai ' + esc(fmtWib(first.startAt, true)) + '. Semua pertemuan, jam absen, tenggat tugas & jadwal tayang materi ikut bergeser.</p>' : '') + '</div>',
    preConfirm: () => ({ title: val('dupTitle'), shiftDays: Number(val('dupDays')) || 0 }) });
  if (!r.isConfirmed) return;
  const res = await api('duplicateBootcamp', { bootId: id, title: r.value.title, shiftDays: r.value.shiftDays });
  if (toastRes(res)) { Admin.fetch('bootcampsAdmin', { _fresh: true }); go('admin/bootcamp/' + res.data.id); }
}
function dupShift(oldIso) {
  const v = val('dupDate'); if (!v) return;
  const w = wib(oldIso), d0 = Date.UTC(w.d.getUTCFullYear(), w.d.getUTCMonth(), w.d.getUTCDate()), p = v.split('-').map(Number), d1 = Date.UTC(p[0], p[1] - 1, p[2]);
  document.getElementById('dupDays').value = Math.round((d1 - d0) / 86400000);
}


// ════════════════════════════════════════════════════════════
// 8. B — DISTRIBUSI AKSES PRODUK (khusus Superadmin)
// ════════════════════════════════════════════════════════════
adminRoute('access-rules', {
  title: 'Distribusi Akses', superOnly: true,
  template: () => '<div class="page-wrap-fluid">' + adminHead('Distribusi Akses Produk', 'Beri akses kelas/produk ke banyak member sekaligus tanpa kode redeem — ke semua member, atau otomatis berdasarkan produk yang sudah dimiliki.',
    '<button class="btn-ghost !w-auto" onclick="withBusy(this,\'Memuat…\',()=>Admin.fetch(\'accessRulesAdmin\',{_fresh:true}))"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Segarkan</button>' +
    '<button class="btn-primary !w-auto" onclick="openRuleWizard()"><i data-lucide="plus" class="w-4 h-4"></i> Buat Aturan</button>') +
    '<div class="ar36-scheme mb-6">' +
      '<div class="ar36-opt"><span class="card36-ico"><i data-lucide="users" class="w-5 h-5"></i></span><b>Otomatis Semua Member</b><small>Semua member aktif mendapat akses produk tujuan. Bisa berlaku juga untuk member yang bergabung nanti.</small></div>' +
      '<div class="ar36-opt"><span class="card36-ico is-amber"><i data-lucide="git-branch" class="w-5 h-5"></i></span><b>Berdasarkan Prasyarat</b><small>Hanya member yang sudah punya produk tertentu (mis. alumni Kelas A otomatis dapat Akses B).</small></div>' +
      '<div class="ar36-opt"><span class="card36-ico" style="background:rgba(16,185,129,.12);color:#059669"><i data-lucide="key-round" class="w-5 h-5"></i></span><b>Manual / Mandiri</b><small>Alur biasa: pembelian & verifikasi pesanan, atau redeem kode. <button class="text-accent font-semibold" onclick="go(\'admin/keys\')">Kode Akses →</button></small></div></div>' +
    '<div id="arList" class="grid xl:grid-cols-2 gap-5">' + skeletonCards(2) + '</div></div>',
  show: () => Admin.load('accessRulesAdmin')
});
ADMIN_RENDER.accessRulesAdmin = function (d) {
  const box = document.getElementById('arList'); if (!box) return;
  const P = {}; (d.products || []).forEach(p => { P[p.id] = p; });
  const pill = (id, t) => '<span class="ar36-pill' + (t ? ' is-target' : '') + '"><i data-lucide="' + (t ? 'gift' : 'badge-check') + '" class="w-3.5 h-3.5"></i>' + esc(P[id] ? P[id].title : '(produk dihapus)') + '</span>';
  box.innerHTML = (d.rules || []).length ? d.rules.map(r => '<article class="ar36-card' + (r.status !== 'Aktif' ? ' is-paused' : '') + '">' +
      '<div class="flex flex-wrap items-start gap-2"><div class="min-w-0 flex-1"><p class="font-bold text-main">' + esc(r.name) + '</p>' +
        '<p class="text-xs text-muted">' + (r.mode === 'all' ? 'Semua member aktif' : 'Berdasarkan prasyarat (' + (r.logic === 'all' ? 'harus punya semua' : 'cukup salah satu') + ')') + (r.includeNew ? ' · berlaku juga untuk member/pemilik baru' : ' · sekali jalan') + '</p></div>' +
        '<span class="badge ' + (r.status === 'Aktif' ? 'badge-success' : 'badge-document') + '">' + esc(r.status) + '</span></div>' +
      '<div class="ar36-flow">' + (r.mode === 'prereq' ? r.prereqIds.map(id => pill(id, false)).join('') + '<i data-lucide="arrow-right" class="w-4 h-4 text-muted"></i>' : '<span class="ar36-pill"><i data-lucide="users" class="w-3.5 h-3.5"></i> ' + d.members + ' member aktif</span><i data-lucide="arrow-right" class="w-4 h-4 text-muted"></i>') +
        r.targetIds.map(id => pill(id, true)).join('') + '</div>' +
      '<div class="flex flex-wrap items-center gap-3 text-xs text-muted"><span><b class="text-main">' + r.activeGrants + '</b> akses aktif dari aturan ini</span>' + (r.lastRunAt ? '<span>Terakhir dijalankan ' + esc(fmtWib(r.lastRunAt, true)) + '</span>' : '<span>Belum pernah dijalankan</span>') + '</div>' +
      '<div class="flex flex-wrap gap-2">' + (r.status === 'Aktif' ? '<button class="btn-primary !w-auto !py-1.5" onclick="runRule36(' + jsArg(r.id) + ')"><i data-lucide="play" class="w-4 h-4"></i> Jalankan Sekarang</button>' : '') +
        '<button class="btn-ghost !w-auto !py-1.5" onclick="openRuleWizard(' + jsArg(r.id) + ')"><i data-lucide="pencil" class="w-4 h-4"></i> Ubah</button>' +
        '<button class="btn-ghost !w-auto !py-1.5" onclick="toggleRule36(' + jsArg(r.id) + ')"><i data-lucide="' + (r.status === 'Aktif' ? 'pause' : 'play-circle') + '" class="w-4 h-4"></i> ' + (r.status === 'Aktif' ? 'Jeda' : 'Aktifkan') + '</button>' +
        (r.activeGrants ? '<button class="btn-ghost !w-auto !py-1.5" style="color:var(--error)" onclick="revokeRule36(' + jsArg(r.id) + ')"><i data-lucide="user-minus" class="w-4 h-4"></i> Cabut ' + r.activeGrants + ' Akses</button>' : '') +
        '<button class="btn-icon !w-9 !h-9 ml-auto" title="Hapus aturan" onclick="deleteRule36(' + jsArg(r.id) + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></article>').join('')
    : '<div class="xl:col-span-2">' + emptyState('git-branch', 'Belum ada aturan distribusi', 'Klik "Buat Aturan" untuk memberi akses ke semua member atau ke pemilik produk tertentu.') + '</div>';
  refreshIcons();
};
const RW = { step: 0, r: null };
async function openRuleWizard(id) {
  const d = AppState.a.accessRulesAdmin || Admin.cached('accessRulesAdmin'); if (!d) return Admin.fetch('accessRulesAdmin').then(() => openRuleWizard(id));
  const cur = id ? d.rules.filter(x => x.id === id)[0] : null;
  RW.r = cur ? JSON.parse(JSON.stringify(cur)) : { id: '', name: '', mode: 'all', targetIds: [], prereqIds: [], logic: 'any', includeNew: true, status: 'Aktif' };
  RW.step = cur ? 1 : 0; RW.prev = null; RW.products = d.products;
  Swal.fire({ width: 820, showConfirmButton: false, showCloseButton: true, html: '<div id="rwBox" class="text-left"></div>', didOpen: rwRender });
}
function rwRender() {
  const box = document.getElementById('rwBox'); if (!box) return;
  const r = RW.r, P = RW.products.filter(p => p.status !== 'Archived');
  const picker = (field, exclude) => '<div class="product-picker" style="max-height:240px">' + P.filter(p => !(exclude || []).includes(p.id)).map(p => '<label class="picker-row' + (r[field].includes(p.id) ? ' is-checked' : '') + '"><input type="checkbox"' + (r[field].includes(p.id) ? ' checked' : '') +
    ' onchange="rwPick(\'' + field + '\',' + jsArg(p.id).replace(/"/g, '&quot;') + ',this.checked)"><span class="text-sm flex-1">' + esc(p.title) + (p.status !== 'Active' ? ' <small class="text-muted">(' + esc(p.status) + ')</small>' : '') + '</span><span class="badge ' + badgeClassFor(p.category) + '">' + esc(catLabel(p.category)) + '</span></label>').join('') + '</div>';
  const steps = ['Skema', 'Produk', 'Pratinjau & Simpan'];
  let body = '';
  if (RW.step === 0) body = '<div class="ar36-scheme">' +
    '<button class="ar36-opt' + (r.mode === 'all' ? ' is-on' : '') + '" onclick="RW.r.mode=\'all\';RW.step=1;rwRender()"><span class="card36-ico"><i data-lucide="users" class="w-5 h-5"></i></span><b>Otomatis Semua Member</b><small>Seluruh member aktif mendapat akses tanpa redeem kode.</small></button>' +
    '<button class="ar36-opt' + (r.mode === 'prereq' ? ' is-on' : '') + '" onclick="RW.r.mode=\'prereq\';RW.step=1;rwRender()"><span class="card36-ico is-amber"><i data-lucide="git-branch" class="w-5 h-5"></i></span><b>Berdasarkan Prasyarat</b><small>Hanya pemilik produk tertentu, mis. alumni Kelas A → Akses Tambahan B.</small></button>' +
    '<button class="ar36-opt" onclick="Swal.close();go(\'admin/keys\')"><span class="card36-ico" style="background:rgba(16,185,129,.12);color:#059669"><i data-lucide="key-round" class="w-5 h-5"></i></span><b>Manual / Mandiri</b><small>Tetap lewat pembelian atau kode redeem. Buka menu Kode Akses.</small></button></div>';
  else if (RW.step === 1) body = (r.mode === 'prereq' ? '<div><p class="form-label">1. Member yang sudah memiliki… (prasyarat)</p>' + picker('prereqIds', r.targetIds) +
      '<div class="seg ar36-seg mt-2"><button class="' + (r.logic !== 'all' ? 'is-active' : '') + '" onclick="RW.r.logic=\'any\';rwRender()">Cukup salah satu</button><button class="' + (r.logic === 'all' ? 'is-active' : '') + '" onclick="RW.r.logic=\'all\';rwRender()">Harus semua</button></div></div>' : '') +
    '<div class="mt-4"><p class="form-label">' + (r.mode === 'prereq' ? '2. …otomatis mendapat akses ke (produk tujuan)' : 'Produk yang diberikan ke semua member aktif') + '</p>' + picker('targetIds', r.prereqIds) + '</div>';
  else body = '<div class="grid gap-3"><div><label class="form-label">Nama aturan</label><input id="rwName" class="form-input" value="' + esc(r.name) + '" placeholder="mis. Bonus Alumni Kelas A" oninput="RW.r.name=this.value"></div>' +
    '<label class="ar36-pill"><input type="checkbox"' + (r.includeNew ? ' checked' : '') + ' onchange="RW.r.includeNew=this.checked"> Berlaku juga untuk member baru / pemilik baru (diberikan saat mereka membuka portal)</label>' +
    '<label class="ar36-pill"><input type="checkbox"' + (r.status === 'Aktif' ? ' checked' : '') + ' onchange="RW.r.status=this.checked?\'Aktif\':\'Jeda\'"> Aktifkan aturan</label>' +
    '<div class="ar36-prev" id="rwPrev">' + (RW.prev ? rwPrevHtml() : '<span class="spinner-inline"></span> Menghitung penerima…') + '</div></div>';
  const can1 = r.targetIds.length && (r.mode === 'all' || r.prereqIds.length);
  box.innerHTML = '<p class="text-xs font-bold text-accent uppercase tracking-wider">' + (r.id ? 'Ubah Aturan' : 'Aturan Distribusi Baru') + '</p>' +
    '<div class="v4-steps">' + steps.map((s, i) => '<span class="' + (i < RW.step ? 'is-done' : i === RW.step ? 'is-active' : '') + '"><b>' + (i < RW.step ? '✓' : i + 1) + '</b> ' + s + '</span>').join('') + '</div>' + body +
    '<div class="v4-foot mt-4">' + (RW.step ? '<button class="btn-ghost !w-auto" onclick="RW.step--;rwRender()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali</button>' : '<span></span>') +
      (RW.step === 1 ? '<button class="btn-primary !w-auto" ' + (can1 ? '' : 'disabled') + ' onclick="RW.step=2;RW.prev=null;rwRender();rwPreview()">Lanjut <i data-lucide="arrow-right" class="w-4 h-4"></i></button>' : '') +
      (RW.step === 2 ? '<div class="flex gap-2"><button class="btn-ghost !w-auto" onclick="saveRule36(false,this)"><i data-lucide="save" class="w-4 h-4"></i> Simpan</button>' + (r.status === 'Aktif' ? '<button class="btn-primary !w-auto" onclick="saveRule36(true,this)"><i data-lucide="play" class="w-4 h-4"></i> Simpan & Jalankan</button>' : '') + '</div>' : '') + '</div>';
  refreshIcons();
  if (RW.step === 2 && !RW.prev) rwPreview();
}
function rwPick(field, id, on) { const a = RW.r[field]; const i = a.indexOf(id); if (on && i < 0) a.push(id); if (!on && i > -1) a.splice(i, 1); rwRender(); }
async function rwPreview() {
  const r = RW.r, res = await api('previewAccessRule', { mode: r.mode, targetIds: r.targetIds, prereqIds: r.prereqIds, logic: r.logic });
  RW.prev = res.success ? res.data : { error: res.message };
  const el = document.getElementById('rwPrev'); if (el) { el.innerHTML = rwPrevHtml(); refreshIcons(); }
}
function rwPrevHtml() {
  const p = RW.prev; if (!p) return '';
  if (p.error) return '<span style="color:var(--error)">' + esc(p.error) + '</span>';
  return '<p class="text-sm"><b class="text-main">' + p.members + ' member</b> akan menerima <b class="text-main">' + p.grants + ' akses baru</b> saat aturan dijalankan.' + (p.members ? '' : ' Semua yang memenuhi syarat sudah memilikinya.') + '</p>' +
    (p.sample.length ? '<ul class="text-xs text-muted mt-2 grid gap-1">' + p.sample.map(s => '<li>• ' + esc(s.name) + ' (' + esc(s.email) + ') → ' + esc(s.missing.join(', ')) + '</li>').join('') + (p.members > p.sample.length ? '<li>…dan ' + (p.members - p.sample.length) + ' lainnya</li>' : '') + '</ul>' : '');
}
async function saveRule36(run, btn) {
  const r = RW.r;
  const res = await withBusy(btn, 'Menyimpan…', () => api('saveAccessRule', { id: r.id, name: r.name, mode: r.mode, targetIds: r.targetIds, prereqIds: r.prereqIds, logic: r.logic, includeNew: r.includeNew, status: r.status }));
  if (!toastRes(res)) return;
  Swal.close();
  await Admin.fetch('accessRulesAdmin', { _fresh: true });
  if (run) runRule36(res.data.id);
}
async function runRule36(id) {
  const d = AppState.a.accessRulesAdmin, r = d && d.rules.filter(x => x.id === id)[0];
  const pv = await api('previewAccessRule', r ? { mode: r.mode, targetIds: r.targetIds, prereqIds: r.prereqIds, logic: r.logic } : {});
  const n = pv.success ? pv.data : { members: '?', grants: '?' };
  const q = await Swal.fire({ icon: 'question', title: 'Jalankan aturan sekarang?', width: 600,
    html: '<p class="text-sm"><b>' + n.members + ' member</b> akan menerima <b>' + n.grants + ' akses baru</b>.</p><label class="form-label mt-3 text-left">Beri tahu penerima</label><select id="rnNotify" class="form-input"><option value="">Tanpa notifikasi</option><option value="email">Email (bertahap lewat Blast)</option><option value="wa">WhatsApp (bertahap lewat Blast)</option><option value="both">Email + WhatsApp</option></select>' +
      '<p class="text-xs text-muted mt-1 text-left">Notifikasi dikirim bertahap 50 penerima / 5 menit agar kuota aman. Pantau di menu Blast.</p>',
    showCancelButton: true, confirmButtonText: 'Jalankan', cancelButtonText: 'Batal', preConfirm: () => document.getElementById('rnNotify').value });
  if (!q.isConfirmed) return;
  Swal.fire({ title: 'Memberi akses…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  const res = await api('runAccessRule', { id: id, notify: q.value }, { timeout: 180000 });
  Swal.close();
  if (toastRes(res)) Admin.fetch('accessRulesAdmin', { _fresh: true });
}
async function toggleRule36(id) {
  const r = AppState.a.accessRulesAdmin.rules.filter(x => x.id === id)[0]; if (!r) return;
  const res = await api('saveAccessRule', Object.assign({}, r, { status: r.status === 'Aktif' ? 'Jeda' : 'Aktif' }));
  if (toastRes(res)) Admin.fetch('accessRulesAdmin', { _fresh: true });
}
async function revokeRule36(id) {
  const r = AppState.a.accessRulesAdmin.rules.filter(x => x.id === id)[0]; if (!r) return;
  const q = await Swal.fire({ icon: 'warning', title: 'Cabut ' + r.activeGrants + ' akses?', text: 'Hanya akses yang diberikan aturan "' + r.name + '" yang dicabut. Akses hasil pembelian/redeem tetap. Aturan akan dijeda.', showCancelButton: true, confirmButtonText: 'Cabut', cancelButtonText: 'Batal', confirmButtonColor: '#DC2626' });
  if (!q.isConfirmed) return;
  const res = await api('revokeAccessRule', { id: id }, { timeout: 180000 });
  if (toastRes(res)) Admin.fetch('accessRulesAdmin', { _fresh: true });
}
async function deleteRule36(id) {
  const q = await Swal.fire({ icon: 'warning', title: 'Hapus aturan?', text: 'Akses yang sudah diberikan tetap dimiliki member. Gunakan "Cabut" bila ingin menarik aksesnya.', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
  if (!q.isConfirmed) return;
  const res = await api('deleteAccessRule', { id: id });
  if (toastRes(res)) Admin.fetch('accessRulesAdmin', { _fresh: true });
}


// ════════════════════════════════════════════════════════════
// 9. C — JALUR BELAJAR (penyusun)
// ════════════════════════════════════════════════════════════
adminRoute('paths', {
  title: 'Jalur Belajar',
  template: () => '<div class="page-wrap-fluid">' + adminHead('Jalur Belajar', 'Rekomendasi urutan kelas di portal member (Pemula → Menengah → Mahir). Tidak mengunci materi — kelas hanya bisa dibuka bila member memilikinya.',
    '<button class="btn-primary !w-auto" onclick="openPathForm()"><i data-lucide="plus" class="w-4 h-4"></i> Buat Jalur</button>') +
    '<div id="lpList" class="grid xl:grid-cols-2 gap-5">' + skeletonCards(2) + '</div></div>',
  show: () => Admin.load('learningPathsAdmin')
});
ADMIN_RENDER.learningPathsAdmin = function (d) {
  const box = document.getElementById('lpList'); if (!box) return;
  const P = {}; (d.products || []).forEach(p => { P[p.id] = p; });
  box.innerHTML = (d.paths || []).length ? d.paths.map(p => '<article class="ar36-card"><div class="flex items-start gap-2"><div class="min-w-0 flex-1"><p class="font-bold text-main">' + esc(p.title) + '</p>' + (p.description ? '<p class="text-xs text-muted">' + esc(p.description) + '</p>' : '') + '</div>' +
      '<span class="badge ' + (p.status === 'Active' ? 'badge-success' : 'badge-document') + '">' + (p.status === 'Active' ? 'Tampil' : 'Draft') + '</span></div>' +
      '<div class="grid sm:grid-cols-3 gap-2">' + p.stages.map((s, i) => '<div class="lp36-stage ' + LEVEL_TONE[i % LEVEL_TONE.length] + ' !p-2.5"><span class="lp36-lv">' + esc(s.level) + '</span><ol class="text-xs mt-2 grid gap-1">' +
        s.items.map((it, k) => '<li class="truncate">' + (k + 1) + '. ' + esc(P[it.productId] ? P[it.productId].title : '(produk dihapus)') + '</li>').join('') + '</ol></div>').join('') + '</div>' +
      '<div class="flex gap-2"><button class="btn-ghost !w-auto !py-1.5" onclick="openPathForm(' + jsArg(p.id) + ')"><i data-lucide="pencil" class="w-4 h-4"></i> Ubah</button>' +
        '<button class="btn-icon !w-9 !h-9 ml-auto" title="Hapus" onclick="deletePath36(' + jsArg(p.id) + ')"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></article>').join('')
    : '<div class="xl:col-span-2">' + emptyState('route', 'Belum ada jalur belajar', 'Susun urutan kelas yang disarankan agar member tidak bingung harus mulai dari mana.') + '</div>';
  refreshIcons();
};
const LP = { p: null };
async function openPathForm(id) {
  const d = AppState.a.learningPathsAdmin || Admin.cached('learningPathsAdmin'); if (!d) return Admin.fetch('learningPathsAdmin').then(() => openPathForm(id));
  const cur = id ? d.paths.filter(x => x.id === id)[0] : null;
  LP.p = cur ? JSON.parse(JSON.stringify(cur)) : { id: '', title: '', description: '', status: 'Active', sort: 0, stages: [{ level: 'Pemula', desc: '', items: [] }, { level: 'Menengah', desc: '', items: [] }, { level: 'Mahir', desc: '', items: [] }] };
  LP.products = d.products;
  const r = await Swal.fire({ title: cur ? 'Ubah Jalur Belajar' : 'Jalur Belajar Baru', width: 980, showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', focusConfirm: false,
    html: '<div id="lpBox" class="text-left"></div>', didOpen: lpRender,
    preConfirm: () => { lpCollect(); const p = LP.p; if (p.title.trim().length < 3) return Swal.showValidationMessage('Judul jalur minimal 3 karakter.'); if (!p.stages.some(s => s.items.length)) return Swal.showValidationMessage('Tambahkan minimal satu kelas.'); return p; } });
  if (!r.isConfirmed) return;
  const res = await api('saveLearningPath', r.value);
  if (toastRes(res)) Admin.fetch('learningPathsAdmin', { _fresh: true });
}
function lpCollect() {
  const v = id => { const e = document.getElementById(id); return e ? e.value : undefined; };
  if (v('lpTitle') !== undefined) { LP.p.title = v('lpTitle'); LP.p.description = v('lpDesc'); LP.p.status = v('lpStatus'); LP.p.sort = Number(v('lpSort')) || 0; }
  document.querySelectorAll('#lpBox [data-lv]').forEach(el => { const s = LP.p.stages[+el.dataset.lv]; if (s) s[el.dataset.f] = el.value; });
  document.querySelectorAll('#lpBox [data-note]').forEach(el => { const [si, ii] = el.dataset.note.split(':').map(Number); const it = LP.p.stages[si] && LP.p.stages[si].items[ii]; if (it) it.note = el.value; });
}
function lpRender() {
  const box = document.getElementById('lpBox'); if (!box) return;
  const p = LP.p, P = {}; LP.products.forEach(x => { P[x.id] = x; });
  const used = {}; p.stages.forEach(s => s.items.forEach(it => { used[it.productId] = true; }));
  box.innerHTML = '<div class="pform"><div class="grid2"><div><label class="form-label">Judul jalur *</label><input id="lpTitle" class="form-input" value="' + esc(p.title) + '" placeholder="mis. Jalur Developer Apps Script"></div>' +
      '<div class="grid2"><div><label class="form-label">Status</label><select id="lpStatus" class="form-input"><option value="Active"' + (p.status !== 'Draft' ? ' selected' : '') + '>Tampil</option><option value="Draft"' + (p.status === 'Draft' ? ' selected' : '') + '>Draft</option></select></div>' +
      '<div><label class="form-label">Urutan</label><input id="lpSort" type="number" class="form-input" value="' + (p.sort || '') + '"></div></div></div>' +
    '<div><label class="form-label">Deskripsi</label><input id="lpDesc" class="form-input" value="' + esc(p.description) + '" placeholder="Untuk siapa jalur ini & hasil akhirnya"></div>' +
    '<div class="grid lg:grid-cols-3 gap-3">' + p.stages.map((s, si) => '<div class="lpa36-stage"><div class="flex gap-2"><input class="form-input !py-1.5 font-bold" data-lv="' + si + '" data-f="level" value="' + esc(s.level) + '">' +
        (p.stages.length > 1 ? '<button type="button" class="btn-icon !w-8 !h-8" title="Hapus tahap" onclick="lpCollect();LP.p.stages.splice(' + si + ',1);lpRender()"><i data-lucide="x" class="w-4 h-4"></i></button>' : '') + '</div>' +
      '<input class="form-input !py-1.5 !text-xs" data-lv="' + si + '" data-f="desc" value="' + esc(s.desc || '') + '" placeholder="Keterangan tahap (opsional)">' +
      s.items.map((it, ii) => '<div class="lpa36-item"><b class="text-xs">' + (ii + 1) + '.</b><div class="min-w-0"><p class="text-xs font-semibold text-main truncate">' + esc(P[it.productId] ? P[it.productId].title : '(produk dihapus)') + '</p>' +
          '<input class="form-input" data-note="' + si + ':' + ii + '" value="' + esc(it.note || '') + '" placeholder="Catatan singkat (opsional)"></div>' +
        '<div class="flex flex-col"><button type="button" class="btn-icon !w-7 !h-7" onclick="lpMove(' + si + ',' + ii + ',-1)"><i data-lucide="chevron-up" class="w-3.5 h-3.5"></i></button><button type="button" class="btn-icon !w-7 !h-7" onclick="lpCollect();LP.p.stages[' + si + '].items.splice(' + ii + ',1);lpRender()"><i data-lucide="x" class="w-3.5 h-3.5"></i></button></div></div>').join('') +
      '<select class="form-input !py-1.5 !text-xs" onchange="if(this.value){lpCollect();LP.p.stages[' + si + '].items.push({productId:this.value,note:\'\'});lpRender()}"><option value="">+ Tambah kelas…</option>' +
        LP.products.filter(x => !used[x.id] && x.status !== 'Archived').map(x => '<option value="' + esc(x.id) + '">' + esc(x.title) + ' (' + esc(catLabel(x.category)) + ')</option>').join('') + '</select></div>').join('') + '</div>' +
    (p.stages.length < 6 ? '<button type="button" class="btn-ghost !w-auto" onclick="lpCollect();LP.p.stages.push({level:\'Tahap \'+(LP.p.stages.length+1),desc:\'\',items:[]});lpRender()"><i data-lucide="plus" class="w-4 h-4"></i> Tahap</button>' : '') + '</div>';
  refreshIcons();
}
function lpMove(si, ii, dir) { lpCollect(); const a = LP.p.stages[si].items, j = ii + dir; if (j < 0 || j >= a.length) return; const t = a[ii]; a[ii] = a[j]; a[j] = t; lpRender(); }
async function deletePath36(id) {
  const q = await Swal.fire({ icon: 'warning', title: 'Hapus jalur belajar?', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
  if (!q.isConfirmed) return;
  const res = await api('deleteLearningPath', { id: id });
  if (toastRes(res)) Admin.fetch('learningPathsAdmin', { _fresh: true });
}
