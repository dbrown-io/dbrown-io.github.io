// Five small models for the service cards in the home page ring. Each one
// stands on the card's paper ledge, fits 1.3 (x) by 1.1 (y) by 0.7 (z) with
// its base at y = 0 and its front facing +z, and does one thing as the card
// turns to face the viewer (k from about 0.4 to 1). Everything is posed from
// k and t, so it plays backwards when the page scrolls back up. 1 unit = 10 cm.
//
//   wash      a car, dirty on the left, cleaned by a pressure washer sweeping across
//   garden    a sprout grows two leaves while fallen leaves are raked into a pile
//   tutoring  the top book opens, the cap hops onto it, maths rises out
//   printing  a printer lays down a pawn layer by layer, nozzle riding the top
//   pc        a RAM stick slides into its slot and the power LED lights
//
// build(THREE, kit) -> { group, update(k, t) }
const DEG = Math.PI / 180;

function helpers(THREE, kit) {
  const { box, mat, ease, span, clamp01 } = kit;
  const geoCache = {};
  const cyl = (rt, rb, h, seg) => {
    const key = [rt, rb, h, seg].join('|');
    return geoCache[key] || (geoCache[key] = new THREE.CylinderGeometry(rt, rb, h, seg));
  };
  const sph = (seg) => geoCache['s' + seg] || (geoCache['s' + seg] = new THREE.SphereGeometry(1, seg, Math.max(3, seg - 2)));
  const cylinder = (rt, rb, h, role, opts, seg) => new THREE.Mesh(cyl(rt, rb, h, seg || 12), mat(role, opts));
  const ball = (r, role, opts, seg) => {
    const m = new THREE.Mesh(sph(seg || 8), mat(role, opts));
    m.scale.setScalar(r);
    return m;
  };
  // Put a mesh at a place in a parent and hand it back.
  const put = (parent, m, x, y, z) => { m.position.set(x, y || 0, z || 0); parent.add(m); return m; };
  const lerp = (a, b, t) => a + (b - a) * t;
  return { box, mat, ease, span, clamp01, cylinder, ball, put, lerp };
}

