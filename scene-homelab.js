// The homelab as an exploded stack: the 2016 MacBook Pro, Proxmox VE on top
// of it, the guests Proxmox runs, then the services (n8n in terracotta).
// Closed at p 0, pulled apart layer by layer as the figure scrolls in.
Scenes.define('homelab', function (ctx) {
  var Z = ctx.Zdog, c = ctx.c, TAU = Z.TAU;

  // Layers draw their plate first, then what sits on it: sorting them together
  // buries tiles at the back of a plate under its top face.
  // Zdog strokes in the fill colour, so every flat face gets a second, unfilled
  // ink outline pushed out a hair to keep the paper-and-ink edge.
  function slab(parent, o) {
    var g = new Z.Group({ addTo: parent, updateSort: true, translate: o.at || {} });
    var w = o.w, h = o.h, d = o.d, e = 0.25;
    new Z.Box({ addTo: g, width: w, height: h, depth: d, color: o.fill, stroke: 1 });
    function edge(wd, ht, t, r) {
      new Z.Rect({ addTo: g, width: wd, height: ht, translate: t, rotate: r,
        stroke: 1.2, color: c.ink, fill: false });
    }
    edge(w, d, { y: -h / 2 - e }, { x: TAU / 4 });
    edge(w, h, { z: d / 2 + e }, {});
    edge(w, h, { z: -d / 2 - e }, {});
    edge(d, h, { x: w / 2 + e }, { y: TAU / 4 });
    edge(d, h, { x: -w / 2 - e }, { y: TAU / 4 });
    return g;
  }

  var stack = new Z.Group({ updateSort: true, addTo: ctx.illo, rotate: { x: -0.5, y: 0.7 }, translate: { x: -14, y: 70 } });

  // 34.9 x 24.1 x 1.55 cm, scaled to 0.4 units per cm.
  var LW = 140, LD = 96, LH = 6;
  var laptop = new Z.Group({ updateSort: true, addTo: stack });
  slab(laptop, { w: LW, h: LH, d: LD, fill: c.card });
  new Z.Rect({ addTo: laptop, width: LW - 28, height: 44, translate: { y: -LH / 2 - 0.3, z: -10 },
    rotate: { x: TAU / 4 }, stroke: 1, color: c.lineStrong, fill: false });
  new Z.Rect({ addTo: laptop, width: 38, height: 24, translate: { y: -LH / 2 - 0.3, z: 33 },
    rotate: { x: TAU / 4 }, stroke: 1, color: c.lineStrong, fill: false });
  // Open to about 100 degrees: ten past upright, leaning back.
  var hinge = new Z.Group({ updateSort: true, addTo: laptop, translate: { y: -LH / 2, z: -LD / 2 }, rotate: { x: 0.17 } });
  slab(hinge, { w: LW, h: 94, d: 3, fill: c.card, at: { y: -47 } });
  new Z.Rect({ addTo: hinge, width: LW - 12, height: 82, translate: { y: -47, z: 2.4 },
    stroke: 1, color: c.inkDim, fill: true });

  // Proxmox VE, in the site's blue tape colour.
  var pve = new Z.Group({ addTo: stack });
  slab(pve, { w: 100, h: 4, d: 70, fill: c.tPc });

  // The guests: three virtual machines and containers.
  var guests = new Z.Group({ addTo: stack });
  slab(guests, { w: 100, h: 3, d: 70, fill: c.paper });
  [[-30, -14, 22, 14], [8, -14, 26, 16], [-6, 16, 24, 12]].forEach(function (b) {
    slab(guests, { w: b[2], h: b[3], d: 22, fill: c.card, at: { x: b[0], y: -1.5 - b[3] / 2, z: b[1] } });
  });

  // The services, laid flat. The terracotta one is n8n: three nodes, joined.
  var services = new Z.Group({ addTo: stack });
  slab(services, { w: 100, h: 3, d: 70, fill: c.paper });
  function tile(x, z, fill) {
    return slab(services, { w: 28, h: 3, d: 28, fill: fill, at: { x: x, y: -3, z: z } });
  }
  tile(-30, -14, c.card);
  tile(-30, 18, c.card);
  var n8n = tile(16, 2, c.terra);
  var nodes = [[-8, 6], [3, -7], [8, 7]];
  new Z.Shape({ addTo: n8n, translate: { y: -2.2 }, stroke: 1.5, color: c.card, closed: false,
    path: [{ x: nodes[0][0], z: nodes[0][1] }, { x: nodes[1][0], z: nodes[1][1] }, { x: nodes[2][0], z: nodes[2][1] }] });
  nodes.forEach(function (n) {
    new Z.Shape({ addTo: n8n, translate: { x: n[0], y: -2.6, z: n[1] }, stroke: 6, color: c.card });
  });
  // Two short lines on the plain tiles say "something runs here" without text.
  [[-30, -14], [-30, 18]].forEach(function (t) {
    new Z.Shape({ addTo: services, translate: { x: t[0], y: -5.4, z: t[1] }, stroke: 1.5, color: c.inkFaint,
      closed: false, path: [{ x: -8 }, { x: 8 }] });
  });

  // Dashed guide through the middle, showing the layers share one axis.
  var guide = [];
  for (var i = 0; i < 26; i++) {
    guide.push(new Z.Shape({ addTo: stack, stroke: 1.2, color: c.lineStrong, closed: false,
      path: [{ y: 0 }, { y: -1 }] }));
  }

  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  // Distance between one layer and the one below: tight when closed, then open.
  var CLOSED = [0, 5, 4, 22], OPEN = [0, 60, 46, 54];

  return {
    update: function (s) {
      var y = -LH / 2, ys = [0];
      [pve, guests, services].forEach(function (layer, k) {
        var t = ease((s.p - 0.14 * k) / 0.72);
        y -= CLOSED[k + 1] + (OPEN[k + 1] - CLOSED[k + 1]) * t;
        layer.translate.y = y;
        ys.push(y);
      });
      var top = y - 14, step = (top + 6) / guide.length;
      guide.forEach(function (g, j) {
        g.translate.y = -6 + step * j;
        g.path[1].y = step * 0.5;
        g.visible = ease(s.p / 0.3) > 0.02;
      });
      stack.rotate.y = 0.7 + s.yaw;
    }
  };
});
