// The shapes the one sky takes, and how each of them lives.
// Units: each story frame is 1.6 wide and 1 tall, centre (.8, .5); z is depth (+ toward the viewer).
// A formation gives base arrays (sorted along a Hilbert curve, so neighbours stay neighbours from one
// formation to the next), live(t, out) for its motion, ns for where the North Star stands in it,
// an overlay of lines and labels, and env for the light of the room around it.
// Palette: black, starlight (silver, gold, ember), emerald, and once in a while a deep indigo.

export const COUNT = 15;
// where each picture sits in its frame: the part that must be seen, centred between the heading and the words
const BOXES = { 1: [.44, .14, 1.16, .86], 2: [.22, .03, 1.4, 1], 3: [.3, 0, 1.3, 1], 4: [.18, .06, 1.38, .96], 5: [.12, .04, 1.48, .96], 6: [.4, .14, 1.2, .9], 7: [.3, .1, 1.3, .86], 8: [.38, .05, 1.22, .84], 9: [.5, .04, 1.1, .96], 10: [.4, .02, 1.2, 1], 11: [.36, .08, 1.24, .96], 12: [.38, .1, 1.22, .94], 13: [.5, .26, 1.1, .88], 14: [.3, .12, 1.3, .98] };
export const box = (i, narrow) => (narrow && i === 5 ? [.4, 0, 1.2, 1.06] : BOXES[i] || [0, 0, 1.6, 1]);
const TAU = Math.PI * 2;

export const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); };
const fract = x => x - Math.floor(x);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = x => fract(Math.sin(x * 127.1 + 311.7) * 43758.5453);

const C = {
  W: [.86, .89, .93], SIL: [.66, .72, .78], WARM: [1, .9, .76],
  G: [.89, .76, .49], GD: [.78, .6, .26], PALE: [1, .93, .74], CREAM: [1, .95, .84],
  E: [.89, .38, .17], EO: [.95, .62, .3],
  EM: [.34, .82, .6], EMD: [.2, .56, .42],
};

const R = {
  GLASS: 7, FRAME: 8, SAND: 9, STREAM: 29, SKIN: 26, INNER: 27, HOLD: 28, GAL: 68,
  STAR: 0, STATIC: 1, CSTAR: 3, METEOR: 5, TRAIL: 6,
  MEMB: 10, NUC: 11, CHROM: 12, NUCL: 13, MITO: 14, ER: 15, GOLGI: 16, VES: 17, CYTO: 18,
  PATH: 20, SOMA: 21, DEND: 22, AXON: 23, RBC: 24, HEART: 25,
  DIV: 30, ECG: 31, WATER: 32, SURF: 33, WALL: 34, CRACK: 35, DROP: 36,
  EMBER: 40, FIRE: 41, REFL: 42, PAGE: 43, LINE: 44, TURN: 45, MOTE: 46, MOON: 47,
  CLINE: 50, PLANET: 51, BOWL: 52, RIM: 53, FLAME: 54, GLOW: 55, POOL: 56, EMB2: 57,
  RING: 60, NAK: 61, TICK: 62, GRAHA: 63, RIDGE: 64, WAY: 65, LAMP: 66, RISE: 67,
  LID: 70, IRIS: 71, FIBER: 72, LASH: 73, LDUST: 74, BMOTE: 75,
  GEM: 76, BODY: 78, FILL: 79, CHAK: 80, ORBIT: 81, HGLOW: 77, SAGE: 89, HIDE: 90, TIP: 91,
  PETAL: 82, POD: 83, STEM: 84, RIPPLE: 85, PAD: 86, POLLEN: 87, SHEEN: 88,
};

// The light of each room: background gradient (top, bottom), the two gas colours and how much gas,
// the North Star's glow on the night, stardust, a horizon, and the North Star's size, intensity and rays.
const ENV = {
  top: [0, 0, 0], bot: [0, 0, 0], g1: [.05, .055, .06], g2: [.02, .1, .065], gas: .4, glow: .2, dust: .8,
  hz: 0, hzC: [.5, .3, .14], base: [.72, .78, .84], nsS: 1, nsI: 1, ray: 0, pan: 0, vig: 1,
};
const env = (i, o) => Object.assign({}, ENV, { pan: i * 1.9 }, o);

// ---------------------------------------------------------------- point helpers
let LAYER = 0; // 1 = in front of the hills (only the last scene has hills)
function P(o, x, y, z, c, s, a, ro, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0) { o.push({ x, y, z, c, s, a, ro, p1, p2, p3, p4, p5, l: LAYER }); }

function sky(o, n, r, B, opt = {}) {
  const { dim = 1, band = 0, x0 = B.x0, x1 = B.x1, y0 = B.y0, y1 = B.y1, warm = .14, flag = 0 } = opt;
  for (let i = 0; i < n; i++) {
    let x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    if (band && r() < band) { const t = r(); x = x0 + t * (x1 - x0); y = y1 - (y1 - y0) * (.12 + .76 * t) + gauss(r) * .07 * (y1 - y0); }
    const k = Math.pow(r(), 5), q = r();
    const c = q < warm ? C.WARM : q < .3 ? C.SIL : C.W;
    P(o, x, y, (r() * 2 - 1) * .5, c, .45 + k * 2.1, (.16 + r() * .64) * dim, R.STAR, .35 + r() * 1.6, r() * TAU, flag);
  }
}
function blob(o, n, x, y, z, sig, c, s, a, ro, r, p1 = 0, p2 = 0) {
  for (let i = 0; i < n; i++) P(o, x + gauss(r) * sig, y + gauss(r) * sig, z + gauss(r) * sig, c, s * (.7 + r() * .6), a * (.65 + r() * .35), ro, p1, p2);
}
function poly(o, pts, n, c, s, a, ro, r, jit = .0015, fn) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1] || 1; let j = 1;
  for (let i = 0; i < n; i++) {
    const d = (i + r() * .8) / n * tot; while (j < L.length - 1 && L[j] < d) j++;
    const A = pts[j - 1], B = pts[j], f = Math.min(1, (d - L[j - 1]) / ((L[j] - L[j - 1]) || 1));
    const x = A[0] + (B[0] - A[0]) * f + gauss(r) * jit, y = A[1] + (B[1] - A[1]) * f + gauss(r) * jit;
    const z = (A[2] || 0) + ((B[2] || 0) - (A[2] || 0)) * f;
    if (fn) fn(x, y, z, d / tot); else P(o, x, y, z, c, s * (.8 + r() * .4), a * (.75 + r() * .25), ro, d / tot);
  }
}
// a dashed guide through a polyline, for the overlay
function dashed(lines, pts, a = .3, dash = .012, gap = .013) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1];
  const at = d => { let j = 1; while (j < L.length - 1 && L[j] < d) j++; const f = (d - L[j - 1]) / ((L[j] - L[j - 1]) || 1); return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f]; };
  for (let d = 0; d < tot; d += dash + gap) { const p = at(d), q = at(Math.min(tot, d + dash)); lines.push([p[0], p[1], 0, q[0], q[1], 0, a]); }
}
const spline = (pts, k = 6) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3))); }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const fib = (i, n) => { const y = 1 - 2 * (i + .5) / n, rr = Math.sqrt(1 - y * y), ph = i * 2.399963; return [Math.cos(ph) * rr, y, Math.sin(ph) * rr]; };
const randDir = r => { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); return [Math.cos(a) * s, Math.sin(a) * s, z]; };
const randBall = r => { const d = randDir(r), k = Math.cbrt(r()); return [d[0] * k, d[1] * k, d[2] * k]; };

// ---------------------------------------------------------------- Hilbert ordering and packing
function hil(x, y) { const n = 1024; let d = 0; for (let s = n >> 1; s > 0; s >>= 1) { const rx = (x & s) ? 1 : 0, ry = (y & s) ? 1 : 0; d += s * s * ((3 * rx) ^ ry); if (!ry) { if (rx) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; } } return d; }
function pack(pts, vb) {
  const n = pts.length, sx = 1023 / (vb.x1 - vb.x0), sy = 1023 / (vb.y1 - vb.y0), ci = v => Math.max(0, Math.min(1023, Math.floor(v)));
  const keyed = pts.map(p => [hil(ci((p.x - vb.x0) * sx), ci((p.y - vb.y0) * sy)), p]).sort((a, b) => a[0] - b[0]);
  const F = { n };
  for (const k of ['x', 'y', 'z', 's', 'a', 'r', 'g', 'b', 'p1', 'p2', 'p3', 'p4', 'p5']) F[k] = new Float32Array(n);
  F.ro = new Uint8Array(n); F.l = new Uint8Array(n);
  keyed.forEach(([, p], i) => {
    F.l[i] = p.l;
    F.x[i] = p.x; F.y[i] = p.y; F.z[i] = p.z; F.s[i] = p.s; F.a[i] = p.a; F.r[i] = p.c[0]; F.g[i] = p.c[1]; F.b[i] = p.c[2];
    F.ro[i] = p.ro; F.p1[i] = p.p1; F.p2[i] = p.p2; F.p3[i] = p.p3; F.p4[i] = p.p4; F.p5[i] = p.p5;
  });
  return F;
}
function finalize(pts, ctx, r, extra) {
  const { N, vb } = ctx, n = N - 1;
  if (pts.length > n) {
    const bg = []; pts.forEach((p, i) => { if (p.ro === R.STAR) bg.push(i); });
    const drop = new Set();
    while (pts.length - drop.size > n && bg.length) drop.add(bg.splice(Math.floor(r() * bg.length), 1)[0]);
    if (drop.size) pts = pts.filter((_, i) => !drop.has(i));
    while (pts.length > n) { const k = Math.floor(r() * pts.length); pts[k] = pts[pts.length - 1]; pts.pop(); }
  }
  if (pts.length < n) sky(pts, n - pts.length, r, vb, { dim: .5 });
  const F = pack(pts, vb);
  F.ns = [.8, .5, 0]; F.env = env(0, {});
  Object.assign(F, extra);
  F.nsAt = typeof F.ns === 'function' ? F.ns : () => F.ns;
  if (!F.live) F.live = (t, o) => { for (let i = 0; i < n; i++) common(F, o, i, t); };
  return F;
}

// ---------------------------------------------------------------- shared life
function base(F, o, i) { o.X[i] = F.x[i]; o.Y[i] = F.y[i]; o.Z[i] = F.z[i]; o.S[i] = F.s[i]; o.A[i] = F.a[i]; o.R[i] = F.r[i]; o.G[i] = F.g[i]; o.B[i] = F.b[i]; }
function common(F, o, i, t) {
  base(F, o, i);
  switch (F.ro[i]) {
    case R.STAR: { const w = .5 + .5 * Math.sin(t * F.p1[i] + F.p2[i]); o.A[i] *= .5 + .5 * w * w; o.X[i] += .0025 * Math.sin(t * .045 + F.p2[i]); o.Y[i] += .0018 * Math.cos(t * .037 + F.p2[i]); break; }
    case R.CSTAR: { const w = .5 + .5 * Math.sin(t * F.p1[i] * .8 + F.p2[i]); o.A[i] *= .72 + .28 * w; o.S[i] *= .9 + .2 * w; break; }
    case R.STATIC: { o.A[i] *= .86 + .14 * Math.sin(t * .6 + F.p2[i] * 9); break; }
  }
}
function meteor(F, o, i, t, vb) {
  base(F, o, i);
  const per = 17, T = (t + 6) % per, ph = T / 1.3;
  if (ph >= 1) { o.A[i] = 0; return; }
  const c = Math.floor((t + 6) / per), sx = vb.x0 + .35 + hash(c) * Math.max(.1, vb.x1 - vb.x0 - .7), sy = vb.y0 + .06 + hash(c + 9.1) * .32;
  const e = 1 - (1 - ph) * (1 - ph), dx = -.5, dy = .21, j = F.p1[i];
  o.X[i] = sx + dx * e - dx * .3 * j; o.Y[i] = sy + dy * e - dy * .3 * j; o.Z[i] = 0;
  o.A[i] = Math.pow(1 - j, 1.7) * Math.sin(Math.PI * ph) * .8; o.S[i] = .45 + 1.2 * (1 - j);
  o.R[i] = 1; o.G[i] = .94 - j * .1; o.B[i] = .84 - j * .2;
}