// ---------------------------------------------------------------- wash
function wash(THREE, kit) {
  const { box, mat, ease, span, cylinder, ball, put, lerp } = helpers(THREE, kit);
  const group = new THREE.Group();
  const DIRT = '#9a8566';
  const CLEAN = 'accent2';

  const L = 1.2, x0 = -L / 2;
  const car = new THREE.Group();
  group.add(car);
  put(car, box(L, 0.17, 0.36, DIRT), 0, 0.165, 0);

  // clean paint arrives column by column, so the sweep is a true edge
  const cols = [];
  const addCols = (from, to, n, y, h, d) => {
    const w = (to - from) / n;
    for (let i = 0; i < n; i++) {
      const m = box(w, h + 0.008, d + 0.008, CLEAN);
      m.position.y = y;
      car.add(m);
      cols.push({ m, left: from + i * w, w });
    }
  };
  put(car, box(0.62, 0.17, 0.34, DIRT), -0.03, 0.335, 0);
  addCols(x0, x0 + L, 8, 0.165, 0.17, 0.36);
  addCols(-0.34, 0.28, 4, 0.335, 0.17, 0.34);

  // windows on both sides, lights, wheels
  [-1, 1].forEach((s) => {
    put(car, box(0.26, 0.09, 0.012, 'dark'), -0.19, 0.335, s * 0.175);
    put(car, box(0.22, 0.09, 0.012, 'dark'), 0.12, 0.335, s * 0.175);
  });
  put(car, box(0.02, 0.05, 0.08, 'tutor', { emissive: 0.4 }), L / 2, 0.19, 0.12);
  put(car, box(0.02, 0.05, 0.08, 'tutor', { emissive: 0.4 }), L / 2, 0.19, -0.12);
  put(car, box(0.02, 0.05, 0.08, 'terra'), -L / 2, 0.19, 0.12);
  put(car, box(0.02, 0.05, 0.08, 'terra'), -L / 2, 0.19, -0.12);
  [[-0.38, 1], [0.38, 1], [-0.38, -1], [0.38, -1]].forEach((p) => {
    const w = cylinder(0.085, 0.085, 0.06, 'dark', null, 14);
    w.rotation.x = Math.PI / 2;
    put(car, w, p[0], 0.085, p[1] * 0.17);
    const hub = cylinder(0.04, 0.04, 0.066, 'trim', null, 8);
    hub.rotation.x = Math.PI / 2;
    put(car, hub, p[0], 0.085, p[1] * 0.17);
  });

  // pressure washer: gun on a lance, aimed at the paint, riding the sweep
  const gun = new THREE.Group();
  group.add(gun);
  const ANG = 0.43;
  const lance = box(0.03, 0.22, 0.03, 'trim');
  put(gun, lance, 0, 0.11, 0);
  put(gun, box(0.05, 0.1, 0.05, 'accent'), 0, 0.25, 0);
  put(gun, box(0.04, 0.05, 0.04, 'dark'), 0, 0.01, 0);
  const fan = new THREE.Group();
  gun.add(fan);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.13, 0.3, 10, 1, true), mat('wash', { opacity: 0.35 }));
  outer.position.y = -0.15;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.045, 0.3, 8, 1, true), mat('wash', { opacity: 0.6 }));
  inner.position.y = -0.15;
  fan.add(outer, inner);
  gun.rotation.x = ANG;

  // splash where the water lands
  const splash = [];
  for (let i = 0; i < 4; i++) {
    const b = ball(0.022, 'wash', { opacity: 0.7 }, 6);
    group.add(b);
    splash.push(b);
  }

  // washer unit and hose behind the car
  put(group, box(0.22, 0.2, 0.16, 'accent'), 0.5, 0.1, -0.27);
  put(group, box(0.1, 0.05, 0.1, 'dark'), 0.5, 0.225, -0.27);
  put(group, box(0.16, 0.014, 0.02, 'dark'), 0.47, 0.17, -0.18);

  // drips and puddle on the ledge
  const puddle = new THREE.Mesh(cylinder(0.22, 0.22, 0.006, 'wash', { opacity: 0.45 }, 14).geometry, mat('wash', { opacity: 0.45 }));
  puddle.position.set(-0.3, 0.003, 0.3);
  puddle.scale.set(0.01, 1, 0.01);
  group.add(puddle);

  const TOP = 0.62;
  return {
    group,
    update(k, t) {
      const a = ease.inout(span(k, 0.4, 0.92));
      const edge = x0 + L * a;
      cols.forEach((c) => {
        const s = Math.max(0, Math.min(1, (edge - c.left) / c.w));
        c.m.visible = s > 0.001;
        c.m.scale.x = s || 0.001;
        c.m.position.x = c.left + c.w * s / 2;
      });
      const active = k > 0.4 && k < 0.93;
      const sx = edge;
      gun.position.set(sx, TOP, 0.3);
      gun.rotation.z = Math.sin(a * 24) * 0.03;
      fan.visible = active;
      const pulse = 1 + 0.12 * Math.sin(k * 90);
      fan.scale.set(pulse, 1, pulse);
      // the gun rests on its side of the car until it is called
      if (!active) gun.position.set(k <= 0.4 ? x0 + 0.05 : x0 + L, TOP - 0.08, 0.33);
      splash.forEach((b, i) => {
        b.visible = active;
        const ph = k * 60 + i * 1.7;
        b.position.set(sx + Math.sin(ph) * 0.07, 0.2 + ((ph * 0.4) % 1) * 0.08, 0.2);
      });
      const pu = ease.smooth(span(k, 0.5, 0.95));
      puddle.visible = pu > 0.01;
      puddle.scale.set(pu * 1.0 + 0.01, 1, pu * 0.6 + 0.01);
      puddle.position.x = lerp(-0.3, 0.1, pu);
    },
  };
}

