// The service ring: seven paper tickets standing on their bottom edges in a
// circle, each facing outward, the whole ring turning one full revolution as
// the home page is scrolled through its pinned track. Each ticket mirrors the
// site's service tickets (tape across the top, a dashed left edge, an icon
// tile, the title, a "Quote first" pill). The front faces are canvas textures
// drawn once the fonts and the icon image have loaded; everything else is
// posed from t, so nothing runs on a timer. 1 unit = 10 cm.
//
// Facing for the leader lines uses a fixed front direction (+z, the camera's
// home side): the shot swings only a few degrees, so recomputing the camera
// direction would change nothing visible.
export default function build(THREE, kit) {
  const { mat, shadow, ease, clamp01, palette } = kit;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;

  const CW = 1.5, CH = 1.95, CT = 0.05; // card width, height, thickness
  const RING = 2.05; // ring radius
  // Ring order, whatever the callout order: the dog card is square on at t = 0.
  const ORDER = ['dog', 'pc', 'tutoring', 'wash', 'garden', 'printing', 'photography'];
  const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
  const items = (kit.data && kit.data.length ? kit.data.slice() : []).sort((a, b) => rank(a.key) - rank(b.key));
  const phone = window.innerWidth < 640;
  const N = items.length || 7;

  const root = new THREE.Group();
  const ring = new THREE.Group();
  root.add(ring);

  const floor = shadow(RING + 0.95, 0.3);
  floor.scale.set(1, 1, 1);
  root.add(floor);

  // ---- shared geometry: a rounded card, thin, front facing +z
  const r = 0.09;
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
  const tapeGeo = new THREE.BoxGeometry(0.66, 0.2, 0.012);
  const bodyMat = mat('body', { emissive: 0.18 });

  // ---- canvas helpers
  const CWPX = 512, CHPX = 666;
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
    g.lineWidth = 3;
    g.setLineDash([9, 11]);
    g.beginPath();
    g.moveTo(34, 70);
    g.lineTo(34, CHPX - 40);
    g.stroke();
    g.restore();

    // icon tile
    const tx = 64, ty = 100, ts = 150;
    g.fillStyle = css(mix(accent, WHITE, 0.16));
    roundRect(g, tx, ty, ts, ts, 34);
    g.fill();
    if (img) {
      const s = 84;
      g.drawImage(img, tx + (ts - s) / 2, ty + (ts - s) / 2, s, s);
    }

    // title
    g.fillStyle = css(INK);
    g.font = "700 54px 'Space Grotesk', sans-serif";
    g.textBaseline = 'alphabetic';
    const lines = wrap(g, item.title || '', CWPX - tx - 44);
    lines.slice(0, 3).forEach((ln, i) => g.fillText(ln, tx, ty + ts + 82 + i * 62));

    // price badge
    g.font = "500 30px 'IBM Plex Mono', monospace";
    const label = 'Quote first';
    const bw = g.measureText(label).width + 44, bh = 56, bx = tx, by = CHPX - 62 - bh;
    g.fillStyle = css(mix(accent, WHITE, 0.12));
    roundRect(g, bx, by, bw, bh, bh / 2);
    g.fill();
    g.strokeStyle = css(mix(accent, INK, 0.55), 0.55);
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = css(mix(accent, INK, 0.55));
    g.textBaseline = 'middle';
    g.fillText(label, bx + 22, by + bh / 2 + 2);
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
  backCanvas.width = 256; backCanvas.height = 333;
  drawBack(backCanvas.getContext('2d'), 256, 333);
  const backMat = new THREE.MeshStandardMaterial({
    map: makeTexture(backCanvas), transparent: true, roughness: 0.55, metalness: 0.1,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });

  // ---- the cards
  const cards = [];
  const anchors = [];
  const fontsReady = Promise.all([
    document.fonts.load("700 54px 'Space Grotesk'"),
    document.fonts.load("500 30px 'IBM Plex Mono'"),
  ]).catch(() => {});

  for (let i = 0; i < N; i++) {
    const item = items[i] || { key: 'card' + i, title: '', accent: '#b3492f', icon: '' };
    const phi = (i / N) * TAU;
    const tilt = (i % 2 ? 1 : -1) * (2.2 + (i % 3) * 0.7) * DEG;
    const holder = new THREE.Group();
    holder.rotation.y = phi;
    holder.rotation.z = tilt;

    const card = new THREE.Mesh(cardGeo, bodyMat);
    holder.add(card);

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
    holder.add(front);
    const back = new THREE.Mesh(faceGeo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -CT / 2 - 0.002;
    holder.add(back);

    // tape: translucent accent, a little crooked
    const tape = new THREE.Mesh(tapeGeo, mat(item.accent || 'accent', { opacity: 0.78 }));
    tape.position.set((i % 3 - 1) * 0.08, CH / 2 - 0.01, 0.006);
    tape.rotation.z = ((i * 37) % 7 - 3) * 1.6 * DEG;
    holder.add(tape);

    const anchor = new THREE.Group();
    anchor.position.set(0, CH / 2 + 0.17, 0);
    holder.add(anchor);
    anchors.push({ key: item.key, object: anchor });

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

    ring.add(holder);
    cards.push({ key: item.key, holder, phi, tilt, anchor, lift: 0 });
  }

  // ---- posing
  let theta = 0;
  let current = null;
  function layout() {
    cards.forEach((c, i) => {
      const hand = Math.sin(c.phi * 2 + theta * 2 + i) * 0.035;
      const wobble = Math.abs(Math.sin(c.tilt)) * CW / 2 + hand + 0.02;
      const out = RING + (c.key === current ? 0.35 : 0);
      const up = CH / 2 + wobble + (c.key === current ? 0.15 : 0);
      c.holder.position.set(Math.sin(c.phi) * out, up, Math.cos(c.phi) * out);
    });
  }

  function update(t) {
    // Eased a touch in the middle but exactly one turn: card 0 is square on at both ends.
    const k = t * 0.65 + ease.smooth(clamp01(t)) * 0.35;
    theta = k * TAU;
    ring.rotation.y = theta;
    layout();
    cards.forEach((c) => {
      const a = c.phi + theta;
      c.anchor.userData.facing = clamp01(Math.cos(a) * 1.3 + 0.15);
    });
  }

  function highlight(key) {
    current = key || null;
    layout();
  }

  update(0);

  return {
    root,
    shot: { radius: phone ? 10.6 : 12, height: phone ? 3.9 : 4.3, angle: 0, target: [0, 0.8, 0] },
    camera: { swing: 14 },
    anchors,
    highlight,
    update,
  };
}