// ---------------------------------------------------------------- the living cell (3D)
function cellGen(o, ctx, r, cell, k, full = true) {
  const f = n => Math.max(3, Math.round(ctx.q(n) * k)), { cx, cy, R: Rc } = cell;
  const add = (ro, rx, ry, rz, c, s, a, p4 = 0, p5 = 0) => P(o, cx + rx, cy + ry, rz, c, s, a, ro, rx, ry, rz, p4, p5);
  const nm = f(620);
  for (let i = 0; i < nm; i++) { const [ux, uy, uz] = fib(i, nm), j = 1 + gauss(r) * .007; add(R.MEMB, ux * Rc * j, uy * Rc * j, uz * Rc * j, C.EM, 1.05, .85); }
  const nx = -.1 * Rc, ny = .06 * Rc, nz = .04 * Rc, Rn = .36 * Rc; cell.n = [nx, ny, nz, Rn];
  const ne = f(260);
  for (let i = 0; i < ne; i++) { const [ux, uy, uz] = fib(i, ne); add(R.NUC, nx + ux * Rn, ny + uy * Rn * .94, nz + uz * Rn, C.SIL, .95, .8, ux, uz); }
  for (let c = 0; c < 16; c++) {
    const [ux, uy, uz] = randBall(r), px = nx + ux * Rn * .7, py = ny + uy * Rn * .7, pz = nz + uz * Rn * .7;
    for (let j = 0, m = f(9); j < m; j++) add(R.CHROM, px + gauss(r) * Rn * .07, py + gauss(r) * Rn * .07, pz + gauss(r) * Rn * .07, C.W, .8, .45, r() * TAU);
  }
  cell.nl = [nx - Rn * .25, ny - Rn * .15, nz + Rn * .2];
  for (let j = 0, m = f(30); j < m; j++) add(R.NUCL, cell.nl[0] + gauss(r) * Rn * .08, cell.nl[1] + gauss(r) * Rn * .08, cell.nl[2] + gauss(r) * Rn * .08, C.CREAM, 1.2, .9);
  if (!full) return;
  for (let m = 0; m < 11; m++) {
    const [ux, uy, uz] = randDir(r), d = Rc * (.56 + r() * .26), gx = ux * d, gy = uy * d, gz = uz * d;
    const la = Rc * (.1 + r() * .03), lb = Rc * .036;
    for (let j = 0, n = f(26); j < n; j++) { const a = j / n * TAU; add(R.MITO, gx, gy, gz, C.G, .95, .85, Math.cos(a) * la, Math.sin(a) * lb); }
    for (let c = -1; c <= 1; c++) for (let j = 0; j < 4; j++) add(R.MITO, gx, gy, gz, C.GD, .7, .55, c * la * .5, (j / 3 * 2 - 1) * lb * .75);
  }
  for (let e = 0; e < 6; e++) {
    const rr = Rn * (1.3 + e * .13), a0 = r() * TAU, span = 1.6 + r() * 1.6, tilt = (r() - .5) * 1.2, n = f(50);
    for (let j = 0; j < n; j++) {
      const u = j / n, a = a0 + span * u, w = 1 + .07 * Math.sin(u * 9 + e), lx = Math.cos(a) * rr * w, ly = Math.sin(a) * rr * w;
      add(R.ER, nx + lx, ny + ly * Math.cos(tilt), nz + ly * Math.sin(tilt), C.EM, .8, .62, u * span * 3, e);
    }
  }
  const ga = 3.75, gd = Rc * .5; cell.g = [Math.cos(ga) * gd, Math.sin(ga) * gd * .9, Rc * .15];
  for (let g = 0; g < 5; g++) {
    const rr = Rc * (.06 + g * .03), n = f(22);
    for (let j = 0; j < n; j++) { const a = ga - .8 + 1.6 * j / (n - 1); add(R.GOLGI, cell.g[0] + Math.cos(a) * rr, cell.g[1] + Math.sin(a) * rr, cell.g[2] + (g - 2) * Rc * .02, C.PALE, .85, .75, g); }
  }
  for (let v = 0, n = f(46); v < n; v++) { const [ux, uy, uz] = randDir(r); add(R.VES, ux * Rc * .86, uy * Rc * .86, uz * Rc * .86, C.PALE, 1.15, .9, r()); }
  for (let i = 0, n = f(470); i < n; i++) {
    let v, tries = 0;
    do { v = randBall(r).map(q => q * Rc * .94); } while (Math.hypot(v[0] - nx, v[1] - ny, v[2] - nz) < Rn * 1.12 && ++tries < 12);
    add(R.CYTO, v[0], v[1], v[2], C.EMD, .55, .2 + r() * .16, .4 + r() * 1.2, r() * TAU);
  }
}
function cellLive(F, cell, o, i, t, ro) {
  const th = t * cell.w + (cell.th0 || 0), c = Math.cos(th), s = Math.sin(th);
  let x = F.p1[i], y = F.p2[i], z = F.p3[i];
  base(F, o, i);
  const br = cell.breath ? cell.breath(t) : 0;
  switch (ro) {
    case R.MEMB: { const f = 1 + .014 * Math.sin(t * 1.05 + x * 40 + y * 27) + br; x *= f; y *= f; z *= f; break; }
    case R.CHROM: o.A[i] *= .6 + .4 * Math.sin(t * 1.6 + F.p4[i]); break;
    case R.NUCL: { const p = Math.sin(t * 1.2); o.A[i] *= .82 + .18 * p; o.S[i] *= 1 + .1 * p; break; }
    case R.MITO: {
      const h = hash(F.p1[i] * 31.7 + F.p3[i] * 17.3), al = h * TAU + t * .25 * (.6 + h), be = (hash(h * 7.1) - .5) * 2.4;
      const so = t * .035 * (1 + h * .5), cs = Math.cos(so), ss = Math.sin(so), gx = x * cs + z * ss, gz = -x * ss + z * cs;
      const lx = F.p4[i], ly = F.p5[i], ca = Math.cos(al), sa = Math.sin(al), qx = lx * ca - ly * sa, qy = lx * sa + ly * ca;
      x = gx + qx; y = y + qy * Math.cos(be); z = gz + qy * Math.sin(be); break;
    }
    case R.ER: { const n = cell.n, f = 1 + .035 * Math.sin(F.p4[i] * 2 - t * 1.2); x = n[0] + (x - n[0]) * f; y = n[1] + (y - n[1]) * f; z = n[2] + (z - n[2]) * f; break; }
    case R.GOLGI: { const g = cell.g, f = 1 + .03 * Math.sin(t * 1.1 + F.p4[i]); x = g[0] + (x - g[0]) * f; y = g[1] + (y - g[1]) * f; break; }
    case R.VES: { const g = cell.g, u = fract(t * .05 + F.p4[i]), e = smooth(u); x = g[0] + (x - g[0]) * e; y = g[1] + (y - g[1]) * e; z = g[2] + (z - g[2]) * e; o.A[i] = F.a[i] * Math.pow(Math.sin(Math.PI * u), .7); break; }
    case R.CYTO: { const f = F.p4[i], p = F.p5[i], a = cell.R * .022; x += a * Math.sin(t * f + p); y += a * Math.cos(t * f * 1.21 + p * 1.7); z += a * Math.sin(t * f * .83 + p * 2.3); break; }
  }
  if (ro !== R.MEMB && br) { x *= 1 + br; y *= 1 + br; z *= 1 + br; }
  const rx = x * c + z * s, rz = -x * s + z * c;
  o.X[i] = cell.cx + rx; o.Y[i] = cell.cy + y; o.Z[i] = rz;
  if (ro === R.MEMB) { const l = 1 - Math.min(1, Math.abs(rz) / cell.R); o.A[i] *= .16 + .84 * Math.pow(l, 2.2); o.S[i] *= .85 + .4 * l; }
  else if (ro === R.NUC) { const l = 1 - Math.min(1, Math.abs(-F.p4[i] * s + F.p5[i] * c)); o.A[i] *= .3 + .7 * Math.pow(l, 1.6); }
}
const isCell = ro => ro >= 10 && ro <= 18;
function cellAt(cell, p, t) {
  const th = t * cell.w + (cell.th0 || 0), c = Math.cos(th), s = Math.sin(th);
  return [cell.cx + p[0] * c + p[2] * s, cell.cy + p[1], -p[0] * s + p[2] * c];
}

// ---------------------------------------------------------------- constellations (relative patterns)
const SAPT_P = { pts: [[0, 0], [.02, .12], [.17, .16], [.2, .05], [.32, .02], [.43, 0], [.56, .06]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] };
const KRIT = { pts: [[0, 0], [.035, .012], [.06, -.008], [.022, .035], [.07, .03], [.045, .055], [.008, .05]], edges: [] };
const ROHI = { pts: [[0, 0], [.045, .06], [.085, .12], [.13, .062], [.17, 0]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] };
const MRIG = { pts: [[0, 0], [.2, .02], [.08, .2], [.12, .21], [.16, .22], [.02, .4], [.22, .38], [.1, -.08]], edges: [[0, 7], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] };
function stars(o, lines, ctx, r, pos, edges, per, bright, warm = [], z = 0) {
  pos.forEach((p, i) => { const br = bright.includes(i); blob(o, ctx.q(br ? per * 1.8 : per), p[0], p[1], z, .0026, warm.includes(i) ? C.WARM : br ? C.CREAM : C.W, br ? 1.45 : 1.1, .95, R.CSTAR, r, .6 + r() * 1.4, r() * TAU); });
  edges.forEach(([a, c]) => lines.push([pos[a][0], pos[a][1], z, pos[c][0], pos[c][1], z, .34]));
  return pos;
}
const place = (b, sc, def) => def.pts.map(([u, v]) => [b[0] + u * sc, b[1] + v * sc]);

// ---------------------------------------------------------------- the fifteen formations
const BUILD = [];

// 0 · Gate: darkness, stars arriving one by one, the whole sky turning slowly about one steady star
BUILD[0] = (ctx, r) => {
  const o = [], vb = ctx.vb, nm = 16, cx = (vb.x0 + vb.x1) / 2, cy = (vb.y0 + vb.y1) / 2 - .05;
  const R0 = Math.hypot(vb.x1 - vb.x0, vb.y1 - vb.y0) / 2 + .05;
  for (let i = 0, n = ctx.N - 1 - nm; i < n; i++) {
    const a = r() * TAU, d = R0 * Math.sqrt(r()), k = Math.pow(r(), 5), q = r();
    P(o, cx + Math.cos(a) * d, cy + Math.sin(a) * d, (r() * 2 - 1) * .45, q < .14 ? C.WARM : q < .3 ? C.SIL : C.W, .45 + k * 2, (.14 + r() * .6) * .75, R.STAR, .25 + r() * 1.1, r() * TAU);
  }
  for (let j = 0; j < nm; j++) P(o, vb.x0 + r() * (vb.x1 - vb.x0), vb.y0 + r() * .4, 0, C.W, 1, 0, R.METEOR, j / (nm - 1));
  const F = finalize(o, ctx, r, { ns: [cx, cy, 0], env: env(0, { gas: .16, glow: .08, dust: .45, nsS: .65, nsI: .6 }) });
  F.live = (t, out) => {
    const a = t * .012, c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < F.n; i++) {
      if (F.ro[i] === R.METEOR) { meteor(F, out, i, t, vb); continue; }
      common(F, out, i, t);
      const dx = out.X[i] - cx, dy = out.Y[i] - cy; out.X[i] = cx + dx * c - dy * s; out.Y[i] = cy + dx * s + dy * c;
    }
  };
  return F;
};

// 1 · Home: one steady star. A ring of light draws itself round it, the seven sages turn slowly about it as they
// have every night, and now and then light breathes out of it. Everything else waits, unseen, sharp, still.
BUILD[1] = (ctx, r) => {
  const o = [], vb = ctx.vb, q = ctx.q, cx = .8, cy = .5, RR = .34, sc = .5, ROT0 = -2.25;
  const M = SAPT_P.pts[1], ox = -M[0] * 1.67, oy = -M[1] * 1.67;
  const REL = SAPT_P.pts.map(([u, v]) => [(u - ox) * sc, (v - oy) * sc]);
  const at = (k, t) => { const a = ROT0 - t * .03, [u, v] = REL[k], c = Math.cos(a), s = Math.sin(a); return [cx + u * c - v * s, cy + u * s + v * c]; };
  REL.forEach((_, k) => {
    const br = k === 0 || k === 1 || k === 6;
    for (let j = 0, m = q(br ? 22 : 16); j < m; j++) P(o, cx, cy, 0, br ? C.CREAM : C.W, br ? 1.2 : 1, .95, R.SAGE, k, gauss(r) * .0017, gauss(r) * .0017, .5 + r() * 1.1, r() * TAU);
  });
  for (let i = 0, n = q(150); i < n; i++) { const k = Math.pow(r(), 4); P(o, vb.x0 + r() * (vb.x1 - vb.x0), vb.y0 + r() * (vb.y1 - vb.y0), 0, r() < .2 ? C.WARM : C.W, .45 + k * 1.3, (.12 + r() * .4) * .7, R.STAR, .3 + r(), r() * TAU); }
  for (let j = 0, m = q(12); j < m; j++) P(o, cx, cy - RR, 0, C.PALE, j ? .8 : 1.35, j ? .55 : 1, R.TIP, j / m);
  while (o.length < ctx.N - 1) P(o, vb.x0 + r() * (vb.x1 - vb.x0), vb.y0 + r() * (vb.y1 - vb.y0), 0, C.W, .6, 0, R.HIDE);
  const ring = age => smoother(clamp((age - 2.4) / 4.2)), drawn = age => clamp((age - 4.8) / 3.4);
  const F = finalize(o, ctx, r, { ns: [cx, cy, 0], env: env(1, { gas: .14, glow: .24, dust: .3, nsS: 1.45, nsI: 1.1, ray: .12, bot: [.002, .003, .004] }) });
  F.live = (t, out, age = 99) => {
    const g = ring(age), ta = -Math.PI / 2 + TAU * g;
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.SAGE) { const p = at(F.p1[i], t), w = .5 + .5 * Math.sin(t * F.p4[i] + F.p5[i]); out.X[i] = p[0] + F.p2[i]; out.Y[i] = p[1] + F.p3[i]; out.A[i] = F.a[i] * (.78 + .22 * w); }
      else if (ro === R.TIP) { const a = ta - F.p1[i] * .1; out.X[i] = cx + Math.cos(a) * RR; out.Y[i] = cy + Math.sin(a) * RR; out.A[i] = F.a[i] * Math.sin(Math.PI * g) * (1 - F.p1[i]); }
      else if (ro === R.HIDE) out.A[i] = 0;
    }
  };
  F.overlay = (t, age = 99) => {
    const g = ring(age), rings = [{ x: cx, y: cy, r: RR, a0: -Math.PI / 2, len: TAU * g, c: C.G, a: .36, w: .9 }];
    for (let j = 0; j < 2; j++) { const u = fract(t * .045 + j * .5); rings.push({ x: cx, y: cy, r: .035 + (RR - .035) * u, a0: 0, len: TAU, c: C.PALE, a: .15 * Math.pow(Math.sin(Math.PI * u), 2) * g, w: .7 }); }
    const lines = [], E = SAPT_P.edges, p = drawn(age) * (E.length + 1);
    E.forEach(([a, b], e) => { const f = clamp(p - e); if (f <= 0) return; const A = at(a, t), B = at(b, t); lines.push([A[0], A[1], 0, A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, 0, .3]); });
    const f2 = clamp(p - E.length);
    if (f2 > 0) { const D = at(0, t), Mk = at(1, t), k0 = .3, k1 = .3 + 1.05 * f2; dashed(lines, [[D[0] + (D[0] - Mk[0]) * k0, D[1] + (D[1] - Mk[1]) * k0], [D[0] + (D[0] - Mk[0]) * k1, D[1] + (D[1] - Mk[1]) * k1]], .2); }
    return { rings, lines };
  };
  return F;
};