// -------------------------------------------------------------- garden
function garden(THREE, kit) {
  const { box, mat, ease, span, cylinder, ball, put, lerp } = helpers(THREE, kit);
  const group = new THREE.Group();
  const POT = new THREE.Group();
  POT.position.set(-0.12, 0, 0);
  group.add(POT);

  put(POT, cylinder(0.2, 0.15, 0.3, 'terra', null, 12), 0, 0.15, 0);
  put(POT, cylinder(0.235, 0.235, 0.07, 'terra', null, 12), 0, 0.325, 0);
  put(POT, cylinder(0.2, 0.2, 0.02, 'dark', null, 12), 0, 0.355, 0);
  // a stripe band so the pot reads as clay
  put(POT, cylinder(0.215, 0.18, 0.04, 'accent', null, 12), 0, 0.22, 0);

  const STEM = 0.5;
  const stem = new THREE.Group();
  stem.position.y = 0.365;
  POT.add(stem);
  const stalk = cylinder(0.022, 0.03, STEM, 'garden', null, 6);
  stalk.position.y = STEM / 2;
  stem.add(stalk);

  const leaves = [];
  const addLeaf = (frac, dir, size) => {
    const pivot = new THREE.Group();
    const blade = ball(1, 'garden', null, 7);
    blade.scale.set(0.2 * size, 0.026, 0.1 * size);
    blade.position.x = dir * 0.19 * size;
    pivot.add(blade);
    const vein = box(0.34 * size, 0.012, 0.012, '#4f9a73');
    vein.position.x = dir * 0.19 * size;
    vein.position.y = 0.012;
    pivot.add(vein);
    POT.add(pivot);
    leaves.push({ pivot, frac, dir });
  };
  addLeaf(0.55, -1, 1);
  addLeaf(0.78, 1, 1.05);
  const bud = ball(0.05, 'garden', null, 6);
  bud.scale.set(0.05, 0.1, 0.05);
  POT.add(bud);

  // trowel standing in the earth to the left
  const trowel = new THREE.Group();
  trowel.position.set(-0.52, 0, 0.14);
  trowel.rotation.z = 0.22;
  group.add(trowel);
  put(trowel, box(0.07, 0.2, 0.014, 'trim'), 0, 0.12, 0);
  put(trowel, box(0.03, 0.06, 0.014, 'trim'), 0, 0.25, 0);
  put(trowel, box(0.045, 0.2, 0.045, 'tutor'), 0, 0.38, 0);
  put(group, ball(0.11, 'dark', null, 7), -0.52, 0.01, 0.14).scale.set(0.16, 0.05, 0.12);

  // fallen leaves, raked into a pile at the right
  const leafRoles = ['terra', 'tutor', 'accent', 'tutor', 'terra', 'accent', 'tutor'];
  const piles = [];
  const scatter = [[0.2, 0, 0.25], [0.5, 0, 0.26], [0.34, 0, -0.18], [0.62, 0, -0.22], [0.1, 0, -0.26], [0.58, 0, 0.12], [0.3, 0, 0.12]];
  const pileAt = [[0.46, 0.04, 0.02], [0.52, 0.06, -0.04], [0.42, 0.07, -0.05], [0.5, 0.1, 0.03], [0.56, 0.05, 0.05], [0.44, 0.05, 0.08], [0.5, 0.13, 0]];
  leafRoles.forEach((r, i) => {
    const l = ball(1, r, null, 6);
    l.scale.set(0.085, 0.012, 0.05);
    group.add(l);
    piles.push({ m: l, s: scatter[i], p: pileAt[i], rot: i * 1.3 });
  });
  const rake = new THREE.Group();
  group.add(rake);
  put(rake, box(0.03, 0.03, 0.55, 'dim'), 0, 0.3, 0).rotation.x = 0;
  const head = put(rake, box(0.3, 0.03, 0.03, 'trim'), 0, 0.02, 0.27);
  for (let i = 0; i < 5; i++) put(rake, box(0.014, 0.014, 0.07, 'trim'), (i - 2) * 0.065, 0.02, 0.31);
  rake.rotation.x = -0.9;
  void head;

  return {
    group,
    update(k, t) {
      const g = ease.inout(span(k, 0.4, 0.85));
      stem.scale.y = 0.08 + 0.92 * g;
      stem.rotation.z = Math.sin(t * 25 + k * 3) * 0.025 * span(k, 0.5, 1);
      leaves.forEach((l, i) => {
        const s = ease.back(span(k, 0.55 + i * 0.15, 0.85 + i * 0.1), 1.2);
        const sc = Math.max(0.001, s);
        l.pivot.position.set(0, 0.365 + STEM * l.frac * stem.scale.y, 0);
        l.pivot.scale.set(sc, sc, sc);
        l.pivot.rotation.z = l.dir * (0.1 + 0.35 * sc) + (l.dir > 0 ? 0 : 0);
        l.pivot.rotation.y = l.dir * 0.25;
      });
      bud.position.set(stem.rotation.z * -STEM * stem.scale.y, 0.365 + STEM * stem.scale.y + 0.03, 0);
      bud.scale.set(0.05, 0.1 * g + 0.01, 0.05);
      const r = ease.inout(span(k, 0.4, 0.95));
      piles.forEach((p) => {
        p.m.position.set(lerp(p.s[0], p.p[0], r), lerp(p.s[1] + 0.008, p.p[1], r), lerp(p.s[2], p.p[2], r));
        p.m.rotation.y = p.rot + r * 1.2;
        p.m.rotation.z = (1 - r) * 0.1 + r * (Math.sin(p.rot) * 0.4);
      });
      // rake drags the leaves in, then lifts away
      const raking = span(k, 0.4, 0.9);
      rake.visible = k > 0.42 && k < 0.95;
      rake.position.set(lerp(0.78, 0.55, ease.inout(raking)), lerp(0.1, 0.02, Math.sin(raking * Math.PI)), lerp(0.25, 0.1, raking));
      rake.rotation.y = -0.3;
    },
  };
}

