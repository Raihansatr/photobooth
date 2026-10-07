// ---------- script.js ----------
const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// DITAMBAHKAN: Strip 6 dan Grid 3x3
const LAYOUTS = {
  single: { n: 'Single',   c: 1, r: 1, w: 760, h: 570 },
  strip2: { n: 'Strip 2',  c: 1, r: 2, w: 520, h: 390 },
  strip3: { n: 'Strip 3',  c: 1, r: 3, w: 480, h: 360 },
  strip4: { n: 'Strip 4',  c: 1, r: 4, w: 440, h: 330 },
  strip6: { n: 'Strip 6',  c: 1, r: 6, w: 360, h: 270 },
  grid4:  { n: 'Grid 2×2', c: 2, r: 2, w: 420, h: 315 },
  grid6:  { n: 'Grid 2×3', c: 2, r: 3, w: 320, h: 240 }
};

// UPGRADED FILTERS (Added 5 new aesthetic filters)
const FILTERS = {
  'Normal': 'none',
  'Hitam Putih': 'grayscale(1) contrast(1.1)',
  'Sepia': 'sepia(.85)',
  'Vintage': 'sepia(.4) contrast(.9) saturate(1.3) hue-rotate(-10deg)',
  'Hangat': 'saturate(1.3) sepia(.2) brightness(1.05)',
  'Dingin': 'saturate(1.1) hue-rotate(15deg) brightness(1.05)',
  'Vivid': 'saturate(1.8) contrast(1.1)',
  'Lembut': 'brightness(1.1) contrast(.9) blur(.6px)',
  'Fade': 'contrast(.8) brightness(1.15) saturate(.8)',
  // --- New Additions ---
  'Cyberpunk': 'saturate(2) hue-rotate(30deg) contrast(1.2)',
  'Cinematic': 'contrast(1.2) saturate(1.1) brightness(0.9) sepia(0.15) hue-rotate(-10deg)',
  'Retro 80s': 'sepia(0.3) saturate(1.5) hue-rotate(-30deg) contrast(1.1)',
  'Noir': 'grayscale(1) contrast(1.5) brightness(0.8)',
  'Dreamy': 'blur(0.8px) brightness(1.1) saturate(0.9) contrast(0.8)'
};

// UPGRADED STICKERS (Added 5 new sticker packs)
const STICKERS = {
  'Tanpa': [],
  'Hati': ['❤️', '💖', '💕', '💗', '💘'],
  'Bintang': ['⭐', '✨', '🌟', '💫', '☄️'],
  'Bunga': ['🌸', '🌼', '🌷', '🌺', '🌻'],
  'Pesta': ['🎉', '🎈', '🎊', '🥳', '🎁'],
  'Kucing': ['🐱', '🐾', '😺', '🐈', '😻'],
  // --- New Additions ---
  'Lucu': ['🤡', '👽', '👻', '💩', '👾'],
  'Makanan': ['🍔', '🍕', '🍟', '🍩', '🥤'],
  'Musik': ['🎵', '🎸', '🎧', '🎹', '🎤'],
  'Cuaca': ['☀️', '⚡', '🌈', '❄️', '🌙'],
  'Aksesoris': ['👑', '👒', '🕶️', '🎀', '🪄']
};

const THEMES = { Putih: '#ffffff', Krem: '#f6ecd9', Pink: '#ffd1dc', Lavender: '#dcd0ff', Mint: '#c9f2e0', Biru: '#cfe8ff', Hitam: '#161616', Emas: '#e8c76a' };

const S = { layout: 'strip4', filter: 'Normal', stk: 'Tanpa', theme: '#ffd1dc', caption: 'SnapBox Moments',
            date: true, timer: 3, mirror: true, sound: true, shots: [] };
const video = $('#video'), out = $('#out');
let running = false, stream = null, ac = null;
const count = () => LAYOUTS[S.layout].c * LAYOUTS[S.layout].r;

