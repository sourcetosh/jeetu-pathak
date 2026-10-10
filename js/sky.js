// The one sky: WebGL points over a living night. At every change of scene the stars leave one picture and drift,
// together and unhurried, into the next, the nearest to the North Star first; the North Star leads each change.
import { COUNT, rng } from './formations.js';

const HP = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const HASH = 'float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n';

const VS_PTS = `
attribute vec2 aP; attribute float aS; attribute float aB; attribute vec4 aC; attribute float aL;
uniform vec2 uRes; uniform float uLayer; varying vec4 vC; varying float vB;
void main() {
  vec2 c = aP / uRes * 2.0 - 1.0;
  float on = 1.0 - step(0.5, abs(aL - uLayer));
  gl_Position = on > 0.5 ? vec4(c.x, -c.y, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = aS * on; vC = aC; vB = aB;
}`;
const FS_PTS = `
precision mediump float;
varying vec4 vC; varying float vB;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float r = sqrt(r2);
  float star = exp(-r2 * 10.0) + 0.22 * exp(-r2 * 3.0) * (1.0 - r2);
  float disc = smoothstep(1.0, 0.86, r) * (0.34 + 0.26 * smoothstep(0.55, 0.92, r));
  gl_FragColor = vec4(vC.rgb * vC.a * mix(star, disc, vB), 1.0);
}`;
const VS_FULL = 'attribute vec2 aQ; void main() { gl_Position = vec4(aQ, 0.0, 1.0); }';

// the gas: domain-warped noise that keeps folding into itself, drawn small and stretched smooth
const FS_GAS = HP + HASH + `
uniform vec2 uRes; uniform float uT; uniform vec3 uC1; uniform vec3 uC2; uniform vec2 uOff;
float vn(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return v; }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.3 + uOff;
  float t = uT * 0.02;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.7, 0.0)));
  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.35));
  float f = fbm(p + 2.8 * r);
  float region = smoothstep(0.32, 0.72, fbm(p * 0.36 + vec2(11.3, 4.1) + t * 0.12));
  float d = smoothstep(0.44, 1.0, f) * region;
  d *= 1.0 - 0.6 * smoothstep(0.52, 0.8, fbm(p * 1.9 + r * 1.3 - t * 0.25));
  vec3 col = mix(uC1, uC2, clamp(dot(q, q) * 0.9, 0.0, 1.0)) * d * (0.5 + 0.9 * r.y);
  gl_FragColor = vec4(min(col * 2.0, 1.0), 1.0);
}`;

