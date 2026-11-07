// The homelab: a 2016 15-inch MacBook Pro (34.9 x 24.1 cm, 1 unit = 10 cm)
// whose lid opens as the page scrolls, then the stack it runs lifts off the
// deck: Proxmox VE, the guests (VMs and containers) and the services with the
// n8n automations. Everything is posed from t; nothing runs on a timer.
export default function build(THREE, kit) {
  const { box, slab, mat, shadow, ease, span, clamp01 } = kit;
  const DEG = Math.PI / 180;

  const ALU = '#8d8f94'; // space-grey aluminium, cooler than the page's warm greys
  const W = 3.49, D = 2.41;
  const baseH = 0.08, lidT = 0.062, gap = 0.025;
  const hingeZ = -D / 2 + 0.03;

  const root = new THREE.Group();
  const lap = new THREE.Group();
  root.add(lap);

  // ---- base: aluminium, black key well, keys, Touch Bar, trackpad
  const base = slab(W, D, baseH, 0.12, ALU);
  lap.add(base);

  const well = slab(3.0, 1.0, 0.004, 0.05, 'dark');
  well.position.set(0, baseH, -0.43);
  lap.add(well);

  // speaker grilles either side of the keys
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 4; i++) {
      const g = box(0.07, 0.004, 0.85 - i * 0.12, '#6c6e73');
      g.position.set(s * (1.58 + i * 0.045), baseH + 0.002, -0.4);
      lap.add(g);
    }
  });

  // Touch Bar: dark strip, a little lit
  const touchBar = box(2.5, 0.01, 0.1, 'dark', { emissive: 0.25 });
  touchBar.position.set(0, baseH + 0.005, -0.99);
  lap.add(touchBar);

  // 14 x 6 key grid as one instanced mesh
  const COLS = 14, ROWS = 6, pitch = 0.2, rowPitch = 0.155, keyH = 0.016;
  const keyZ0 = -0.82;
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat('dark'), COLS * ROWS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  let n = 0;
  const putKey = (x, z, w, d) => {
    ps.set(x, baseH + 0.004 + keyH / 2, z);
    sc.set(w, keyH, d);
    m4.compose(ps, q, sc);
    keys.setMatrixAt(n++, m4);
  };
  for (let r = 0; r < ROWS; r++) {
    const z = keyZ0 + r * rowPitch;
    const d = r === 0 ? 0.085 : 0.13;
    if (r < ROWS - 1) {
      for (let c = 0; c < COLS; c++) putKey((c - (COLS - 1) / 2) * pitch, z, 0.17, d);
    } else {
      // bottom row: modifiers, a long space bar, then the arrows' place
      for (let c = 0; c < 4; c++) putKey((c - 6.5) * pitch, z, 0.17, d);
      putKey(0.0 - 0.0, z, 1.17, d);
      for (let c = 10; c < COLS; c++) putKey((c - 6.5) * pitch, z, 0.17, d);
      putKey((8.5 - 6.5) * pitch + 0.0, z, 0.0001, 0.0001);
      while (n < COLS * ROWS) putKey(0, z, 0.0001, 0.0001);
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  lap.add(keys);

  // the very large trackpad, about 16 x 10 cm
  const pad = slab(1.6, 1.0, 0.005, 0.04, 'body');
  pad.position.set(0, baseH, 0.64);
  lap.add(pad);

  // ---- hinge
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.0, 10), mat('dim'));
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, baseH + gap * 0.6, hingeZ);
  lap.add(hinge);

  // ---- lid: pivots at the back edge; local +z lies over the base when closed
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, baseH + gap, hingeZ);
  lap.add(lidPivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0, D / 2 - 0.03);
  lidPivot.add(lid);
  lid.add(slab(W, D, lidT, 0.12, ALU));

  const bezel = slab(W - 0.1, D - 0.1, 0.005, 0.08, 'dark');
  bezel.position.y = -0.005;
  lid.add(bezel);

  // the glass sits on a group turned to face down out of the lid (local +y of
  // the group is the top of the screen when the lid is up)
  const GW = W - 0.34, GH = D - 0.34;
  const face = new THREE.Group();
  face.rotation.x = Math.PI / 2;
  face.position.set(0, -0.0056, 0);
  lid.add(face);
  const screenMat = mat('dark', { emissive: 0.1, unique: true });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), screenMat);
  face.add(glass);

  // logo on the lid's back: a plain disc
  const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 24), mat('paper'));
  logo.position.set(0, lidT + 0.004, 0);
  lid.add(logo);

  // ---- code lines, pooled; they scroll up with t
  const CROWS = 12;
  const cpitch = (GH * 0.9) / (CROWS + 0.4);
  const barH = cpitch * 0.46;
  const cpad = GW * 0.07, inner = GW - cpad * 2;
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const mA = mat('accent2', { emissive: 0.8 });
  const mB = mat('accent', { emissive: 0.8 });
  const mC = mat('paper', { emissive: 0.55 });
  const hash = (v) => { const s = Math.sin(v * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const slots = [];
  for (let i = 0; i <= CROWS; i++) {
    const trio = [mA, mB, mC].map((m) => {
      const b = new THREE.Mesh(unit, m);
      face.add(b);
      return b;
    });
    slots.push(trio);
  }
  function setCode(t, glow) {
    const s = span(t, 0.08, 1) * 16;
    const baseLine = Math.floor(s), frac = s - baseLine;
    const regionH = cpitch * CROWS;
    const top = GH / 2 - GH * 0.05;
    for (let i = 0; i <= CROWS; i++) {
      const line = i + baseLine;
      const pos = (i - frac) * cpitch;
      const fade = clamp01(1 + pos / cpitch) * clamp01((regionH - pos) / cpitch) * glow;
      const trio = slots[i];
      if (fade <= 0.01 || hash(line * 3.7) < 0.14) { trio.forEach((b) => { b.visible = false; }); continue; }
      const indent = Math.floor(hash(line * 1.9 + 4) * 4) * 0.07 * inner;
      const lenA = (0.1 + hash(line * 5.3) * 0.16) * inner;
      const lenB = (0.18 + hash(line * 8.1 + 2) * 0.4) * inner;
      const lenC = (0.08 + hash(line * 2.3 + 9) * 0.18) * inner;
      const y = top - pos - barH / 2 - (cpitch - barH) / 2;
      const x0 = -GW / 2 + cpad + indent;
      const g = cpitch * 0.4;
      const lens = [lenA, lenB, lenC];
      let x = x0;
      trio.forEach((b, k) => {
        b.visible = true;
        b.scale.set(lens[k], barH * fade, 0.01);
        b.position.set(x + lens[k] / 2, y, 0.006);
        x += lens[k] + g;
      });
    }
  }

  // ---- exploded layers
  const layers = new THREE.Group();
  layers.position.set(0, baseH + 0.06, 0.12);
  lap.add(layers);
  const PW = 2.3, PD = 1.3;

  const mkLayer = () => {
    const g = new THREE.Group();
    const props = new THREE.Group();
    g.add(props);
    layers.add(g);
    return { g, props };
  };

  // 1. Proxmox VE: blue plate with a few paper marks
  const L0 = mkLayer();
  L0.g.add(slab(PW, PD, 0.07, 0.1, 'accent2'));
  [[-0.7, 0.45], [-0.35, 0.3], [0.0, 0.2]].forEach(([x, w], i) => {
    const b = box(w, 0.012, 0.07, 'paper');
    b.position.set(-0.55 + x * 0.0 + i * 0.0 - 0.0, 0.076, 0.45 - i * 0.14);
    b.position.x = -PW / 2 + 0.2 + w / 2;
    L0.props.add(b);
  });

  // 2. Guests: two VMs and a container, each a card with a dark top strip
  const L1 = mkLayer();
  L1.g.add(slab(PW, PD, 0.06, 0.1, 'body'));
  const guest = (x, w, d, h) => {
    const g = new THREE.Group();
    const b = box(w, h, d, 'paper'); b.position.y = h / 2; g.add(b);
    const s = box(w + 0.01, 0.06, d + 0.01, 'dark'); s.position.y = h - 0.03; g.add(s);
    const led = box(0.06, 0.012, 0.06, 'accent', { emissive: 0.8 }); led.position.set(w / 2 - 0.1, h + 0.003, d / 2 - 0.1); g.add(led);
    g.position.set(x, 0.06, 0);
    L1.props.add(g);
  };
  guest(-0.75, 0.62, 0.8, 0.46);
  guest(0.0, 0.62, 0.8, 0.46);
  guest(0.72, 0.5, 0.55, 0.28);

  // 3. Services: three tiles, the n8n one in terracotta with a node graph
  const L2 = mkLayer();
  L2.g.add(slab(PW, PD, 0.06, 0.1, 'body'));
  const tile = (x, z, role) => {
    const t = slab(0.62, 0.62, 0.08, 0.06, role);
    t.position.set(x, 0.06, z);
    L2.props.add(t);
    return t;
  };
  tile(-0.75, 0, 'garden');
  tile(0.0, 0, 'wash');
  tile(0.75, 0, 'accent');
  const nodes = [[0.55, 0.12, 0.12], [0.95, 0.38, -0.12], [0.8, 0.22, 0.2]];
  const nodeMat = mat('paper');
  const pts = nodes.map(([x, y, z]) => new THREE.Vector3(x, 0.14 + y, z));
  pts.forEach((p) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), nodeMat);
    s.position.copy(p);
    L2.props.add(s);
  });
  [[0, 1], [1, 2], [0, 2]].forEach(([a, b]) => {
    const A = pts[a], B = pts[b];
    const len = A.distanceTo(B);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), nodeMat);
    c.position.copy(A).add(B).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    L2.props.add(c);
  });

  const parts = [L0, L1, L2];

  // dashed guide through the stack centre
  const dashes = [];
  const DASH_N = 20, DASH_P = 0.15;
  for (let i = 0; i < DASH_N; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.085, 5), mat('trim'));
    layers.add(d);
    dashes.push(d);
  }

  lap.add(shadow(2.7, 0.3));
  lap.children[lap.children.length - 1].scale.set(1.15, 1, 0.85);

  // lap sits so its middle is at the origin
  lap.position.set(0, 0, 0);

  const REST = [0.0, 0.14, 0.28];      // stacked, just above the deck
  const OPEN = [0.55, 1.35, 2.15];     // exploded, about 0.8 apart
  const START = 0.42, STAG = 0.08, LEN = 0.88 - START - 2 * STAG;

  function update(t) {
    // lid: closed until 0.06, open with a little overshoot by 0.32
    const x = span(t, 0.06, 0.32);
    const ang = 105 * DEG * ease.back(x, 0.9);
    lidPivot.rotation.x = -ang;
    const glow = clamp01((ang / DEG - 40) / 40);
    screenMat.emissiveIntensity = 0.1 + 0.3 * glow;
    setCode(t, glow);

    // layers come up out of the deck as the lid opens
    const rise = ease.smooth(span(t, 0.12, 0.34));
    layers.visible = rise > 0.01;
    layers.scale.setScalar(Math.max(0.0001, rise));

    let reach = 0;
    parts.forEach((p, i) => {
      const e = ease.inout(span(t, START + i * STAG, START + i * STAG + LEN));
      p.g.position.y = REST[i] + (OPEN[i] - REST[i]) * e;
      p.props.scale.y = 0.08 + 0.92 * clamp01(e * 1.4 + (i === 0 ? 1 : 0));
      if (e > 0) reach = Math.max(reach, p.g.position.y + 0.3);
    });
    // dashed guide grows up with the top layer
    const topY = parts[2].g.position.y + 0.5;
    dashes.forEach((d, i) => {
      const y = 0.1 + i * DASH_P;
      const k = clamp01((topY - y) / 0.2) * (parts[0].g.position.y > REST[0] + 0.02 ? 1 : 0);
      d.visible = k > 0.02;
      d.scale.setScalar(Math.max(0.0001, k));
      d.position.set(0, y, 0);
    });
  }

  update(0);
  return {
    root,
    shot: { radius: 9.6, height: 3.2, angle: 24, target: [0, 1.0, 0] },
    // The camera looks at the laptop while it opens, then rises with the
    // stack, so neither the deck nor the top layer leaves the frame.
    target: (t) => [0, 0.45 + 0.55 * ease.inout(span(t, START, 0.88)), 0],
    update,
  };
}