// 2 · I Fifteen: the sky she was given; the pointers of the Saptarishi lead to Dhruva
BUILD[2] = (ctx, r) => {
  const o = [], lines = [], q = ctx.q;
  const SAPT = [[.86, .3], [.9, .42], [1.04, .44], [1.02, .33], [1.13, .3], [1.22, .285], [1.31, .335]], D = SAPT[0], M = SAPT[1];
  const NS = [D[0] + (D[0] - M[0]) * 1.67, D[1] + (D[1] - M[1]) * 1.67, 0];
  stars(o, lines, ctx, r, SAPT, SAPT_P.edges, 16, [0]);
  stars(o, lines, ctx, r, place([.36, .24], 1.1, KRIT), [], 12, []);
  stars(o, lines, ctx, r, place([.25, .5], 1, ROHI), ROHI.edges, 16, [4], [4]);
  stars(o, lines, ctx, r, place([.55, .56], .82, MRIG), MRIG.edges, 15, [0, 6], [0]);
  stars(o, lines, ctx, r, [[1.3, .66]], [], 22, [0], [0]);
  dashed(lines, [[D[0] + (D[0] - M[0]) * .25, D[1] + (D[1] - M[1]) * .25], [D[0] + (D[0] - M[0]) * 1.38, D[1] + (D[1] - M[1]) * 1.38]], .26);
  const arc = []; for (let i = 0; i <= 30; i++) { const u = i / 30, v = 1 - u, A0 = [1.335, .365], c = [1.39, .47], B0 = [1.305, .63]; arc.push([v * v * A0[0] + 2 * v * u * c[0] + u * u * B0[0], v * v * A0[1] + 2 * v * u * c[1] + u * u * B0[1]]); }
  dashed(lines, arc, .18);
  sky(o, q(1250), r, ctx.vb, { dim: .85, band: .3 });
  return finalize(o, ctx, r, { ns: NS, env: env(2, { gas: .45, glow: .24, bot: [.003, .005, .007] }), overlay: () => ({ lines }) });
};

// 3 · II The laboratory: a living cell under the microscope
BUILD[3] = (ctx, r) => {
  const o = [], cell = { cx: .8, cy: .5, R: .37, w: .05 };
  cellGen(o, ctx, r, cell, 1);
  const F = finalize(o, ctx, r, { env: env(3, { g1: [.02, .13, .085], g2: [.05, .055, .06], gas: .5, glow: .14, nsS: .7, nsI: .85, bot: [.002, .007, .005] }) });
  F.live = (t, out) => { for (let i = 0; i < F.n; i++) { const ro = F.ro[i]; if (isCell(ro)) cellLive(F, cell, out, i, t, ro); else common(F, out, i, t); } };
  F.ns = t => cellAt(cell, cell.nl, t); F.nsAt = F.ns;
  const ring = []; for (let j = 0; j < 96; j++) { const a = j / 96 * TAU, b = (j + .6) / 96 * TAU; ring.push([.8 + Math.cos(a) * .47, .5 + Math.sin(a) * .47, 0, .8 + Math.cos(b) * .47, .5 + Math.sin(b) * .47, 0, .14]); }
  for (let j = 0; j < 4; j++) { const a = j * TAU / 4; ring.push([.8 + Math.cos(a) * .47, .5 + Math.sin(a) * .47, 0, .8 + Math.cos(a) * .44, .5 + Math.sin(a) * .44, 0, .28]); }
  ring.push([1.1, .95, 0, 1.22, .95, 0, .6]);
  const labels = [{ x: 1.16, y: .99, z: 0, t: '10 µm', it: true, fs: 1.1 }];
  if (!ctx.narrow) labels.push(
    { x: 1.44, y: .2, z: 0, t: 'NUCLEUS', fs: .8 }, { x: 1.44, y: .25, z: 0, t: 'RETICULUM', fs: .8, col: C.EM },
    { x: 1.44, y: .3, z: 0, t: 'MITOCHONDRIA', fs: .8, gold: true }, { x: 1.44, y: .35, z: 0, t: 'GOLGI', fs: .8, gold: true });
  F.overlay = () => ({ lines: ring, labels });
  return F;
};

// 4 · III Becoming: a stem cell and the lives it could become
BUILD[4] = (ctx, r) => {
  const o = [], q = ctx.q, cell = { cx: .3, cy: .52, R: .085, w: .13, breath: t => .025 * Math.sin(t * 1.1) };
  cellGen(o, ctx, r, cell, .4, false);
  const fates = [[.88, .25], [1.08, .52], [.88, .8]];
  fates.forEach(([fx, fy], k) => {
    const p0 = [.39, .52], c = [.62, fy], pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, v = 1 - u; pts.push([v * v * p0[0] + 2 * v * u * c[0] + u * u * fx, v * v * p0[1] + 2 * v * u * c[1] + u * u * fy]); }
    poly(o, pts, q(70), C.GD, .75, .5, R.PATH, r, 0, (x, y, z, u) => P(o, x, y, 0, C.GD, .75, .5, R.PATH, u, k));
  });
  const nx = .98, ny = .24;
  for (let i = 0, m = q(40); i < m; i++) { const [ux, uy, uz] = fib(i, m); P(o, nx + ux * .03, ny + uy * .028, uz * .03, C.EM, .95, .85, R.SOMA, i); }
  blob(o, q(14), nx, ny, 0, .006, C.W, .9, .8, R.SOMA, r);
  const branch = (x, y, ang, len, depth, ph, d0) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    poly(o, [[x, y], [x2, y2]], Math.max(2, Math.round(q(260) * len)), C.EM, .75, .75, R.DEND, r, .001, (px, py, pz, u) => P(o, px, py, (r() - .5) * .02, C.EM, .75, .72, R.DEND, d0 + u * len / .2, ph));
    if (depth > 0) { branch(x2, y2, ang - .45 - r() * .2, len * .68, depth - 1, ph, d0 + len / .2); branch(x2, y2, ang + .4 + r() * .2, len * .68, depth - 1, ph, d0 + len / .2); }
  };
  [Math.PI * .95, Math.PI * 1.25, Math.PI * .72, Math.PI * 1.55].forEach((a, k) => branch(nx + Math.cos(a) * .03, ny + Math.sin(a) * .03, a, .05, 3, k * 1.7, 0));
  const ax = []; for (let i = 0; i <= 24; i++) { const u = i / 24; ax.push([nx + .03 + u * .4, ny + .02 + Math.sin(u * 9) * .008 + u * .05]); }
  poly(o, ax, q(80), C.EM, .8, .8, R.AXON, r, .0008);
  [-.5, 0, .5].forEach(a => poly(o, [[nx + .43, ny + .07], [nx + .43 + Math.cos(a) * .035, ny + .07 + Math.sin(a) * .035]], q(6), C.EM, .7, .7, R.AXON, r, .0006, (x, y) => P(o, x, y, 0, C.EM, .7, .7, R.AXON, 1)));
  const RB = [[1.17, .5], [1.29, .46], [1.24, .6]];
  RB.forEach((c, k) => {
    for (let j = 0, m = q(34); j < m; j++) { const a = j / m * TAU; P(o, c[0] + Math.cos(a) * .036, c[1] + Math.sin(a) * .036, 0, C.E, 1, .85, R.RBC, k, Math.cos(a) * .036, Math.sin(a) * .036); }
    for (let j = 0, m = q(14); j < m; j++) { const a = j / m * TAU; P(o, c[0] + Math.cos(a) * .016, c[1] + Math.sin(a) * .016, 0, C.E, .8, .4, R.RBC, k, Math.cos(a) * .016, Math.sin(a) * .016); }
  });
  // the heart: four cardiac muscle cells joined end to end and branching, striped, each with its nucleus,
  // contracting together while a wave of calcium light runs along them
  const HX = .985, HY = .8, HC = [[.875, .81, .06, .055, .022], [.985, .8, -.04, .055, .024], [1.085, .765, -.38, .048, .02], [1.088, .835, .34, .046, .02]];
  const cellPt = ([x, y, a, l], u, v) => [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)];
  const hd = x => (x - .82) / .32;
  HC.forEach(cc => {
    const [, , , l, w] = cc, m = q(40), per = 4 * (l - w) + 2 * Math.PI * w;
    for (let j = 0; j < m; j++) {
      let d = (j + r() * .5) / m * per, u, v;
      const sl = 2 * (l - w), arc = Math.PI * w;
      if (d < sl) { u = -(l - w) + d; v = -w; } else if ((d -= sl) < arc) { const t2 = -Math.PI / 2 + d / w; u = (l - w) + Math.cos(t2) * w; v = Math.sin(t2) * w; }
      else if ((d -= arc) < sl) { u = (l - w) - d; v = w; } else { d -= sl; const t2 = Math.PI / 2 + d / w; u = -(l - w) + Math.cos(t2) * w; v = Math.sin(t2) * w; }
      const [x, y] = cellPt(cc, u, v); P(o, x, y, 0, C.G, .75, .8, R.HEART, 0, hd(x));
    }
    for (let k = 0; k < 8; k++) { const u = -(l - w * .55) + k * 2 * (l - w * .55) / 7; for (let j = 0, m2 = q(5); j < m2; j++) { const [x, y] = cellPt(cc, u + gauss(r) * .0008, (-.8 + 1.6 * j / Math.max(1, m2 - 1)) * w); P(o, x, y, 0, C.PALE, .5, .32, R.HEART, 1, hd(x)); } }
    for (let j = 0, m3 = q(12); j < m3; j++) { const a2 = j / m3 * TAU, [x, y] = cellPt(cc, Math.cos(a2) * .012, Math.sin(a2) * .0065); P(o, x, y, 0, C.W, .55, .7, R.HEART, 2, hd(x)); }
  });
  [[.93, .81, .01, .022], [1.04, .783, -.38, .02], [1.045, .82, .34, .02]].forEach(([x, y, a, w]) => { for (let j = 0, m = q(9); j < m; j++) { const v = (-.9 + 1.8 * j / (m - 1)) * w, st2 = (j % 2 ? .0025 : -.0025); P(o, x + st2 * Math.cos(a) - v * Math.sin(a), y + st2 * Math.sin(a) + v * Math.cos(a), 0, C.CREAM, .6, .85, R.HEART, 3, hd(x)); } });
  sky(o, ctx.q(500), r, ctx.vb, { dim: .5 });
  const F = finalize(o, ctx, r, { env: env(4, { g1: [.02, .12, .08], g2: [.05, .055, .06], gas: .45, glow: .14, nsS: .7, nsI: .85, bot: [.002, .006, .005] }) });
  F.live = (t, out) => {
    const pulse = d => Math.exp(-(d * d) / .003);
    const beat = Math.exp(-Math.pow(((t % 1.25) - .12) / .07, 2));
    for (let i = 0; i < F.n; i++) {
      const ro = F.ro[i];
      if (isCell(ro)) { cellLive(F, cell, out, i, t, ro); continue; }
      common(F, out, i, t);
      switch (ro) {
        case R.PATH: { const d = fract(t * .18 - F.p1[i] + F.p2[i] * .33), b = pulse(d) + pulse(1 - d); out.A[i] = F.a[i] * (.35 + 1.4 * b); out.S[i] = F.s[i] * (1 + b * .7); break; }
        case R.SOMA: out.A[i] *= .8 + .2 * Math.sin(t * 1.1); break;
        case R.DEND: { const d = F.p1[i], a = .05 * Math.sin(t * .5 + F.p2[i]) * Math.min(1, d), c = Math.cos(a), s = Math.sin(a), dx = F.x[i] - nx, dy = F.y[i] - ny; out.X[i] = nx + dx * c - dy * s; out.Y[i] = ny + dx * s + dy * c; break; }
        case R.AXON: { const d = fract(t * .4) * 1.25 - F.p1[i], b = Math.exp(-(d * d) / .002); out.A[i] = F.a[i] * (.55 + 1.3 * b); out.S[i] = F.s[i] * (1 + b); if (b > .05) { out.R[i] = 1; out.G[i] = .95; out.B[i] = .82; } break; }
        case R.RBC: { const k = F.p1[i], c = RB[k], a = t * .45 + k * 2.1, cy = Math.cos(a), sy = Math.sin(a); out.X[i] = c[0] + .012 * Math.sin(t * .3 + k) + F.p2[i]; out.Y[i] = c[1] + .01 * Math.cos(t * .25 + k * 2) + F.p3[i] * cy; out.Z[i] = F.p3[i] * sy; break; }
        case R.HEART: {
          const k = F.p1[i], ph = t % 1.25, fl = ph < .45 ? Math.exp(-((F.p2[i] - (ph - .02) / .3) ** 2) / .015) : 0;
          out.X[i] = HX + (F.x[i] - HX) * (1 - .07 * beat); out.Y[i] = HY + (F.y[i] - HY) * (1 + .025 * beat);
          out.A[i] = F.a[i] * (k === 1 ? .5 + .5 * beat + 1.6 * fl : k === 2 ? 1 : .8 + .2 * beat + .7 * fl);
          if (fl > .05 && k !== 2) { out.R[i] += (C.EO[0] - out.R[i]) * fl * .6; out.G[i] += (C.EO[1] - out.G[i]) * fl * .6; out.B[i] += (C.EO[2] - out.B[i]) * fl * .6; }
          break;
        }
      }
    }
  };
  F.ns = t => cellAt(cell, [cell.n[0], cell.n[1], cell.n[2]], t); F.nsAt = F.ns;
  const labels = [{ x: .3, y: .67, z: 0, t: 'STEM CELL' }, { x: 1.14, y: .12, z: 0, t: 'NEURON' }, { x: 1.24, y: .69, z: 0, t: 'BLOOD' }, { x: .98, y: .92, z: 0, t: 'HEART' }];
  F.overlay = () => ({ lines: [], labels });
  return F;
};

