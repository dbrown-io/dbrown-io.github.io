// The service area as a paper map lying on the desk. Scrolling tilts it from
// flat-on to an angle, a terracotta ring sweeps out to five miles, and each
// place's pin stands up as the ring reaches it. Names and miles are in the
// legend, so the model only has to show where and how far.
Scenes.define('map', function (ctx) {
  var Zdog = ctx.Zdog, c = ctx.c, U = 24;       // 24 units a mile, 5 miles = 120
  var places = [
    ['Isleworth', 1.1, -1.04, 0.34], ['Kew', 1.2, 0.7, 0.93], ['East Sheen', 1.5, 1.5, -0.08],
    ['Mortlake', 1.5, 1.44, 0.43], ['Twickenham', 1.6, -1.13, -1.17], ['Brentford', 1.8, -0.85, 1.57],
    ['Ham', 2.0, -0.32, -1.99], ['Richmond Park', 2.1, 1.17, -1.73], ['Barnes', 2.4, 2.27, 0.7],
    ['Chiswick', 2.6, 1.64, 1.98], ['Hounslow', 2.6, -2.56, 0.35], ['Whitton', 2.6, -2.42, -0.86],
    ['Roehampton', 2.8, 2.61, -0.95], ['Teddington', 2.8, -1.37, -2.47], ['Hampton Wick', 3.4, -0.47, -3.39],
    ['Kingston', 3.7, -0.19, -3.73], ['Putney', 3.7, 3.69, -0.08], ['Hammersmith', 3.9, 3.37, 1.96],
    ['Hampton Court', 4.4, -1.54, -4.13], ['Wimbledon', 5.0, 4.12, -2.9]
  ];
  var river = [[-1.75, -4.12], [-0.75, -3.75], [-0.31, -3.62], [-0.63, -2.9], [-0.95, -2.2], [-1.01, -1.28],
    [-0.65, -0.8], [-0.22, -0.43], [-0.53, -0.21], [-0.66, -0.1], [-0.76, 0.44], [-0.39, 1.06], [0.04, 1.44],
    [0.62, 1.61], [0.81, 1.51], [1.07, 1.06], [1.38, 0.66], [2.07, 0.63], [2.58, 1.17], [3.09, 1.71],
    [3.45, 0.96], [3.81, 0.21]];

  // The map's own x/y plane; north is up, so the sign flips. Things that
  // stand up on the map go along -z, which is "up" once it is tilted.
  var root = new Zdog.Anchor({ addTo: ctx.illo, translate: { y: 8 } });
  var tilt = new Zdog.Anchor({ addTo: root });
  function at(x, y, z) { return { x: x * U, y: -y * U, z: z || 0 }; }
  function disc(r, z) { return Math.max(0.01, 2 * r * U); }

  // The flat layers are one group, painted first and in order. Zdog sorts by
  // each shape's origin, which would otherwise bury the sheet under the pins
  // on the far side.
  var flat = new Zdog.Group({ addTo: tilt });
  flat.updateSortValue = function () { this.sortValue = -1e9; };
  new Zdog.Rect({ addTo: flat, width: 272, height: 272, fill: true, stroke: 2, color: c.card });
  new Zdog.Rect({ addTo: flat, width: 272, height: 272, stroke: 1.4, color: c.line });

  for (var m = 1; m <= 4; m++) {
    new Zdog.Ellipse({ addTo: flat, diameter: disc(m), stroke: 0.8, color: c.line });
  }

  // The boundary as dashes, so it reads as a limit rather than a road.
  var dashes = [], n = 72, k, a0, a1;
  for (k = 0; k < n; k++) {
    a0 = (k / n) * Math.PI * 2; a1 = a0 + (Math.PI * 2 / n) * 0.55;
    dashes.push({ move: { x: Math.cos(a0) * 5 * U, y: Math.sin(a0) * 5 * U } });
    dashes.push({ line: { x: Math.cos(a1) * 5 * U, y: Math.sin(a1) * 5 * U } });
  }
  new Zdog.Shape({ addTo: flat, path: dashes, closed: false, fill: false, stroke: 1.5, color: c.terra });

  // Two rounds of corner-cutting turn the survey points into a smooth bend.
  var pts = river.slice(), r, j, next;
  for (r = 0; r < 2; r++) {
    next = [pts[0]];
    for (j = 0; j < pts.length - 1; j++) {
      next.push([pts[j][0] * 0.75 + pts[j + 1][0] * 0.25, pts[j][1] * 0.75 + pts[j + 1][1] * 0.25]);
      next.push([pts[j][0] * 0.25 + pts[j + 1][0] * 0.75, pts[j][1] * 0.25 + pts[j + 1][1] * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  new Zdog.Shape({
    addTo: flat, closed: false, fill: false, stroke: 5, color: c.tWash,
    path: pts.map(function (q) { return at(q[0], q[1]); })
  });

  var reach = new Zdog.Ellipse({ addTo: flat, diameter: 1, stroke: 2.5, color: c.terra });

  // Pin: a stick and a round head, scaled in height only.
  function pin(x, y, h, head, w) {
    var base = at(x, y);
    var a = new Zdog.Anchor({ addTo: tilt, translate: { x: base.x, y: base.y } });
    var stick = new Zdog.Shape({ addTo: a, path: [{ z: 0 }, { z: -h }], stroke: 1.8, color: c.ink });
    var ball = new Zdog.Shape({ addTo: a, translate: { z: -h }, stroke: w, color: head });
    return { h: h, stick: stick, ball: ball, a: a };
  }
  var station = pin(0, 0, 18, c.terra, 10);
  var pins = places.map(function (p, i) {
    var o = pin(p[2], p[3], 10 + (i % 4) * 2, p[1] >= 5 ? c.terra : c.ink, 6.5);
    o.d = p[1];
    return o;
  });

  function raise(o, t) {
    var back = 1.7, u = Math.max(0, Math.min(1, t)) - 1;     // ease out with a little overshoot
    var g = u <= -1 ? 0 : 1 + (back + 1) * u * u * u + back * u * u;
    var vis = g > 0.02, z = -o.h * g;
    o.stick.visible = o.ball.visible = vis;
    o.stick.path[1].z = z;
    o.stick.updatePath();
    o.ball.translate.z = z;
  }

  return {
    update: function (s) {
      var p = Math.max(0, Math.min(1, s.p)), e = p * p * (3 - 2 * p);
      var R = 5 * e;
      root.rotate.y = s.yaw;
      tilt.rotate.x = -1.0 * e;                  // flat-on at the top, about 57 degrees when done
      reach.visible = R > 0.05;
      reach.width = reach.height = disc(Math.max(R, 0.05));
      reach.updatePath();
      raise(station, R / 0.3);
      pins.forEach(function (o) { raise(o, (R - (o.d - 0.55)) / 0.55); });
    }
  };
});
