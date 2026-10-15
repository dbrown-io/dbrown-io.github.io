// Two bits of motion shared by every page. Cards below the fold wait to land
// until they are scrolled to (the landing itself is the `land` keyframes in
// styles.css), and the taped profile photo in the header can be grabbed and
// flicked, then wobbles back onto its tape. Reduced motion turns both off.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ------------------------------------------------- cards land on scroll */
  var cards = Array.prototype.slice.call(
    document.querySelectorAll('.ticket, .route, .record, .project, .contact, .facts')
  );
  if (cards.length && window.IntersectionObserver) {
    // Only cards that start below the fold are held back: anything already on
    // screen keeps the landing it started on load, so nothing blinks out.
    var below = cards.filter(function (c) {
      return c.getBoundingClientRect().top > window.innerHeight;
    });
    below.forEach(function (c) { c.classList.add('land-wait'); });

    var io = new IntersectionObserver(function (entries) {
      // Cards that arrive in the same scroll land one after another.
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target;
        io.unobserve(c);
        c.style.animationDelay = (k++ * 0.08) + 's';
        c.classList.remove('land-wait');
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    below.forEach(function (c) { io.observe(c); });
  }

  /* ------------------------------------------ scroll-linked (scrubbed) */
  // Each entry sets --p on its element from 0 to 1 as the element's top
  // travels from `from` to `to` (fractions of the screen height), so the
  // motion runs forwards scrolling down and backwards scrolling up. The CSS
  // reads --p and treats a missing one as 1, the finished state.
  var scrubs = [];
  function scrub(el, from, to, shape) {
    scrubs.push({ el: el, from: from, to: to, shape: shape, last: -1 });
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  Array.prototype.slice.call(document.querySelectorAll('.section-label')).forEach(function (el) {
    scrub(el, 0.95, 0.68);
  });

  Array.prototype.slice.call(document.querySelectorAll('.record-photos')).forEach(function (el) {
    scrub(el, 1.0, 0.4, smooth);
  });

  // Intro words ink in one after another. The link inside an intro keeps its
  // own element; only its text is split.
  Array.prototype.slice.call(document.querySelectorAll('.home-intro')).forEach(function (p) {
    var n = 0;
    var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', n++);
        w.textContent = part;
        frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
    p.style.setProperty('--n', n);
    scrub(p, 0.92, 0.42);
  });

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    // At the very bottom of the page nothing can scroll any higher, so
    // everything still on its way finishes.
    var atEnd = window.scrollY + vh >= document.documentElement.scrollHeight - 2;
    scrubs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      // Far off screen: settle it as finished (above) or not started (below),
      // so a fast jump past one never leaves it half drawn.
      var t = r.bottom < -vh ? 1 : r.top > vh * 2 ? 0
        : atEnd ? 1 : (s.from * vh - r.top) / ((s.from - s.to) * vh);
      t = Math.max(0, Math.min(1, t));
      if (s.shape) t = s.shape(t);
      t = Math.round(t * 1000) / 1000;
      if (t === s.last) return;
      s.last = t;
      s.el.style.setProperty('--p', t);
    });
  }
  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  if (scrubs.length) {
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  }

  /* ---------------------------------------------- flickable profile photo */
  var card = document.querySelector('.profile-card');
  var photo = card && card.querySelector('.profile-photo');
  if (!card || !photo || !window.requestAnimationFrame) return;

  photo.setAttribute('draggable', 'false');
  card.classList.add('is-flickable');

  var x = 0, y = 0, a = 0;      // offset from rest, px and deg
  var vx = 0, vy = 0, va = 0;
  var held = null;               // { id, sx, sy, px, py, t }
  var raf = 0, last = 0;

  // A rubber band: the photo follows the pointer, but less the further it goes,
  // so it can never be dragged off across the page.
  function band(d) { return d / (1 + Math.abs(d) / 220); }

  // band() is applied to the raw drag distance, so a grab that starts while
  // the photo is still wobbling needs the distance that produced the current
  // offset, or the photo would jump under the pointer.
  band.inverse = function (v) {
    var s = v < 0 ? -1 : 1;
    var m = Math.min(Math.abs(v), 219);
    return s * (m / (1 - m / 220));
  };

  function paint() {
    card.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
    card.style.rotate = a.toFixed(2) + 'deg';
  }

  function frame(t) {
    raf = 0;
    var dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    if (!held) {
      // Under-damped spring back to rest: two or three wobbles, then still.
      var k = 260, c = 15;
      vx += (-k * x - c * vx) * dt;
      vy += (-k * y - c * vy) * dt;
      va += (-k * a - c * va) * dt;
      x += vx * dt; y += vy * dt; a += va * dt;
      if (Math.abs(x) + Math.abs(y) + Math.abs(a) < 0.05 &&
          Math.abs(vx) + Math.abs(vy) + Math.abs(va) < 0.5) {
        x = y = a = vx = vy = va = 0;
        paint();
        card.style.zIndex = '';
        return;
      }
    }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  photo.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    held = { id: e.pointerId, sx: e.clientX - band.inverse(x), sy: e.clientY - band.inverse(y), px: e.clientX, py: e.clientY, t: performance.now() };
    vx = vy = va = 0;
    card.style.zIndex = '20';
    card.classList.add('is-held');
    photo.setPointerCapture(e.pointerId);
    e.preventDefault();
    wake();
  });

  photo.addEventListener('pointermove', function (e) {
    if (!held || held.id !== e.pointerId) return;
    var now = performance.now();
    var dt = Math.max(1, now - held.t) / 1000;
    var nx = band(e.clientX - held.sx);
    var ny = band(e.clientY - held.sy);
    // Swing like something held at the top: sideways drag tips the photo.
    var na = nx * 0.12;
    var k = 1 - Math.exp(-dt * 20);
    vx += ((nx - x) / dt - vx) * k;
    vy += ((ny - y) / dt - vy) * k;
    va += ((na - a) / dt - va) * k;
    x = nx; y = ny; a = na;
    held.t = now;
  });

  function letGo(e) {
    if (!held || (e && held.id !== e.pointerId)) return;
    // Holding still before letting go means no flick, just the spring.
    if (performance.now() - held.t > 90) vx = vy = va = 0;
    held = null;
    card.classList.remove('is-held');
    wake();
  }
  photo.addEventListener('pointerup', letGo);
  photo.addEventListener('pointercancel', letGo);

})();