// ------------------------------------------------------------ tutoring
function tutoring(THREE, kit) {
  const { box, mat, ease, span, cylinder, ball, put, lerp } = helpers(THREE, kit);
  const group = new THREE.Group();

  const W = 0.8, D = 0.5, T = 0.02;
  // a closed book: two boards, a spine facing +z, a block of pages
  const book = (y, w, role, rotY, dx, h) => {
    const g = new THREE.Group();
    g.position.set(dx, y, 0);
    g.rotation.y = rotY;
    put(g, box(w, T, D, role), 0, T / 2, 0);
    put(g, box(w, T, D, role), 0, h - T / 2, 0);
    put(g, box(w, h, T, role), 0, h / 2, D / 2 - T / 2);
    put(g, box(w - 0.03, h - 2 * T, D - 0.04, 'body'), 0, h / 2, -0.01);
    put(g, box(0.05, 0.03, 0.002, 'tutor'), 0, h * 0.5, D / 2 + 0.001);
    group.add(g);
    return g;
  };
  book(0, W + 0.1, 'tutor', 0.04, 0, 0.12);
  book(0.12, W, 'accent2', -0.05, 0.03, 0.11);
  const topY = 0.23;

  // the top book: pages and a back board stay put, the front board hinges up
  const top = new THREE.Group();
  top.position.set(-0.02, topY, 0);
  top.rotation.y = 0.03;
  group.add(top);
  const TH = 0.1;
  put(top, box(W - 0.06, T, D, 'terra'), 0, T / 2, 0);
  put(top, box(W - 0.09, TH - T, D - 0.05, 'body'), 0, T + (TH - T) / 2, -0.01);
  put(top, box(W - 0.06, TH + T, T, 'terra'), 0, (TH + T) / 2, D / 2 - T / 2);
  // page lines as a hint of text on the open pages
  const lines = [];
  for (let i = 0; i < 3; i++) {
    const ln = box(0.22, 0.003, 0.012, 'trim');
    ln.position.set(i === 1 ? 0.1 : -0.15, TH + 0.002, -0.12 + i * 0.1);
    top.add(ln);
    lines.push(ln);
  }
  const hinge = new THREE.Group();
  hinge.position.set(0, TH + T / 2, -D / 2 + 0.01);
  top.add(hinge);
  put(hinge, box(W - 0.06, T, D, 'terra'), 0, 0, D / 2);
  put(hinge, box(0.2, 0.004, 0.2, 'tutor'), 0, T / 2 + 0.002, D / 2);

  // graduation cap
  const cap = new THREE.Group();
  group.add(cap);
  const board = box(0.34, 0.025, 0.34, 'dark');
  board.rotation.y = 45 * DEG;
  put(cap, board, 0, 0.1, 0);
  put(cap, cylinder(0.11, 0.12, 0.09, 'dark', null, 10), 0, 0.045, 0);
  put(cap, ball(0.02, 'tutor', null, 6), 0, 0.118, 0);
  const tassel = put(cap, box(0.012, 0.1, 0.012, 'tutor'), 0.17, 0.05, 0.0);
  put(cap, box(0.03, 0.04, 0.03, 'tutor'), 0.17, -0.01, 0);
  void tassel;

  // maths rising out of the pages
  const syms = [];
  const mk = (build, x, z, base, role) => {
    const g = new THREE.Group();
    build(g, role);
    g.position.set(x, topY, z);
    group.add(g);
    syms.push({ g, x, z, base });
  };
  mk((g, r) => { put(g, box(0.2, 0.05, 0.05, r), 0, 0, 0); put(g, box(0.05, 0.2, 0.05, r), 0, 0, 0); }, -0.3, 0.02, 0.38, 'accent');
  mk((g, r) => { put(g, box(0.22, 0.045, 0.05, r), 0, 0.05, 0); put(g, box(0.22, 0.045, 0.05, r), 0, -0.05, 0); }, 0.02, 0.06, 0.52, 'accent2');
  mk((g, r) => {
    put(g, box(0.06, 0.1, 0.05, r), -0.08, -0.05, 0);
    put(g, box(0.06, 0.17, 0.05, r), 0, -0.015, 0);
    put(g, box(0.06, 0.25, 0.05, r), 0.08, 0.025, 0);
  }, 0.33, 0.02, 0.32, 'garden');
  syms.push = syms.push.bind(syms);

  const rest = new THREE.Vector3(0.02, topY + TH + T + 0.08, 0.0);
  return {
    group,
    update(k, t) {
      const o = ease.inout(span(k, 0.4, 0.8));
      hinge.rotation.x = -o * 105 * DEG;
      // cap: sits on the closed book, hops onto the top edge of the open board
      const c = ease.inout(span(k, 0.45, 0.9));
      const endY = topY + TH + T / 2 + D * Math.sin(105 * DEG) + 0.0;
      const endZ = -D / 2 + 0.01 + D * Math.cos(105 * DEG) - 0.04;
      cap.position.set(lerp(rest.x, 0.05, c), lerp(rest.y - 0.05, endY - 0.06, c) + Math.sin(c * Math.PI) * 0.22, lerp(rest.z, endZ, c));
      cap.rotation.z = c * -0.28 + Math.sin(c * Math.PI) * 0.15;
      cap.rotation.y = c * 0.35;
      cap.rotation.x = c * -0.08;
      syms.forEach((s, i) => {
        const p = ease.back(span(k, 0.55 + i * 0.1, 0.95), 1.1);
        const sc = Math.max(0.001, Math.min(1.15, p));
        s.g.visible = p > 0.02;
        s.g.scale.setScalar(sc);
        s.g.position.set(s.x, topY + TH + 0.02 + (s.base - TH) * Math.min(1, p) + Math.sin(t * 40 + i * 2) * 0.01 * span(k, 0.9, 1), s.z);
        s.g.rotation.y = (1 - Math.min(1, p)) * 1.5;
      });
      lines.forEach((l) => { l.visible = o > 0.3; });
    },
  };
}