// 5 · IV As within, so above: half a cell, half the sky, one breath (stacked on a phone, side by side on a wide screen)
BUILD[5] = (ctx, r) => {
  const o = [], lines = [], breath = t => .018 * Math.sin(t * .8), nar = ctx.narrow;
  const cell = nar ? { cx: .8, cy: .77, R: .22, w: .05, breath } : { cx: .42, cy: .5, R: .26, w: .05, breath };
  cellGen(o, ctx, r, cell, .5);
  if (nar) {
    sky(o, ctx.q(380), r, ctx.vb, { y1: .44, flag: 1 });
    stars(o, lines, ctx, r, place([.52, .1], .95, SAPT_P), SAPT_P.edges, 14, [0]);
    poly(o, [[.36, .5], [1.24, .5]], ctx.q(70), C.W, .6, .3, R.DIV, r, 0);
    sky(o, ctx.q(200), r, ctx.vb, { y0: .56, dim: .45 });
  } else {
    sky(o, ctx.q(420), r, ctx.vb, { x0: .86, flag: 1 });
    stars(o, lines, ctx, r, place([.95, .26], .9, SAPT_P), SAPT_P.edges, 14, [0]);
    poly(o, [[.8, .08], [.8, .9]], ctx.q(70), C.W, .6, .3, R.DIV, r, 0);
    sky(o, ctx.q(260), r, ctx.vb, { x1: .78, dim: .5 });
  }
  const F = finalize(o, ctx, r, { ns: [.8, .5, 0], env: env(5, { g1: [.02, .1, .07], g2: [.05, .055, .065], gas: .45, glow: .2, nsS: .95 }) });
  F.live = (t, out) => {
    const b = .5 + .5 * Math.sin(t * .8);
    for (let i = 0; i < F.n; i++) {
      const ro = F.ro[i];
      if (isCell(ro)) { cellLive(F, cell, out, i, t, ro); continue; }
      common(F, out, i, t);
      if ((ro === R.STAR && F.p3[i] === 1) || (ro === R.CSTAR)) { out.A[i] *= .62 + .38 * b; out.S[i] *= .94 + .1 * b; }
      else if (ro === R.DIV) out.A[i] = F.a[i] * (.5 + .5 * Math.sin(t * .8 + F.p1[i] * 6));
    }
  };
  const labels = nar ? [{ x: .8, y: .43, t: 'THE SKY' }, { x: .8, y: 1.04, t: 'THE BODY' }] : [{ x: .42, y: .86, t: 'THE BODY' }, { x: 1.2, y: .86, t: 'THE SKY' }];
  F.overlay = () => ({ lines, labels });
  return F;
};

// 9 · VIII Prarabdha: an hourglass of starlight. The sand already falling cannot be called back up
BUILD[9] = (ctx, r) => {
  const o = [], q = ctx.q, cx = .8, cy = .5, TOP = .1, BOT = .9, RB = .19, NECK = .011, TILT = .2, SPIN = .1;
  const rad = y => { const h = Math.min(1, Math.abs(y) / (cy - TOP - .03)); return NECK + (RB - NECK) * Math.pow(Math.sin(h * Math.PI / 2), 1.5) * (1 - .22 * smooth(clamp((h - .8) / .2))); };
  const ct = Math.cos(TILT), st = Math.sin(TILT), tmp = [0, 0, 0];
  // object space (X, Y, Z) about the centre, spun about the vertical and seen a little from above
  const view = (X, Y, Z, sp) => { const c = Math.cos(sp), s = Math.sin(sp), x = X * c + Z * s, z = -X * s + Z * c; tmp[0] = cx + x; tmp[1] = cy + Y * ct - z * st; tmp[2] = Y * st + z * ct; return tmp; };
  const add = (ro, X, Y, Z, c, s, a, p4 = 0) => { view(X, Y, Z, 0); P(o, tmp[0], tmp[1], tmp[2], c, s, a, ro, X, Y, Z, p4); };
  // the glass, brightest where it turns away from you
  for (let i = 0, n = q(940); i < n;) { const Y = TOP - cy + .03 + r() * (BOT - TOP - .06), rr = rad(Y); if (r() > rr / RB + .05) continue; const a = r() * TAU; add(R.GLASS, Math.cos(a) * rr, Y, Math.sin(a) * rr, C.W, .7, .85, a); i++; }
  // the frame: two discs and three posts
  for (const Y of [TOP - cy, BOT - cy]) for (const rr of [.215, .2]) for (let j = 0, n = q(80); j < n; j++) { const a = j / n * TAU; add(R.FRAME, Math.cos(a) * rr, Y, Math.sin(a) * rr, C.G, .8, .85); }
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5; for (let j = 0, n = q(46); j < n; j++) add(R.FRAME, Math.cos(a) * .208, TOP - cy + (BOT - TOP) * j / (n - 1), Math.sin(a) * .208, C.G, .7, .7); }
  // the sand. The top drains from its surface, opening a crater; a thin thread falls through the neck; the pile below
  // grows as a cone at sand's own angle. Each grain knows its turn: it slides into the neck, falls, and lands on the cone.
  const G = q(1000), F0 = .52, GT = Math.round(G * F0), RUN = 21, DELAY = 3.2, SLIDE = .55, DROP = .45, floor = BOT - cy - .035, SL = .55;
  const sample = (n, top) => {
    const out = [];
    while (out.length < n) {
      const Y = top ? -(.014 + r() * (cy - TOP - .06)) : .014 + r() * (BOT - cy - .06), rm = rad(Y) * .9;
      if (r() > (rm * rm) / (RB * RB)) continue;
      const rr = rm * Math.sqrt(r()), a = r() * TAU;
      out.push([Math.cos(a) * rr, Y, Math.sin(a) * rr, top ? -Y - SL * rr : (floor - Y) + SL * rr]);
    }
    return out.sort((u, v) => u[3] - v[3]);
  };
  const pile = sample(G * 3, false).slice(0, G), heap = sample(GT * 3, true).slice(0, GT).reverse();
  const base0 = G - GT;
  for (let g = 0; g < G; g++) {
    const p = g < base0 ? pile[g] : heap[g - base0];
    view(p[0], p[1], p[2], 0); P(o, tmp[0], tmp[1], tmp[2], r() < .3 ? C.PALE : r() < .5 ? C.G : C.GD, .58 + r() * .2, .78 + r() * .22, R.SAND, g);
  }
  // the thread itself
  for (let i = 0, n = q(90); i < n; i++) P(o, cx, cy, 0, C.PALE, .55, .95, R.STREAM, i / n, r(), r());
  sky(o, q(300), r, ctx.vb, { dim: .45 });
  const F = finalize(o, ctx, r, { ns: [1.15, .14, 0], env: env(9, { gas: .32, glow: .26, nsS: .9, nsI: .8, g1: [.07, .06, .045], g2: [.03, .07, .05], top: [.002, .003, .007], bot: [.006, .007, .01] }) });
  F.live = (t, out, age = 99) => {
    const sp = t * SPIN;
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.GLASS || ro === R.FRAME) {
        view(F.p1[i], F.p2[i], F.p3[i], sp); out.X[i] = tmp[0]; out.Y[i] = tmp[1]; out.Z[i] = tmp[2];
        out.A[i] = ro === R.GLASS ? F.a[i] * (.14 + .86 * Math.pow(1 - Math.abs(Math.sin(F.p4[i] + sp)), 2)) : F.a[i] * (.55 + .45 * (tmp[2] / .22 * .5 + .5));
      } else if (ro === R.SAND) {
        const g = F.p1[i], P1 = pile[g];
        let X = P1[0], Y = P1[1], Z = P1[2];
        if (g >= base0) {
          const j = g - base0, tf = DELAY + j / GT * RUN, H1 = heap[j];
          if (age < tf) { X = H1[0]; Y = H1[1]; Z = H1[2]; }
          else if (age < tf + SLIDE) { const u = smooth((age - tf) / SLIDE); X = H1[0] * (1 - u); Y = H1[1] + (-.014 - H1[1]) * u * u; Z = H1[2] * (1 - u); }
          else if (age < tf + SLIDE + DROP) { X = 0; Y = 0; Z = 0; out.A[i] = 0; }
          else out.A[i] = F.a[i] * clamp((age - tf - SLIDE - DROP) / .25);
        }
        view(X, Y, Z, sp); out.X[i] = tmp[0]; out.Y[i] = tmp[1]; out.Z[i] = tmp[2];
      } else if (ro === R.STREAM) {
        const done = (age - DELAY) / RUN, flow = smooth(clamp((age - DELAY) / .5)) * (1 - smooth(clamp((done - 1) / .04)));
        const landed = Math.min(G - 1, Math.floor(base0 + clamp(done) * GT)), apex = floor - pile[landed][3];
        const u = fract(F.p1[i] + t * 1.5), Y = .006 + (apex - .006) * u * u, sp2 = u > .9 ? (u - .9) / .1 : 0;
        view((F.p2[i] - .5) * (.003 + .02 * sp2), Y - sp2 * .006 * Math.sin(Math.PI * sp2), (F.p3[i] - .5) * (.003 + .02 * sp2), sp);
        out.X[i] = tmp[0]; out.Y[i] = tmp[1]; out.Z[i] = tmp[2]; out.A[i] = F.a[i] * flow * (u < .03 ? u / .03 : 1) * (1 - .5 * sp2);
      }
    }
  };
  return F;
};

// 7 · VI 2 AM: the Yoga Vasishtha open under one light, a page turning, a thin moon
BUILD[7] = (ctx, r) => {
  const o = [], q = ctx.q, cx = .8, by = .8, W = .46, D = .32;
  const lift = a => .06 * Math.sin(Math.PI * Math.pow(clamp(a), .55) * .62);
  const at = (u, v, h) => [cx + u * W, by - v * D - h, -(v - .5) * .2 + h * .3];
  const put = (u, v, c, s, a, ro, p3 = 0) => { const [x, y, z] = at(u, v, lift(Math.abs(u))); P(o, x, y, z, c, s, a, ro, u, v, p3); };
  // the paper, rising from the spine
  for (let i = 0, n = q(400); i < n; i++) put((r() * 2 - 1) * .985, r(), C.CREAM, .6, .13 + r() * .1, R.PAGE, r() * TAU);
  // page edges, and the stack of pages beneath
  for (const side of [-1, 1]) {
    for (let i = 0, n = q(60); i < n; i++) { const a = i / n; put(side * a, 0, C.W, .65, .56, R.PAGE, r() * TAU); put(side * a, 1, C.W, .6, .4, R.PAGE, r() * TAU); }
    for (let i = 0, n = q(34); i < n; i++) put(side, i / n, C.W, .6, .5, R.PAGE, r() * TAU);
    for (let j = 1; j <= 3; j++) for (let i = 0, n = q(34); i < n; i++) { const a = .08 + .92 * i / n, [x, y, z] = at(side * a, 0, lift(a)); P(o, x, y + j * .0075, z, C.W, .5, .2 / j, R.STATIC, 0, r() * TAU); }
  }
  // lines of text: light, not letters
  const lines = (side, add) => {
    for (let k = 0; k < 11; k++) {
      const v = .1 + k * .073, end = k === 10 || k === 5 ? .3 + r() * .4 : .9; let a = .1;
      while (a < end) { const a1 = Math.min(end, a + .03 + r() * .11), m = Math.max(2, Math.round((a1 - a) * q(120))); for (let j = 0; j < m; j++) add(side * (a + (a1 - a) * (j + r()) / m), v + (r() - .5) * .008); a = a1 + .022 + r() * .02; }
    }
  };
  for (const side of [-1, 1]) lines(side, (u, v) => put(u, v, C.G, .62, .62 + r() * .25, R.LINE, r() * TAU));
  // the page that turns, kept as (distance from the spine, depth into the page)
  const turnAt = (a, v) => at(a, v, lift(a));
  for (let i = 0, n = q(170); i < n; i++) { const a = r() * .985, v = r(), [x, y, z] = turnAt(a, v); P(o, x, y, z, C.CREAM, .6, .15 + r() * .1, R.TURN, a, v, 0); }
  for (let i = 0, n = q(40); i < n; i++) { const v = i / n, [x, y, z] = turnAt(1, v); P(o, x, y, z, C.W, .65, .6, R.TURN, 1, v, 0); }
  lines(1, (u, v) => { const [x, y, z] = turnAt(u, v); P(o, x, y, z, C.G, .62, .58 + r() * .25, R.TURN, u, v, 1); });
  poly(o, [[cx, by, -.1], [cx, by - D, .1]], q(40), C.W, .5, .28, R.STATIC, r, .0008);
  // a thin crescent at two in the morning
  const mc = [1.22, .14], mr = .042;
  for (let i = 0, n = q(140); i < n;) { const a = r() * TAU, d = Math.sqrt(r()) * mr, x = Math.cos(a) * d, y = Math.sin(a) * d; if (Math.hypot(x + mr * .42, y + mr * .18) < mr * .92) continue; P(o, mc[0] + x, mc[1] + y, 0, C.W, .6, .45 + r() * .3, R.MOON, r() * TAU); i++; }
  // motes of light lifting off the page
  for (let i = 0, n = q(46); i < n; i++) { const u = (r() * 2 - 1) * .9, v = r(), [x, y, z] = at(u, v, lift(Math.abs(u))); P(o, x, y, z, C.PALE, .8, .7, R.MOTE, r(), x, y); }
  sky(o, q(360), r, ctx.vb, { y1: .5, dim: .55 });
  const F = finalize(o, ctx, r, { ns: [cx, .2, 0], env: env(7, { g1: [.05, .05, .06], g2: [.025, .085, .06], gas: .42, glow: .3, nsS: 1, nsI: .85, top: [.002, .003, .008], bot: [.006, .008, .014] }) });
  F.live = (t, out, age = 99) => {
    const T = (age - 3.4) % 13, th0 = T < 0 ? 0 : Math.PI * smoother(clamp(T / 5.5)), vis = Math.pow(Math.sin(th0), .4);
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.TURN) {
        const a = F.p1[i], v = F.p2[i], th = clamp(th0 - .6 * Math.sin(th0) * Math.pow(a, 1.5), 0, Math.PI);
        const [x, y, z] = at(a * Math.cos(th), v, a * Math.sin(th) * W + lift(a) * Math.abs(Math.cos(th)));
        out.X[i] = x; out.Y[i] = y; out.Z[i] = z; out.A[i] = F.a[i] * vis * (F.p3[i] && Math.cos(th) < 0 ? .4 : 1);
      } else if (ro === R.LINE || ro === R.PAGE) {
        const lx = out.X[i] - cx, ly = out.Y[i] - (by - D * .55), pool = 1 + .7 * Math.exp(-(lx * lx * 3 + ly * ly * 9) / .06);
        out.A[i] *= pool * (ro === R.LINE ? .8 + .2 * Math.sin(t * .8 + F.p3[i]) : .9 + .1 * Math.sin(t * .5 + F.p3[i]));
      } else if (ro === R.MOTE) { const h = fract(F.p1[i] + t * .04); out.X[i] = F.p2[i] + .012 * Math.sin(t * .6 + F.p1[i] * 20) * h; out.Y[i] = F.p3[i] - h * .2; out.A[i] = F.a[i] * Math.pow(Math.sin(Math.PI * h), 1.5); }
      else if (ro === R.MOON) out.A[i] *= .9 + .1 * Math.sin(t * .4 + F.p1[i]);
    }
  };
  return F;
};

