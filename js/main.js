// Conductor: the gate, one gesture per chapter, the words, the tabs, the moon and the leave card.
// The page never scrolls. A wheel turn, a swipe or a key starts one slow change of scene, and the sky plays it out.
import { createSky } from './sky.js';
import { COUNT, build, box } from './formations.js';
import { createSound } from './sound.js';

const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 560 || innerWidth < 700;
const sky = createSky($('#sky'), $('#ink'), { reduce, N: small ? 1700 : 2400 });
const sound = createSound();
const scenes = []; $$('.scene').forEach(s => { scenes[+s.dataset.k] = s; });
const wait = ms => new Promise(res => setTimeout(res, ms));
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = t => t * t * (3 - 2 * t);
const LAST = COUNT - 1, STEP = reduce ? 1200 : 5000, JUMP = reduce ? 1200 : 6200, ENTER = reduce ? 1200 : 5600;

let gate = true, entering = false, built = false, L = null, frames = [];
window.__sky = sky; // for local testing

// ---- layout: each scene's picture is centred in the space between its heading and its words
function frameFor(top, bottom, bx = [0, 0, 1.6, 1]) {
  const vw = innerWidth, vh = innerHeight, narrow = vw < 700;
  const availH = Math.max(140, bottom - top), availW = vw - (narrow ? 10 : 64), bw = bx[2] - bx[0], bh = bx[3] - bx[1];
  const U = Math.max(120, Math.min(availW / bw, availH / bh, .98 * Math.min(availW, availH * 1.15)));
  return { vw, vh, U, ox: vw / 2 - (bx[0] + bx[2]) / 2 * U, oy: (top + bottom) / 2 - (bx[1] + bx[3]) / 2 * U, narrow };
}
const bounds = F => ({ x0: -F.ox / F.U - .06, x1: (F.vw - F.ox) / F.U + .06, y0: -F.oy / F.U - .06, y1: (F.vh - F.oy) / F.U + .06 });
const ctxOf = F => ({ N: sky.N, vb: bounds(F), narrow: F.narrow, q: n => Math.max(1, Math.round(n * sky.N / 2400)) });
function measure() {
  const narrow = innerWidth < 700, barB = $('.bar').getBoundingClientRect().bottom, gap = narrow ? 14 : 24;
  root.style.setProperty('--capTop', Math.round(barB + (narrow ? 12 : 22)) + 'px');
  L = frameFor(0, innerHeight);
  frames = [L];
  for (let k = 1; k <= LAST; k++) {
    const hd = $('.scene__head', scenes[k]), ft = $('.scene__foot', scenes[k]);
    frames[k] = frameFor(hd.offsetTop + hd.offsetHeight + gap, ft.offsetTop - gap, box(k, narrow));
  }
}
function make(i) {
  const Fi = frames[i], F = build(i, ctxOf(Fi));
  F.xf = { k: Fi.U / L.U, dx: (Fi.ox - L.ox) / L.U, dy: (Fi.oy - L.oy) / L.U };
  return F;
}
async function buildAll(first) {
  measure(); sky.resize(L);
  if (first) { sky.setForm(0, make(0)); await fontsReady; measure(); sky.resize(L); }
  for (let i = 0; i <= LAST; i++) { sky.setForm(i, make(i)); await wait(0); }
  built = true;
}
const fontsReady = Promise.race([
  Promise.all([
    document.fonts.load('300 60px "Cormorant Garamond"'), document.fonts.load('italic 300 20px "Cormorant Garamond"'), document.fonts.load('20px "Cormorant Garamond"'),
    document.fonts.load('10px Cinzel'), document.fonts.load('300 12px "Noto Serif Devanagari"', 'ध्रुव'),
  ]),
  wait(3000),
]).catch(() => {});

buildAll(true);
sky.start();

let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => { if (built) buildAll(false); }, 280);
});

// ---- the gate
async function enter() {
  if (!gate || entering) return;
  entering = true;
  sound.start(); sound.scene(1); sky.wake(); root.classList.add('is-entering'); setSoundUi();
  while (!built) await wait(60);
  sky.go(1, ENTER);
}
sky.onArrive(k => {
  if (entering && k === 1) { entering = false; gate = false; root.classList.remove('is-gate', 'is-entering'); }
});
$('.gate').addEventListener('click', enter);

// ---- moving: one gesture, one chapter
function go(k) {
  if (gate || !built) return;
  k = Math.max(1, Math.min(LAST, k));
  const d = sky.dest(); if (k === d) return;
  sky.go(k, Math.abs(k - d) > 1 ? JUMP : STEP); sound.scene(k);
}
const step = d => go(sky.dest() + d);

// a wheel gesture (and a trackpad's long inertia after it) moves one chapter; a pause or a change of direction starts the next
let wAcc = 0, wLast = 0, wDir = 0, wLock = 0;
addEventListener('wheel', e => {
  e.preventDefault();
  if (gate || leave.open) return;
  const now = performance.now(), gap = now - wLast; wLast = now;
  const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1), dir = Math.sign(d);
  if (!dir) return;
  if (dir === wDir && (now < wLock || gap < 300)) return;
  if (gap > 400 || dir !== Math.sign(wAcc)) wAcc = 0;
  wAcc += d;
  if (Math.abs(wAcc) >= 30) { step(dir); wAcc = 0; wDir = dir; wLock = now + 1600; }
}, { passive: false });

