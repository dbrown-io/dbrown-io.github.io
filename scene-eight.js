// A coxed eight rowing as the page scrolls. One scroll screen is about 1.6
// strokes, so the boat only moves while the visitor does. Flat card hull,
// ink lines, bow to the right, the cox's head in terracotta.
Scenes.define('eight', function (ctx) {
  var Zdog = ctx.Zdog, c = ctx.c, M = 19;       // about 19 units per metre
  var HALF = 165, BEAM = 5.5, PIN = 0.8 * M, REACH = 3.0 * M, BLADE = 0.5 * M;
  var SEAT0 = -105, GAP = 1.38 * M;             // stroke seat first, nearest the cox

  var boat = new Zdog.Anchor({ addTo: ctx.illo });

  // Pointed at both ends, fullest just aft of the middle.
  var side = [], i, u, hw;
  for (i = 0; i <= 28; i++) {
    u = -1 + i / 14;
    hw = BEAM * Math.pow(1 - Math.pow(Math.abs(u), 2.2), 0.55);
    side.push({ x: u * HALF, y: 2, z: hw });
  }
  var path = side.concat(side.slice(1, -1).reverse().map(function (p) {
    return { x: p.x, y: 2, z: -p.z };
  }));
  new Zdog.Shape({ addTo: boat, path: path, closed: true, fill: true, color: c.card, stroke: 0 });
  new Zdog.Shape({ addTo: boat, path: path, closed: true, color: c.ink, stroke: 1.2 });
  new Zdog.Shape({ addTo: boat, path: [{ x: -HALF + 6, y: 1.5 }, { x: HALF - 6, y: 1.5 }], color: c.inkFaint, stroke: 0.8 });

  // The cox faces the bow from the stern; no oar.
  var cox = new Zdog.Anchor({ addTo: boat, translate: { x: -140, y: 0 } });
  new Zdog.Shape({ addTo: cox, path: [{ y: 0 }, { x: 2, y: -4 }], color: c.inkDim, stroke: 4 });
  new Zdog.Shape({ addTo: cox, translate: { x: 3, y: -8 }, color: c.terra, stroke: 7 });

  var rowers = [];
  for (i = 0; i < 8; i++) {
    // Stroke seat is on the +z side, then alternate down to the bow.
    var dir = i % 2 === 0 ? 1 : -1;
    var seatX = SEAT0 + i * GAP;
    var rig = new Zdog.Shape({
      addTo: boat, path: [{ x: seatX, y: -1, z: 0 }, { x: seatX, y: -1.5, z: dir * PIN }],
      color: c.inkFaint, stroke: 0.8
    });
    var body = new Zdog.Shape({ addTo: boat, path: [{ y: 0 }, { y: -4 }], color: c.inkDim, stroke: 4 });
    var head = new Zdog.Shape({ addTo: boat, color: c.ink, stroke: 6.5 });
    // The oar pivots at the pin; its blade hangs off the tip.
    var oar = new Zdog.Anchor({ addTo: boat, translate: { x: seatX, y: -1.5, z: dir * PIN } });
    new Zdog.Shape({
      addTo: oar, color: c.ink, stroke: 1,
      path: [{ z: -dir * 14 }, { z: dir * (REACH - BLADE) }]
    });
    var tip = new Zdog.Anchor({ addTo: oar, translate: { z: dir * (REACH - BLADE / 2) }, rotate: { y: Math.PI / 2 } });
    var blade = new Zdog.Rect({
      addTo: tip, width: BLADE, height: BLADE / 2, color: c.ink, fill: true,
      stroke: 0.8, backface: c.card
    });
    rowers.push({ seatX: seatX, dir: dir, body: body, head: head, oar: oar, tip: tip, blade: blade });
  }

  function ease(t) { return t * t * (3 - 2 * t); }
  function clamp(t) { return Math.max(0, Math.min(1, t)); }

  return {
    update: function (s) {
      var ph = (((s.run * 1.6) % 1) + 1) % 1;
      // q is how far through the stroke the body has travelled: 0 at the
      // catch, 1 at the finish. Blades sweep with it, so all eight keep time.
      var q = ph < 0.4 ? ease(ph / 0.4) : 1 - ease((ph - 0.4) / 0.6);
      var swing = (40 - 70 * q) * Math.PI / 180;
      // Flat (feathered) from just after the finish until just before the catch.
      var f = ph < 0.4 ? 0 : ph < 0.5 ? ease((ph - 0.4) / 0.1) : ph < 0.9 ? 1 : 1 - ease((ph - 0.9) / 0.1);
      var slide = (q - 0.5) * 10, lean = (q - 0.5) * 7;
      var lift = f;                        // blades clear the water on the recovery

      rowers.forEach(function (r) {
        var x = r.seatX + slide;
        r.body.translate = { x: x, y: 0 };
        r.body.path = [{ y: 0 }, { x: lean * 0.5, y: -4 }];
        r.head.translate = { x: x + lean * 0.5, y: -8.5 };
        r.oar.rotate.y = r.dir * swing;
        r.oar.translate.y = -1.5 - lift * 2;
        r.blade.rotate.x = f * Math.PI / 2;
        r.body.updatePath();
      });

      var ry = 0.35 + s.yaw, sy = Math.abs(Math.sin(ry)), cy = Math.abs(Math.cos(ry));
      var vert = 0.79 * (HALF * sy + (PIN + REACH) * cy) + 10;
      var horiz = HALF * cy + (PIN + REACH) * sy + 16;
      var k = Math.min(1, (ctx.h / 2 - 6) / vert, 190 / horiz);
      boat.scale = k;
      boat.rotate.x = -0.9;
      boat.rotate.y = ry;
      boat.translate.x = (s.p - 1) * 12 * k;
    }
  };
});
