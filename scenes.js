// Small flat 3D models drawn with Zdog (vendor/zdog.min.js), whose motion is
// tied to scroll position. Each <figure class="scene" data-scene="name"> gets
// a canvas in its .scene-stage; the model itself comes from a scene-*.js file
// that calls Scenes.define(name, build). The figure's caption and any list
// inside it are the real content, so with JS off, or if a model fails, the
// page loses a picture and nothing else.
//
// build(ctx) adds shapes to ctx.illo and returns { update: function (s) {} }.
// s carries:
//   p     0 to 1: 0 as the figure's top enters the bottom of the screen, 1 once
//         its middle reaches 35% down. Scrolling up runs it backwards.
//   run   the same distance, unclamped, in screen heights: for motion that
//         keeps going while the visitor scrolls (a stroke cycle).
//   yaw   radians of sideways turn from dragging the model; springs back.
// The model is drawn in a space 400 units wide (ctx.w) by ctx.h, centred on 0.
// Reduced motion draws the finished state (p 1, run 0.5) and turns drag off.
(function () {
  var defs = {};
  window.Scenes = { define: function (name, build) { defs[name] = build; } };

  function colours() {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    return {
      ink: v('--ink'), inkDim: v('--ink-dim'), inkFaint: v('--ink-faint'),
      line: v('--line'), lineStrong: v('--line-strong'),
      card: v('--card'), paper: v('--paper'), terra: v('--terra-text'),
      tPrint: v('--t-print'), tWash: v('--t-wash'), tGarden: v('--t-garden'),
      tPc: v('--t-pc'), tTutor: v('--t-tutor'), tTerra: v('--t-terra')
    };
  }

  function start() {
    if (!window.Zdog) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scenes = [];

    Array.prototype.slice.call(document.querySelectorAll('figure.scene[data-scene]')).forEach(function (fig) {
      var build = defs[fig.getAttribute('data-scene')];
      var stage = fig.querySelector('.scene-stage');
      if (!build || !stage) return;
      var canvas = document.createElement('canvas');
      stage.appendChild(canvas);
      fig.classList.add('is-live');

      var sc = { fig: fig, canvas: canvas, yaw: 0, vyaw: 0, held: null, last: '' , visible: false };
      try {
        sc.illo = new Zdog.Illustration({
          element: canvas,
          resize: true,
          onResize: function (w, h) {
            this.zoom = w / 400;
            sc.h = 400 * h / Math.max(1, w);
            sc.last = '';
          }
        });
        sc.ctx = { Zdog: Zdog, illo: sc.illo, c: colours(), w: 400, h: sc.h, fig: fig, reduced: reduced };
        sc.model = build(sc.ctx) || {};
      } catch (err) {
        // A broken model leaves the caption, not a blank box.
        console.error('Scene "' + fig.getAttribute('data-scene') + '" failed to build.', err);
        fig.classList.remove('is-live');
        stage.removeChild(canvas);
        return;
      }
      scenes.push(sc);
      if (!reduced) grab(sc);
    });
    if (!scenes.length) return;

    // Only scenes near the screen are drawn.
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          scenes.forEach(function (sc) { if (sc.fig === e.target) sc.visible = e.isIntersecting; });
        });
        request();
      }, { rootMargin: '200px 0px' });
      scenes.forEach(function (sc) { io.observe(sc.fig); });
    } else {
      scenes.forEach(function (sc) { sc.visible = true; });
    }

    var raf = 0, lastT = 0;
    function request() { if (!raf) raf = requestAnimationFrame(frame); }

    function frame(t) {
      raf = 0;
      var dt = lastT ? Math.min((t - lastT) / 1000, 1 / 30) : 1 / 60;
      lastT = t;
      var vh = window.innerHeight;
      var again = false;
      scenes.forEach(function (sc) {
        // Let go of a drag: an under-damped spring back to facing front.
        if (!sc.held && (sc.yaw || sc.vyaw)) {
          sc.vyaw += (-90 * sc.yaw - 11 * sc.vyaw) * dt;
          sc.yaw += sc.vyaw * dt;
          if (Math.abs(sc.yaw) < 0.001 && Math.abs(sc.vyaw) < 0.01) sc.yaw = sc.vyaw = 0;
          else again = true;
        }
        if (!sc.visible) return;
        var r = sc.fig.getBoundingClientRect();
        var run = (vh - r.top) / vh;
        var p = (vh - r.top) / (vh * 0.65 + r.height / 2);
        var s = reduced
          ? { p: 1, run: 0.5, yaw: 0 }
          : { p: Math.max(0, Math.min(1, p)), run: run, yaw: sc.yaw };
        var key = s.p.toFixed(4) + '|' + s.run.toFixed(4) + '|' + s.yaw.toFixed(4) + '|' + sc.h;
        if (key === sc.last) return;
        sc.last = key;
        sc.ctx.h = sc.h;
        if (sc.model.update) sc.model.update(s);
        sc.illo.updateRenderGraph();
      });
      if (again || scenes.some(function (sc) { return sc.held; })) request();
      else lastT = 0;
    }

    // Dragging sideways turns the model to look round it. Vertical swipes on a
    // touch screen still scroll the page (touch-action: pan-y in styles.css).
    function grab(sc) {
      var c = sc.canvas;
      c.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        sc.held = { id: e.pointerId, x: e.clientX, yaw: sc.yaw, t: performance.now(), px: e.clientX };
        sc.vyaw = 0;
        c.setPointerCapture(e.pointerId);
        c.classList.add('is-held');
        request();
      });
      c.addEventListener('pointermove', function (e) {
        if (!sc.held || sc.held.id !== e.pointerId) return;
        var d = (e.clientX - sc.held.x) / Math.max(1, c.clientWidth);
        var now = performance.now();
        var next = Math.max(-1.1, Math.min(1.1, sc.held.yaw + d * 2.4));
        sc.vyaw = (next - sc.yaw) / Math.max(0.008, (now - sc.held.t) / 1000);
        sc.yaw = next;
        sc.held.t = now;
        request();
      });
      function letGo(e) {
        if (!sc.held || sc.held.id !== e.pointerId) return;
        if (performance.now() - sc.held.t > 90) sc.vyaw = 0;
        sc.held = null;
        c.classList.remove('is-held');
        request();
      }
      c.addEventListener('pointerup', letGo);
      c.addEventListener('pointercancel', letGo);
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    request();
  }

  // Deferred scripts run while readyState is already 'interactive', before
  // the scene-*.js files after this one have defined their models, so wait
  // for DOMContentLoaded, which fires once every deferred script has run.
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
