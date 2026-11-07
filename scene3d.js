// Real 3D models (three.js) whose camera and motion are driven by scroll.
// The ideas come from the Byte Size video engine: every surface takes its
// colour from a palette role, models are low-poly and flat-shaded under a
// key, rim and fill light, a soft disc stands in for a cast shadow, and the
// camera arrives wide and high, makes one eased swing, racks into focus and
// pushes in at the end. In a video those run on the frame number; here they
// run on how far the model has been scrolled through the screen.
//
// Markup: <figure class="scene3d" data-model="homelab"> holding a
// .scene3d-stage and a caption. The caption is the content; the canvas is
// aria-hidden and only appears once a model has loaded. three.js and the
// model are fetched when the figure comes within a screen or so of view, so
// a visitor who never scrolls there never downloads them.
//
// A model is a module in scenes/ whose default export is
//   build(THREE, kit) -> { root, shot, update(t) }
// root: an Object3D added to the scene. shot: { radius, height, angle,
// target } for the camera (angle in degrees, 0 = front). update(t): pose the
// model for t from 0 to 1. Optional target(t) returns the look-at point for
// t, so the camera can follow the model. kit holds the shared helpers below.
const V = '2';
const DEG = Math.PI / 180;

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const ease = {
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // Settles past the end and back, like the video engine's lid.
  back: (t, c = 0.9) => 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2),
  smooth: (t) => t * t * (3 - 2 * t),
};
// A window of t mapped to 0..1: span(t, 0.2, 0.5) is 0 before 0.2, 1 after 0.5.
const span = (t, a, b) => clamp01((t - a) / (b - a));

// Camera choreography, the same shape as the video engine's defaults.
const CAM = {
  fov: 32,
  arrive: { until: 0.22, wide: 0.2, crane: 0.28 },
  swing: 46,
  push: { from: 0.78, amount: 0.15 },
  focus: { until: 0.18, blur: 3 },
};

function palette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    body: v('--card'), paper: v('--paper'), trim: v('--line-strong'), line: v('--line'),
    dark: v('--ink'), dim: v('--ink-dim'), accent: v('--terra-text'), terra: v('--t-terra'),
    accent2: v('--t-pc'), wash: v('--t-wash'), garden: v('--t-garden'), tutor: v('--t-tutor'),
    print: v('--t-print'),
  };
}

function makeKit(THREE, pal) {
  const cache = {};
  // Every surface is one of these roles, so a model never picks its own colours.
  const roles = {
    body: pal.body, paper: pal.paper, trim: pal.trim, line: pal.line, dark: pal.dark,
    dim: pal.dim, accent: pal.accent, terra: pal.terra, accent2: pal.accent2,
    wash: pal.wash, garden: pal.garden, tutor: pal.tutor, print: pal.print,
  };
  function mat(role, opts) {
    opts = opts || {};
    const key = role + '|' + (opts.emissive || 0) + '|' + (opts.opacity == null ? 1 : opts.opacity);
    if (cache[key] && !opts.unique) return cache[key];
    const colour = roles[role] || role;
    const m = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.55,
      metalness: 0.1,
      flatShading: true,
      emissive: opts.emissive ? colour : '#000000',
      emissiveIntensity: opts.emissive || 0,
      transparent: opts.opacity != null && opts.opacity < 1,
      opacity: opts.opacity == null ? 1 : opts.opacity,
    });
    if (!opts.unique) cache[key] = m;
    return m;
  }
  // A slab with rounded corners lying flat (w across x, d across z, h tall).
  function slab(w, d, h, r, role, opts) {
    r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001);
    const s = new THREE.Shape();
    const x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, opts && opts.material ? opts.material : mat(role, opts));
    return mesh;
  }
  function box(w, h, d, role, opts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts && opts.material ? opts.material : mat(role, opts));
    return mesh;
  }
  // Soft fake contact shadow: a dark disc with a radial fade, far cheaper
  // than real shadows and closer to the flat look.
  function shadow(radius, opacity) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(43,42,38,1)');
    grad.addColorStop(0.55, 'rgba(43,42,38,0.55)');
    grad.addColorStop(1, 'rgba(43,42,38,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: opacity == null ? 0.28 : opacity, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.001;
    m.renderOrder = -1;
    return m;
  }
  return { mat: mat, slab: slab, box: box, shadow: shadow, ease: ease, span: span, clamp01: clamp01, palette: pal };
}

function layoutTop(el) {
  let top = 0;
  for (let n = el; n; n = n.offsetParent) top += n.offsetTop;
  return top - window.scrollY;
}