// 12 · XI No planet to fear: the North Indian chart, drawn in stars
BUILD[12] = (ctx, r) => {
  const o = [], q = ctx.q, s = .74, x0 = .8 - s / 2, y0 = .5 - s / 2, X = u => x0 + u * s, Y = v => y0 + v * s;
  const SEG = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0], [0, 0, 1, 1], [1, 0, 0, 1], [.5, 0, 1, .5], [1, .5, .5, 1], [.5, 1, 0, .5], [0, .5, .5, 0]].map(([a, b, c, d]) => [X(a), Y(b), X(c), Y(d)]);
  const len = SEG.map(z => Math.hypot(z[2] - z[0], z[3] - z[1])), tot = len.reduce((a, b) => a + b, 0), nl = q(1150);
  SEG.forEach((z, k) => { const m = Math.round(nl * len[k] / tot); for (let j = 0; j < m; j++) { const u = (j + r()) / m; P(o, z[0] + (z[2] - z[0]) * u + gauss(r) * .001, z[1] + (z[3] - z[1]) * u + gauss(r) * .001, 0, C.GD, .85, .8, R.CLINE, k, u); } });
  const H = { 1: [[.5, 0], [.75, .25], [.5, .5], [.25, .25]], 3: [[0, 0], [.25, .25], [0, .5]], 4: [[0, .5], [.25, .25], [.5, .5], [.25, .75]], 6: [[0, 1], [.25, .75], [.5, 1]], 7: [[.5, 1], [.25, .75], [.5, .5], [.75, .75]], 9: [[1, 1], [.75, .75], [1, .5]], 10: [[1, .5], [.75, .75], [.5, .5], [.75, .25]], 11: [[1, .5], [.75, .25], [1, 0]], 12: [[1, 0], [.75, .25], [.5, 0]] };
  const cen = h => { const p = H[h]; return [X(p.reduce((a, z) => a + z[0], 0) / p.length), Y(p.reduce((a, z) => a + z[1], 0) / p.length) - .012]; };
  const PL = [['Mo', 1, C.W], ['Su', 10, C.G], ['Ma', 7, C.E], ['Me', 11, C.EM], ['Ju', 4, C.G], ['Ve', 12, C.CREAM], ['Sa', 6, C.SIL], ['Ra', 3, C.GD], ['Ke', 9, C.GD]].map(([nm, h, c], k) => ({ nm, c, k, at: cen(h) }));
  PL.forEach(p => { for (let j = 0, m = q(20); j < m; j++) P(o, p.at[0], p.at[1], 0, p.c, 1.2, .95, R.PLANET, p.k, gauss(r) * .005, gauss(r) * .005, p.at[0], p.at[1]); });
  sky(o, q(420), r, ctx.vb, { dim: .55 });
  const xf = (x, y, z, t) => {
    const ph = .36, ps = .14 * Math.sin(t * .1), dx = x - .8, dy = y - .5;
    const y1 = dy * Math.cos(ph) - z * Math.sin(ph), z1 = dy * Math.sin(ph) + z * Math.cos(ph);
    return [.8 + dx * Math.cos(ps) + z1 * Math.sin(ps), .5 + y1, -dx * Math.sin(ps) + z1 * Math.cos(ps)];
  };
  const F = finalize(o, ctx, r, { ns: t => xf(.8, .5, 0, t), env: env(12, { g1: [.12, .09, .04], g2: [.02, .09, .06], gas: .5, glow: .38, nsS: 1.1, nsI: 1.05, top: [.003, .004, .01], bot: [.01, .011, .016] }) });
  F.live = (t, out) => {
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.CLINE) {
        const d = fract(t * .14 + F.p1[i] * .37) - F.p2[i], b = Math.exp(-(d * d) / .0016);
        out.A[i] = F.a[i] * (.5 + 1.1 * b); out.S[i] = F.s[i] * (1 + b * .5);
        const p = xf(F.x[i], F.y[i], 0, t); out.X[i] = p[0]; out.Y[i] = p[1]; out.Z[i] = p[2];
      } else if (ro === R.PLANET) {
        const k = F.p1[i], a = t * (.3 + k * .04) + k, px = F.p4[i] + Math.cos(a) * .008 + F.p2[i], py = F.p5[i] + Math.sin(a) * .008 + F.p3[i];
        const p = xf(px, py, 0, t); out.X[i] = p[0]; out.Y[i] = p[1]; out.Z[i] = p[2];
      }
    }
  };
  F.overlay = t => {
    const lines = SEG.map(z => { const a = xf(z[0], z[1], 0, t), b = xf(z[2], z[3], 0, t); return [a[0], a[1], a[2], b[0], b[1], b[2], .2]; });
    const labels = PL.map(p => { const a = xf(p.at[0], p.at[1] + .04, 0, t); return { x: a[0], y: a[1], z: a[2], t: p.nm.toUpperCase(), fs: .72 }; });
    return { lines, labels };
  };
  return F;
};

// 13 · XII The lamp: everything gathers into one flame, and the North Star sits in its heart
BUILD[13] = (ctx, r) => {
  const o = [], q = ctx.q, cx = .8, rim = .68;
  for (let i = 0, n = q(360); i < n; i++) { const u = r() * 2 - 1, top = rim - .012 * (1 - u * u), bot = rim + .085 * Math.sqrt(1 - u * u), y = top + r() * (bot - top); P(o, cx + u * .19, y, (r() - .5) * .14 * Math.sqrt(1 - u * u), mixc(C.GD, [.45, .3, .14], r() * .6), .9, .42 + r() * .3, R.BOWL, r() * TAU); }
  for (let i = 0, n = q(110); i < n; i++) { const u = i / n * 2 - 1; P(o, cx + u * .19, rim - .012 * (1 - u * u), 0, C.G, 1.05, .95, R.RIM, u); }
  for (let i = 0, n = q(700); i < n; i++) P(o, cx, rim - .1, 0, C.EO, 1.4, .9, R.FLAME, r(), r() * 2 - 1, .8 + r() * .4);
  for (let i = 0, n = q(330); i < n; i++) { const a = r() * TAU, d = .07 + Math.pow(r(), 1.5) * .38; P(o, cx + Math.cos(a) * d * 1.25, rim - .11 + Math.sin(a) * d, (r() - .5) * .4, C.G, .75, .42 * (1 - d / .46), R.GLOW, r() * TAU); }
  for (let i = 0, n = q(50); i < n; i++) P(o, cx, rim - .3, 0, C.EO, 1, .7, R.EMB2, r(), gauss(r));
  for (let i = 0, n = q(160); i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()); P(o, cx + Math.cos(a) * d * .36, rim + .12 + Math.sin(a) * d * .035, 0, C.G, .7, .22 * (1 - d), R.POOL, r() * TAU); }
  sky(o, q(250), r, ctx.vb, { y1: .42, dim: .7 });
  const flick = t => 1 + .05 * Math.sin(t * 6.1) + .03 * Math.sin(t * 10.7 + 1.3) + .03 * Math.sin(t * 2.7);
  const F = finalize(o, ctx, r, { ns: t => [cx, rim - .085 * flick(t), .01], env: env(13, { g1: [.2, .1, .035], g2: [.02, .08, .055], gas: .55, glow: .42, nsS: 1.1, nsI: 1.1, top: [.004, .005, .01], bot: [.035, .02, .01] }) });
  F.live = (t, out) => {
    const k = flick(t);
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.FLAME) {
        const h = fract(F.p1[i] + t * .45 * F.p3[i]), u = F.p2[i], hw = .062 * Math.sin(Math.PI * Math.pow(h, .55)) * (1 - h * .25);
        const sway = (Math.sin(t * 1.8 + h * 2.5) * .014 + Math.sin(t * 4.9 + h * 4) * .005) * Math.pow(h, 1.6);
        out.X[i] = cx + u * hw * Math.sqrt(k) + sway; out.Y[i] = rim - .016 - h * .25 * k; out.Z[i] = u * hw * .5 * Math.sin(F.p1[i] * 40);
        const core = Math.abs(u) < .42 && h < .5, c = core ? mixc(C.CREAM, C.EO, h * 1.4) : h < .5 ? mixc(C.E, C.EO, h / .5) : mixc(C.EO, [1, .92, .72], (h - .5) / .5);
        out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2];
        out.A[i] = .82 * (h < .05 ? h / .05 : 1) * (1 - smooth(clamp((h - .82) / .18))); out.S[i] = 1.75 - h * .8;
      } else if (ro === R.GLOW) out.A[i] = F.a[i] * Math.pow(k, 3) * (.85 + .15 * Math.sin(t * .8 + F.p1[i]));
      else if (ro === R.BOWL || ro === R.RIM) out.A[i] *= .82 + .18 * k;
      else if (ro === R.POOL) out.A[i] = F.a[i] * Math.pow(k, 4) * (.8 + .2 * Math.sin(t + F.p1[i]));
      else if (ro === R.EMB2) {
        const hh = fract(F.p1[i] + t * .07), c = mixc(C.EO, C.G, hh);
        out.X[i] = cx + F.p2[i] * .02 * (1 + hh * 3) + Math.sin(t + F.p1[i] * 6) * .01 * hh; out.Y[i] = rim - .3 - hh * .3;
        out.A[i] = .7 * (1 - hh) * Math.min(1, hh * 8); out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2];
      }
    }
  };
  return F;
};

