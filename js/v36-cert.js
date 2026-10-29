/**
 * ============================================================
 * v36-cert.js — Mesin Sertifikat (dimuat hanya saat dibutuhkan)
 * Menggambar sertifikat di <canvas> dari desain Admin (posisi dalam % halaman), lalu menyimpan
 * sebagai PNG atau PDF A4 (penulis PDF mini bawaan — tanpa pustaka tambahan).
 * Gambar (latar, logo, tanda tangan) datang sebagai data URI dari server → canvas tidak "tercemar"
 * dan bisa diekspor. QR verifikasi memakai qrcode-generator (MIT) dari jsDelivr.
 * ============================================================
 */
const CertRender = {
  W: 3508, H: 2480,                                       // A4 300 dpi (lanskap)
  FONTS: { sans: 'Inter, "Segoe UI", Arial, sans-serif', serif: '"Playfair Display", Georgia, "Times New Roman", serif', script: '"Great Vibes", "Brush Script MT", cursive', mono: '"JetBrains Mono", Consolas, monospace' },
  _fontsP: null, _qrP: null,

  loadFonts() {
    if (this._fontsP) return this._fontsP;
    loadCss('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap');
    const want = ['700 40px "Great Vibes"', '800 40px "Playfair Display"', '600 40px "Playfair Display"', 'italic 600 40px "Playfair Display"', '400 40px Inter', '600 40px Inter', '700 40px Inter', '800 40px Inter'];
    const t = new Promise(r => setTimeout(r, 4000));
    this._fontsP = Promise.race([Promise.all(want.map(f => (document.fonts && document.fonts.load ? document.fonts.load(f) : Promise.resolve()).catch(() => null))), t]);
    return this._fontsP;
  },
  loadQr() {
    if (window.qrcode) return Promise.resolve(true);
    if (!this._qrP) this._qrP = loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').then(() => !!window.qrcode, () => { this._qrP = null; return false; });
    return this._qrP;
  },
  image(src) {
    return new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  },
  fill(text, v) {
    return String(text || '').replace(/\{(nama|bootcamp|tanggal|nomor|profesi|pertemuan)\}/gi, (m, k) => (v && v[k.toLowerCase()] !== undefined ? v[k.toLowerCase()] : m));
  },

  /** design: dari server (normCert36_) · assets: {fileId: dataUri} · values: {nama, bootcamp, …} · verifyUrl: isi QR */
  async draw(design, assets, values, verifyUrl, opt) {
    opt = opt || {};
    const land = design.orientation !== 'portrait';
    const W = land ? this.W : this.H, H = land ? this.H : this.W, k = opt.scale || 1;
    const cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    const g = cv.getContext('2d'); g.scale(k, k);
    await this.loadFonts();
    const [bg, qrOk] = await Promise.all([this.image(assets && assets[design.bgFileId]), design.qr && design.qr.show ? this.loadQr() : false]);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
    if (bg) {
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, (design.bgOpacity == null ? 100 : design.bgOpacity) / 100));
      const s = Math.max(W / bg.width, H / bg.height), bw = bg.width * s, bh = bg.height * s;
      g.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh); g.restore();
    }
    if (design.frame !== false && !bg) this.frame(g, W, H, design.accent || '#1E40AF');
    for (const l of design.logos || []) { const im = await this.image(assets && assets[l.fileId]); if (im) this.placeImg(g, im, l, W, H); }
    for (const t of design.texts || []) this.text(g, t, values, W, H);
    for (const s of design.signs || []) {
      const im = await this.image(assets && assets[s.fileId]);
      const w = s.w / 100 * W, cx = s.x / 100 * W, cy = s.y / 100 * H;
      if (im) this.placeImg(g, im, s, W, H);
      const ih = im ? w * im.height / im.width : w * 0.4, lineY = cy + ih / 2 + H * 0.008;
      g.strokeStyle = '#334155'; g.lineWidth = Math.max(2, W * 0.0007); g.beginPath(); g.moveTo(cx - w * 0.7, lineY); g.lineTo(cx + w * 0.7, lineY); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#0F172A';
      g.font = '700 ' + Math.round(W * 0.014) + 'px ' + this.FONTS.sans; g.fillText(s.name || '', cx, lineY + H * 0.01);
      g.fillStyle = '#475569'; g.font = '500 ' + Math.round(W * 0.011) + 'px ' + this.FONTS.sans; g.fillText(s.role || '', cx, lineY + H * 0.01 + W * 0.018);
    }
    if (design.qr && design.qr.show) this.qr(g, design.qr, verifyUrl, values, W, H, qrOk);
    return cv;
  },

  frame(g, W, H, accent) {
    const m = W * 0.03;
    g.save();
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#F8FAFF'); grd.addColorStop(1, '#EEF2FF');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = accent; g.lineWidth = W * 0.006; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
    g.strokeStyle = '#F59E0B'; g.lineWidth = W * 0.0018; g.strokeRect(m * 1.45, m * 1.45, W - 2.9 * m, H - 2.9 * m);
    g.fillStyle = accent; const c = W * 0.05;
    [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, c * 0.28, 0, Math.PI * 2); g.fill(); });
    g.restore();
  },
  placeImg(g, im, o, W, H) {
    const w = o.w / 100 * W, h = w * im.height / im.width;
    g.drawImage(im, o.x / 100 * W - w / 2, o.y / 100 * H - h / 2, w, h);
  },
  text(g, t, values, W, H) {
    const s = this.fill(t.text, values); if (!s) return;
    let size = t.size / 100 * W;
    const fam = this.FONTS[t.font] || this.FONTS.sans, sp = (t.spacing || 0) * size;
    const font = sz => (t.italic ? 'italic ' : '') + (t.weight || 600) + ' ' + Math.round(sz) + 'px ' + fam;
    g.font = font(size);
    const measure = () => g.measureText(s).width + sp * Math.max(s.length - 1, 0);
    const maxW = W * 0.88;
    while (measure() > maxW && size > 8) { size *= 0.94; g.font = font(size); }   // nama panjang → huruf mengecil otomatis
    g.fillStyle = t.color || '#0F172A'; g.textBaseline = 'middle';
    const x = t.x / 100 * W, y = t.y / 100 * H;
    if (!sp) { g.textAlign = t.align || 'center'; g.fillText(s, x, y); return; }
    const total = measure(); let cx = t.align === 'left' ? x : t.align === 'right' ? x - total : x - total / 2;
    g.textAlign = 'left';
    for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
  },
  qr(g, q, url, values, W, H, ok) {
    const size = q.size / 100 * W, x = q.x / 100 * W - size / 2, y = q.y / 100 * H - size / 2, pad = size * 0.06;
    g.fillStyle = '#FFFFFF'; g.fillRect(x - pad, y - pad, size + 2 * pad, size + 2 * pad);
    if (ok && window.qrcode && url) {
      const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      const n = qr.getModuleCount(), cell = size / n;
      g.fillStyle = '#0F172A';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
    } else {
      g.strokeStyle = '#94A3B8'; g.lineWidth = 3; g.strokeRect(x, y, size, size);
      g.fillStyle = '#64748B'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + Math.round(size * 0.09) + 'px ' + this.FONTS.mono;
      g.fillText(values && values.nomor || 'QR', x + size / 2, y + size / 2);
    }
    g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#475569';
    g.font = '600 ' + Math.round(W * 0.0085) + 'px ' + this.FONTS.sans;
    if (q.label) g.fillText(q.label, x + size / 2, y + size + pad + H * 0.004);
    g.font = '500 ' + Math.round(W * 0.0075) + 'px ' + this.FONTS.mono;
    if (values && values.nomor) g.fillText(values.nomor, x + size / 2, y + size + pad + H * 0.004 + W * 0.012);
  },

  /** Simpan PNG atau PDF A4 (satu halaman, gambar JPEG penuh). */
  async save(canvas, fmt, name) {
    const a = document.createElement('a');
    if (fmt === 'png') {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      a.href = URL.createObjectURL(blob); a.download = name + '.png';
    } else {
      const blob = this.pdf(canvas);
      a.href = URL.createObjectURL(blob); a.download = name + '.pdf';
    }
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return a.download;
  },

  /** Penulis PDF minimal: 1 halaman A4, 1 gambar JPEG (DCTDecode) memenuhi halaman. */
  pdf(canvas) {
    const jpg = atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
    const land = canvas.width >= canvas.height, pw = land ? 841.89 : 595.28, ph = land ? 595.28 : 841.89;
    const enc = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
    const parts = [], offs = []; let len = 0;
    const push = s => { const u = typeof s === 'string' ? enc(s) : s; parts.push(u); len += u.length; };
    const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'));
    obj(4, () => { push('<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); push(enc(jpg)); push('\nendstream'); });
    const content = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(5, () => push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
    const xref = len;
    let x = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }
};