async function mount(fig, reduced) {
  const name = fig.getAttribute('data-model');
  const stage = fig.querySelector('.scene3d-stage');
  if (!name || !stage) return;
  const THREE = await import('./vendor/three/three-site.min.js?v=' + V);
  const model = await import('./scenes/' + name + '.js?v=' + V);

  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    // No WebGL: leave the caption, not an empty box.
    stage.removeChild(canvas);
    fig.classList.add('is-failed');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.1, 200);
  // Key, rim and fill, in the video engine's proportions.
  scene.add(new THREE.AmbientLight('#ffffff', 0.55 * Math.PI));
  const key = new THREE.DirectionalLight('#fff6ea', 2.2);
  key.position.set(4, 7, 5);
  const rim = new THREE.DirectionalLight('#ffffff', 1.6);
  rim.position.set(-5, 4, -6);
  const fill = new THREE.DirectionalLight('#eef2ff', 0.6);
  fill.position.set(-4, 2, 5);
  scene.add(key, rim, fill);

  const kit = makeKit(THREE, palette());
  const built = model.default(THREE, kit);
  scene.add(built.root);
  const shot = Object.assign({ radius: 10, height: 4, angle: 20, target: [0, 0.6, 0] }, built.shot || {});
  fig.classList.add('is-live');

  let yaw = 0, vyaw = 0, held = null, last = '', raf = 0, lastT = 0, visible = true;

  function size() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    last = '';
  }

  function progress() {
    if (reduced) return 1;
    const vh = window.innerHeight;
    const top = layoutTop(stage);
    // 0 as the stage's top enters the bottom of the screen, 1 once its middle
    // is 30% down: long enough for the lid, the explode and the push-in.
    return clamp01((vh - top) / (vh * 0.7 + stage.offsetHeight / 2));
  }

  function pose(t) {
    let radius = shot.radius, height = shot.height, angle = shot.angle * DEG, blur = 0;
    if (!reduced) {
      const k = 1 - ease.expo(span(t, 0, CAM.arrive.until));
      radius *= 1 + CAM.arrive.wide * k;
      height *= 1 + CAM.arrive.crane * k;
      angle += CAM.swing * (ease.inout(t) - 0.5) * DEG;
      radius *= 1 - CAM.push.amount * ease.inout(span(t, CAM.push.from, 1));
      blur = CAM.focus.blur * (1 - ease.expo(span(t, 0, CAM.focus.until)));
    }
    angle += yaw;
    // A model may move the look-at point with t (a pan that follows it).
    const tg = built.target ? built.target(t) : shot.target;
    camera.position.set(tg[0] + Math.sin(angle) * radius, tg[1] + height, tg[2] + Math.cos(angle) * radius);
    camera.lookAt(tg[0], tg[1], tg[2]);
    return blur;
  }

  function frame(now) {
    raf = 0;
    const dt = lastT ? Math.min((now - lastT) / 1000, 1 / 30) : 1 / 60;
    lastT = now;
    let again = false;
    if (!held && (yaw || vyaw)) {
      // Let go of a drag: an under-damped spring back to the shot.
      vyaw += (-90 * yaw - 11 * vyaw) * dt;
      yaw += vyaw * dt;
      if (Math.abs(yaw) < 0.001 && Math.abs(vyaw) < 0.01) yaw = vyaw = 0;
      else again = true;
    }
    if (visible) {
      const t = progress();
      const k = t.toFixed(4) + '|' + yaw.toFixed(4) + '|' + canvas.width;
      if (k !== last) {
        last = k;
        built.update(t);
        const blur = pose(t);
        canvas.style.filter = blur > 0.25 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
        renderer.render(scene, camera);
        again = true;
      }
    }
    if (again || held) request();
    else lastT = 0;
  }
  function request() { if (!raf) raf = requestAnimationFrame(frame); }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[es.length - 1].isIntersecting;
      request();
    }, { rootMargin: '150px 0px' }).observe(fig);
  }
  if (window.ResizeObserver) new ResizeObserver(function () { size(); request(); }).observe(stage);
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);

  // A sideways drag turns the model to look round it; it springs back to the
  // shot when let go. Vertical swipes still scroll (touch-action in CSS).
  if (!reduced) {
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      held = { id: e.pointerId, x: e.clientX, yaw: yaw, t: performance.now() };
      vyaw = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-held');
      request();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!held || held.id !== e.pointerId) return;
      const now = performance.now();
      const next = Math.max(-1.2, Math.min(1.2, held.yaw + (e.clientX - held.x) / Math.max(1, canvas.clientWidth) * 2.6));
      vyaw = (next - yaw) / Math.max(0.008, (now - held.t) / 1000);
      yaw = next;
      held.t = now;
      request();
    });
    const letGo = function (e) {
      if (!held || held.id !== e.pointerId) return;
      if (performance.now() - held.t > 90) vyaw = 0;
      held = null;
      canvas.classList.remove('is-held');
      request();
    };
    canvas.addEventListener('pointerup', letGo);
    canvas.addEventListener('pointercancel', letGo);
  }

  size();
  request();
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const figs = Array.prototype.slice.call(document.querySelectorAll('figure.scene3d[data-model]'));
function load(fig) {
  mount(fig, reduced).catch(function (err) {
    fig.classList.add('is-failed');
    console.error('3D model "' + fig.getAttribute('data-model') + '" could not load.', err);
  });
}
if (window.IntersectionObserver) {
  const near = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      near.unobserve(e.target);
      load(e.target);
    });
  }, { rootMargin: '100% 0px' });
  figs.forEach(function (f) { near.observe(f); });
} else {
  figs.forEach(load);
}