/* ---------- UI: chips & swatches ---------- */
function chips(box, items, get, set, label) {
  const mark = () => [...box.children].forEach((b, i) => b.classList.toggle('on', get() === items[i]));
  items.forEach(k => {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = label ? label(k) : k;
    b.onclick = () => { set(k); mark(); };
    box.append(b);
  });
  mark();
}
chips($('#layouts'), Object.keys(LAYOUTS), () => S.layout, k => { S.layout = k; compose(); }, k => LAYOUTS[k].n);
chips($('#timers'), [0, 3, 5, 10], () => S.timer, k => S.timer = k, k => k ? k + ' detik' : 'Instan');
chips($('#filters'), Object.keys(FILTERS), () => S.filter, k => { S.filter = k; applyLive(); compose(); });
chips($('#stickers'), Object.keys(STICKERS), () => S.stk, k => { S.stk = k; compose(); });
Object.entries(THEMES).forEach(([name, col]) => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = col; b.title = name;
  b.onclick = () => { S.theme = col; mark(); compose(); };
  $('#themes').append(b);
});
function mark() { [...$('#themes').children].forEach(b => b.classList.toggle('on', rgb2hex(b.style.background) === S.theme)); }
function rgb2hex(c) { const m = c.match(/\d+/g); return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('') : c; }
$('#caption').oninput = e => { S.caption = e.target.value; compose(); };
$('#date').onchange   = e => { S.date = e.target.checked; compose(); };
$('#mirror').onchange = e => { S.mirror = e.target.checked; applyLive(); };
$('#sound').onchange  = e => S.sound = e.target.checked;

function applyLive() {
  video.style.transform = S.mirror ? 'scaleX(-1)' : 'none';
  video.style.filter = FILTERS[S.filter];
}

/* ---------- Kamera ---------- */
async function startCam(id) {
  try {
    stream && stream.getTracks().forEach(t => t.stop());
    const size = { width: { ideal: 1280 }, height: { ideal: 960 } };
    stream = await navigator.mediaDevices.getUserMedia({ audio: false,
      video: id ? { deviceId: { exact: id }, ...size } : { facingMode: 'user', ...size } });
    video.srcObject = stream; $('#msg').hidden = true;
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    const sel = $('#camSel');
    sel.innerHTML = cams.map((d, i) => `<option value="${d.deviceId}">${d.label || 'Kamera ' + (i + 1)}</option>`).join('');
    const cur = stream.getVideoTracks()[0].getSettings().deviceId; if (cur) sel.value = cur;
    sel.hidden = cams.length < 2;
  } catch (e) {
    const m = $('#msg'); m.hidden = false;
    m.innerHTML = '📷 Kamera tidak bisa diakses.<br>Izinkan akses kamera di browser lalu klik di sini,<br>atau gunakan tombol <b>Upload Foto</b>.';
  }
}
$('#msg').onclick = () => {
    if ($('#msg').innerHTML.includes('Kamera')) startCam();
};
$('#camSel').onchange = e => startCam(e.target.value);

function grab() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 480;
  const x = c.getContext('2d'), vw = video.videoWidth, vh = video.videoHeight, r = 4 / 3;
  let sw = vw, sh = vw / r; if (sh > vh) { sh = vh; sw = vh * r; }
  if (S.mirror) { x.translate(640, 0); x.scale(-1, 1); }
  x.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, 640, 480);
  return c;
}

/* ---------- Suara & efek ---------- */
function beep(f, d) {
  if (!S.sound) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = .08; o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + d);
  } catch (e) {}
}
async function countdown(t) {
  const el = $('#count');
  for (let n = t; n > 0 && running; n--) {
    el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    beep(660, .08); await sleep(1000);
  }
  el.textContent = '';
}
function flash() { const f = $('#flash'); f.classList.add('go'); beep(1000, .15); setTimeout(() => f.classList.remove('go'), 120); }

/* ---------- Alur pengambilan foto ---------- */
function setRunning(v) { running = v; $('#start').hidden = v; $('#stop').hidden = !v; }
async function run(indices) {
  if (running) return;
  if (!video.videoWidth) { $('#msg').hidden = false; $('#msg').innerHTML = '📷 Kamera belum aktif. Klik di sini untuk mengaktifkan,<br>atau gunakan <b>Upload Foto</b>.'; return; }
  setRunning(true);
  try {
    for (const i of indices) {
      if (!running) break;
      await countdown(S.timer);
      if (!running) break;
      flash(); S.shots[i] = grab(); compose(); await sleep(800);
    }
  } finally { setRunning(false); $('#count').textContent = ''; }
}
$('#start').onclick = () => {
  const n = count(); let idx = [];
  for (let i = 0; i < n; i++) if (!S.shots[i]) idx.push(i);
  if (!idx.length) { S.shots = []; idx = [...Array(n).keys()]; }
  run(idx);
};
$('#stop').onclick = () => { running = false; };
$('#reset').onclick = () => { S.shots = []; compose(); };