// 14 · Here, now: the North Star has become the light of Jyotish. A galaxy turns about it inside the astrolabe of the
// sky (27 nakshatras and their 108 padas, 12 rashis, 9 grahas), rising behind the hills at dawn; in front, a road of
// small lamps leads from where you stand towards it. The hills are painted by the sky's hill pass from PK and
// HILLS, and hide everything drawn behind them; road, lamps and glints are drawn in front (LAYER 1).
const PK = [[.08, .06, .14], [.28, .09, .14], [.46, .13, .14], [.62, .19, .13], [.99, .21, .14], [1.17, .13, .13], [1.37, .09, .14], [1.57, .07, .15]];
const HILLS = [{ y: .78, sh: 0 }, { y: .83, sh: .07 }, { y: .88, sh: -.05 }];
const ridgeY = (x, k) => {
  let h = 0;
  for (const [px, ph, pw] of PK) { const d = Math.abs(x - px - HILLS[k].sh) / pw; if (d < 1) h = Math.max(h, ph * (1 - k * .22) * Math.pow(1 - d, 1.3)); }
  h += (.012 * Math.sin(x * 23 + k * 2) + .007 * Math.sin(x * 57 + k * 5) + .004 * Math.sin(x * 131 + k * 3)) * (.5 + 2.5 * h);
  return HILLS[k].y - Math.max(0, h) * (1 - .85 * Math.exp(-(((x - .8) / .14) ** 2)));
};
BUILD[14] = (ctx, r) => {
  const o = [], q = ctx.q, vb = ctx.vb, LX = .8, LY = .36, TILT = .98, ROLL = .1, bold = ctx.narrow ? 1.3 : 1, gb = ctx.narrow ? 2.5 : 1.75;
  const ct = Math.cos(TILT), st = Math.sin(TILT), cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  const disk = (rr, ph, h = 0) => { const x = Math.cos(ph) * rr, y0 = Math.sin(ph) * rr, y = y0 * ct - h * st, z = y0 * st + h * ct; return [LX + x * cr - y * sr, LY + x * sr + y * cr, z]; };
  const put = (ro, rr, ph, h, c, s, a) => { const [x, y, z] = disk(rr, ph, h); P(o, x, y, z, c, s, a, ro, rr, ph, h); };
  const spiral = rr => 3.7 * Math.log(Math.max(.01, rr) / .05);
  // the galaxy: a warm bulge, two great arms and two faint ones, emerald knots where stars are being born
  for (let i = 0, n = q(200); i < n; i++) { const rr = Math.abs(gauss(r)) * .034 + .004; put(R.GAL, rr, r() * TAU, gauss(r) * .01, r() < .5 ? C.CREAM : r() < .5 ? C.PALE : C.G, .6 + r() * .55, (.42 + r() * .35) * gb); }
  const arm = (n, ph0, spread, dim) => {
    for (let i = 0; i < n; i++) {
      const u = Math.pow(r(), .8), rr = .05 + .33 * u + gauss(r) * .008, k = r();
      const c = k < .05 ? C.EM : k < .08 ? C.E : u < .35 ? (r() < .5 ? C.PALE : C.G) : (r() < .6 ? C.W : C.SIL);
      put(R.GAL, rr, ph0 + spiral(rr) + gauss(r) * (spread + .12 * u), gauss(r) * .005, c, (k < .08 ? .9 : .58) + r() * .4, ((k < .08 ? .7 : .34) + r() * .3) * dim * gb);
    }
  };
  arm(q(420), 0, .085, 1); arm(q(420), Math.PI, .085, 1); arm(q(110), Math.PI / 2, .16, .45); arm(q(110), -Math.PI / 2, .16, .45);
  for (let k = 0; k < 18; k++) { const rr0 = .1 + r() * .26, ph0 = (k % 2 ? Math.PI : 0) + spiral(rr0) + gauss(r) * .08; for (let j = 0; j < 5; j++) put(R.GAL, rr0 + gauss(r) * .006, ph0 + gauss(r) * .03, gauss(r) * .003, C.EM, .8, .95); }
  for (let i = 0, n = q(110); i < n; i++) put(R.GAL, .05 + .36 * Math.sqrt(r()), r() * TAU, gauss(r) * .01, C.SIL, .5, (.1 + r() * .1) * gb);
  // the astrolabe: the nakshatra ring with its 27 stars and 108 padas, the rashi ring with its 12 houses
  for (let j = 0, n = q(300); j < n; j++) put(R.RING, .45 + gauss(r) * .0012, (j + r() * .7) / n * TAU, 0, C.G, .6, .62);
  for (let j = 0, n = q(220); j < n; j++) put(R.RING, .415 + gauss(r) * .001, (j + r() * .7) / n * TAU, 0, C.SIL, .52, .4);
  for (let j = 0; j < 27; j++) { put(R.NAK, .45, j / 27 * TAU, 0, C.CREAM, 1.3, .95); put(R.NAK, .454, j / 27 * TAU + .012, 0, C.CREAM, .7, .4); }
  for (let j = 0; j < 108; j++) if (j % 4) put(R.TICK, .462, j / 108 * TAU, 0, C.G, .42, .36);
  for (let j = 0; j < 12; j++) for (let m = 0; m < 6; m++) put(R.TICK, .417 + .031 * m / 5, (j + .5) / 12 * TAU, 0, C.G, .5, .45);
  // the nine grahas ride between the rings at their own speeds; Rahu and Ketu go backwards, always opposite
  const GC = [C.G, C.W, C.E, C.EM, C.PALE, C.CREAM, C.SIL, C.GD, C.GD], SP = [.03, .1, .022, .042, .012, .036, .008, -.016, -.016], PH = [0, 1.9, 3.4, .6, 4.6, 5.5, 2.6, 1.2, 1.2 + Math.PI];
  const gph = (g, t) => PH[g] + t * SP[g];
  GC.forEach((c, g) => { for (let m = 0, nm = Math.max(4, q(9)); m < nm; m++) { const [x, y, z] = disk(.432, gph(g, 0)); P(o, x, y, z, c, m ? .7 : 1.4, m ? .35 : 1, R.GRAHA, g, m ? gauss(r) * .012 : 0, m ? gauss(r) * .004 : 0); } });
  sky(o, q(300), r, vb, { y1: .66, dim: .6 });
  // in front of the hills: glints on the ridges, the road, its lamps, and small lights rising from it
  LAYER = 1;
  HILLS.forEach((H, k) => { for (let i = 0, n = q(36); i < n; i++) { const x = vb.x0 + r() * (vb.x1 - vb.x0); P(o, x, ridgeY(x, k) + .002, 0, k === 2 ? C.G : C.SIL, .55, .28, R.RIDGE, x, k, r() * TAU); } });
  const yV = ridgeY(LX, 2) + .006, yB = vb.y1 + .03;
  const way = (s, v) => { const e = Math.pow(s, 1.6), x = LX + (.1 * Math.sin(s * 3.4 + .2) - .03) * s, w = .004 + .34 * Math.pow(s, 1.5); return [x + v * w, yV + (yB - yV) * e, .42 * e]; };
  for (let i = 0, n = q(380); i < n; i++) { const s = r(), v = clamp(r() < .5 ? gauss(r) * .35 : r() * 2 - 1, -1, 1), [x, y, z] = way(s, v); P(o, x, y, z, mixc(C.G, C.CREAM, 1 - Math.abs(v)), .6, .46, R.WAY, s, v, .7 + r() * .6); }
  [.05, .12, .2, .3, .42, .56, .72, .9].forEach((s, j) => [-1, 1].forEach(sd => { for (let m = 0; m < 4; m++) { const [x, y, z] = way(s, sd * 1.12); P(o, x + gauss(r) * .002 * (.4 + s), y - m * .004 * (.3 + s), z, C.EO, m ? .8 : 1.5, m ? .55 : 1, R.LAMP, j * 2 + (sd > 0 ? 1 : 0), s, m); } }));
  for (let i = 0, n = q(50); i < n; i++) { const s = .1 + r() * .8, v = (r() * 2 - 1) * .8, [x, y, z] = way(s, v); P(o, x, y, z, C.PALE, .75, .7, R.RISE, r(), s, v); }
  LAYER = 0;
  const F = finalize(o, ctx, r, {
    ns: t => [LX, LY + .004 * Math.sin(t * .25), 0],
    env: env(14, { top: [.03, .04, .09], bot: [.06, .045, .05], g1: [.3, .2, .08], g2: [.03, .14, .1], gas: .38, glow: .75, dust: .75, hz: 1, hzC: [.36, .22, .1], pk: PK.flat(), base: HILLS.map(h => h.y), nsS: 3.2, nsI: 1.35, ray: .5, vig: .25 }),
  });
  F.live = (t, out) => {
    const rot = t * .03, beam = t * .13;
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.GAL) {
        const rr = F.p1[i], [x, y, z] = disk(rr, F.p2[i] + rot * (1 + .25 * (1 - Math.min(1, rr / .4))), F.p3[i]);
        out.X[i] = x; out.Y[i] = y; out.Z[i] = z; out.A[i] = F.a[i] * (.6 + .4 * (z / .4 * .5 + .5)) * (.88 + .12 * Math.sin(t * .9 + F.p2[i] * 7));
      } else if (ro === R.RING || ro === R.NAK || ro === R.TICK || ro === R.GRAHA) {
        const g = ro === R.GRAHA, ph = g ? gph(F.p1[i], t) + rot * .4 + F.p2[i] : F.p2[i] + rot * .4, rr = g ? .432 + F.p3[i] : F.p1[i];
        const [x, y, z] = disk(rr, ph), d = Math.atan2(Math.sin(ph - beam), Math.cos(ph - beam));
        out.X[i] = x; out.Y[i] = y; out.Z[i] = z;
        out.A[i] = F.a[i] * (.4 + .6 * (z / rr * .5 + .5)) * (ro === R.NAK || ro === R.RING ? 1 + 1.3 * Math.exp(-d * d / .08) : 1);
      } else if (ro === R.RIDGE) {
        out.A[i] = F.a[i] * (.3 + .9 * Math.exp(-((F.p1[i] - LX) ** 2) / .12)) * (.6 + .4 * Math.sin(t * .9 + F.p3[i] * 5));
      } else if (ro === R.WAY) {
        const s = fract(F.p1[i] - t * .01), v = F.p2[i], [x, y, z] = way(s, v);
        out.X[i] = x; out.Y[i] = y; out.Z[i] = z;
        out.A[i] = F.a[i] * bold * smooth(clamp(s / .1)) * smooth(clamp((1 - s) / .12)) * (.5 + .5 * (1 - Math.abs(v))) * (.85 + .15 * Math.sin(t * 1.2 + F.p3[i] * 20));
        out.S[i] = (.42 + .9 * s) * F.p3[i] * bold;
      } else if (ro === R.LAMP) {
        const j = F.p1[i]; out.A[i] = F.a[i] * (.75 + .25 * Math.sin(t * 3.6 + j * 3.1) * Math.sin(t * 2.2 + j)); out.S[i] = F.s[i] * bold;
      } else if (ro === R.RISE) {
        const h = fract(F.p1[i] + t * .022), [sx, sy, sz] = way(F.p2[i], F.p3[i]), e = smooth(h);
        out.X[i] = sx + (LX + F.p3[i] * .05 - sx) * e + .015 * Math.sin(t * .5 + F.p1[i] * 30) * Math.sin(Math.PI * h);
        out.Y[i] = sy + (LY + .07 - sy) * e; out.Z[i] = sz * (1 - e);
        out.A[i] = .6 * Math.pow(Math.sin(Math.PI * h), 1.4); out.S[i] = .55 + .4 * (1 - e);
      }
    }
  };
  return F;
};

// 6 · V The inner laboratory: the bright field of the microscope narrows into an eye, and its specimens become the
// iris; then the eye closes, and its light, with the North Star, moves up to the brow
BUILD[6] = (ctx, r) => {
  const o = [], q = ctx.q, cx = .8, cy = .53, RL = .32, RI = .29, EW = .34, EU = .165, EL = .115, BY = .33, A0 = 3.6;
  const phase = age => [smoother(clamp((age - A0) / 2.4)), smoother(clamp((age - A0 - 3.4) / 2.4)), smoother(clamp((age - A0 - 3.8) / 2.8))];
  const shut = s => EL * .62 * Math.pow(s, 1.7);
  // a point of the rim at angle th: a circle, then an open eye, then a closed one (the crease is the fold above the lid)
  const lid = (th, m1, m2, crease) => {
    const c = Math.cos(th), sn = Math.sin(th), s = Math.abs(sn);
    let ey = crease ? -(EU + .04) * Math.pow(s, 1.9) : sn < 0 ? -EU * Math.pow(s, 2.1) : EL * Math.pow(s, 1.9);
    ey += ((crease ? shut(s) - .036 * Math.pow(s, .9) : shut(s)) - ey) * m2;
    return [cx + (RL + (EW * (1 - .1 * m2) - RL) * m1) * c, cy + RL * sn + (ey - RL * sn) * m1];
  };
  for (let i = 0, n = q(420); i < n; i++) { const th = (i + r() * .5) / n * TAU; P(o, cx + Math.cos(th) * RL, cy + Math.sin(th) * RL, 0, C.SIL, .85, .8, R.LID, th, 0); }
  for (let i = 0, n = q(110); i < n; i++) { const th = Math.PI * (1.1 + .8 * (i + r()) / n); P(o, cx, cy, 0, C.G, .65, .5, R.LID, th, 1); }
  for (let i = 0, n = q(200); i < n; i++) { const th = (i + r() * .5) / n * TAU; P(o, cx + Math.cos(th) * RI, cy + Math.sin(th) * RI, 0, C.G, .72, .5, R.IRIS, th); }
  // specimens drifting in the field
  const cells = [];
  while (cells.length < 6) { const a = r() * TAU, d = .1 + r() * .13, c = [Math.cos(a) * d, Math.sin(a) * d]; if (cells.every(e => Math.hypot(e[0] - c[0], e[1] - c[1]) > .09)) cells.push(c); }
  cells.forEach((c, k) => {
    const rc = .022 + r() * .012, m = q(26), mn = q(7);
    for (let j = 0; j < m + mn; j++) {
      const ring = j < m, a = ring ? j / m * TAU : r() * TAU, rr = ring ? rc : rc * .3 * Math.sqrt(r()), x = c[0] + Math.cos(a) * rr, y = c[1] + Math.sin(a) * rr;
      P(o, cx + x, cy + y, 0, ring ? C.EM : C.PALE, ring ? .8 : .9, ring ? .75 : .85, R.FIBER, x, y, r() * TAU, .03 + Math.sqrt(r()) * .052, k + r() * .999);
    }
  });
  for (let k = 0; k < 13; k++) { const th = Math.PI * (.14 + .72 * (k + .5) / 13); for (let j = 0; j < 4; j++) P(o, cx, cy, 0, C.G, .6, .7, R.LASH, th, j / 3); }
  for (let i = 0, n = q(140); i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * RL * .9; P(o, cx + Math.cos(a) * d, cy + Math.sin(a) * d, (r() - .5) * .1, C.SIL, .5, .15 + r() * .2, R.LDUST, r() * TAU, .3 + r()); }
  for (let i = 0, n = q(36); i < n; i++) P(o, cx, cy, 0, C.PALE, .7, .65, R.BMOTE, r(), r() * 2 - 1);
  sky(o, q(380), r, ctx.vb, { dim: .5 });
  const F = finalize(o, ctx, r, {
    ns: (t, age = 99) => [cx, cy + (BY - cy) * phase(age)[2] + .003 * Math.sin(t * .5), 0],
    env: env(6, { g1: [.02, .1, .07], g2: [.05, .05, .06], gas: .42, glow: .2, nsS: .85, nsI: .9, bot: [.002, .006, .006] }),
  });
  F.live = (t, out, age = 99) => {
    const [m1, m2, mi] = phase(age);
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.LID) {
        const cr = F.p2[i] === 1, p = lid(F.p1[i], m1, m2, cr);
        out.X[i] = p[0]; out.Y[i] = p[1]; out.Z[i] = 0;
        if (cr) out.A[i] = F.a[i] * m1 * (.7 + .3 * m2);
        else {
          const c = mixc(C.SIL, C.CREAM, m1), s = Math.abs(Math.sin(F.p1[i])); out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2];
          out.A[i] = F.a[i] * (.78 + .22 * Math.sin(t * .9 + F.p1[i] * 3)) * (1 - m2 * (.3 + .5 * (1 - Math.min(1, s * 2.5))));
        }
      } else if (ro === R.IRIS) {
        const th = F.p1[i] + t * .05, rr = RI + (.085 - RI) * m1, r2 = rr + (.032 - rr) * mi, by = cy + (BY - cy) * mi;
        out.X[i] = cx + Math.cos(th) * r2; out.Y[i] = by + Math.sin(th) * r2; out.A[i] = F.a[i] * (1 + .5 * m1);
      } else if (ro === R.FIBER) {
        const k = Math.floor(F.p5[i]), h = F.p5[i] - k, ph = F.p3[i] + t * .05;
        const sx = F.p1[i] + .014 * Math.sin(t * .21 + k * 1.7), sy = F.p2[i] + .011 * Math.cos(t * .17 + k * 2.3);
        const u = smoother(clamp(m1 * 1.25 - h * .25)), w = smoother(clamp(mi * 1.2 - h * .2));
        const ix = Math.cos(ph) * F.p4[i], iy = Math.sin(ph) * F.p4[i], ba = t * .1 + h * TAU, bd = .006 + .02 * hash(h * 7.3);
        const x = sx + (ix - sx) * u, y = sy + (iy - sy) * u, bx = Math.cos(ba) * bd, by = BY - cy + Math.sin(ba) * bd * .7;
        out.X[i] = cx + x + (bx - x) * w; out.Y[i] = cy + y + (by - y) * w;
        const c = mixc(mixc([F.r[i], F.g[i], F.b[i]], F.p4[i] > .058 ? C.EM : C.G, u), C.PALE, w);
        out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2]; out.A[i] = F.a[i] * (1 - .4 * w);
      } else if (ro === R.LASH) {
        const th = F.p1[i], s = Math.sin(th), c = Math.cos(th), j = F.p2[i], L = .026 * (.35 + .65 * s), dx = c * .6, nn = Math.hypot(dx, 1);
        out.X[i] = cx + EW * .9 * c + dx / nn * L * j; out.Y[i] = cy + shut(s) + L * j / nn; out.A[i] = F.a[i] * m2 * m2 * (1 - j * .45);
      } else if (ro === R.LDUST) {
        out.X[i] += .012 * Math.sin(t * F.p2[i] * .3 + F.p1[i]); out.Y[i] += .01 * Math.cos(t * F.p2[i] * .25 + F.p1[i] * 2); out.A[i] *= 1 - m1;
      } else if (ro === R.BMOTE) {
        const h = fract(F.p1[i] + t * .045), e = smooth(h), xs = F.p2[i] * EW * .8, ys = shut(Math.sqrt(1 - xs * xs / (EW * EW)));
        out.X[i] = cx + xs * (1 - e) + .01 * Math.sin(t * .7 + F.p1[i] * 20) * Math.sin(Math.PI * h); out.Y[i] = cy + ys + (BY - cy - ys) * e;
        out.A[i] = F.a[i] * m2 * Math.pow(Math.sin(Math.PI * h), 1.5); out.S[i] = F.s[i] * (1 - .4 * e);
      }
    }
  };
  // the graticule of the eyepiece, gone once the eye has formed
  F.overlay = (t, age = 99) => {
    const a = 1 - phase(age)[0], lines = [];
    if (a < .01) return { lines };
    for (let j = 0; j < 24; j++) { const an = j / 24 * TAU, l = j % 6 ? .3 : .28; lines.push([cx + Math.cos(an) * l, cy + Math.sin(an) * l, 0, cx + Math.cos(an) * .312, cy + Math.sin(an) * .312, 0, .3 * a]); }
    dashed(lines, [[cx - .24, cy], [cx + .24, cy]], .14 * a); dashed(lines, [[cx, cy - .24], [cx, cy + .24]], .14 * a);
    return { lines };
  };
  return F;
};