// the night itself: gradient, gas, the North Star's light on it, stardust, the dawn behind the hills, vignette, dither
const FS_BG = HP + HASH + `
uniform sampler2D uGas; uniform vec2 uRes; uniform float uDpr; uniform float uT;
uniform vec3 uTop; uniform vec3 uBot; uniform float uGasA; uniform vec2 uNS; uniform float uGlow; uniform float uDust;
uniform float uHz; uniform vec3 uHzC; uniform vec3 uMap; uniform float uBase; uniform float uVig;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = mix(uBot, uTop, smoothstep(0.0, 1.0, uv.y));
  col += texture2D(uGas, uv).rgb * 0.5 * uGasA;
  vec2 d = (gl_FragCoord.xy - uNS) / uRes.y; float r2 = dot(d, d);
  col += vec3(1.0, 0.8, 0.52) * uGlow * (exp(-r2 * 26.0) * 0.1 + exp(-r2 * 2.6) * 0.05 + exp(-r2 * 0.6) * 0.02);
  vec2 cell = floor(gl_FragCoord.xy / (3.0 * uDpr));
  float h = h21(cell);
  if (h > 0.9962) {
    vec2 c = (cell + 0.5 + (vec2(h21(cell + 1.7), h21(cell + 3.1)) - 0.5) * 0.7) * 3.0 * uDpr;
    float rr = length(gl_FragCoord.xy - c) / uDpr;
    float tw = 0.55 + 0.45 * sin(uT * (0.3 + h21(cell + 7.7) * 1.4) + h * 400.0);
    col += vec3(0.8, 0.83, 0.88) * exp(-rr * rr * 1.4) * tw * uDust * (0.25 + 0.75 * h21(cell + 5.3)) * 0.5;
  }
  if (uHz > 0.001) {
    float lx = (gl_FragCoord.x - uMap.x) / uMap.z, ly = (uRes.y - gl_FragCoord.y - uMap.y) / uMap.z;
    float near = exp(-pow((lx - 0.8) * 1.5, 2.0));
    col += uHz * uHzC * exp(-max(uBase - ly, 0.0) * 2.4) * (0.35 + 0.65 * near);
  }
  vec2 v = uv - 0.5; col *= 1.0 - dot(v, v) * 0.5 * uVig;
  col += (h21(gl_FragCoord.xy * 0.37 + 3.1) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

// the hills of the last scene, drawn over the sky (and over everything behind them) with their own alpha
const FS_HILL = HP + `
uniform vec2 uRes; uniform float uDpr; uniform float uHz; uniform vec3 uHzC; uniform vec3 uMap; uniform vec3 uPK[8]; uniform vec3 uBase;
float ridge(float x, float k, float base, float sh) {
  float h = 0.0;
  for (int i = 0; i < 8; i++) { vec3 p = uPK[i]; float d = abs(x - p.x - sh) / p.z; if (d < 1.0) h = max(h, p.y * (1.0 - k * 0.22) * pow(1.0 - d, 1.3)); }
  h += (0.012 * sin(x * 23.0 + k * 2.0) + 0.007 * sin(x * 57.0 + k * 5.0) + 0.004 * sin(x * 131.0 + k * 3.0)) * (0.5 + 2.5 * h);
  return base - max(h, 0.0) * (1.0 - 0.85 * exp(-pow((x - 0.8) / 0.14, 2.0)));
}
void main() {
  float lx = (gl_FragCoord.x - uMap.x) / uMap.z, ly = (uRes.y - gl_FragCoord.y - uMap.y) / uMap.z, aa = 1.2 * uDpr / uMap.z;
  if (ly < uBase.x - 0.36) discard;
  float y0 = ridge(lx, 0.0, uBase.x, 0.0), y1 = ridge(lx, 1.0, uBase.y, 0.07), y2 = ridge(lx, 2.0, uBase.z, -0.05);
  float m0 = smoothstep(y0 - aa, y0 + aa, ly), m1 = smoothstep(y1 - aa, y1 + aa, ly), m2 = smoothstep(y2 - aa, y2 + aa, ly);
  float cov = max(m0, max(m1, m2));
  if (cov < 0.002) discard;
  float near = exp(-pow((lx - 0.8) * 1.7, 2.0));
  vec3 col = vec3(0.02, 0.02, 0.03) + uHzC * (0.16 + 0.22 * near) * (1.0 - 0.5 * smoothstep(0.0, 0.12, ly - y0)) + uHzC * 0.1 * smoothstep(0.03, 0.1, ly - y0);
  col = mix(col, vec3(0.01, 0.01, 0.013) + uHzC * (0.05 + 0.08 * near) + uHzC * 0.06 * smoothstep(0.02, 0.09, ly - y1), m1);
  col = mix(col, vec3(0.005, 0.005, 0.006) + uHzC * 0.025 * near, m2);
  float rim = exp(-abs(ly - y0) / aa) * (1.0 - m1) * 0.14 + exp(-abs(ly - y1) / aa) * (1.0 - m2) * 0.2 + exp(-abs(ly - y2) / aa) * 0.32;
  col += vec3(1.0, 0.82, 0.5) * rim * (0.2 + 0.8 * near);
  gl_FragColor = vec4(col, cov * uHz);
}`;

// the North Star: a bright core, a soft halo, four long spikes and four short ones; rays when it becomes the light
const VS_NS = `
attribute vec2 aQ; uniform vec2 uRes; uniform vec2 uC; uniform float uRq; varying vec2 vP;
void main() { vP = aQ * uRq; vec2 c = (uC + vP) / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
const FS_NS = `
precision mediump float;
varying vec2 vP; uniform float uRw; uniform float uCore; uniform float uSpk; uniform float uRay; uniform float uI; uniform float uT; uniform float uRot;
void main() {
  float r = length(vP), c = r / uCore;
  float core = exp(-c * c * 1.6);
  float halo = exp(-c * 0.55) * 0.3 + exp(-c * 0.16) * 0.07;
  float ca = cos(uRot), sa = sin(uRot);
  vec2 q = vec2(ca * vP.x - sa * vP.y, sa * vP.x + ca * vP.y);
  float w = uCore * 0.16;
  float s1 = exp(-abs(q.y) / w) * pow(max(0.0, 1.0 - abs(q.x) / uSpk), 2.2) + exp(-abs(q.x) / w) * pow(max(0.0, 1.0 - abs(q.y) / uSpk), 2.2);
  vec2 e = vec2(q.x + q.y, q.x - q.y) * 0.7071;
  float s2 = exp(-abs(e.y) / (w * 0.8)) * pow(max(0.0, 1.0 - abs(e.x) / (uSpk * 0.42)), 2.4) + exp(-abs(e.x) / (w * 0.8)) * pow(max(0.0, 1.0 - abs(e.y) / (uSpk * 0.42)), 2.4);
  float ang = atan(vP.y, vP.x);
  float rays = (pow(0.5 + 0.5 * sin(ang * 13.0 + sin(ang * 5.0 - uT * 0.05) * 1.4 + uT * 0.02), 9.0) * 0.6 + pow(0.5 + 0.5 * sin(ang * 7.0 - uT * 0.015 + 1.3), 6.0) * 0.4) * exp(-r / (uCore * 6.5)) * smoothstep(uCore * 0.8, uCore * 3.0, r);
  float bloom = exp(-r / (uCore * 5.0)) * 0.26 + exp(-r / (uCore * 14.0)) * 0.05;
  vec3 col = vec3(1.0, 0.97, 0.9) * core * 1.4 + vec3(1.0, 0.85, 0.6) * halo + vec3(1.0, 0.92, 0.76) * (s1 * 0.55 + s2 * 0.24) + vec3(1.0, 0.78, 0.45) * uRay * (rays * 0.2 + bloom);
  gl_FragColor = vec4(col * uI * smoothstep(1.0, 0.72, r / uRw), 1.0);
}`;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const LIFE = .72; // every formation lives at this pace: slow, never busy

export function createSky(cv, ink, { reduce, N }) {
  const n = N - 1, forms = new Array(COUNT).fill(null);
  const gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  const c2 = gl ? null : cv.getContext('2d');
  const ic = ink.getContext('2d');
  const mk = () => ({ X: new Float32Array(n), Y: new Float32Array(n), Z: new Float32Array(n), S: new Float32Array(n), A: new Float32Array(n), R: new Float32Array(n), G: new Float32Array(n), B: new Float32Array(n) });
  const LA = mk(), LB = mk();
  const r = rng(91), RND = new Float32Array(n), ORD = new Float32Array(n), DLY = new Float32Array(n), born = new Float32Array(COUNT);
  for (let i = 0; i < n; i++) { RND[i] = r(); ORD[i] = .4 + Math.pow(r(), 1.5) * 7; }
  const STR = 9, buf = new Float32Array(n * STR);

  let L = null, DPR = 1, W = 0, H = 0, gw = 0, gh = 0, gasStale = true;
  let cur = 0, tr = null, queued = null, qdur = 0, tl = 0, frameNo = 0, liveA = null, liveB = null;
  let bright = 0, brightT = .62, flash = 0, woke = false, tWake = 0, last = 0, running = true, raf = 0;
  const t0 = performance.now(), mouse = { x: 0, y: 0, sx: 0, sy: 0, px: -1e4, py: -1e4, on: 0 };
  let onFrame = () => {}, onArrive = () => {};

  // ---- GL setup
  let P = null, G = null, Q = null, S = null, K = null, vbo = null, tri = null, quad = null, fbo = null, gasTex = null;
  const loc = {}, gloc = {}, qloc = {}, sloc = {}, kloc = {};
  if (gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
    const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); (window.__glErr ||= []).push(gl.getProgramInfoLog(p)); } return p; };
    const grab = (p, into, attrs, unis) => { attrs.forEach(a => { into[a] = gl.getAttribLocation(p, a); }); unis.forEach(u => { into[u] = gl.getUniformLocation(p, u); }); };
    P = prog(VS_PTS, FS_PTS); G = prog(VS_FULL, FS_GAS); Q = prog(VS_FULL, FS_BG); S = prog(VS_NS, FS_NS); K = prog(VS_FULL, FS_HILL);
    grab(P, loc, ['aP', 'aS', 'aB', 'aC', 'aL'], ['uRes', 'uLayer']);
    grab(G, gloc, ['aQ'], ['uRes', 'uT', 'uC1', 'uC2', 'uOff']);
    grab(Q, qloc, ['aQ'], ['uGas', 'uRes', 'uDpr', 'uT', 'uTop', 'uBot', 'uGasA', 'uNS', 'uGlow', 'uDust', 'uHz', 'uHzC', 'uMap', 'uBase', 'uVig']);
    grab(K, kloc, ['aQ'], ['uRes', 'uDpr', 'uHz', 'uHzC', 'uMap', 'uPK', 'uBase']);
    grab(S, sloc, ['aQ'], ['uRes', 'uC', 'uRq', 'uRw', 'uCore', 'uSpk', 'uRay', 'uI', 'uT', 'uRot']);
    vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gasTex = gl.createTexture(); fbo = gl.createFramebuffer();
  }

  function resize(nl) {
    L = nl; DPR = Math.min(devicePixelRatio || 1, L.narrow ? 2 : 1.75); W = L.vw; H = L.vh;
    for (const c of [cv, ink]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    if (gl) {
      gl.viewport(0, 0, cv.width, cv.height);
      gw = Math.max(16, Math.round(W / 3)); gh = Math.max(16, Math.round(H / 3));
      gl.bindTexture(gl.TEXTURE_2D, gasTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gasTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gasStale = true;
    }
  }

  // ---- projection shared by points, the North Star and the ink overlay (global frame units)
  let cyw = 1, syw = 0, cpi = 1, spi = 0;
  function proj(x, y, z, out) {
    const dx = x - .8, dy = y - .5;
    const x1 = dx * cyw + z * syw, z1 = -dx * syw + z * cyw;
    const y2 = dy * cpi - z1 * spi, z2 = dy * spi + z1 * cpi;
    const per = 1 / Math.max(.4, 1 - z2 * .3);
    out[0] = L.ox + (.8 + x1 * per) * L.U; out[1] = L.oy + (.5 + y2 * per) * L.U; out[2] = z2; out[3] = per;
  }
  // each formation lives in its own frame (below its words); bring it into the shared one
  const XF0 = { k: 1, dx: 0, dy: 0 };
  function xform(F, o) {
    const { k, dx, dy } = F.xf || XF0; if (k === 1 && !dx && !dy) return;
    for (let i = 0; i < n; i++) { o.X[i] = o.X[i] * k + dx; o.Y[i] = o.Y[i] * k + dy; o.Z[i] *= k; }
  }
  const nsOf = (F, t, age = 99) => { const p = F.nsAt(t, age), { k, dx, dy } = F.xf || XF0; return [p[0] * k + dx, p[1] * k + dy, (p[2] || 0) * k]; };

  // ---- moving between scenes
  function begin(k, dur) {
    const A = forms[cur], ns = nsOf(A, tl, tl - born[cur]), { k: s, dx, dy } = A.xf || XF0;
    for (let i = 0; i < n; i++) DLY[i] = .26 * (.25 * RND[i] + .75 * Math.min(1, Math.hypot(A.x[i] * s + dx - ns[0], A.y[i] * s + dy - ns[1]) / 1.2));
    tr = { a: cur, b: k, f: 0, dir: 1, dur: dur / 1000, sgn: k > cur ? 1 : -1 }; born[k] = tl;
  }
  function go(k, dur) {
    if (k < 0 || k >= COUNT || !forms[k]) return;
    if (tr) {
      if (k === tr.a) { tr.dir = -1; queued = null; return; }
      if (k === tr.b) { tr.dir = 1; queued = null; return; }
      queued = k; qdur = dur; return;
    }
    if (k !== cur) begin(k, dur);
  }
  const dest = () => (tr ? (queued ?? (tr.dir > 0 ? tr.b : tr.a)) : cur);

  const pr = [0, 0, 0, 0], pa = [0, 0, 0, 0], pb = [0, 0, 0, 0];
  const st = { cur: 0, moving: false, a: 0, b: 0, f: 0, sgn: 1, P: 0 };
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const rdt = last ? Math.min(.25, (now - last) / 1000) : .016, dt = Math.min(.05, rdt); last = now;
    const tg = (now - t0) / 1000, t = reduce ? 0 : tg; tl = t * LIFE; frameNo++;
    if (tr) {
      tr.f += tr.dir * rdt / tr.dur;
      if (tr.f >= 1 || tr.f <= 0) {
        cur = tr.f >= 1 ? tr.b : tr.a; tr = null; onArrive(cur);
        if (queued != null) { const k = queued; queued = null; if (k !== cur && forms[k]) begin(k, qdur); }
      }
    }
    bright += (brightT - bright) * (1 - Math.exp(-dt * 1.2)); flash *= Math.exp(-dt * 1.1);
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 1.5)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 1.5)); mouse.on = Math.max(0, mouse.on - dt * .2);
    const A = forms[tr ? tr.a : cur];
    if (!A || !L) return;
    const B = tr ? forms[tr.b] : null, f = tr ? clamp(tr.f) : 0;
    // while changing scene, each picture's own (slow) life is refreshed on alternate frames
    const ia = tr ? tr.a : cur;
    if (!B || frameNo % 2 === 0 || liveA !== A) { A.live(tl, LA, tl - born[ia]); xform(A, LA); liveA = A; }
    if (B && (frameNo % 2 === 1 || liveB !== B)) { B.live(tl, LB, tl - born[tr.b]); xform(B, LB); liveB = B; }
    if (!B) liveB = null;

    // the North Star sets out a moment after the words begin to fade, and arrives before the stars do
    const na = nsOf(A, tl, tl - born[ia]), nb = B ? nsOf(B, tl, tl - born[tr.b]) : na, g = B ? smoother(clamp((f - .04) / .8)) : 0;
    const lift = B ? Math.sin(Math.PI * g) * Math.min(.12, Math.hypot(nb[0] - na[0], nb[1] - na[1]) * .3) : 0;
    const ns = [mix(na[0], nb[0], g), mix(na[1], nb[1], g) - lift, mix(na[2], nb[2], g)];
    const eA = A.env, eB = B ? B.env : eA, m = B ? smooth(clamp((f - .1) / .75)) : 0;

    const yaw = .045 * Math.sin(t * .045) + mouse.sx * .06, pit = .028 * Math.sin(t * .033) + mouse.sy * .04;
    cyw = Math.cos(yaw); syw = Math.sin(yaw); cpi = Math.cos(pit); spi = Math.sin(pit);
    const sc = L.U / 470 * DPR, glob = bright * (1 + flash * .6), wakeA = woke ? clamp((tg - tWake) * 1.2) : 0;
    let o = 0;
    for (let i = 0; i < n; i++) {
      let x, y, z, s, a, cr, cg, cb, ly;
      if (B) {
        let u = (f - DLY[i]) / .74; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const e = u * u * u * (u * (u * 6 - 15) + 10), bm = reduce ? 0 : Math.sin(Math.PI * u), fade = 1 - .38 * bm;
        x = LA.X[i] + (LB.X[i] - LA.X[i]) * e; y = LA.Y[i] + (LB.Y[i] - LA.Y[i]) * e; z = LA.Z[i] + (LB.Z[i] - LA.Z[i]) * e - .28 * bm;
        s = (LA.S[i] + (LB.S[i] - LA.S[i]) * e) * (1 - .3 * bm); a = (LA.A[i] + (LB.A[i] - LA.A[i]) * e) * fade;
        cr = LA.R[i] + (LB.R[i] - LA.R[i]) * e; cg = LA.G[i] + (LB.G[i] - LA.G[i]) * e; cb = LA.B[i] + (LB.B[i] - LA.B[i]) * e;
        ly = e < .5 ? A.l[i] : B.l[i];
      } else { x = LA.X[i]; y = LA.Y[i]; z = LA.Z[i]; s = LA.S[i]; a = LA.A[i]; cr = LA.R[i]; cg = LA.G[i]; cb = LA.B[i]; ly = A.l[i]; }
      if (!reduce) a *= Math.max(clamp((tg - ORD[i]) * 1.1), wakeA);
      proj(x, y, z, pr);
      const blur = clamp((Math.abs(pr[2]) - .3) * 1.35);
      let size = s * sc * 6 * pr[3] * (1 + blur * 2);
      a *= glob * (1 - blur * .55) / (1 + blur * 1.8);
      if (mouse.on > 0) { const ddx = pr[0] - mouse.px, ddy = pr[1] - mouse.py; a *= 1 + .6 * mouse.on * Math.exp(-(ddx * ddx + ddy * ddy) / 22000); }
      if (size > 90 * DPR) size = 90 * DPR;
      if (size < 1.5) { a *= size / 1.5; size = 1.5; }
      buf[o++] = pr[0] * DPR; buf[o++] = pr[1] * DPR; buf[o++] = size; buf[o++] = blur; buf[o++] = cr; buf[o++] = cg; buf[o++] = cb; buf[o++] = a; buf[o++] = ly;
    }

    // the North Star itself
    proj(ns[0], ns[1], ns[2], pr);
    const nsS = mix(eA.nsS, eB.nsS, g), kU = Math.sqrt(L.U / 470) * DPR * pr[3];
    const star = {
      x: pr[0] * DPR, y: pr[1] * DPR, core: 4.2 * kU * Math.pow(nsS, .75), spk: 34 * kU * Math.pow(nsS, .7), ray: mix(eA.ray, eB.ray, g),
      I: (woke ? 1 : clamp((tg - 1.4) * .45)) * glob * mix(eA.nsI, eB.nsI, g) * (1 + .07 * Math.sin(t * .8) + .035 * Math.sin(t * 2.3 + 1)),
      rot: t * .02,
    };
    // the room's light, and where the hills stand if this room has them
    const hzF = B && eB.hz ? B : eA.hz ? A : null;
    let map = null;
    if (hzF) { const { k, dx, dy } = hzF.xf || XF0; map = [(L.ox + dx * L.U) * DPR, (L.oy + dy * L.U) * DPR, k * L.U * DPR, hzF.env.pk, hzF.env.base]; }
    const room = {
      top: mix3(eA.top, eB.top, m), bot: mix3(eA.bot, eB.bot, m), g1: mix3(eA.g1, eB.g1, m), g2: mix3(eA.g2, eB.g2, m),
      gas: mix(eA.gas, eB.gas, m) * Math.min(1, bright * 1.2), glow: mix(eA.glow, eB.glow, m) * star.I, dust: mix(eA.dust, eB.dust, m),
      hz: mix(eA.hz, eB.hz, m), hzC: mix3(eA.hzC, eB.hzC, m), pan: mix(eA.pan, eB.pan, m), vig: mix(eA.vig, eB.vig, m), map,
    };
    draw(t, star, room);
    drawInk(A, B, f, tl, tl - born[ia], B ? tl - born[tr.b] : 0);
    st.cur = cur; st.moving = !!tr; st.a = tr ? tr.a : cur; st.b = tr ? tr.b : cur; st.f = f; st.sgn = tr ? tr.sgn : 1;
    st.P = tr ? mix(tr.a, tr.b, smooth(f)) : cur;
    onFrame(st);
  }

  function draw(t, star, room) {
    if (!gl) return draw2d(star);
    const full = (prog, l) => { gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(l.aQ); gl.vertexAttribPointer(l.aQ, 2, gl.FLOAT, false, 0, 0); };
    gl.disable(gl.BLEND);
    // the gas, small, and only every other frame: it moves far too slowly to need more
    if (frameNo % 2 === 0 || gasStale) {
      gasStale = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, gw, gh);
      full(G, gloc);
      gl.uniform2f(gloc.uRes, gw, gh); gl.uniform1f(gloc.uT, t);
      gl.uniform3fv(gloc.uC1, room.g1); gl.uniform3fv(gloc.uC2, room.g2);
      gl.uniform2f(gloc.uOff, room.pan + t * .004, room.pan * .37 - t * .002);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
    }
    // the night
    full(Q, qloc);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gasTex); gl.uniform1i(qloc.uGas, 0);
    gl.uniform2f(qloc.uRes, cv.width, cv.height); gl.uniform1f(qloc.uDpr, DPR); gl.uniform1f(qloc.uT, t);
    gl.uniform3fv(qloc.uTop, room.top); gl.uniform3fv(qloc.uBot, room.bot); gl.uniform1f(qloc.uGasA, room.gas);
    gl.uniform2f(qloc.uNS, star.x, cv.height - star.y); gl.uniform1f(qloc.uGlow, room.glow); gl.uniform1f(qloc.uDust, room.dust * Math.min(1, bright * 1.4));
    gl.uniform1f(qloc.uHz, room.map ? room.hz : 0); gl.uniform3fv(qloc.uHzC, room.hzC); gl.uniform1f(qloc.uVig, room.vig);
    if (room.map) { gl.uniform3f(qloc.uMap, room.map[0], room.map[1], room.map[2]); gl.uniform1f(qloc.uBase, room.map[4][0]); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(qloc.aQ);
    // the stars behind, the North Star, the hills, the stars in front
    gl.enable(gl.BLEND);
    points(0);
    if (star.I > .002) {
      gl.blendFunc(gl.ONE, gl.ONE);
      const rq = Math.max(star.spk * 1.02, star.core * 16, star.ray ? star.core * 34 : 0);
      gl.useProgram(S);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(sloc.aQ); gl.vertexAttribPointer(sloc.aQ, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(sloc.uRes, cv.width, cv.height); gl.uniform2f(sloc.uC, star.x, star.y); gl.uniform1f(sloc.uRq, rq); gl.uniform1f(sloc.uRw, rq);
      gl.uniform1f(sloc.uCore, star.core); gl.uniform1f(sloc.uSpk, star.spk); gl.uniform1f(sloc.uRay, star.ray);
      gl.uniform1f(sloc.uI, star.I); gl.uniform1f(sloc.uT, t); gl.uniform1f(sloc.uRot, star.rot);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(sloc.aQ);
    }
    if (room.map && room.hz > .001) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      full(K, kloc);
      gl.uniform2f(kloc.uRes, cv.width, cv.height); gl.uniform1f(kloc.uDpr, DPR); gl.uniform1f(kloc.uHz, room.hz); gl.uniform3fv(kloc.uHzC, room.hzC);
      gl.uniform3f(kloc.uMap, room.map[0], room.map[1], room.map[2]); gl.uniform3fv(kloc.uPK, room.map[3]); gl.uniform3fv(kloc.uBase, room.map[4]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(kloc.aQ);
      points(1);
    }
  }
  let uploaded = -1;
  function points(layer) {
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    if (uploaded !== frameNo) { gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf); uploaded = frameNo; }
    const sb = STR * 4;
    gl.enableVertexAttribArray(loc.aP); gl.vertexAttribPointer(loc.aP, 2, gl.FLOAT, false, sb, 0);
    gl.enableVertexAttribArray(loc.aS); gl.vertexAttribPointer(loc.aS, 1, gl.FLOAT, false, sb, 8);
    gl.enableVertexAttribArray(loc.aB); gl.vertexAttribPointer(loc.aB, 1, gl.FLOAT, false, sb, 12);
    gl.enableVertexAttribArray(loc.aC); gl.vertexAttribPointer(loc.aC, 4, gl.FLOAT, false, sb, 16);
    gl.enableVertexAttribArray(loc.aL); gl.vertexAttribPointer(loc.aL, 1, gl.FLOAT, false, sb, 32);
    gl.uniform2f(loc.uRes, cv.width, cv.height); gl.uniform1f(loc.uLayer, layer);
    gl.drawArrays(gl.POINTS, 0, n);
    [loc.aP, loc.aS, loc.aB, loc.aC, loc.aL].forEach(l => gl.disableVertexAttribArray(l));
  }
  function draw2d(star) {
    c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalCompositeOperation = 'source-over'; c2.fillStyle = '#000'; c2.fillRect(0, 0, cv.width, cv.height);
    c2.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const j = i * STR, a = buf[j + 7]; if (a < .01) continue;
      c2.fillStyle = `rgba(${buf[j + 4] * 255 | 0},${buf[j + 5] * 255 | 0},${buf[j + 6] * 255 | 0},${Math.min(1, a).toFixed(3)})`;
      c2.beginPath(); c2.arc(buf[j], buf[j + 1], Math.max(.6, buf[j + 2] / 6), 0, 6.2832); c2.fill();
    }
    const R = star.core * 6, g = c2.createRadialGradient(star.x, star.y, 0, star.x, star.y, R);
    g.addColorStop(0, `rgba(255,248,230,${Math.min(1, star.I)})`); g.addColorStop(.15, `rgba(255,220,150,${.4 * Math.min(1, star.I)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c2.fillStyle = g; c2.fillRect(star.x - R, star.y - R, R * 2, R * 2);
  }

  function drawInk(A, B, f, t, ageA, ageB) {
    ic.setTransform(DPR, 0, 0, DPR, 0, 0); ic.clearRect(0, 0, W, H);
    const wA = clamp(1 - f * 3.2), wB = B ? clamp((f - .7) * 3.3) : 0;
    if (wA > .01 && A.overlay) layer(A.overlay(t, ageA), wA, A.xf);
    if (wB > .01 && B.overlay) layer(B.overlay(t, ageB), wB, B.xf);
  }
  function layer(ov, w, xf) {
    const g = Math.min(1, bright), { k, dx, dy } = xf || XF0;
    if (ov.arcs && ov.arcs.length) {
      // each trail fades from its star backwards: eight segments, batched by brightness
      const SEG = 8, groups = new Map();
      for (const A of ov.arcs) {
        if (A.len < .002) continue;
        const q = Math.round(A.a * 6) / 6, key = (A.c[0] > .88 && A.c[2] < .6 ? 'g' : 'w') + q;
        let gr = groups.get(key); if (!gr) { gr = { c: A.c, a: q, w: A.w, segs: Array.from({ length: SEG }, () => []) }; groups.set(key, gr); }
        for (let j = 0; j < SEG; j++) gr.segs[j].push(A, j);
      }
      ic.lineCap = 'round';
      groups.forEach(gr => {
        const col = gr.c.map(v => v * 255 | 0).join(',');
        ic.lineWidth = Math.max(.7, L.U * k / 520 * gr.w);
        gr.segs.forEach((list, j) => {
          ic.strokeStyle = `rgba(${col},${(gr.a * w * g * Math.pow(1 - j / SEG, 1.6)).toFixed(3)})`; ic.beginPath();
          for (let m = 0; m < list.length; m += 2) {
            const A = list[m];
            for (let q2 = 0; q2 <= 2; q2++) {
              const an = A.a0 + A.len * (j + q2 / 2) / SEG;
              proj((A.x + Math.cos(an) * A.r) * k + dx, (A.y + Math.sin(an) * A.r) * k + dy, 0, pa);
              if (q2) ic.lineTo(pa[0], pa[1]); else ic.moveTo(pa[0], pa[1]);
            }
          }
          ic.stroke();
        });
      });
    }
    if (ov.rings && ov.rings.length) {
      // whole, even rings of light (a ring may be part drawn: len < 2π)
      ic.lineCap = 'round';
      for (const Q of ov.rings) {
        const a = Q.a * w * g; if (Q.len < .002 || a < .004) continue;
        const n = Math.max(12, Math.round(Q.len / 6.2832 * 160));
        ic.lineWidth = Math.max(.6, L.U * k / 620 * (Q.w || 1)); ic.strokeStyle = `rgba(${Q.c.map(v => v * 255 | 0).join(',')},${a.toFixed(3)})`; ic.beginPath();
        for (let j = 0; j <= n; j++) {
          const an = Q.a0 + Q.len * j / n;
          proj((Q.x + Math.cos(an) * Q.r) * k + dx, (Q.y + Math.sin(an) * Q.r) * k + dy, 0, pa);
          if (j) ic.lineTo(pa[0], pa[1]); else ic.moveTo(pa[0], pa[1]);
        }
        ic.stroke();
      }
    }
    if (ov.lines && ov.lines.length) {
      const tot = ov.lines.length, groups = new Map();
      ic.lineWidth = Math.max(.6, L.U / 820); ic.lineCap = 'round';
      for (let j = 0; j < tot; j++) {
        const ln = ov.lines[j], rev = clamp(w * 1.6 - j / tot * .6); if (rev <= 0) continue;
        const a = ln[6] ?? .4; let g2 = groups.get(a); if (!g2) { g2 = []; groups.set(a, g2); }
        g2.push(ln, rev);
      }
      groups.forEach((list, a) => {
        ic.strokeStyle = `rgba(214,178,104,${(a * w * g).toFixed(3)})`; ic.beginPath();
        for (let j = 0; j < list.length; j += 2) {
          const ln = list[j], rev = list[j + 1];
          proj(ln[0] * k + dx, ln[1] * k + dy, ln[2] * k, pa); proj(ln[3] * k + dx, ln[4] * k + dy, ln[5] * k, pb);
          ic.moveTo(pa[0], pa[1]); ic.lineTo(pa[0] + (pb[0] - pa[0]) * rev, pa[1] + (pb[1] - pa[1]) * rev);
        }
        ic.stroke();
      });
    }
    if (ov.labels && ov.labels.length) {
      ic.textAlign = 'center'; ic.textBaseline = 'middle';
      for (const lb of ov.labels) {
        proj(lb.x * k + dx, lb.y * k + dy, (lb.z || 0) * k, pa);
        const fs = Math.max(9, L.U * k * .02 * (lb.fs || 1)), a = (lb.a ?? .66) * w * g;
        const col = lb.col ? lb.col.map(v => v * 255 | 0).join(',') : lb.gold ? '222,190,120' : '190,198,204';
        ic.fillStyle = `rgba(${col},${a.toFixed(3)})`;
        if (lb.it) { ic.font = `italic ${fs * 1.1}px "Cormorant Garamond", Georgia, serif`; if ('letterSpacing' in ic) ic.letterSpacing = '0px'; }
        else { ic.font = `${fs}px Cinzel, "Times New Roman", serif`; if ('letterSpacing' in ic) ic.letterSpacing = `${(fs * .26).toFixed(1)}px`; }
        ic.fillText(lb.t, pa[0], pa[1]);
        if (lb.sub) { if ('letterSpacing' in ic) ic.letterSpacing = '0px'; ic.font = `300 ${fs * 1.12}px "Noto Serif Devanagari", serif`; ic.fillStyle = `rgba(222,190,120,${(a * .82).toFixed(3)})`; ic.fillText(lb.sub, pa[0], pa[1] + fs * 1.6); }
      }
      if ('letterSpacing' in ic) ic.letterSpacing = '0px';
    }
  }

  return {
    N, webgl: !!gl,
    setForm(i, F) { forms[i] = F; },
    has: i => !!forms[i],
    resize,
    start() { last = 0; raf = requestAnimationFrame(frame); },
    pause(v) { if (v) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    go, dest,
    jump(k) { tr = null; queued = null; cur = k; born[k] = tl; },
    state: () => st,
    wake() { if (woke) return; woke = true; tWake = (performance.now() - t0) / 1000; brightT = 1; flash = 1; },
    pointer(x, y) { mouse.x = (x / W - .5) * 2; mouse.y = (y / H - .5) * 2; mouse.px = x; mouse.py = y; mouse.on = 1; },
    onFrame(cb) { onFrame = cb; },
    onArrive(cb) { onArrive = cb; },
  };
}