// ------------------------------------------------------------ printing
function printing(THREE, kit) {
  const { box, mat, ease, span, cylinder, ball, put, lerp } = helpers(THREE, kit);
  const group = new THREE.Group();

  // frame: base, two posts at the back, a bed that stays put
  put(group, box(1.0, 0.09, 0.58, 'dim'), 0, 0.045, 0);
  put(group, box(0.62, 0.02, 0.46, 'dark'), 0, 0.1, 0.03);
  put(group, box(0.56, 0.01, 0.4, 'trim'), 0, 0.115, 0.03);
  [-1, 1].forEach((s) => {
    put(group, box(0.06, 0.95, 0.07, 'print'), s * 0.46, 0.565, -0.22);
    put(group, box(0.1, 0.04, 0.12, 'dark'), s * 0.46, 0.11, -0.22);
  });
  put(group, box(0.98, 0.04, 0.05, 'dark'), 0, 1.04, -0.22);
  // control knob and a little screen on the front of the base
  put(group, box(0.16, 0.05, 0.01, 'dark'), 0.3, 0.05, 0.296);
  put(group, box(0.1, 0.02, 0.004, 'accent2', { emissive: 0.5 }), 0.3, 0.05, 0.302);

  // filament spool on the right post
  const spool = new THREE.Group();
  spool.position.set(0.46, 0.8, -0.14);
  group.add(spool);
  const reel = cylinder(0.1, 0.1, 0.05, 'print', null, 12);
  reel.rotation.x = Math.PI / 2;
  spool.add(reel);
  [-1, 1].forEach((s) => {
    const fl = cylinder(0.13, 0.13, 0.01, 'dim', null, 12);
    fl.rotation.x = Math.PI / 2;
    put(spool, fl, 0, 0, s * 0.03);
  });
  put(spool, box(0.07, 0.02, 0.012, 'paper'), 0.1, 0, 0.0);

  // gantry: crossbar rides up the posts, carriage slides along it
  const gantry = new THREE.Group();
  group.add(gantry);
  put(gantry, box(0.9, 0.05, 0.06, 'print'), 0, 0, -0.22);
  [-1, 1].forEach((s) => put(gantry, box(0.09, 0.08, 0.1, 'dark'), s * 0.46, 0, -0.22));
  const carriage = new THREE.Group();
  gantry.add(carriage);
  put(carriage, box(0.12, 0.08, 0.08, 'dark'), 0, 0, -0.22);
  put(carriage, box(0.06, 0.04, 0.26, 'dim'), 0, -0.02, -0.09);
  put(carriage, box(0.07, 0.06, 0.07, 'accent'), 0, -0.07, 0.01);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.02, 0.04, 8), mat('tutor'));
  nozzle.position.set(0, -0.12, 0.01);
  carriage.add(nozzle);

  // the pawn, sliced: one thin disc per layer, profile of a chess pawn
  const prof = [0.19, 0.19, 0.17, 0.12, 0.085, 0.07, 0.065, 0.06, 0.09, 0.12, 0.1, 0.13, 0.14, 0.12, 0.08, 0.03];
  const N = prof.length, LAYER = 0.032;
  const slices = [];
  const unit = new THREE.CylinderGeometry(1, 1, 1, 14);
  const solid = mat('print');
  const bedTop = 0.12, ox = 0, oz = 0.03;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(unit, solid);
    m.scale.set(prof[i], LAYER, prof[i]);
    m.position.set(ox, bedTop + LAYER * (i + 0.5), oz);
    group.add(m);
    slices.push(m);
  }
  const H = N * LAYER;
  // a finished little one waiting on the bed, for scale
  const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 8), mat('print'));
  mini.position.set(-0.4, bedTop + 0.05, 0.12);
  group.add(mini);
  const topball = ball(0.05, 'print', null, 8);
  topball.position.set(-0.4, bedTop + 0.13, 0.12);
  group.add(topball);

  return {
    group,
    update(k, t) {
      const p = span(k, 0.4, 0.95);
      const f = ease.smooth(p) * N;
      slices.forEach((m, i) => {
        const g = Math.max(0, Math.min(1, f - i));
        m.visible = g > 0.001;
        m.scale.y = LAYER * Math.max(0.05, g);
        m.position.y = bedTop + LAYER * i + (LAYER * Math.max(0.05, g)) / 2;
      });
      const topY = bedTop + Math.min(H, f * LAYER) ;
      const noz = topY + 0.145;
      const nozzleX = ox + Math.sin(p * 55) * 0.16 * (p > 0 && p < 1 ? 1 : 0);
      carriage.position.x = nozzleX;
      carriage.position.z = oz > 0 ? Math.cos(p * 38) * 0.0 : 0;
      gantry.position.y = noz + 0.12 - (k <= 0.4 ? 0 : 0);
      spool.rotation.z = -p * 9;
      void t;
    },
  };
}