// a swipe moves either way; a tap (or a click) anywhere that isn't a control moves on
const tappable = el => !(el.closest && el.closest('a, button, input, dialog, .bar, .reach'));
let ty = null, tx = 0, t0 = 0, lastTouch = 0;
addEventListener('touchstart', e => { if (e.touches.length !== 1) { ty = null; return; } ty = e.touches[0].clientY; tx = e.touches[0].clientX; t0 = performance.now(); }, { passive: true });
addEventListener('touchmove', e => { if (!e.target.closest('dialog')) e.preventDefault(); }, { passive: false });
addEventListener('touchend', e => {
  lastTouch = performance.now();
  if (ty == null || gate || leave.open) return;
  const t = e.changedTouches[0], dy = ty - t.clientY, dx = tx - t.clientX; ty = null;
  if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx) * 1.2) step(dy > 0 ? 1 : -1);
  else if (Math.hypot(dx, dy) < 12 && lastTouch - t0 < 450 && tappable(e.target)) step(1);
});
addEventListener('click', e => {
  if (gate || leave.open || performance.now() - lastTouch < 800 || e.button !== 0 || !tappable(e.target)) return;
  if (getSelection && String(getSelection())) return;
  step(1);
});

addEventListener('keydown', e => {
  if (leave.open) return;
  if (gate) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } return; }
  if (e.target.closest && e.target.closest('button, a, dialog')) { if (e.key === ' ' || e.key === 'Enter') return; }
  const k = e.key;
  if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (k === 'Home') { e.preventDefault(); go(1); }
  else if (k === 'End') { e.preventDefault(); go(LAST); }
});
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') sky.pointer(e.clientX, e.clientY); }, { passive: true });

// ---- per frame: the words, the bar, the moon
const seen = new Array(COUNT).fill(-1), tabs = $$('.tabs button'), moonLit = $('.moon__lit');
let lastMoon = -1, lastDest = -1, lastHere = -1;
function moonPath(ph) {
  const R = 10, rx = Math.abs(Math.cos(Math.PI * ph)) * R;
  if (ph <= .001) return '';
  if (ph >= .999) return `M0,${-R} A${R},${R} 0 1,1 0,${R} A${R},${R} 0 1,1 0,${-R}Z`;
  return `M0,${-R} A${R},${R} 0 0,1 0,${R} A${rx.toFixed(2)},${R} 0 0,${ph < .5 ? 0 : 1} 0,${-R}Z`;
}
sky.onFrame(st => {
  for (let k = 1; k <= LAST; k++) {
    let w = 0, ty = 0;
    if (!st.moving) w = k === st.cur ? 1 : 0;
    else if (k === st.a) { w = 1 - smooth(clamp(st.f / .3)); ty = -(1 - w) * 14 * st.sgn; }
    else if (k === st.b) { w = smooth(clamp((st.f - .66) / .3)); ty = (1 - w) * 14 * st.sgn; }
    w = Math.round(w * 400) / 400;
    if (w === seen[k]) continue;
    seen[k] = w;
    const s = scenes[k];
    s.style.opacity = w; s.style.visibility = w > 0 ? 'visible' : 'hidden';
    s.style.transform = ty ? `translateY(${ty.toFixed(1)}px)` : 'none';
    s.style.filter = w < 1 ? `blur(${((1 - w) * 6).toFixed(2)}px)` : 'none';
    s.inert = w < .5;
  }
  // a scene's verse arrives only once its picture has settled
  const here = st.moving ? -1 : st.cur;
  if (here !== lastHere) { scenes[lastHere]?.classList.remove('is-here'); scenes[here]?.classList.add('is-here'); lastHere = here; }
  root.classList.toggle('is-in', !gate || st.P > .5);
  const ph = clamp((st.P - 1) / (LAST - 1)), mq = Math.round(ph * 240);
  if (mq !== lastMoon) { lastMoon = mq; moonLit.setAttribute('d', moonPath(ph)); }
  const d = sky.dest();
  if (d !== lastDest) {
    lastDest = d;
    tabs.forEach(b => b.setAttribute('aria-current', String((b.dataset.go === '2' && d >= 2 && d < LAST) || (b.dataset.go === String(LAST) && d === LAST))));
    root.classList.toggle('on-home', d <= 1);
    root.classList.toggle('in-journey', d >= 2 && d < LAST);
  }
});

// ---- tabs and links: in-site moves go to their scene, everything outside asks first
$$('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
const leave = $('.leave');
$$('[data-leave]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  $('.leave__title').textContent = el.dataset.title || 'Leaving';
  $('.leave__text').textContent = el.dataset.text || '';
  $('.leave__url').textContent = el.dataset.leave.replace(/^https?:\/\//, '');
  leave.dataset.href = el.dataset.leave;
  leave.showModal();
}));
$('.leave__go').addEventListener('click', () => { window.open(leave.dataset.href, '_blank', 'noopener'); leave.close(); });
$('.leave__stay').addEventListener('click', () => leave.close());
leave.addEventListener('click', e => { if (e.target === leave) leave.close(); });

// ---- sound
const soundBtn = $('.sound');
function setSoundUi() { const on = sound.isOn(); soundBtn.classList.toggle('is-on', on); soundBtn.setAttribute('aria-pressed', on); soundBtn.setAttribute('aria-label', on ? 'Music on' : 'Music off'); }
soundBtn.addEventListener('click', () => { sound.setOn(!sound.isOn()); setSoundUi(); });
document.addEventListener('visibilitychange', () => { sky.pause(document.hidden); sound.pause(document.hidden); });