// 8 · VII From stars to stillness: six stars harden into the gems people wear for their planets. One by one they
// fall into a figure sitting still and each opens into the wheel of one of its centres, root to crown; then the
// North Star itself comes down and becomes the heart, the brightest of them.
// FIG is the right half of the seated figure's outline, from the neck round the arm, the knee and the folded legs.
const FIG = [[.014, .345], [.02, .368], [.05, .381], [.092, .392], [.122, .41], [.136, .445], [.142, .49], [.148, .535], [.163, .578], [.188, .618], [.212, .645], [.24, .664], [.266, .684], [.284, .712], [.281, .742], [.255, .762], [.2, .777], [.13, .787], [.06, .793], [0, .795]];
const segD = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, u = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)); return Math.hypot(px - ax - vx * u, py - ay - vy * u); };
const inFig = (x, y) => {
  const ax = Math.abs(x);
  if ((ax / .044) ** 2 + ((y - .3) / .05) ** 2 < 1) return true;
  if (ax < .016 && y > .34 && y < .38) return true;
  if (y > .38 && y < .66 && ax < (y < .45 ? .1 - (y - .38) * .2 : y < .6 ? .086 - (y - .45) * .08 : .074 + (y - .6) * .5)) return true;
  if (segD(ax, y, .12, .425, .142, .53) < .022 || segD(ax, y, .142, .53, .222, .652) < .017) return true;
  return (x / .278) ** 2 + ((y - .738) / .056) ** 2 < 1;
};
BUILD[8] = (ctx, r) => {
  const o = [], q = ctx.q, cx = .8, A0 = 3.4, BASE = .795;
  const body = (pts, n, a) => poly(o, spline(pts), n, C.SIL, .72, a, R.BODY, r, .0008, (x, y, z, u) => P(o, cx + x, y, 0, C.SIL, .72, a * (.8 + r() * .2), R.BODY, x, y, u));
  body([...FIG, ...FIG.slice(0, -1).map(([x, y]) => [-x, y]).reverse()], q(540), .6);
  const ring = (x0, y0, rx, ry, a0 = 0, a1 = TAU, m = 40) => { const p = []; for (let j = 0; j <= m; j++) { const a = a0 + (a1 - a0) * j / m; p.push([x0 + Math.cos(a) * rx, y0 + Math.sin(a) * ry]); } return p; };
  body(ring(0, .3, .044, .051), q(96), .6);
  for (const s of [1, -1]) {
    body([[.086, .447], [.092, .5], [.104, .553], [.13, .6], [.166, .638], [.2, .657]].map(([x, y]) => [x * s, y]), q(40), .4);
    body([[.084, .455], [.076, .51], [.074, .56], [.082, .6], [.104, .632]].map(([x, y]) => [x * s, y]), q(30), .35);
    body(ring(s * .222, .652, .011, .009, 0, TAU, 16), q(14), .5);
    body(ring(s * .095, .712, .042, .013, Math.PI, TAU, 12), q(16), .35);
  }
  body([[-.21, .708], [-.12, .724], [0, .73], [.12, .724], [.21, .708]], q(40), .3);
  body(ring(0, .808, .31, .022, 0, Math.PI, 30), q(60), .26);
  const inside = () => { for (;;) { const x = (r() * 2 - 1) * .29, y = .245 + r() * .56; if (inFig(x, y)) return [x, y]; } };
  for (let i = 0, n = q(280); i < n; i++) { const [x, y] = inside(); P(o, cx + x, y, (r() - .5) * .05, r() < .6 ? C.SIL : C.EMD, .55, .05 + r() * .07, R.FILL, x, y, r() * TAU); }
  // the seven centres, root to crown. Each gem comes to rest at one and opens into its wheel of petals;
  // the heart's wheel is the North Star's own
  const CH = [
    { y: .703, c: [.93, .3, .2], n: 4, rc: .015 }, { y: .645, c: [.95, .52, .32], n: 6, rc: .016 }, { y: .578, c: [1, .84, .4], n: 10, rc: .018 },
    { y: .475, c: C.EM, n: 12, rc: .03 },
    { y: .372, c: [.94, .94, .9], n: 16, rc: .016 }, { y: .296, c: [.46, .49, .93], n: 2, rc: .013 }, { y: .228, c: [.88, .94, 1], n: 24, rc: .022 },
  ];
  const HY = CH[3].y, GK = [0, 1, 2, 4, 5, 6];
  const wheel = (ch, m, i) => {
    const nr = Math.round(m * .4), np = Math.max(2, Math.min(ch.n, Math.floor((m - nr) / 3))), per = Math.floor((m - nr) / np), pl = ch.rc * (ch.n > 12 ? .75 : 1);
    if (i < nr || i >= nr + per * np) { const a = i < nr ? i / nr * TAU : i * 2.399963; return [Math.cos(a) * ch.rc, Math.sin(a) * ch.rc]; }
    const j = Math.floor((i - nr) / per), w = ((i - nr) % per + .5) / per, side = w < .5 ? -1 : 1, v = w < .5 ? w * 2 : (1 - w) * 2;
    const hw = Math.min(.6, Math.PI / np * .85) * Math.sin(Math.PI * (.15 + .85 * v)), a = j / np * TAU - Math.PI / 2 + side * hw, rr = ch.rc + pl * v;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  };
  // seven stars in an arc above, the North Star in the middle; the other six harden into the gems people wear
  const GP = CH.map((_, k) => { const u = k / 6 * 2 - 1; return [cx + u * .33, .125 + .06 * u * u]; });
  const GS = [[-.015, -.011, .015, -.011], [.015, -.011, .028, 0], [.028, 0, 0, .034], [0, .034, -.028, 0], [-.028, 0, -.015, -.011], [-.028, 0, .028, 0], [-.015, -.011, -.009, 0], [.015, -.011, .009, 0], [0, -.011, 0, 0], [-.009, 0, 0, .034], [.009, 0, 0, .034]];
  const gl = GS.map(s => Math.hypot(s[2] - s[0], s[3] - s[1])), gt = gl.reduce((a, b) => a + b, 0), TW = [];
  GK.forEach(k => {
    const n = q(60), pts = [];
    GS.forEach((s, j) => { const m = Math.max(2, Math.round(n * gl[j] / gt)); for (let i = 0; i < m; i++) { const u = (i + r() * .6) / m; pts.push([s[0] + (s[2] - s[0]) * u, s[1] + (s[3] - s[1]) * u, j < 5]); } });
    pts.forEach(([lx, ly, edge], i) => { TW.push(wheel(CH[k], pts.length, i)); P(o, GP[k][0], GP[k][1], 0, CH[k].c, edge ? .85 : .62, edge ? .95 : .62, R.GEM, k, lx, ly, r(), TW.length - 1); });
  });
  // the heart: the North Star's own wheel of twelve petals, and the light around it
  const HW = [];
  for (let i = 0, n = q(96); i < n; i++) { HW.push(wheel(CH[3], n, i)); P(o, cx, HY, .01, i % 3 ? C.EM : C.G, .78, .95, R.ORBIT, HW.length - 1); }
  for (let i = 0, n = q(70); i < n; i++) P(o, cx + gauss(r) * .035, HY + gauss(r) * .03, .01, r() < .5 ? C.PALE : C.EM, .6, .2 + r() * .15, R.HGLOW, r() * TAU);
  // the channel along the spine, lit once all the centres are
  for (let i = 0, n = q(50); i < n; i++) { const u = (i + r() * .5) / n; P(o, cx + gauss(r) * .0015, CH[0].y + (CH[6].y + .02 - CH[0].y) * u, .005, C.PALE, .55, .5, R.CHAK, u); }
  sky(o, q(380), r, ctx.vb, { dim: .55 });
  const ORD = [0, 1, 2, -1, 3, 4, 5], FALL = 1.9, DIS = 1.5, TF = CH.map((_, k) => A0 + 2.2 + ORD[k] * .45), TN = A0 + 5.4;
  const F = finalize(o, ctx, r, {
    ns: (t, age = 99) => { const m = smoother(clamp((age - TN) / 2.6)); return [cx, GP[3][1] + (HY - GP[3][1]) * m + .002 * Math.sin(t * .9) * m, .01 * m]; },
    env: env(8, { g1: [.04, .1, .075], g2: [.09, .07, .04], gas: .42, glow: .3, nsS: 1, nsI: 1.2, top: [.002, .003, .007], bot: [.008, .008, .012] }),
  });
  F.live = (t, out, age = 99) => {
    let landed = 0; GK.forEach(k => { landed += clamp((age - TF[k] - FALL) / 1.2); }); landed /= 6;
    const br = 1 + .007 * Math.sin(t * .9), mN = smoother(clamp((age - TN - 1.8) / 1.6)), lit = landed * .6 + mN * .4;
    const lc = mixc(C.SIL, mixc(C.CREAM, C.G, .35), lit), lift = y => BASE - (BASE - y) * br;
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.GEM) {
        const k = F.p1[i], g = GP[k], h = F.p4[i], cy = lift(CH[k].y), d = clamp((age - TF[k] - FALL) / DIS);
        const cry = smoother(clamp((age - A0 - .2 - ORD[k] * .13) / 1.5)), e = smoother(clamp((age - TF[k]) / FALL)), sc = 1 - .65 * e, spn = d > 0 ? 1 : Math.cos(t * 1.1 + k * .9);
        const lx = F.p2[i] * spn * cry + (hash(h * 3.7) - .5) * .007 * (1 - cry), ly = F.p3[i] * cry + (hash(h * 5.3) - .5) * .007 * (1 - cry);
        const v = 1 - e, gy = g[1] + .004 * Math.sin(t * .8 + k) * v, c1 = (gy + cy) / 2 + .03;
        let x = v * v * g[0] + 2 * v * e * g[0] + e * e * cx + lx * sc, y = v * v * gy + 2 * v * e * c1 + e * e * cy + ly * sc;
        if (d > 0) {
          const W = TW[F.p5[i]], sa = t * .22 * (k % 2 ? 1 : -1), cs = Math.cos(sa), sn = Math.sin(sa), ed = smoother(d), b = 1 + .05 * Math.sin(t * 1.2 + k);
          x += (cx + (W[0] * cs - W[1] * sn) * b - x) * ed; y += (cy + (W[0] * sn + W[1] * cs) * b - y) * ed;
        }
        out.X[i] = x; out.Y[i] = y; out.Z[i] = .01;
        const c = mixc(C.CREAM, [F.r[i], F.g[i], F.b[i]], cry); out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2];
        const flash = Math.exp(-(((age - TF[k] - FALL) / .3) ** 2));
        out.A[i] = F.a[i] * (.25 + .75 * cry) * (.85 + .15 * Math.sin(t * (d > 0 ? 1.2 : 3) + h * 40)) * (1 + 1.4 * flash);
        out.S[i] = F.s[i] * (1.3 - .3 * cry) * (1 - .25 * e * (1 - d));
      } else if (ro === R.ORBIT) {
        const W = HW[F.p1[i]], sa = t * .12, cs = Math.cos(sa), sn = Math.sin(sa), b = (.3 + .7 * mN) * (1 + .04 * Math.sin(t * .9)), hy = lift(HY);
        out.X[i] = cx + (W[0] * cs - W[1] * sn) * b; out.Y[i] = hy + (W[0] * sn + W[1] * cs) * b; out.A[i] = F.a[i] * mN;
      } else if (ro === R.HGLOW) {
        out.Y[i] = lift(F.y[i]); out.A[i] = F.a[i] * mN * (.75 + .25 * Math.sin(t * .9 + F.p1[i]));
      } else if (ro === R.CHAK) {
        const u = F.p1[i], wave = Math.exp(-(((fract(t * .09) * 1.4 - .2) - u) ** 2) / .01);
        out.Y[i] = lift(F.y[i]); out.A[i] = F.a[i] * smooth(clamp((landed - .95) * 20)) * (.35 + .65 * mN) * (.4 + 1.2 * wave);
      } else if (ro === R.BODY) {
        out.X[i] = cx + F.p1[i] * (1 + (br - 1) * .5); out.Y[i] = lift(F.p2[i]);
        out.R[i] = lc[0]; out.G[i] = lc[1]; out.B[i] = lc[2]; out.A[i] = F.a[i] * (.34 + .66 * lit) * (.88 + .12 * Math.sin(t * .7 + F.p3[i] * 40));
      } else if (ro === R.FILL) {
        out.X[i] = cx + F.p1[i] + .002 * Math.sin(t * .5 + F.p3[i]); out.Y[i] = lift(F.p2[i]); out.A[i] = F.a[i] * (1 + 2.2 * lit);
      }
    }
  };
  return F;
};

