// Turns the photo grids into a pile of prints on the desk. Throw them around,
// tap one to turn it over, and keep scrolling to have them sort into a grid.
// The prints are the same links the grids hold, so gallery.js still opens the
// full-size photo once they are sorted, and with JS off the grids stay as
// they are.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('a.photo[data-name]'));
  if (links.length < 2 || !window.requestAnimationFrame || !window.IntersectionObserver) return;

  var reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  // Card geometry, as fractions of the card width (matches styles.css).
  var CARD_H = 1.22;
  var LIN_DRAG = 4.2; // how quickly a thrown print slides to rest, per second
  var ANG_DRAG = 5;
  var STAGGER = 0.05; // each print leaves the pile a little after the last
  var TAPES = ['top', 'corner', 'side'];
  var SWATCHES = ['--t-terra', '--t-pc', '--t-tutor', '--t-garden', '--t-print', '--t-wash'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  /* ------------------------------------------------------------ markup */
  var grids = [];
  links.forEach(function (a) {
    var g = a.closest('.photo-grid');
    if (g && grids.indexOf(g) < 0) grids.push(g);
  });

  var track = el('section', 'desk-track');
  track.setAttribute('aria-label', 'Photos');
  var stage = el('div', 'desk-stage');
  stage.dataset.mode = 'pile';
  var hint = el('p', 'desk-hint');
  hint.setAttribute('aria-live', 'polite');
  var tools = el('div', 'desk-tools');
  var shuffleBtn = el('button', 'contact-btn contact-btn--ghost', 'Shuffle');
  shuffleBtn.type = 'button';
  tools.appendChild(shuffleBtn);
  stage.appendChild(hint);

  var total = links.length;
  var cards = links.map(function (a, i) {
    var name = a.dataset.name;
    var print = el('div', 'print');
    print.style.setProperty('--accent', 'var(' + SWATCHES[i % SWATCHES.length] + ')');
    var inner = el('div', 'print-inner');
    var front = el('div', 'print-face print-front');
    var back = el('div', 'print-face print-back');
    back.setAttribute('aria-hidden', 'true');

    a.setAttribute('draggable', 'false');
    var img = a.querySelector('img');
    if (img) { img.setAttribute('draggable', 'false'); img.removeAttribute('loading'); }
    front.appendChild(a);
    front.appendChild(el('span', 'print-name', name));
    var tape = el('i', 'print-tape print-tape--' + TAPES[i % TAPES.length]);
    tape.setAttribute('aria-hidden', 'true');
    front.appendChild(tape);

    back.appendChild(el('span', 'print-kicker', (a.dataset.group || 'Photo') + ' · ' + pad(i + 1) + '/' + pad(total)));
    back.appendChild(el('span', 'print-title', name));
    if (a.dataset.kind) back.appendChild(el('span', 'print-kind', a.dataset.kind));
    if (a.dataset.note) back.appendChild(el('p', 'print-note', a.dataset.note));

    var key = el('button', 'print-key', 'Turn over');
    key.type = 'button';
    key.setAttribute('aria-pressed', 'false');
    key.setAttribute('aria-label', 'Turn over photo ' + pad(i + 1) + ', ' + name);

    inner.appendChild(front);
    inner.appendChild(back);
    print.appendChild(inner);
    print.appendChild(key);
    stage.appendChild(print);

    return {
      el: print, back: back, key: key,
      x: 0, y: 0, a: 0, vx: 0, vy: 0, va: 0,
      hx: 0.5, hy: 0.5, ha: 0, gx: 0, gy: 0,
      spawnAt: 0, inside: false, z: i + 1
    };
  });

  stage.appendChild(tools);
  track.appendChild(stage);
  var firstLabel = grids[0].previousElementSibling;
  var anchor = firstLabel && firstLabel.classList.contains('section-label') ? firstLabel : grids[0];
  anchor.parentNode.insertBefore(track, anchor);
  grids.forEach(function (g) {
    g.classList.add('is-replaced');
    var label = g.previousElementSibling;
    if (label && label.classList.contains('section-label')) label.classList.add('is-replaced');
  });

  /* ------------------------------------------------------------- state */
  var w = 1, h = 1, cw = 160, gridScale = 1;
  var sort = 0, mode = 'pile';
  var clock = 0, topZ = cards.length + 1;
  var drag = null, dealt = false, visible = false;
  var reduced = reducedMq.matches;

  function mobile() { return w < 520; }

  var hintState = '';
  function setHint() {
    var next = sort >= 0.99 ? 'sorted' : 'pile';
    if (next === hintState && arguments.length === 0) return;
    hintState = next;
    if (next === 'sorted') {
      hint.textContent = (coarse ? 'Tap' : 'Click') + ' a photo to see it full size.';
    } else if (reduced) {
      hint.textContent = (coarse ? 'Tap' : 'Click') + ' one to turn it over. Keep scrolling to sort them.';
    } else {
      hint.textContent = coarse
        ? 'Swipe one sideways to throw it, tap one to turn it over. Scroll on and they sort themselves.'
        : 'Throw them around. Click one to turn it over. Keep scrolling and they sort themselves.';
    }
  }

  /* ------------------------------------------------------------ layout */
  // Scattered but even: one jittered cell per print.
  function pickHomes() {
    var cols = mobile() ? 2 : 4;
    var rows = Math.ceil(cards.length / cols);
    var order = cards.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    order.forEach(function (ci, k) {
      var c = cards[ci];
      c.hx = ((k % cols) + 0.5 + rnd(-0.3, 0.3)) / cols;
      c.hy = (Math.floor(k / cols) + 0.5 + rnd(-0.28, 0.28)) / rows;
      c.ha = rnd(-0.35, 0.35);
    });
  }

  // Leaves the hint clear at the top and the Shuffle button clear at the bottom.
  function homePx(c) {
    var ch = cw * CARD_H;
    var x0 = cw * 0.6, x1 = w - cw * 0.6;
    var y0 = 64 + ch / 2, y1 = h - 76 - ch / 2;
    return { x: x0 + c.hx * Math.max(0, x1 - x0), y: y0 + c.hy * Math.max(0, y1 - y0) };
  }

  function layoutGrid() {
    var n = cards.length;
    var top = mobile() ? 64 : 72;
    var bottom = 24;
    var gap = mobile() ? 10 : 16;
    var availH = h - top - bottom;
    // Only column counts that fill every row, so no print sits alone at the end.
    var counts = [];
    for (var k = 2; k <= n; k++) if (n % k === 0) counts.push(k);
    if (!counts.length) for (k = 2; k <= n; k++) counts.push(k);
    var best = { cols: counts[0], size: 0 };
    counts.forEach(function (cols) {
      var rows = Math.ceil(n / cols);
      var size = Math.min((w - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows / CARD_H);
      if (size > best.size) best = { cols: cols, size: size };
    });
    var bc = best.cols, bs = best.size;
    var gridW = bc * bs + (bc - 1) * gap;
    var gridH = Math.ceil(n / bc) * bs * CARD_H + (Math.ceil(n / bc) - 1) * gap;
    var x0 = (w - gridW) / 2 + bs / 2;
    var y0 = top + (availH - gridH) / 2 + (bs * CARD_H) / 2;
    gridScale = bs / cw;
    cards.forEach(function (c, i) {
      c.gx = x0 + (i % bc) * (bs + gap);
      c.gy = y0 + Math.floor(i / bc) * (bs * CARD_H + gap);
    });
  }

  function resize() {
    var ow = w, oh = h;
    w = stage.clientWidth || 1;
    h = stage.clientHeight || 1;
    cw = mobile() ? clamp(w * 0.34, 96, 140) : clamp(Math.min(w * 0.24, h * 0.22), 120, 190);
    stage.style.setProperty('--cw', cw + 'px');
    cards.forEach(function (c) {
      c.x *= w / ow;
      c.y *= h / oh;
    });
    layoutGrid();
    render();
  }

  /* ----------------------------------------------------------- tossing */
  // Velocity that brings a print to rest exactly at (tx, ty, ta) under the drag.
  function launch(c, tx, ty, ta) {
    c.vx = (tx - c.x) * LIN_DRAG;
    c.vy = (ty - c.y) * LIN_DRAG;
    var spin = rnd(-1.2, 1.2);
    c.a = ta - spin;
    c.va = spin * ANG_DRAG;
  }

  function deal() {
    dealt = true;
    clock = 0;
    pickHomes();
    cards.forEach(function (c, i) {
      var home = homePx(c);
      if (reduced) {
        c.x = home.x; c.y = home.y; c.a = c.ha;
        c.vx = c.vy = c.va = 0;
        c.inside = true; c.spawnAt = 0;
        return;
      }
      c.x = home.x + rnd(-0.2, 0.2) * w;
      c.y = h + cw * CARD_H;
      c.inside = false;
      c.spawnAt = 0.1 + i * 0.07;
      launch(c, home.x, home.y, c.ha);
    });
    render();
    wake();
  }

  function shuffle() {
    cancel();
    pickHomes();
    cards.forEach(function (c, i) {
      var home = homePx(c);
      if (reduced) {
        c.x = home.x; c.y = home.y; c.a = c.ha;
        c.vx = c.vy = c.va = 0;
        return;
      }
      c.spawnAt = clock + i * 0.03;
      launch(c, home.x, home.y, c.ha + rnd(-0.6, 0.6));
    });
    render();
    wake();
  }

  /* ---------------------------------------------------------- dragging */
  function local(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function cardFor(node) {
    var p = node && node.closest ? node.closest('.print') : null;
    for (var i = 0; i < cards.length; i++) if (cards[i].el === p) return cards[i];
    return null;
  }

  function grab(c, id, px, py) {
    var dx = px - c.x, dy = py - c.y;
    var cos = Math.cos(-c.a), sin = Math.sin(-c.a);
    drag = {
      card: c, id: id, px: px, py: py, moved: 0, t: performance.now(),
      lx: dx * cos - dy * sin, ly: dx * sin + dy * cos, svx: 0, svy: 0, sva: 0
    };
    c.vx = c.vy = c.va = 0;
    c.inside = true;
    c.spawnAt = 0;
    c.z = ++topZ;
    c.el.classList.add('is-held');
    wake();
  }

  function move(id, px, py) {
    var d = drag;
    if (!d || d.id !== id) return;
    var c = d.card;
    var now = performance.now();
    var dt = Math.max(1, now - d.t) / 1000;
    var mx = px - d.px, my = py - d.py;
    d.moved += Math.abs(mx) + Math.abs(my);
    // Pulling a print off-centre swings it round the grab point.
    var rx = d.px - c.x, ry = d.py - c.y;
    var lever = cw * 0.9;
    var da = clamp(((rx * my - ry * mx) / (rx * rx + ry * ry + lever * lever)) * 0.9, -0.25, 0.25);
    var ox = c.x, oy = c.y;
    c.a += da;
    var cos = Math.cos(c.a), sin = Math.sin(c.a);
    c.x = px - (d.lx * cos - d.ly * sin);
    c.y = py - (d.lx * sin + d.ly * cos);
    var k = 1 - Math.exp(-dt * 18);
    d.svx += ((c.x - ox) / dt - d.svx) * k;
    d.svy += ((c.y - oy) / dt - d.svy) * k;
    d.sva += (da / dt - d.sva) * k;
    d.px = px; d.py = py; d.t = now;
  }

  // Returns true when the gesture was a tap rather than a throw.
  function release(id) {
    var d = drag;
    if (!d || d.id !== id) return false;
    var c = d.card;
    c.el.classList.remove('is-held');
    drag = null;
    // Holding still before letting go kills the throw, like real paper.
    var idle = performance.now() - d.t > 90;
    if (!reduced && !idle) {
      var max = 3600;
      var sp = Math.hypot(d.svx, d.svy);
      var f = sp > max ? max / sp : 1;
      c.vx = d.svx * f;
      c.vy = d.svy * f;
      c.va = clamp(d.sva, -12, 12);
    }
    wake();
    return d.moved < 7;
  }

  function cancel() {
    if (drag) drag.card.el.classList.remove('is-held');
    drag = null;
  }

  function flip(c) {
    var on = c.el.classList.toggle('is-flipped');
    c.back.setAttribute('aria-hidden', String(!on));
    c.key.setAttribute('aria-pressed', String(on));
  }

  /* ------------------------------------------------------------- frame */
  function step(dt) {
    clock += dt;
    var moving = false;
    var mx = cw * 0.55;
    var my = cw * CARD_H * 0.5;
    cards.forEach(function (c) {
      if ((drag && drag.card === c) || clock < c.spawnAt) { moving = true; return; }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.a += c.va * dt;
      var lin = Math.exp(-LIN_DRAG * dt);
      c.vx *= lin;
      c.vy *= lin;
      c.va *= Math.exp(-ANG_DRAG * dt);
      if (Math.abs(c.vx) + Math.abs(c.vy) > 2 || Math.abs(c.va) > 0.01) moving = true;
      if (!c.inside) {
        if (c.y < h - my && c.x > mx && c.x < w - mx) c.inside = true;
        return;
      }
      // Desk edges: prints bounce softly off them.
      if (c.x < mx) { c.x = mx; c.vx = Math.abs(c.vx) * 0.45; }
      if (c.x > w - mx) { c.x = w - mx; c.vx = -Math.abs(c.vx) * 0.45; }
      if (c.y < my) { c.y = my; c.vy = Math.abs(c.vy) * 0.45; }
      if (c.y > h - my) { c.y = h - my; c.vy = -Math.abs(c.vy) * 0.45; }
    });
    return moving;
  }

  function render() {
    var n = cards.length;
    var span = 1 - STAGGER * (n - 1);
    cards.forEach(function (c, i) {
      var t = ease(clamp((sort - i * STAGGER) / span, 0, 1));
      var a0 = Math.atan2(Math.sin(c.a), Math.cos(c.a)); // shortest way back to upright
      var x = c.x + (c.gx - c.x) * t;
      var y = c.y + (c.gy - c.y) * t;
      var a = a0 * (1 - t);
      var s = (1 + (gridScale - 1) * t) * (1 + Math.sin(Math.PI * t) * 0.1);
      var st = c.el.style;
      st.transform = 'translate3d(' + (x - cw / 2).toFixed(1) + 'px,' + (y - (cw * CARD_H) / 2).toFixed(1) + 'px,0) rotate(' + a.toFixed(4) + 'rad) scale(' + s.toFixed(4) + ')';
      st.zIndex = String(t > 0 && t < 1 ? 500 + i : t >= 1 ? 100 + i : c.z);
      st.visibility = !dealt || (clock < c.spawnAt && !c.inside) ? 'hidden' : 'visible';
    });
  }

  var raf = 0, last = 0;
  function frame(t) {
    raf = 0;
    var dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    var moving = step(dt);
    render();
    if ((moving || drag) && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || !visible || document.hidden || reduced && !drag) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ scroll */
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    stage.dataset.mode = m;
    if (m !== 'pile') cancel();
  }

  function onScroll() {
    var r = track.getBoundingClientRect();
    var spanPx = r.height - stage.offsetHeight;
    var p = spanPx > 0 ? clamp(-r.top / spanPx, 0, 1) : 0;
    sort = reduced ? (p > 0.45 ? 1 : 0) : smooth(0.12, 0.8, p);
    setMode(sort > 0.002 ? 'index' : 'pile');
    setHint();
    render();
  }

  /* ------------------------------------------------------------ events */
  stage.addEventListener('pointerdown', function (e) {
    if (mode !== 'pile' || e.button > 0) return;
    if (e.target.closest('.print-key, .desk-tools')) return;
    var c = cardFor(e.target);
    if (!c) return;
    var p = local(e);
    grab(c, e.pointerId, p.x, p.y);
    stage.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = local(e);
    move(e.pointerId, p.x, p.y);
  });
  stage.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var c = drag.card;
    if (release(e.pointerId)) flip(c);
  });
  stage.addEventListener('pointercancel', cancel);

  // In the pile, a pointer tap turns a print over instead of opening it.
  // Keyboard activation (detail 0) still opens the full-size photo.
  stage.addEventListener('click', function (e) {
    if (mode === 'pile' && e.detail !== 0 && e.target.closest('a.photo')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Once sorted, a turned-over print has no photo to open, so a tap turns it
  // face up again.
  stage.addEventListener('click', function (e) {
    if (mode !== 'index' || !e.target.closest('.print-back')) return;
    var c = cardFor(e.target);
    if (c) flip(c);
  });

  cards.forEach(function (c) {
    c.key.addEventListener('click', function () { flip(c); });
  });
  shuffleBtn.addEventListener('click', shuffle);

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && !dealt) deal();
    if (visible) wake();
  }).observe(track);

  document.addEventListener('visibilitychange', wake);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  reducedMq.addEventListener && reducedMq.addEventListener('change', function () {
    reduced = reducedMq.matches;
    onScroll();
    setHint(true);
  });

  resize();
  onScroll();
})();
