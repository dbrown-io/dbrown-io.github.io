// The service flow. Seven paper tickets start as the old spinning helix, then
// unwind into a tall S path (the owner's sketch) and flow along it, bottom to
// top, one at a time holding at the bow. Left of the bow, a mounted paper
// display ("the centre") shows the active service's model, big and turning
// slowly, or a big mounted print for the two photo services. Everything is
// posed from t, nothing runs on a timer. 1 unit = 10 cm.
//
// t: 0 to 0.18 helix spins; 0.18 to 0.33 it unwinds into the S, the dashed
// path draws in and the centre pops up; 0.38 to 0.98 the cards flow and each
// service holds at the bow; the last beat holds to 1.
export default function build(THREE, kit) {
  const { mat, slab, shadow, ease, span, clamp01, palette } = kit;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const aspectNow = () => (kit.aspect ? kit.aspect() : 1.35) || 1.35;

  const CW = 2.2, CH = 2.9, CT = 0.05; // card width, height, thickness
  const R = 2.9; // helix radius to the card faces
  const RISE = 0.62; // climb per card on the helix
  const ORDER = ['dog', 'wash', 'garden', 'tutoring', 'printing', 'pc', 'photography'];
  const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
  const items = (kit.data && kit.data.length ? kit.data.slice() : []).sort((a, b) => rank(a.key) - rank(b.key));
  const N = items.length || 7;
  const STEP = TAU / 7;

  // Two layouts, chosen from the stage aspect. Y: half height of the S; A: how
  // far it bows; K: lean of its ends; bowX/y0: where the bow sits; the centre
  // (cx, cy, cs = scale of the display) and the box the whole picture must fit.
  const LAYOUTS = {
    wide: { Y: 3.9, A: 1.9, K: 0.5, bowX: 2.7, y0: 0, SP: 1.7, cx: -2.1, cy: 0.1, cs: 1,
      box: { x: -0.2, y: 0, w: 8.8, h: 9.9 } },
    tall: { Y: 4.2, A: 1.0, K: 0.25, bowX: 1.4, y0: -1.0, SP: 1.55, cx: -1.05, cy: 1.35, cs: 0.7,
      box: { x: -0.2, y: -0.5, w: 5.0, h: 10.6 } },
  };
  let L = LAYOUTS.wide;
  let fit = 1;
  const CAM_R = 18, CAM_H = 2.4;
  const VIS_H = 2 * CAM_R * Math.tan(16 * DEG);

  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);

  // ---- shared geometry
  function rrGeo(w, h, rad, d) {
    const s = new THREE.Shape();
    const x0 = -w / 2, y0 = -h / 2;
    s.moveTo(x0 + rad, y0);
    s.lineTo(x0 + w - rad, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rad);
    s.lineTo(x0 + w, y0 + h - rad); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rad, y0 + h);
    s.lineTo(x0 + rad, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rad);
    s.lineTo(x0, y0 + rad); s.quadraticCurveTo(x0, y0, x0 + rad, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -d / 2);
    return g;
  }
  const cardGeo = rrGeo(CW, CH, 0.12, CT);
  const faceGeo = new THREE.PlaneGeometry(CW - 0.02, CH - 0.02);
  const tapeGeo = new THREE.BoxGeometry(0.9, 0.26, 0.012);
  const bodyMat = mat('body', { emissive: 0.18 });

  // ---- canvas helpers
  const CWPX = 640, CHPX = 844;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pg = probe.getContext('2d', { willReadFrequently: true });
  function rgb(css) {
    pg.clearRect(0, 0, 1, 1);
    pg.fillStyle = '#000';
    pg.fillStyle = css;
    pg.fillRect(0, 0, 1, 1);
    const d = pg.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const mix = (a, b, k) => a.map((v, i) => Math.round(v * k + b[i] * (1 - k)));
  const css = (c, a) => (a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')');
  const INK = [43, 42, 38];
  const WHITE = [255, 255, 255];

  function roundRect(g, x, y, w, h, rad) {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  }

  function wrap(g, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const next = cur ? cur + ' ' + w : w;
      if (cur && g.measureText(next).width > maxW) { lines.push(cur); cur = w; } else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function makeTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function drawFront(g, item, img) {
    const accent = rgb(item.accent || '#b3492f');
    g.clearRect(0, 0, CWPX, CHPX);
    // dashed left edge, like a tear-off
    g.save();
    g.strokeStyle = css(rgb(palette.trim || '#cfc9ba'));
    g.lineWidth = 3.5;
    g.setLineDash([10, 13]);
    g.beginPath();
    g.moveTo(36, 96);
    g.lineTo(36, CHPX - 44);
    g.stroke();
    g.restore();

    // icon tile, small, beside the title
    const tx = 66, ty = 96, ts = 100;
    g.fillStyle = css(mix(accent, WHITE, 0.16));
    roundRect(g, tx, ty, ts, ts, 24);
    g.fill();
    if (img) {
      const s = 62;
      g.drawImage(img, tx + (ts - s) / 2, ty + (ts - s) / 2, s, s);
    }

    // title, to the right of the tile
    g.fillStyle = css(INK);
    g.font = "700 46px 'Space Grotesk', sans-serif";
    g.textBaseline = 'alphabetic';
    const lx = tx + ts + 24;
    const lines = wrap(g, item.title || '', CWPX - lx - 40).slice(0, 3);
    const first = ty + ts / 2 - ((lines.length - 1) * 54) / 2 + 15;
    lines.forEach((ln, i) => g.fillText(ln, lx, first + i * 54));

    // description, the middle of the card
    g.font = "400 34px 'Inter', sans-serif";
    g.fillStyle = css(rgb(palette.dim || '#5b5850'));
    g.textBaseline = 'alphabetic';
    const dl = wrap(g, item.desc || '', CWPX - 66 - 54);
    const maxL = 9;
    dl.slice(0, maxL).forEach((ln, i) => {
      if (i === maxL - 1 && dl.length > maxL) ln = ln.replace(/[ ,.;:]*$/, '') + '...';
      g.fillText(ln, 66, 310 + i * 47);
    });

    // price badge
    g.font = "500 31px 'IBM Plex Mono', monospace";
    const label = 'Quote first';
    const bw = g.measureText(label).width + 46, bh = 58, bx = tx, by = CHPX - 54 - bh;
    g.fillStyle = css(mix(accent, WHITE, 0.12));
    roundRect(g, bx, by, bw, bh, bh / 2);
    g.fill();
    g.strokeStyle = css(mix(accent, INK, 0.55), 0.55);
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = css(mix(accent, INK, 0.55));
    g.textBaseline = 'middle';
    g.fillText(label, bx + 23, by + bh / 2 + 2);
  }

  function drawBack(g, w, h) {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(43,42,38,0.09)';
    g.lineWidth = 2;
    for (let y = 120; y < h - 30; y += 40) {
      g.beginPath();
      g.moveTo(34, y);
      g.lineTo(w - 34, y);
      g.stroke();
    }
  }

  // shared back texture
  const backCanvas = document.createElement('canvas');
  backCanvas.width = 256; backCanvas.height = 338;
  drawBack(backCanvas.getContext('2d'), 256, 338);
  const backMat = new THREE.MeshStandardMaterial({
    map: makeTexture(backCanvas), transparent: true, roughness: 0.55, metalness: 0.1,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });


  const fontsReady = Promise.all([
    document.fonts.load("700 46px 'Space Grotesk'"),
    document.fonts.load("500 31px 'IBM Plex Mono'"),
    document.fonts.load("400 34px 'Inter'"),
  ]).catch(() => {});

  // The photo, cover-cropped to the slot, drawn into a canvas texture.
  function loadPhoto(src, mesh, tex, canvas) {
    const img = new Image();
    img.onload = () => {
      const g = canvas.getContext('2d');
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      g.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      tex.needsUpdate = true;
      mesh.material.color.set('#ffffff');
      if (kit.invalidate) kit.invalidate();
    };
    img.src = src;
  }

  // ---- the cards
  const cards = [];
  const pickables = [];
  for (let i = 0; i < N; i++) {
    const item = items[i] || { key: 'card' + i, title: '', desc: '', accent: '#b3492f', icon: '' };
    const holder = new THREE.Group();
    holder.userData.key = item.key;

    const card = new THREE.Mesh(cardGeo, bodyMat);
    card.userData.key = item.key;
    holder.add(card);
    pickables.push(card);

    const canvas = document.createElement('canvas');
    canvas.width = CWPX; canvas.height = CHPX;
    const g = canvas.getContext('2d');
    const tex = makeTexture(canvas);
    tex.anisotropy = 8;
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.18,
      transparent: true, roughness: 0.55, metalness: 0.1,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const face = new THREE.Mesh(faceGeo, frontMat);
    face.position.z = CT / 2 + 0.002;
    holder.add(face);
    const back = new THREE.Mesh(faceGeo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -CT / 2 - 0.002;
    holder.add(back);

    const tape = new THREE.Mesh(tapeGeo, mat(item.accent || 'accent', { opacity: 0.78 }));
    tape.position.set((i % 3 - 1) * 0.1, CH / 2 - 0.01, 0.008);
    tape.rotation.z = ((i * 37) % 7 - 3) * 1.6 * DEG;
    holder.add(tape);

    const done = () => { tex.needsUpdate = true; if (kit.invalidate) kit.invalidate(); };
    const paint = (img) => { fontsReady.then(() => { drawFront(g, item, img); done(); }); };
    if (item.icon) {
      const colour = css(mix(rgb(item.accent || '#b3492f'), INK, 0.45));
      let svg = item.icon.replace(/currentColor/g, colour);
      if (svg.indexOf('xmlns=') < 0) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      svg = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');
      svg = svg.replace('<svg', '<svg width="96" height="96"');
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => { paint(img); URL.revokeObjectURL(url); };
      img.onerror = () => { paint(null); URL.revokeObjectURL(url); };
      img.src = url;
    } else paint(null);

    const el = document.querySelector('[data-anchor="' + item.key + '"]');
    const image = item.image || (el && el.getAttribute('data-image')) || '';
    inner.add(holder);
    cards.push({
      key: item.key, holder, item, frontMat, image,
      tilt: (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.5) * DEG,
      model: null, stand: null, print: null,
    });
  }

  // ---- the path: short dashes along the S
  const NDASH = 54;
  const dashMat = new THREE.MeshStandardMaterial({
    color: palette.trim || '#cfc9ba', roughness: 0.6, metalness: 0.05, transparent: true, opacity: 0.85,
  });
  const dashGeo = new THREE.BoxGeometry(0.075, 1, 0.02);
  const dashes = [];
  for (let j = 0; j < NDASH; j++) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    inner.add(d);
    dashes.push(d);
  }
  let dashLayout = null;

  // x on the S at height yy above the bow, and its slope dx/dy. Past the ends
  // it carries on straight so cards can slide in from below and out above.
  function sAt(yy) {
    const s = Math.max(-1, Math.min(1, yy / L.Y));
    const bx = L.bowX - L.A;
    const x = bx + L.A * (1 - s * s) + L.K * s;
    const slope = (-2 * L.A * s + L.K) / L.Y;
    if (Math.abs(yy) > L.Y) return { x: x + slope * (yy - Math.sign(yy) * L.Y), slope };
    return { x, slope };
  }

  // ---- the centre: a mounted paper display with a plinth, local origin at the
  // middle of the backing card
  const centre = new THREE.Group();
  inner.add(centre);
  const PNW = 4.0, PNH = 3.1;
  const edge = new THREE.Mesh(rrGeo(PNW + 0.08, PNH + 0.08, 0.2, 0.04), mat('dark'));
  edge.position.z = -0.03;
  centre.add(edge);
  const panel = new THREE.Mesh(rrGeo(PNW, PNH, 0.18, 0.05), bodyMat);
  panel.rotation.z = 0;
  centre.add(panel);
  const plinthBase = new THREE.Mesh(slab(3.6, 2.0, 0.05, 0.12, 'dark').geometry, mat('dark'));
  const plinth = slab(3.5, 1.92, 0.15, 0.1, 'paper', { emissive: 0.35 });
  const PLY = -PNH / 2 + 0.08, PLZ = 1.0, PLTOP = PLY + 0.15;
  plinthBase.position.set(0, PLY - 0.045, PLZ);
  plinth.position.set(0, PLY, PLZ);
  centre.add(plinthBase, plinth);
  const tapeMat = new THREE.MeshStandardMaterial({
    color: '#b3492f', roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0.8,
  });
  const ptape = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.012), tapeMat);
  ptape.position.set(-0.5, PNH / 2 - 0.02, 0.032);
  ptape.rotation.z = -2.5 * DEG;
  centre.add(ptape);
  const ptape2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.01), tapeMat);
  ptape2.position.set(0.4, PLTOP + 0.01, PLZ + 0.9);
  ptape2.rotation.z = 1.5 * DEG;
  centre.add(ptape2);
  const floor = shadow(1.9, 0.22);
  floor.position.set(0, PLTOP + 0.003, PLZ);
  centre.add(floor);
  [panel, plinth, edge].forEach((m) => { pickables.push(m); });

  const MS = 3.0; // model scale on the plinth
  const PW = 2.9, PH = 2.5;
  const photoCache = {};
  function makePrint(c) {
    const g = new THREE.Group();
    g.userData.key = c.key;
    const body = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.28, PH + 0.28, 0.06), mat('#ffffff', { emissive: 0.22 }));
    body.position.y = (PH + 0.28) / 2;
    g.add(body);
    const pc = document.createElement('canvas');
    pc.width = 864; pc.height = Math.round(864 * PH / PW);
    const p2 = pc.getContext('2d');
    p2.fillStyle = css(mix(rgb(c.item.accent || '#b3492f'), WHITE, 0.25));
    p2.fillRect(0, 0, pc.width, pc.height);
    const ptex = makeTexture(pc);
    ptex.anisotropy = 8;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: ptex, color: '#ffffff' }));
    photo.position.set(0, (PH + 0.28) / 2, 0.034);
    g.add(photo);
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.01), tapeMat);
    corner.position.set(-PW / 2 - 0.02, PH + 0.28 - 0.05, 0.04);
    corner.rotation.z = 38 * DEG;
    g.add(corner);
    loadPhoto(c.image, photo, ptex, pc);
    return g;
  }

  cards.forEach((c) => {
    const stand = new THREE.Group();
    stand.position.set(0, PLTOP, PLZ);
    stand.visible = false;
    c.stand = stand;
    centre.add(stand);
    if (c.image) {
      c.print = makePrint(c);
      c.print.rotation.x = -0.1;
      stand.add(c.print);
      c.pick = c.print;
    }
  });

  // models, added when their module resolves (it may be missing)
  const base = new URL('./service-models.js', import.meta.url);
  base.search = new URL(import.meta.url).search;
  import(base.href).then((mod) => {
    const models = (mod && mod.models) || {};
    cards.forEach((c) => {
      const m = models[c.key];
      if (c.image || !m || c.model) return;
      try {
        const built = m.build(THREE, kit);
        if (!built || !built.group) return;
        built.group.userData.key = c.key;
        c.stand.add(built.group);
        c.model = built;
        c.pick = built.group;
      } catch (err) {
        console.warn('Service model "' + c.key + '" could not be built.', err);
      }
    });
    if (kit.invalidate) kit.invalidate();
  }).catch(() => {});

  // ---- posing
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion();
  const AX_Y = new THREE.Vector3(0, 1, 0), AX_Z = new THREE.Vector3(0, 0, 1);
  const compose = (out, yaw, rz) => {
    qA.setFromAxisAngle(AX_Y, yaw);
    qB.setFromAxisAngle(AX_Z, rz);
    return out.copy(qA).multiply(qB);
  };
  const hq = new THREE.Quaternion(), pq = new THREE.Quaternion();

  // Which card is at the bow: 0 to N - 1, held a beat on each.
  function flow(t) {
    const s = span(t, 0.38, 0.98) * (N - 1);
    const n = Math.min(N - 2, Math.floor(s));
    const f = s - n;
    return (n + ease.smooth(ease.smooth(f))) * 0.85 + s * 0.15;
  }

  let current = null;
  let activeKey = null;

  function applyLayout() {
    const asp = aspectNow();
    L = asp < 0.9 ? LAYOUTS.tall : LAYOUTS.wide;
    const visW = VIS_H * asp;
    // Fitting the whole box left the busy middle small: zoom in and let the
    // tapered ends of the path run off the top and bottom, like a conveyor.
    fit = Math.min((VIS_H * 0.96) / L.box.h, (visW * 0.96) / L.box.w) * (L === LAYOUTS.tall ? 1.15 : 1.4);
    root.scale.setScalar(fit);
    inner.position.set(-L.box.x, -L.box.y, 0);
    centre.position.set(L.cx, L.cy, 0);
    if (dashLayout !== L) {
      dashLayout = L;
      const seg = (2 * L.Y) / NDASH;
      dashes.forEach((d, j) => {
        const yy = -L.Y + (j + 0.5) * seg;
        const p = sAt(yy);
        d.position.set(p.x, L.y0 + yy, -0.7);
        d.rotation.z = -Math.atan(p.slope);
        d.userData.len = seg * 0.52;
        d.userData.at = j / NDASH;
      });
    }
    return visW / fit;
  }

  function update(t) {
    const visWroot = applyLayout();
    const cs = L.cs;
    const f = flow(t);
    const hs = Math.min(1.3, (0.88 * visWroot) / (2 * R + CW));
    const lin = span(t, 0, 0.34);
    const spin = TAU * 1.15 * (0.6 * lin + 0.4 * ease.smooth(lin));
    const bx = L.box.x, by = L.box.y;

    const drawn = ease.smooth(span(t, 0.17, 0.3));
    dashes.forEach((d) => {
      const on = span(drawn, d.userData.at, d.userData.at + 0.12);
      d.visible = on > 0.01;
      d.scale.set(1, d.userData.len * Math.max(0.001, on), 1);
    });

    let best = 0, bestK = -1;
    cards.forEach((c, i) => {
      const x = f - i;
      const k = 1 - ease.smooth(span(Math.abs(x), 0.05, 0.7));
      c.k = k;
      if (k > bestK) { bestK = k; best = i; }
      const hi = c.key === current ? 1 : 0;

      // helix place
      const ang = i * STEP - spin;
      const hx = bx + Math.sin(ang) * R * hs, hy = by + (i - 3) * RISE * hs, hz = Math.cos(ang) * R * hs;
      compose(hq, ang, c.tilt);
      // path place
      const yy = x * L.SP;
      const p = sAt(yy);
      const ay = Math.abs(yy);
      const taper = 1 - ease.smooth(span(ay, L.Y + 0.1, L.Y + 1.3));
      const base = 0.74 - 0.16 * ease.smooth(span(ay, 0, L.Y));
      const ps = (base + 0.14 * k + 0.04 * hi) * taper;
      const pz = 0.55 * k - 0.04 * ay + 0.2 * hi;
      const at = Math.atan(p.slope);
      compose(pq, -0.2 * at * (1 - k * 0.6), -at * 0.6);

      const u = ease.smooth(span(t, 0.18 + 0.012 * i, 0.26 + 0.012 * i));
      const lift = Math.sin(Math.PI * u) * 0.3;
      c.holder.position.set(hx + (p.x - hx) * u, hy + (L.y0 + yy - hy) * u, hz + (pz - hz) * u + lift);
      qC.copy(hq).slerp(pq, u);
      c.holder.quaternion.copy(qC);
      const sc = hs + (ps - hs) * u;
      c.holder.scale.setScalar(Math.max(0.0001, sc));
      c.holder.visible = sc > 0.01;
      const dim = 0.86 + 0.14 * Math.max(k, 1 - u);
      c.frontMat.color.setScalar(dim);
    });

    // the centre pops up as the helix finishes unwinding
    const cin = ease.back(span(t, 0.24, 0.36));
    centre.scale.setScalar(Math.max(0.0001, cs * cin));
    centre.visible = cin > 0.005;

    const act = Math.max(0, Math.min(N - 1, Math.round(f)));
    if (activeKey !== cards[act].key) {
      activeKey = cards[act].key;
      tapeMat.color.set(cards[act].item.accent || '#b3492f');
    }
    [panel, plinth, edge].forEach((m) => { m.userData.key = activeKey; });
    // only the model on show can be clicked
    for (let n = pickables.length - 1; n >= N + 3; n--) pickables.pop();
    let shownMax = 0;
    cards.forEach((c, i) => {
      const x = f - i;
      let m;
      if (i === 0) m = x <= 0 ? ease.back(span(t, 0.3, 0.42)) : 1 - ease.smooth(span(x, 0.1, 0.4));
      else if (x < 0) m = ease.back(span(x, -0.45, -0.1));
      else m = 1 - ease.smooth(span(x, 0.1, 0.4));
      const k = 1 - ease.smooth(span(Math.abs(x), 0.05, 0.55));
      const out = x > 0 ? ease.smooth(span(x, 0.1, 0.4)) : 0;
      const live = m > 0.01 && !(i === 0 && t < 0.3);
      c.stand.visible = live;
      if (!live) return;
      shownMax = Math.max(shownMax, m);
      c.stand.scale.setScalar(MS * Math.max(0.001, m));
      c.stand.position.y = PLTOP - 0.7 * out;
      if (c.print) {
        c.stand.scale.setScalar(Math.max(0.001, m));
        c.print.rotation.y = 0.14 * Math.sin(t * 22 + i);
      } else if (c.model) {
        c.model.group.rotation.y = 0.5 + t * 7;
        try { c.model.update(k, t); } catch (err) { c.stand.visible = false; }
      }
      if (c.pick && m > 0.3) pickables.push(c.pick);
    });
    floor.scale.setScalar(Math.max(0.001, shownMax));
  }

  function highlight(key) {
    current = key || null;
    if (kit.invalidate) kit.invalidate();
  }

  update(0);

  return {
    root,
    shot: { radius: CAM_R, height: CAM_H, angle: 0, target: [0, 0, 0] },
    target: () => [0, 0, 0],
    camera: { swing: 0, push: { from: 0.78, amount: 0 } },
    pickables,
    highlight,
    update,
  };
}