// 10 · IX The fire that never goes out: Manikarnika, firelight on dark water, embers rising to become stars
BUILD[10] = (ctx, r) => {
  const o = [], q = ctx.q, bx = .8, by = .84;
  const ember = (ph, lat, sp, t) => {
    const h = fract(ph + t * .045 * sp), hh = 1 - Math.pow(1 - h, 1.6);
    const top = .56 + .3 * fract(ph * 7.31);
    return [bx + lat * (.022 + h * .3) + Math.sin(h * 7 + ph * 12 + t * .45) * .035 * h, by - hh * top, lat * .25 * h, h];
  };
  for (let i = 0, n = q(1050); i < n; i++) { const ph = r(), lat = gauss(r), sp = .7 + r() * .6, [x, y, z] = ember(ph, lat, sp, 0); P(o, x, y, z, C.E, 1.5, .9, R.EMBER, ph, lat, sp); }
  blob(o, q(200), bx, by + .01, 0, .03, C.E, 1.8, .7, R.FIRE, r);
  for (let i = 0, n = q(230); i < n; i++) { const x = bx + (r() - .5) * .7 * (1 - r() * .5), y = .9 + r() * .08; P(o, x, y, 0, mixc(C.E, C.EO, r()), .9, .12 + r() * .25, R.REFL, r() * TAU, x); }
  const steps = [[-.2, .66], [.06, .66], [.06, .72], [.16, .72], [.16, .78], [.26, .78], [.26, .84], [.38, .84], [.38, .9]];
  poly(o, steps, q(170), C.W, .7, .14, R.STATIC, r, .002);
  sky(o, q(320), r, ctx.vb, { y1: .32 });
  const F = finalize(o, ctx, r, { ns: [.8, .14, 0], env: env(10, { g1: [.2, .065, .02], g2: [.1, .07, .03], gas: .5, glow: .2, nsS: .85, nsI: .62, bot: [.03, .008, .003] }) });
  F.live = (t, out) => {
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.EMBER) {
        const [x, y, z, h] = ember(F.p1[i], F.p2[i], F.p3[i], t);
        out.X[i] = x; out.Y[i] = y; out.Z[i] = z;
        const c = h < .35 ? mixc(C.E, C.EO, h / .35) : h < .7 ? mixc(C.EO, C.G, (h - .35) / .35) : mixc(C.G, C.W, (h - .7) / .3);
        out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2];
        out.A[i] = (h < .04 ? h / .04 : 1) * (.95 - h * .3) * (1 - smooth(clamp((h - .8) / .2)) * .55) * (.75 + .25 * Math.sin(t * 7 + F.p1[i] * 40)); out.S[i] = 2.1 - h * 1.35;
      } else if (ro === R.FIRE) { const fl = .5 + .5 * Math.sin(t * 7 + F.x[i] * 300); out.A[i] *= .5 + .5 * fl; out.Y[i] -= .006 * Math.abs(Math.sin(t * 5 + F.x[i] * 200)); }
      else if (ro === R.REFL) { out.X[i] = bx + (F.p2[i] - bx) * (1 + .12 * Math.sin(t * 1.4 + F.p1[i])); out.A[i] *= .6 + .4 * Math.sin(t * 2 + F.p1[i] * 3); }
    }
  };
  return F;
};

// 11 · X What I was made for: from dark water a lotus rises and opens toward the North Star. It never had to
// become anything else.
BUILD[11] = (ctx, r) => {
  const o = [], q = ctx.q, vb = ctx.vb, cx = .8, WY = .71, TOPY = .63, PIT = .42, cp = Math.cos(PIT), spt = Math.sin(PIT), NSY = .15;
  // three rings of petals; each petal's spine is a curve from the base (b1 its bend, b2 its tip, in petal lengths) that
  // goes from the closed bud's to the open flower's
  const LAY = [
    { n: 8, L: .25, W: .088, a0: 0, c: C.CREAM, b1: [.55, .3], b2: [.93, .6] },
    { n: 8, L: .215, W: .08, a0: Math.PI / 8, c: C.PALE, b1: [.38, .5], b2: [.62, .92] },
    { n: 6, L: .17, W: .07, a0: .26, c: C.CREAM, b1: [.2, .58], b2: [.3, 1] },
  ];
  const BUD1 = [.26, .45], BUD2 = [.04, 1.02];
  // a point of a petal: s runs from the base to the tip, v across it; the petal cups, its edges rising
  const petal = (l, al, s, v, opn, spin, bx, by) => {
    const Lr = LAY[l], L = Lr.L, k1r = BUD1[0] + (Lr.b1[0] - BUD1[0]) * opn, k1h = BUD1[1] + (Lr.b1[1] - BUD1[1]) * opn, k2r = BUD2[0] + (Lr.b2[0] - BUD2[0]) * opn, k2h = BUD2[1] + (Lr.b2[1] - BUD2[1]) * opn;
    const u = 1 - s, w = Lr.W * Math.pow(Math.sin(Math.PI * Math.min(1, s)), .7) * (1 - .25 * s) * (.62 + .38 * opn);
    const rr = .016 * u * u + 2 * u * s * k1r * L + s * s * k2r * L - .25 * Lr.W * v * v * s, hh = .006 + 2 * u * s * k1h * L + s * s * k2h * L + .4 * Lr.W * v * v * s;
    const a = al + spin, ca = Math.cos(a), sa = Math.sin(a), X = ca * rr - sa * w * v, Z = sa * rr + ca * w * v;
    return [bx + X, by - hh * cp + Z * spt, Z * cp + hh * spt, sa];
  };
  LAY.forEach((Lr, l) => {
    for (let j = 0; j < Lr.n; j++) {
      const al = Lr.a0 + j / Lr.n * TAU;
      for (let i = 0, m = ctx.narrow ? 15 : 16; i < m; i++) for (const v of [-1, 1]) P(o, cx, .9, 0, Lr.c, .62, .8, R.PETAL, l, al, (i + .5) / m, v, r());
      for (let i = 0, m = q(7); i < m; i++) P(o, cx, .9, 0, C.G, .55, .5, R.PETAL, l, al, (i + .5) / m * .9, 0, r());
      if (!ctx.narrow) for (let i = 0, m = q(6); i < m; i++) P(o, cx, .9, 0, Lr.c, .5, .14, R.PETAL, l, al, .1 + r() * .8, (r() * 2 - 1) * .8, r());
    }
  });
  // the seed head, its seeds, the stamens round it
  for (let i = 0, n = q(40); i < n; i++) P(o, cx, .9, 0, C.G, .7, .8, R.POD, i / n * TAU, .036, .03);
  for (let k = 0; k < 7; k++) for (let j = 0; j < 3; j++) P(o, cx, .9, 0, C.EM, .7, .85, R.POD, k / 7 * TAU, (k ? .02 : 0) + gauss(r) * .002, .031);
  for (let i = 0, n = q(50); i < n; i++) P(o, cx, .9, 0, C.PALE, .55, .6, R.POD, r() * TAU, .04 + r() * .012, .012 + r() * .03);
  for (let i = 0, n = q(70); i < n; i++) P(o, cx, .9, 0, C.EMD, .7, .6, R.STEM, (i + r() * .5) / n, (r() - .5) * .004);
  // the leaves floating on the water, each with its notch and veins
  const PADS = [[.5, .765, .1, 2.2], [1.12, .74, .085, .4], [.98, .865, .13, 1.5]];
  PADS.forEach(([px, py, rx, an], k) => {
    const ry = rx * .26;
    for (let i = 0, n = q(54); i < n; i++) { const a = an + .2 + (TAU - .4) * (i + r() * .5) / n; P(o, px + Math.cos(a) * rx, py + Math.sin(a) * ry, 0, C.EMD, .7, .6, R.PAD, k); }
    for (const e of [.2, -.2]) for (let i = 0, n = q(8); i < n; i++) { const u = i / n; P(o, px + Math.cos(an + e) * rx * u, py + Math.sin(an + e) * ry * u, 0, C.EMD, .6, .5, R.PAD, k); }
    for (let v = 0; v < 6; v++) { const a = an + .7 + v * (TAU - 1.4) / 5; for (let i = 0, n = q(5); i < n; i++) { const u = .15 + .75 * i / n; P(o, px + Math.cos(a) * rx * u, py + Math.sin(a) * ry * u, 0, C.EM, .5, .22, R.PAD, k); } }
  });
  // the water: rings spreading from the stem, a sheen on the surface, the flower's light below it
  for (let k = 0; k < 8; k++) for (let i = 0, n = q(34); i < n; i++) P(o, cx, WY, 0, C.SIL, .6, .5, R.RIPPLE, k, (i + r() * .5) / n * TAU);
  for (let i = 0, n = q(200); i < n; i++) { const d = Math.pow(r(), 1.7); P(o, vb.x0 + r() * (vb.x1 - vb.x0), WY + .006 + d * (vb.y1 - WY), 0, C.SIL, .55 + d * .5, .16 + r() * .22, R.SHEEN, r() * TAU, d); }
  // the surface itself, a thin bright line fading into the dark at either side
  for (let i = 0, n = q(140); i < n; i++) { const u = r() * 2 - 1; P(o, cx + u * .62, WY + gauss(r) * .0015, 0, C.SIL, .55, .32 * Math.pow(1 - Math.abs(u), .6), R.SHEEN, r() * TAU, 0); }
  for (let i = 0, n = q(60); i < n; i++) P(o, cx, WY, 0, C.G, .6, .4, R.REFL, r(), gauss(r));
  for (let i = 0, n = q(44); i < n; i++) P(o, cx, TOPY, 0, C.PALE, .7, .7, R.POLLEN, r(), r() * 2 - 1);
  sky(o, q(300), r, vb, { y1: WY - .01 });
  const F = finalize(o, ctx, r, {
    ns: t => [cx, NSY + .004 * Math.sin(t * .3), 0],
    env: env(11, { g1: [.02, .12, .08], g2: [.1, .08, .04], gas: .45, glow: .36, nsS: 1.05, nsI: 1, top: [.004, .005, .011], bot: [.006, .016, .014] }),
  });
  const uw = y => .3 + .7 * smooth(clamp((WY + .01 - y) / .02));
  F.live = (t, out, age = 99) => {
    const grow = smoother(clamp((age - .6) / 2.8)), rise = smoother(clamp((age - 3) / 2.6)), em = smooth(clamp((age - 3.9) / 1.2));
    const by = rise > 0 ? .93 + (TOPY - .93) * rise : .995 + (.93 - .995) * grow, sway = .006 * Math.sin(t * .45), bx = cx + sway, spin = t * .05;
    const opn = [0, 1, 2].map(l => smoother(clamp((age - 5 - l * .45) / 4.4)));
    for (let i = 0; i < F.n; i++) {
      common(F, out, i, t);
      const ro = F.ro[i];
      if (ro === R.PETAL) {
        const l = F.p1[i], s = F.p3[i], p = petal(l, F.p2[i], s, F.p4[i], opn[l], spin, bx, by);
        out.X[i] = p[0]; out.Y[i] = p[1]; out.Z[i] = p[2];
        out.A[i] = F.a[i] * grow * (.45 + .55 * (.5 + .5 * p[3])) * uw(p[1]) * (.9 + .1 * Math.sin(t * .8 + F.p5[i] * 20));
        if (s > .72) { const c = mixc([F.r[i], F.g[i], F.b[i]], C.EO, smooth((s - .72) / .28) * .4 * opn[l]); out.R[i] = c[0]; out.G[i] = c[1]; out.B[i] = c[2]; }
      } else if (ro === R.POD) {
        const a = F.p1[i] + spin, d = F.p2[i], X = Math.cos(a) * d, Z = Math.sin(a) * d, H = F.p3[i];
        out.X[i] = bx + X; out.Y[i] = by - H * cp + Z * spt; out.Z[i] = Z * cp + H * spt; out.A[i] = F.a[i] * smooth(clamp(opn[2] * 1.6 - .4));
      } else if (ro === R.STEM) {
        const s = F.p1[i], x0 = cx + .035;
        out.X[i] = x0 + (bx - x0) * s + .012 * Math.sin(s * 3 + .5) * (1 - s) + F.p2[i]; out.Y[i] = .995 + (by - .995) * s; out.Z[i] = 0;
        out.A[i] = F.a[i] * grow * uw(out.Y[i]);
      } else if (ro === R.PAD) out.Y[i] += .0025 * Math.sin(t * .6 + F.p1[i] * 2);
      else if (ro === R.RIPPLE) {
        const u = fract(t * .07 + F.p1[i] / 8), a = F.p2[i], rx = .02 + .58 * u;
        out.X[i] = cx + Math.cos(a) * rx; out.Y[i] = WY + Math.sin(a) * rx * .15;
        out.A[i] = F.a[i] * em * Math.pow(1 - u, 1.6) * smooth(clamp(u / .06)) * (Math.sin(a) > 0 ? 1 : .45);
      } else if (ro === R.SHEEN) {
        const w = Math.sin(t * (.6 + F.p2[i]) + F.p1[i]); out.X[i] += .004 * Math.sin(t * .3 + F.p1[i]); out.A[i] *= .4 + .6 * w * w;
      } else if (ro === R.REFL) {
        const d = F.p1[i]; out.X[i] = cx + F.p2[i] * .025 * (1 + d * 1.5) + .006 * Math.sin(t * 1.3 + d * 20); out.Y[i] = WY + .01 + d * .16;
        out.A[i] = F.a[i] * (1 - d) * opn[0] * (.5 + .5 * Math.sin(t * 2 + d * 30));
      } else if (ro === R.POLLEN) {
        const h = fract(F.p1[i] + t * .035), e = smooth(h), sy = by - .05;
        out.X[i] = bx + F.p2[i] * .06 * e + .012 * Math.sin(t * .6 + F.p1[i] * 30) * Math.sin(Math.PI * h); out.Y[i] = sy + (NSY + .06 - sy) * e;
        out.A[i] = .65 * Math.pow(Math.sin(Math.PI * h), 1.4) * opn[1]; out.S[i] = F.s[i] * (1 - .3 * e);
      }
    }
  };
  return F;
};

// on a phone the new pictures are drawn a little bolder, so their lines hold at that size
const BOLD = { 1: [1.25, 1.2], 6: [1.45, 1.3], 8: [1.45, 1.3], 11: [1.35, 1.6] };
export function build(i, ctx) {
  const F = BUILD[i](ctx, rng(1000 + i * 77));
  if (ctx.narrow && BOLD[i]) for (let j = 0; j < F.n; j++) if (F.ro[j] !== R.STAR) { F.s[j] *= BOLD[i][0]; F.a[j] = Math.min(1, F.a[j] * BOLD[i][1]); }
  return F;
}
