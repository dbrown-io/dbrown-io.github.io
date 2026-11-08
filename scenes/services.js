// The service helix: seven big paper tickets on a rising spiral, like a spiral
// staircase of cards. As the home page is scrolled through its pinned track the
// helix turns and the look-at point climbs, so each card in turn comes squarely
// to the front, then holds for a beat. The front card's pop-up ledge folds out
// from its face and a small model (scenes/service-models.js) stands on it; the
// dog cards carry a mounted print instead. Everything is posed from t, so
// nothing runs on a timer. 1 unit = 10 cm.
//
// The ticket mirrors the site's service tickets: tape across the top, a dashed
// left edge, an icon tile and the title, a "Quote first" pill. The middle of
// the card is left clear for the ledge or the print.
export default function build(THREE, kit) {
  const { mat, shadow, ease, span, clamp01, palette } = kit;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;

  const CW = 2.2, CH = 2.9, CT = 0.05; // card width, height, thickness
  const R = 2.9; // helix radius to the card faces
  const RISE = 0.62; // climb per card
  // Helix order, bottom to top: the dog card is square on at t = 0 and the
  // photo shoots card at t = 1, with the five model cards between.
  const ORDER = ['dog', 'wash', 'garden', 'tutoring', 'printing', 'pc', 'photography'];
  const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
  const items = (kit.data && kit.data.length ? kit.data.slice() : []).sort((a, b) => rank(a.key) - rank(b.key));
  const phone = window.innerWidth < 640;
  const N = items.length || 7;
  const STEP = TAU / 7;

  const root = new THREE.Group();
  const helix = new THREE.Group();
  root.add(helix);

  const floor = shadow(4.2, 0.26);
  floor.position.y = -CH / 2 - 0.02;
  root.add(floor);

  // ---- shared geometry: a rounded card, thin, front facing +z
  const r = 0.12;
  const shape = new THREE.Shape();
  const x0 = -CW / 2, y0 = -CH / 2;
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x0 + CW - r, y0); shape.quadraticCurveTo(x0 + CW, y0, x0 + CW, y0 + r);
  shape.lineTo(x0 + CW, y0 + CH - r); shape.quadraticCurveTo(x0 + CW, y0 + CH, x0 + CW - r, y0 + CH);
  shape.lineTo(x0 + r, y0 + CH); shape.quadraticCurveTo(x0, y0 + CH, x0, y0 + CH - r);
  shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);
  const cardGeo = new THREE.ExtrudeGeometry(shape, { depth: CT, bevelEnabled: false, curveSegments: 4 });
  cardGeo.translate(0, 0, -CT / 2);
  const faceGeo = new THREE.PlaneGeometry(CW - 0.02, CH - 0.02);
  const tapeGeo = new THREE.BoxGeometry(0.9, 0.26, 0.012);
  const bodyMat = mat('body', { emissive: 0.18 });
  const ledgeMat = mat('paper', { emissive: 0.35 });

  // pop-up ledge: hinged at its back edge (z = 0), extending along +z when flat out
  const LW = 1.7, LD = 0.95, LT = 0.035;
  const ledgeGeo = new THREE.BoxGeometry(LW, LT, LD);
  ledgeGeo.translate(0, 0, LD / 2);
  const lipGeo = new THREE.BoxGeometry(LW, LT + 0.03, 0.045);
  const hingeGeo = new THREE.BoxGeometry(LW * 0.62, 0.014, 0.16);
  const HINGE_Y = -CH / 2 + CH * 0.4; // about 40% up the card
  const MODEL_SCALE = 0.98;

  // mounted print slot
  const PW = 1.72, PH = 1.5, PY = -0.14, PX = 0.05;
  const borderGeo = new THREE.PlaneGeometry(PW + 0.16, PH + 0.16);
  const photoGeo = new THREE.PlaneGeometry(PW, PH);
  const cornerGeo = new THREE.BoxGeometry(0.4, 0.13, 0.01);
  const borderMat = mat('#ffffff', { emissive: 0.22 });

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

  // ---- the cards
  const cards = [];
  const anchors = [];
  const pickables = [];
  const fontsReady = Promise.all([
    document.fonts.load("700 46px 'Space Grotesk'"),
    document.fonts.load("500 31px 'IBM Plex Mono'"),
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

  for (let i = 0; i < N; i++) {
    const item = items[i] || { key: 'card' + i, title: '', accent: '#b3492f', icon: '' };
    const el = document.querySelector('[data-anchor="' + item.key + '"]');
    const image = item.image || (el && el.getAttribute('data-image')) || '';
    const phi = i * STEP;
    const tilt = (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.5) * DEG;
    const holder = new THREE.Group();
    holder.rotation.y = phi;
    holder.userData.key = item.key;
    const pose = new THREE.Group(); // tilt lives here so highlight can move the holder freely
    pose.rotation.z = tilt;
    holder.add(pose);

    const card = new THREE.Mesh(cardGeo, bodyMat);
    card.userData.key = item.key;
    pose.add(card);
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
    const front = new THREE.Mesh(faceGeo, frontMat);
    front.position.z = CT / 2 + 0.002;
    pose.add(front);
    const back = new THREE.Mesh(faceGeo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -CT / 2 - 0.002;
    pose.add(back);

    // tape: translucent accent, a little crooked
    const tape = new THREE.Mesh(tapeGeo, mat(item.accent || 'accent', { opacity: 0.78 }));
    tape.position.set((i % 3 - 1) * 0.1, CH / 2 - 0.01, 0.008);
    tape.rotation.z = ((i * 37) % 7 - 3) * 1.6 * DEG;
    pose.add(tape);

    const anchor = new THREE.Group();
    anchor.position.set(0, CH / 2 + 0.2, 0);
    pose.add(anchor);
    anchors.push({ key: item.key, object: anchor });

    const c = { key: item.key, holder, pose, phi, anchor, ledge: null, mount: null, model: null, kind: image ? 'print' : 'model', k: 0 };

    if (image) {
      // a mounted print: card-coloured border, photo, a tape corner
      const border = new THREE.Mesh(borderGeo, borderMat);
      border.position.set(PX, PY, CT / 2 + 0.012);
      border.rotation.z = (i % 2 ? 1 : -1) * 1.4 * DEG;
      border.userData.key = item.key;
      pose.add(border);
      pickables.push(border);
      const pc = document.createElement('canvas');
      pc.width = 864; pc.height = Math.round(864 * PH / PW);
      const pg2 = pc.getContext('2d');
      pg2.fillStyle = css(mix(rgb(item.accent || '#b3492f'), WHITE, 0.25));
      pg2.fillRect(0, 0, pc.width, pc.height);
      const ptex = makeTexture(pc);
      ptex.anisotropy = 8;
      const photo = new THREE.Mesh(photoGeo, new THREE.MeshBasicMaterial({ map: ptex, color: '#ffffff' }));
      photo.position.z = 0.004;
      photo.userData.key = item.key;
      border.add(photo);
      pickables.push(photo);
      const corner = new THREE.Mesh(cornerGeo, mat(item.accent || 'accent', { opacity: 0.8 }));
      corner.position.set(-PW / 2 - 0.02, PH / 2 + 0.02, 0.012);
      corner.rotation.z = 38 * DEG;
      border.add(corner);
      loadPhoto(image, photo, ptex, pc);
    } else {
      // pop-up ledge, hinged at the card face
      const mount = new THREE.Group();
      mount.position.set(0, HINGE_Y, CT / 2 + 0.006);
      pose.add(mount);
      const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
      ledge.userData.key = item.key;
      mount.add(ledge);
      const lip = new THREE.Mesh(lipGeo, mat(item.accent || 'accent'));
      lip.position.set(0, 0, LD - 0.02);
      mount.add(lip);
      const hinge = new THREE.Mesh(hingeGeo, mat(item.accent || 'accent', { opacity: 0.78 }));
      hinge.position.set(0, 0.012, 0.03);
      mount.add(hinge);
      const modelHolder = new THREE.Group();
      modelHolder.userData.key = item.key;
      pose.add(modelHolder);
      c.mount = mount;
      c.modelHolder = modelHolder;
      pickables.push(ledge);
    }

    // draw once fonts and the icon have loaded (async: never during build)
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

    pose.position.set(0, 0, 0);
    helix.add(holder);
    cards.push(c);
  }

  // ---- models, added when their module resolves (it may be missing)
  const base = new URL('./service-models.js', import.meta.url);
  base.search = new URL(import.meta.url).search;
  import(base.href).then((mod) => {
    const models = (mod && mod.models) || {};
    cards.forEach((c) => {
      const m = models[c.key];
      if (!m || !c.modelHolder || c.model) return;
      try {
        const built = m.build(THREE, kit);
        if (!built || !built.group) return;
        built.group.userData.key = c.key;
        c.modelHolder.add(built.group);
        c.model = built;
        pickables.push(built.group);
      } catch (err) {
        console.warn('Service model "' + c.key + '" could not be built.', err);
      }
    });
    if (kit.invalidate) kit.invalidate();
  }).catch(() => {});

  // ---- posing
  // Which card is in front: t runs 0 to 1 over cards 0 to N - 1, held a beat on
  // each (mostly stepped, a little linear so it never freezes dead).
  function front(t) {
    const x = clamp01(t) * (N - 1);
    const n = Math.min(N - 2, Math.floor(x));
    const f = x - n;
    const stepped = n + ease.smooth(ease.smooth(f));
    return stepped * 0.82 + x * 0.18;
  }

  let current = null;
  let lastIdx = 0;
  function layout(idx) {
    cards.forEach((c, i) => {
      const hi = c.key === current;
      const out = R + (hi ? 0.18 : 0);
      c.holder.position.set(Math.sin(c.phi) * out, i * RISE + (hi ? 0.06 : 0), Math.cos(c.phi) * out);
    });
  }

  function update(t) {
    const idx = front(t);
    lastIdx = idx;
    helix.rotation.y = -idx * STEP;
    layout(idx);
    cards.forEach((c, i) => {
      const d = Math.abs(i - idx);
      const k = 1 - ease.smooth(span(d, 0.0, 0.8));
      c.k = k;
      if (!c.mount) return;
      const fold = (1 - ease.smooth(k)) * (Math.PI / 2);
      c.mount.rotation.x = -fold;
      const mid = LD / 2;
      const m = c.modelHolder;
      if (c.model) {
        const pop = ease.smooth(span(k, 0.2, 1));
        m.visible = pop > 0.01;
        if (m.visible) {
          m.position.set(0, HINGE_Y + Math.sin(fold) * mid + LT / 2, CT / 2 + 0.006 + Math.cos(fold) * mid);
          m.scale.setScalar(MODEL_SCALE * Math.max(0.001, pop));
          try { c.model.update(k, t); } catch (err) { m.visible = false; }
        }
      }
    });
  }

  function highlight(key) {
    current = key || null;
    layout(lastIdx);
  }

  update(0);

  return {
    root,
    shot: { radius: phone ? 7.6 : 7.9, height: phone ? 3.1 : 2.9, angle: 0, target: [0, 0, R] },
    // The camera looks at the front card's face and climbs with the helix.
    target: (t) => [0, front(t) * RISE, R],
    camera: { swing: 10 },
    anchors,
    pickables,
    highlight,
    update,
  };
}