$('#file').onchange = async e => {
  const n = count();
  for (const f of e.target.files) {
    let i = 0; while (i < n && S.shots[i]) i++; if (i >= n) break;
    const im = await createImageBitmap(f), c = document.createElement('canvas');
    c.width = 640; c.height = 480;
    let sw = im.width, sh = sw * 3 / 4; if (sh > im.height) { sh = im.height; sw = sh * 4 / 3; }
    c.getContext('2d').drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 0, 0, 640, 480);
    S.shots[i] = c;
  }
  compose(); e.target.value = '';
};

/* ---------- Komposisi strip ---------- */
const isDark = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 110; };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function compose() {
  const L = LAYOUTS[S.layout], n = count(), pad = 28, gap = 18, foot = (S.caption || S.date) ? 92 : 28;
  const W = pad * 2 + L.c * L.w + (L.c - 1) * gap, H = pad * 2 + L.r * L.h + (L.r - 1) * gap + foot;
  out.width = W; out.height = H;
  const x = out.getContext('2d'), ink = isDark(S.theme) ? '#ffffff' : '#2b2433';
  x.fillStyle = S.theme; x.fillRect(0, 0, W, H);

  for (let i = 0; i < n; i++) {
    const cx = pad + (i % L.c) * (L.w + gap), cy = pad + Math.floor(i / L.c) * (L.h + gap);
    x.save(); x.beginPath(); x.roundRect ? x.roundRect(cx, cy, L.w, L.h, 14) : x.rect(cx, cy, L.w, L.h); x.clip();
    if (S.shots[i]) { x.filter = FILTERS[S.filter]; x.drawImage(S.shots[i], cx, cy, L.w, L.h); x.filter = 'none'; }
    else {
      x.fillStyle = isDark(S.theme) ? '#2a2a2a' : 'rgba(0,0,0,.07)'; x.fillRect(cx, cy, L.w, L.h);
      x.fillStyle = ink; x.globalAlpha = .35; x.font = '700 64px Bricolage Grotesque, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(i + 1, cx + L.w / 2, cy + L.h / 2); x.globalAlpha = 1;
    }
    const set = STICKERS[S.stk];
    if (set.length && S.shots[i]) {
      const rd = rng(i * 97 + 13); x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let k = 0; k < 6; k++) {
        const size = L.w * (.08 + rd() * .06), edge = rd() < .5;
        const px = cx + (edge ? (rd() < .5 ? .08 : .92) : rd()) * L.w, py = cy + (edge ? rd() : (rd() < .5 ? .1 : .9)) * L.h;
        x.save(); x.translate(px, py); x.rotate((rd() - .5) * .8); x.font = `${size}px serif`;
        x.fillText(set[Math.floor(rd() * set.length)], 0, 0); x.restore();
      }
    }
    x.restore();
  }
  const fy = H - foot / 2 - 4; x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (S.caption) { x.font = '600 32px Bricolage Grotesque, sans-serif'; x.fillText(S.caption, W / 2, fy - (S.date ? 12 : 0)); }
  if (S.date) {
    x.globalAlpha = .75; x.font = '500 17px Figtree, sans-serif';
    x.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, fy + (S.caption ? 22 : 0));
    x.globalAlpha = 1;
  }
  renderThumbs(n);
}

function renderThumbs(n) {
  const th = $('#thumbs'); th.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas'); c.width = 120; c.height = 90; c.title = 'Klik untuk foto ulang';
    const x = c.getContext('2d');
    if (S.shots[i]) { x.filter = FILTERS[S.filter]; x.drawImage(S.shots[i], 0, 0, 120, 90); }
    else { x.fillStyle = '#efe9f7'; x.fillRect(0, 0, 120, 90); x.fillStyle = '#b6a8cc'; x.font = '700 30px Bricolage Grotesque, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(i + 1, 60, 45); }
    c.onclick = () => run([i]);
    th.append(c);
  }
}

/* ---------- Unduh & cetak ---------- */
$('#dl').onclick = () => out.toBlob(b => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = `snapbox-${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#print').onclick = () => {
  const w = window.open('', '_blank'); 
  if (!w) {
    const m = $('#msg'); 
    m.hidden = false; 
    m.innerHTML = '⚠️ Gagal mencetak.<br>Silakan izinkan Pop-up di browser Anda untuk mencetak.';
    setTimeout(() => { m.hidden = true; }, 4000);
    return;
  }
  w.document.write(`<title>SnapBox Print</title><body style="margin:0;text-align:center"><img src="${out.toDataURL()}" style="max-width:100%;max-height:100vh" onload="print()"></body>`);
  w.document.close();
};

/* ---------- Mulai ---------- */
mark(); applyLive(); compose(); startCam();
if (document.fonts) document.fonts.ready.then(compose);
