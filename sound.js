(function () {
  'use strict';
  var W = window, ctx = null, master = null, noiseBuf = null, keep = null;
  var KEY = 'p123-muted', muted = false, mur = null;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  function silentWav() {
    var n = 800, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer);
    function s(o, t) { for (var i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); }
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    var str = ''; for (var i = 0; i < b.length; i++) str += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(str);
  }

  function build() {
    var AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    var len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
  }

  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!ctx) build();
      if (ctx) {
        preload();
        if (ctx.state !== 'running') { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
        var sb = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource();
        src.buffer = sb; src.connect(ctx.destination); src.start(0);
      }
    } catch (e) {}
    try {
      if (!keep) {
        keep = document.createElement('audio');
        keep.setAttribute('playsinline', ''); keep.setAttribute('webkit-playsinline', '');
        keep.loop = true; keep.preload = 'auto'; keep.src = silentWav();
        keep.style.display = 'none';
      }
      if (keep.paused && !document.hidden) { var q = keep.play(); if (q && q.catch) q.catch(function () {}); }
    } catch (e) {}
  }

  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    try {
      if (document.hidden) { if (keep) keep.pause(); }
      else { if (keep && keep.src) { var q = keep.play(); if (q && q.catch) q.catch(function () {}); } if (ctx && ctx.state !== 'running') ctx.resume(); }
    } catch (e) {}
  });

  var bufs = {}, loading = false;
  function preload() {
    try {
      if (!ctx || loading) return; loading = true;
      [].forEach(function (k) { // voice removed (Levi 11/25); clips stay in /audio, list them here to bring it back
        fetch('/audio/' + k + '.mp3?v=5').then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
          return new Promise(function (ok, no) { var p = ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
        }).then(function (b) { bufs[k] = b; }).catch(function () { loading = false; });
      });
    } catch (e) {}
  }
  function clip(name) {
    try {
      if (!ctx || !bufs[name]) return false;
      var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[name]; g.gain.value = 1.1;
      s.connect(g); g.connect(master); s.start(ctx.currentTime + 0.01); return true;
    } catch (e) { return false; }
  }

  function safe(fn) { return function () { try { if (!ctx) return; return fn.apply(null, arguments); } catch (e) {} }; }
  function now() { return ctx.currentTime + 0.02; }
  function osc(type, f, t, dur, dest) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function gainEnv(t, a, peak, dur, dest) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest || master); return g;
  }
  function noise(t, dur, loop) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop;
    s.start(t, Math.random()); if (!loop || dur) s.stop(t + dur + 0.05); return s;
  }
  function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  function lfo(f, depth, target, t) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = depth;
    o.connect(g); g.connect(target); o.start(t); return o;
  }
  function shaper(k) {
    var w = ctx.createWaveShaper(), c = new Float32Array(256);
    for (var i = 0; i < 256; i++) { var x = i / 128 - 1; c[i] = Math.tanh(x * k); }
    w.curve = c; return w;
  }

  function blast(t, dur) {
    var g = gainEnv(t, 0.02, 0.35, dur);
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.setValueAtTime(0.35, t + dur - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    [2900, 3070].forEach(function (f) {
      var o = osc('sine', f, t, dur, g);
      lfo(32, 70, o.frequency, t).stop(t + dur + 0.05);
    });
    var n = noise(t, dur), h = filt('highpass', 2500); n.connect(h);
    var ng = ctx.createGain(); ng.gain.value = 0.05; h.connect(ng); ng.connect(g);
  }
  var whistle = safe(function () { var t = now(); blast(t, 0.25); blast(t + 0.38, 0.6); });

  function clap(t, v) {
    [0, 0.011, 0.024].forEach(function (d, i) {
      var n = noise(t + d, 0.03), bp = filt('bandpass', 1400 + i * 200, 1.3), g = gainEnv(t + d, 0.002, v * (i === 2 ? 1 : 0.7), i === 2 ? 0.13 : 0.03);
      n.connect(bp); bp.connect(g);
    });
  }
  var beep = safe(function (n) {
    var t = now(), big = n === 3, v = big ? 1 : 0.85, D = big ? 0.32 : 0.24;
    var g = gainEnv(t, 0.004, v, D), o = osc('sine', big ? 135 : 120, t, D, g);
    o.frequency.exponentialRampToValueAtTime(40, t + D * 0.9);
    var g2 = gainEnv(t, 0.003, 0.4 * v, 0.1), o2 = osc('triangle', 260, t, 0.1, g2);
    o2.frequency.exponentialRampToValueAtTime(90, t + 0.09);
    var s = noise(t, 0.04), lp = filt('lowpass', 1800), g3 = gainEnv(t, 0.002, 0.5 * v, 0.04);
    s.connect(lp); lp.connect(g3);
    clap(t + 0.005, 0.6 * v);
    if (big) {
      var c = noise(t, 1), hp = filt('highpass', 6000), g4 = gainEnv(t, 0.01, 0.3, 0.9);
      c.connect(hp); hp.connect(g4);
    }
    clip(['', 'one', 'two', 'three'][n]);
  });

  function horn(t, dur) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.setValueAtTime(0.5, t + dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    var bp = filt('bandpass', 1200, 0.8), ws = shaper(2.5), mix = ctx.createGain(); mix.gain.value = 1.6;
    mix.connect(bp); bp.connect(ws); ws.connect(g); g.connect(master);
    [233, 277, 349, 415].forEach(function (f) {
      var o = osc('sawtooth', f, t, dur, mix); o.detune.value = (Math.random() - 0.5) * 24;
    });
    var low = ctx.createGain(); low.gain.value = 0.15; low.connect(g);
    osc('square', 466, t, dur, low);
  }
  var airhorn = safe(function () { var t = now(); horn(t, 0.35); horn(t + 0.45, 0.9); });

  var crowd = safe(function () {
    var t = now(), D = 2.5;
    var n = noise(t, D), bp = filt('bandpass', 600, 0.7), g = ctx.createGain();
    bp.frequency.linearRampToValueAtTime(1100, t + 0.8); bp.frequency.linearRampToValueAtTime(700, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    n.connect(bp); bp.connect(g); g.connect(master);
    var n2 = noise(t, D), bp2 = filt('bandpass', 3000, 0.6), g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.25, t + 0.8);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + D);
    n2.connect(bp2); bp2.connect(g2); g2.connect(master);
    var w = gainEnv(t + 0.3, 0.3, 0.07, 1.2), o = osc('sine', 520, t + 0.3, 1.2, w);
    o.frequency.exponentialRampToValueAtTime(820, t + 1.0); o.frequency.exponentialRampToValueAtTime(700, t + 1.5);
    lfo(6, 12, o.frequency, t + 0.3).stop(t + 1.55);
    var o2 = osc('sine', 1040, t + 0.3, 1.2, w);
    o2.frequency.exponentialRampToValueAtTime(1640, t + 1.0);
  });

  var murmur = safe(function (on) {
    if (on) {
      if (mur) return;
      var t = ctx.currentTime, g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.4); g.connect(master);
      var n = noise(t, 0, true), a = filt('bandpass', 450, 0.6), ag = ctx.createGain(); ag.gain.value = 0.22;
      n.connect(a); a.connect(ag); ag.connect(g); lfo(0.3, 0.07, ag.gain, t);
      var n2 = noise(t, 0, true), b = filt('bandpass', 1400, 0.8), bg = ctx.createGain(); bg.gain.value = 0.1;
      n2.connect(b); b.connect(bg); bg.connect(g); lfo(0.5, 0.04, bg.gain, t);
      mur = { g: g, nodes: [n, n2] };
    } else if (mur) {
      var m = mur, t2 = ctx.currentTime; mur = null;
      m.g.gain.cancelScheduledValues(t2); m.g.gain.setValueAtTime(m.g.gain.value, t2);
      m.g.gain.linearRampToValueAtTime(0.0001, t2 + 0.4);
      setTimeout(function () { try { m.nodes.forEach(function (s) { s.stop(); }); m.g.disconnect(); } catch (e) {} }, 500);
    }
  });

  var snoreFn = safe(function () {
    var t = ctx.currentTime + 0.02, live = [], out = ctx.createGain();
    out.gain.value = 1; out.connect(master);
    function amp(base, depth, f) { var g = ctx.createGain(); g.gain.value = base; live.push(lfo(f, depth, g.gain, t)); g.connect(out); return g; }
    var n = noise(t, 0, true); live.push(n);
    var lp = filt('lowpass', 500), g1 = amp(0.1, 0.1, 0.4); n.connect(lp); lp.connect(g1);
    var n2 = noise(t, 0, true); live.push(n2);
    var bp = filt('bandpass', 1000, 1.2), g2 = amp(0.05, 0.07, 0.4); n2.connect(bp); bp.connect(g2);
    var s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 90; live.push(s);
    var sl = filt('lowpass', 700), g3 = amp(0.04, 0.05, 0.45);
    s.connect(sl); sl.connect(g3); live.push(lfo(0.45, 14, s.frequency, t)); s.start(t);
    var w = ctx.createOscillator(); w.type = 'sine'; w.frequency.value = 600; live.push(w);
    var g4 = amp(0.0, 0.03, 0.4); w.connect(g4); live.push(lfo(0.4, 70, w.frequency, t)); w.start(t);
    var stopped = false;
    return function () {
      if (stopped) return; stopped = true;
      try {
        var t2 = ctx.currentTime; out.gain.setValueAtTime(out.gain.value, t2); out.gain.linearRampToValueAtTime(0, t2 + 0.08);
        setTimeout(function () { live.forEach(function (x) { try { x.stop(); } catch (e) {} }); try { out.disconnect(); } catch (e) {} }, 150);
      } catch (e) {}
    };
  });
  function snore() { try { return snoreFn() || function () {}; } catch (e) { return function () {}; } }

  var boing = safe(function () {
    var t = now(), g = gainEnv(t, 0.01, 0.6, 0.45), o = osc('sine', 180, t, 0.45, g);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.15); o.frequency.exponentialRampToValueAtTime(300, t + 0.45);
    lfo(22, 25, o.frequency, t).stop(t + 0.5);
    var g2 = gainEnv(t, 0.01, 0.25, 0.4), o2 = osc('triangle', 360, t, 0.4, g2);
    o2.frequency.exponentialRampToValueAtTime(1200, t + 0.15); o2.frequency.exponentialRampToValueAtTime(600, t + 0.4);
  });

  var pop = safe(function () {
    var t = now(), g = gainEnv(t, 0.003, 0.7, 0.1), o = osc('sine', 700, t, 0.1, g);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    var n = noise(t, 0.03), bp = filt('bandpass', 1800, 1), g2 = gainEnv(t, 0.002, 0.4, 0.03);
    n.connect(bp); bp.connect(g2);
  });

  var ding = safe(function () {
    var t = now(), g = gainEnv(t, 0.003, 0.14, 0.2);
    osc('sine', 1760, t, 0.2, g); osc('sine', 2637, t, 0.2, g);
  });

  var whoosh = safe(function () {
    var t = now(), n = noise(t, 0.45), bp = filt('bandpass', 400, 1.2), g = gainEnv(t, 0.18, 0.7, 0.45);
    bp.frequency.exponentialRampToValueAtTime(2800, t + 0.4);
    n.connect(bp); bp.connect(g);
  });

  function packers() { try { var said = clip('packers'); setTimeout(crowd, said ? 650 : 0); setTimeout(airhorn, said ? 850 : 0); } catch (e) {} }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
    try {
      if (master) {
        var t = ctx.currentTime; master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(muted ? 0 : 0.9, t + 0.03);
      }
    } catch (e) {}
  }

  W.SFX = {
    unlock: unlock, setMuted: setMuted,
    toggleMute: function () { setMuted(!muted); return muted; },
    whistle: whistle, beep: beep, airhorn: airhorn, crowd: crowd, murmur: murmur, snore: snore,
    packers: packers, preload: preload, clip: clip, boing: boing, pop: pop, ding: ding, whoosh: whoosh
  };
  Object.defineProperty(W.SFX, 'muted', { get: function () { return muted; }, enumerable: true });
})();
