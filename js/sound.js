// Music: "Little Light", a soft felt-piano waltz (or "Dhruva", a Yaman alap), rendered once offline
// (_local/music/piano.mjs, compose.mjs) so the phone only plays a file and nothing competes with the sky for time.
// Two audio elements take turns and crossfade at the loop, so it never stops; one gain fades it all.
export function createSound({ src = 'audio/piano.aac', xfade = 5, level = .9 } = {}) {
  let ac = null, master = null, on = true, cur = 0, timer = 0, started = false;
  const els = [0, 1].map(() => { const a = new Audio(); a.preload = 'auto'; a.src = src; return { a, g: null }; });

  function ramp(param, v, sec) {
    const now = ac.currentTime;
    param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); param.linearRampToValueAtTime(v, now + sec);
  }
  function tick() {
    const A = els[cur], B = els[cur ^ 1], d = A.a.duration;
    if (!on || !d || A.a.paused) return;
    if (A.a.currentTime > d - xfade) {
      B.a.currentTime = 0; B.a.play().catch(() => {});
      ramp(B.g.gain, 1, xfade); ramp(A.g.gain, 0, xfade);
      cur ^= 1;
      setTimeout(() => { if (els[cur] !== A) A.a.pause(); }, (xfade + .5) * 1000);
    }
  }

  function start() {
    if (started) { setOn(on); return; }
    started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    // both elements are touched inside the tap, so a phone lets either play later
    els.forEach(e => { e.a.play().then(() => { if (e !== els[cur]) e.a.pause(); }).catch(() => {}); });
    if (AC) {
      ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      els.forEach((e, i) => { e.g = ac.createGain(); e.g.gain.value = i === 0 ? 1 : 0; ac.createMediaElementSource(e.a).connect(e.g); e.g.connect(master); });
      ramp(master.gain, on ? level : 0, 4);
    }
    timer = setInterval(tick, 250);
  }

  function setOn(v) {
    on = v; if (!started) return;
    const A = els[cur].a;
    if (v) { if (ac) { ac.resume(); ramp(master.gain, level, 1.5); } A.play().catch(() => {}); }
    else { if (ac) ramp(master.gain, 0, 1.2); setTimeout(() => { if (!on) els.forEach(e => e.a.pause()); }, 1300); }
  }

  return {
    start, setOn,
    scene() {}, // the music runs on its own; scenes no longer steer it
    isOn: () => on,
    pause(hidden) { if (!started) return; if (hidden) { els.forEach(e => e.a.pause()); ac && ac.suspend(); } else if (on) { ac && ac.resume(); els[cur].a.play().catch(() => {}); } },
  };
}