// ------------------------------------------------------------------ pc
function pc(THREE, kit) {
  const { box, mat, ease, span, cylinder, ball, put, lerp } = helpers(THREE, kit);
  const group = new THREE.Group();

  const tower = new THREE.Group();
  tower.rotation.y = -0.3;
  tower.position.x = 0.08;
  group.add(tower);

  const LEN = 0.74, H = 0.9, TH = 0.4; // x, y, z of the case
  const wall = 0.03;
  // open case: back plate, floor, roof, front, rear I/O strip
  put(tower, box(LEN, H, wall, 'dark'), 0, H / 2, -TH / 2 + wall / 2);
  put(tower, box(LEN, wall, TH, 'dark'), 0, wall / 2, 0);
  put(tower, box(LEN, wall, 0.14, 'dark'), 0, H - wall / 2, -TH / 2 + 0.07);
  put(tower, box(wall, H, TH, 'dark'), LEN / 2 - wall / 2, H / 2, 0);
  put(tower, box(wall, H, TH, 'dim'), -LEN / 2 + wall / 2, H / 2, 0);
  // front mesh with a power button and the LED
  put(tower, box(0.012, 0.5, 0.26, 'trim'), LEN / 2 + 0.006, 0.55, 0);
  for (let i = 0; i < 5; i++) put(tower, box(0.016, 0.012, 0.22, 'dark'), LEN / 2 + 0.008, 0.4 + i * 0.09, 0);
  put(tower, cylinder(0.025, 0.025, 0.02, 'paper', null, 10), LEN / 2 + 0.012, 0.84, 0.08).rotation.z = Math.PI / 2;
  const ledMat = mat('garden', { emissive: 1, unique: true });
  ledMat.emissiveIntensity = 0;
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.03), ledMat);
  led.position.set(LEN / 2 + 0.012, 0.84, -0.08);
  tower.add(led);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: kit.palette.garden, transparent: true, opacity: 0.0, depthWrite: false }));
  halo.position.copy(led.position);
  tower.add(halo);

  // motherboard on the back plate
  const mz = -TH / 2 + wall + 0.008;
  put(tower, box(0.56, 0.74, 0.016, '#4f8a72'), -0.04, 0.46, mz);
  // CPU socket, cooler and fan
  put(tower, box(0.13, 0.13, 0.02, 'trim'), -0.14, 0.4, mz + 0.016);
  const cooler = cylinder(0.085, 0.085, 0.07, 'dim', null, 12);
  cooler.rotation.x = Math.PI / 2;
  put(tower, cooler, -0.14, 0.4, mz + 0.06);
  put(tower, box(0.1, 0.1, 0.01, 'terra'), -0.14, 0.4, mz + 0.1);
  // graphics card: a long slab with a pair of fans
  put(tower, box(0.5, 0.12, 0.09, 'dark'), -0.02, 0.22, mz + 0.06);
  [-0.12, 0.1].forEach((x) => {
    const f = cylinder(0.04, 0.04, 0.012, 'trim', null, 10);
    f.rotation.x = Math.PI / 2;
    put(tower, f, x, 0.22, mz + 0.11);
  });
  // power supply shroud
  put(tower, box(0.6, 0.08, 0.2, 'dim'), -0.04, 0.085, 0.0);
  // heat pipe / VRM block
  put(tower, box(0.16, 0.2, 0.04, 'dim'), -0.3, 0.55, mz + 0.03);
  // RAM slots: A already holds a stick, B waits
  const SLOTY = 0.7;
  const slotA = 0.12, slotB = 0.0;
  put(tower, box(0.16, 0.025, 0.05, 'dark'), slotA + 0.0, SLOTY, mz + 0.03);
  put(tower, box(0.16, 0.025, 0.05, 'dark'), slotB + 0.0, SLOTY, mz + 0.03);

  const stick = (x) => {
    const g = new THREE.Group();
    const pcb = box(0.15, 0.1, 0.012, 'accent2');
    put(g, pcb, 0, 0.05, 0);
    for (let i = 0; i < 4; i++) put(g, box(0.026, 0.045, 0.008, 'dark'), -0.052 + i * 0.035, 0.06, 0.009);
    put(g, box(0.15, 0.014, 0.006, 'tutor'), 0, 0.007, 0.0);
    g.position.set(x, 0, mz + 0.045);
    tower.add(g);
    return g;
  };
  const fixed = stick(slotA);
  fixed.position.y = SLOTY + 0.0125;
  fixed.rotation.z = 0;
  const mover = stick(slotB);

  // the side panel, taken off and leaning on the ledge
  const panel = new THREE.Group();
  panel.position.set(-0.62, 0, 0.25);
  panel.rotation.set(0, 0.2, 0.2);
  group.add(panel);
  put(panel, box(0.02, 0.62, 0.42, 'trim'), 0, 0.31, 0);
  for (let i = 0; i < 4; i++) put(panel, box(0.024, 0.02, 0.3, 'dark'), 0, 0.2 + i * 0.07, 0);

  return {
    group,
    update(k, t) {
      const s = ease.inout(span(k, 0.4, 0.86));
      const drop = 0.3 * (1 - s);
      // a small settle as it seats
      const seat = Math.sin(span(k, 0.8, 0.9) * Math.PI) * 0.012;
      mover.position.y = SLOTY + 0.0125 + drop - seat;
      const lit = ease.smooth(span(k, 0.88, 0.96));
      ledMat.emissiveIntensity = lit * 1.2;
      halo.scale.setScalar(0.04 + 0.03 * lit);
      halo.material.opacity = 0.35 * lit;
      void t;
    },
  };
}

// Each entry is the build function itself; `.build` points at it too.
[wash, garden, tutoring, printing, pc].forEach((f) => { f.build = f; });
export const models = { wash, garden, tutoring, printing, pc };
