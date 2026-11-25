(function () {
  'use strict';
  var W = 1080, H = 1350, GREEN = '#203731', GOLD = '#FFB612';
  var toastEl = null, toastT = 0, cssDone = false;

  function slugOf(o) {
    var s = String((o && (o.short || o.teamLabel)) || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'team';
  }
  function clamp(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'shr-toast';
        toastEl.setAttribute('role', 'status');
        injectCss();
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      void toastEl.offsetWidth;
      toastEl.classList.add('shr-on');
      clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl && toastEl.classList.remove('shr-on'); }, 2400);
    } catch (e) {}
  }

  function injectCss() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent =
      ".shr-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,20px);background:#000;color:#fff;font:700 18px 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.3px;padding:11px 20px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:10000;max-width:90vw;text-align:center;border:2px solid " + GOLD + "}" +
      ".shr-toast.shr-on{opacity:.95;transform:translate(-50%,0)}" +
      ".shr-back{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:flex;align-items:flex-end;justify-content:center;font-family:'Barlow Condensed',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}" +
      ".shr-sheet{background:#14231f;color:#fff;width:100%;max-width:520px;max-height:100%;overflow:auto;border-radius:22px 22px 0 0;border-top:4px solid " + GOLD + ";padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box}" +
      "@media(min-width:600px){.shr-back{align-items:center}.shr-sheet{border-radius:22px;border:4px solid " + GOLD + ";max-height:94vh}}" +
      ".shr-hint{margin:0 0 10px;text-align:center;font-weight:700;font-size:18px;color:" + GOLD + "}" +
      ".shr-img{display:block;margin:0 auto 14px;max-width:100%;max-height:60vh;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.5);-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto}" +
      ".shr-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
      ".shr-btn{appearance:none;border:0;cursor:pointer;text-decoration:none;text-align:center;background:" + GOLD + ";color:" + GREEN + ";font:800 22px 'Barlow Condensed',system-ui,sans-serif;text-transform:uppercase;letter-spacing:.5px;padding:13px 10px;border-radius:12px;box-shadow:0 4px 0 #b57f00;display:block}" +
      ".shr-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #b57f00}" +
      ".shr-btn.shr-wide{grid-column:1 / -1}" +
      ".shr-btn.shr-ghost{background:transparent;color:#fff;box-shadow:none;border:2px solid rgba(255,255,255,.35)}";
    document.head.appendChild(st);
  }

  function ready() {
    var ps = [];
    try { if (document.fonts) {
      ps.push(document.fonts.ready);
      ps.push(document.fonts.load('80px Anton'));
      ps.push(document.fonts.load('800 40px "Barlow Condensed"'));
      ps.push(document.fonts.load('700 40px "Barlow Condensed"'));
    } } catch (e) {}
    var all = Promise.all(ps.map(function (p) { return Promise.resolve(p).catch(function () {}); }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 3500); })]);
  }

  function fit(ctx, text, font, maxW, startPx, minPx) {
    var px = startPx;
    for (; px > (minPx || 20); px -= 2) { ctx.font = font.replace('{px}', px); if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = font.replace('{px}', px);
    return px;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW, maxLines) {
    var words = String(text || '').split(/\s+/).filter(Boolean), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var l = lines[maxLines - 1];
      while (l.length > 1 && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1);
      lines[maxLines - 1] = l.replace(/[\s.,;:]+$/, '') + '…';
    }
    return lines;
  }

  function drawField(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16302a'); g.addColorStop(1, '#0d1f1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 14; i++) { if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, 170 + i * 90, W, 90); } }
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4;
    for (var y = 260; y < H; y += 180) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.lineWidth = 3;
    for (var y2 = 215; y2 < H; y2 += 90) { for (var x = 40; x < W; x += 200) { ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x + 24, y2); ctx.stroke(); } }
    var v = ctx.createRadialGradient(W / 2, 560, 200, W / 2, 560, 900);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function drawJersey(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    // shoulders
    ctx.fillStyle = GREEN; ctx.strokeStyle = GOLD; ctx.lineWidth = 5;
    rr(ctx, x - r * 1.05, y + r * .25, r * 2.1, r * 1.0, r * .5); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.stroke();
    // helmet
    ctx.beginPath(); ctx.arc(x, y - r * .1, r, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(x - r * .3, y - r * .5, r * .1, x, y, r);
    g.addColorStop(0, '#2f5248'); g.addColorStop(1, GREEN);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = (r * 1.25) + 'px Anton, Impact, sans-serif';
    ctx.fillText('G', x, y - r * .05);
    ctx.restore();
  }

  function drawFallbackCoach(ctx, cx, cy, s, visor) {
    ctx.save(); ctx.translate(cx - 100 * s, cy - 105 * s); ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#222'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(38, 98); ctx.quadraticCurveTo(100, 8, 162, 98); ctx.stroke();
    ctx.fillStyle = '#f2b38f'; ctx.strokeStyle = '#7a4a33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(100, 112, 64, 72, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; rr(ctx, 24, 92, 24, 40, 10); ctx.fill(); rr(ctx, 152, 92, 24, 40, 10); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(34, 72); ctx.quadraticCurveTo(100, 38, 166, 72); ctx.lineTo(170, 84); ctx.quadraticCurveTo(100, 62, 30, 84); ctx.fill();
    ctx.fillStyle = visor || '#111'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 84); ctx.quadraticCurveTo(100, 62, 170, 84); ctx.quadraticCurveTo(100, 108, 30, 84); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(62, 98); ctx.lineTo(88, 94); ctx.moveTo(112, 94); ctx.lineTo(138, 98); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(76, 112, 7, 0, 7); ctx.arc(124, 112, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#e59a76'; ctx.beginPath(); ctx.ellipse(100, 132, 11, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a1414'; ctx.beginPath(); ctx.ellipse(100, 162, 22, 17, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e86a6a'; ctx.beginPath(); ctx.ellipse(100, 170, 13, 7, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function prepSvg(svg, c1) {
    var s = String(svg);
    s = s.replace(/<g[^>]*class="e-shut"[\s\S]*?<\/g>/g, '');
    s = s.replace(/<path[^>]*class="m-flat"[^>]*\/?>(<\/path>)?/g, '');
    s = s.replace(/<text[^>]*class="zz"[\s\S]*?<\/text>/g, '');
    s = s.replace(/var\(--visor,\s*#111\)/g, c1 || '#111').replace(/var\(--visor\)/g, c1 || '#111');
    if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    if (!/viewBox=/.test(s)) s = s.replace('<svg', '<svg viewBox="0 0 200 210"');
    s = s.replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, '<svg$1');
    return s;
  }
  function loadSvg(svg, c1) {
    return new Promise(function (res) {
      var url = null, done = false, img = new Image();
      function fin(v) { if (done) return; done = true; if (url) URL.revokeObjectURL(url); res(v); }
      try {
        url = URL.createObjectURL(new Blob([prepSvg(svg, c1)], { type: 'image/svg+xml;charset=utf-8' }));
        img.onload = function () { fin(img); };
        img.onerror = function () { fin(null); };
        img.src = url;
        setTimeout(function () { fin(null); }, 2500);
      } catch (e) { fin(null); }
    });
  }

  function stroked(ctx, t, x, y, lw, fill, shadow) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowOffsetY = shadow; ctx.shadowBlur = shadow * 1.2; }
    ctx.lineWidth = lw; ctx.strokeStyle = '#000'; ctx.strokeText(t, x, y);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = fill; ctx.fillText(t, x, y);
    ctx.restore();
  }

  function card(o) {
    o = o || {};
    return ready().then(function () {
      var c1 = o.c1 || '#101820', c2 = o.c2 || GOLD;
      var svgP = o.coachSvg ? loadSvg(o.coachSvg, c1) : Promise.resolve(null);
      return svgP.then(function (coachImg) {
        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.textBaseline = 'alphabetic';
        drawField(ctx);

        // top band
        var title = 'MY ' + clamp(o.short || o.teamLabel || 'TEAM', 28).toUpperCase() + ' HUDDLE';
        ctx.fillStyle = c1; ctx.fillRect(0, 0, W, 150);
        ctx.fillStyle = c2; ctx.fillRect(0, 150, W, 8);
        ctx.textAlign = 'center'; ctx.fillStyle = c2;
        var px = fit(ctx, title, '{px}px Anton, Impact, sans-serif', W - 100, 96, 36);
        ctx.fillText(title, W / 2, 75 + px * .36);
        // team label under band (clamped)
        if (o.teamLabel) {
          ctx.font = "700 28px 'Barlow Condensed', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.fillText(clamp(o.teamLabel, 28).toUpperCase(), W / 2, 192);
        }

        // ring + coach
        var cx = W / 2, cy = 482, R = 270;
        var glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 330);
        glow.addColorStop(0, 'rgba(255,182,18,.28)'); glow.addColorStop(1, 'rgba(255,182,18,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 200, W, 600);
        var pts = [];
        for (var i = 0; i < 11; i++) {
          var a = -Math.PI / 2 + i * 2 * Math.PI / 11;
          pts.push([cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * 190]);
        }
        pts.sort(function (a, b) { return a[1] - b[1]; });
        var coachDrawn = false;
        function drawCoach() {
          coachDrawn = true;
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
          var cw = 330, ch = 346;
          if (coachImg) { try { ctx.drawImage(coachImg, cx - cw / 2, cy - ch / 2 - 25, cw, ch); } catch (e) { drawFallbackCoach(ctx, cx, cy - 25, 1.65, c1); } }
          else drawFallbackCoach(ctx, cx, cy - 25, 1.65, c1);
          ctx.restore();
        }
        pts.forEach(function (p) {
          if (!coachDrawn && p[1] > cy) drawCoach();
          drawJersey(ctx, p[0], p[1], 48);
        });
        if (!coachDrawn) drawCoach();
        // nameplate
          ctx.save(); ctx.font = '34px Anton, Impact, sans-serif'; ctx.textAlign = 'center';
          var nt = 'COACH MIKE', nw = ctx.measureText(nt).width + 50;
          rr(ctx, cx - nw / 2, cy + 100, nw, 54, 10); ctx.fillStyle = '#000'; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = GOLD; ctx.stroke();
          ctx.fillStyle = GOLD; ctx.fillText(nt, cx, cy + 137); ctx.restore();

        // chyron sizing first
        var footTop = H - 124, payoff = o.payoff ? String(o.payoff) : '', lines = [], bh = 0, lh = 46;
        if (payoff) {
          ctx.font = "800 40px 'Barlow Condensed', sans-serif";
          lines = wrap(ctx, payoff, W - 150, 3); bh = lines.length * lh + 30;
        }
        var by = footTop - 12 - bh;
        var baseP = by - 16;
        var pk = 'PACKERS!';
        var ppx = fit(ctx, pk, '{px}px Anton, Impact, sans-serif', W - 80, 250, 80);
        ppx = Math.min(ppx, (baseP - 930) / .88);
        var top123 = baseP - .88 * ppx - 20 - 68;

        // star tags
        var stars = (o.stars || []).slice(0, 3);
        if (stars.length) {
          ctx.font = "800 32px 'Barlow Condensed', sans-serif";
          var tags = stars.map(function (s) { var t = (s[1] != null ? '#' + s[1] + ' ' : '') + String(s[0]).toUpperCase(); return { t: t, w: ctx.measureText(t).width + 40 }; });
          var total = tags.reduce(function (a, t) { return a + t.w; }, 0) + (tags.length - 1) * 16;
          var scale = total > W - 80 ? (W - 80) / total : 1;
          var tx = (W - total * scale) / 2, ty = Math.min(top123 - 88, 772);
          ctx.save(); ctx.translate(tx, ty); ctx.scale(scale, scale); var xx = 0;
          tags.forEach(function (t) {
            rr(ctx, xx, 0, t.w, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = GOLD; ctx.stroke();
            ctx.fillStyle = GOLD; ctx.textAlign = 'center'; ctx.fillText(t.t, xx + t.w / 2, 38);
            xx += t.w + 16;
          });
          ctx.restore();
        }

        ctx.textAlign = 'center';
        ctx.font = '100px Anton, Impact, sans-serif';
        stroked(ctx, '1 - 2 - 3', W / 2, baseP - .88 * ppx - 20, 14, '#ffffff', 8);
        ctx.font = ppx + 'px Anton, Impact, sans-serif';
        var g = ctx.createLinearGradient(0, baseP - .88 * ppx, 0, baseP);
        g.addColorStop(0, '#FFD65A'); g.addColorStop(1, GOLD);
        stroked(ctx, pk, W / 2, baseP, Math.max(14, ppx * .09), g, 14);

        if (payoff) {
          ctx.font = "800 40px 'Barlow Condensed', sans-serif";
          ctx.fillStyle = '#0a1226'; ctx.fillRect(50, by, W - 100, bh);
          ctx.fillStyle = GOLD; ctx.fillRect(50, by, 12, bh);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
          lines.forEach(function (l, i) { ctx.fillText(l, 86, by + 48 + i * lh); });
        }

        // sleepy sticker
        if (o.sleepy) {
          ctx.save(); ctx.translate(W - 215, 330); ctx.rotate(.22);
          var st = 'COACH FELL ASLEEP ';
          ctx.font = '40px Anton, Impact, sans-serif';
          var sw = ctx.measureText(st + '\uD83D\uDE34').width + 56;
          ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          rr(ctx, -sw / 2, -36, sw, 72, 12); ctx.fillStyle = '#d4202a'; ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '40px Anton, "Apple Color Emoji", "Segoe UI Emoji", Impact, sans-serif';
          ctx.fillText(st + '\uD83D\uDE34', 0, 14);
          ctx.restore();
        }

        // footer
        ctx.fillStyle = '#000'; ctx.fillRect(0, footTop, W, H - footTop);
        ctx.fillStyle = GOLD; ctx.fillRect(0, footTop, W, 5);
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.font = '62px Anton, Impact, sans-serif';
        ctx.fillText('1-2-3-packers.com', W / 2, footTop + 72);
        ctx.font = "700 24px 'Barlow Condensed', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.fillText('PARODY · cartoon coach · not affiliated with the NFL', W / 2, footTop + 106);

        return new Promise(function (res, rej) {
          cv.toBlob(function (b) { cv.width = cv.height = 0; b ? res(b) : rej(new Error('blob')); }, 'image/png');
        });
      });
    });
  }

  function copyText(t) {
    function fb() {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(fb);
    } catch (e) {}
    fb(); return Promise.resolve();
  }

  function fallbackModal(blob, o, slug) {
    injectCss();
    var objUrl = URL.createObjectURL(blob), text = o.text || '', url = o.url || '';
    var back = document.createElement('div'); back.className = 'shr-back';
    var sheet = document.createElement('div'); sheet.className = 'shr-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    var phone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 800);
    if (phone) { var h = document.createElement('p'); h.className = 'shr-hint'; h.textContent = 'Press and hold the image to save it'; sheet.appendChild(h); }
    var img = document.createElement('img'); img.className = 'shr-img'; img.src = objUrl; img.alt = 'Your huddle card';
    sheet.appendChild(img);
    var row = document.createElement('div'); row.className = 'shr-row'; sheet.appendChild(row);
    var save = document.createElement('a'); save.className = 'shr-btn'; save.textContent = 'Save image'; save.href = objUrl; save.download = 'huddle-' + slug + '.png';
    var file = null;
    try { file = new File([blob], 'huddle-' + slug + '.png', { type: 'image/png' }); } catch (e) {}
    var shareBtn = null;
    if (navigator.share) {
      shareBtn = document.createElement('button'); shareBtn.className = 'shr-btn'; shareBtn.type = 'button'; shareBtn.textContent = 'Share';
      shareBtn.onclick = function () { nativeShare(file, o, null); };
    }
    var copy = document.createElement('button'); copy.className = 'shr-btn'; copy.type = 'button'; copy.textContent = 'Copy link';
    copy.onclick = function () { copyText(url || text).then(function () { toast("Link copied. Go ruin someone's day."); }); };
    var x = document.createElement('a'); x.className = 'shr-btn'; x.textContent = 'Post on X'; x.target = '_blank'; x.rel = 'noopener';
    x.href = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    var close = document.createElement('button'); close.className = 'shr-btn shr-ghost'; close.type = 'button'; close.textContent = 'Close';
    if (shareBtn) row.appendChild(shareBtn);
    row.appendChild(save); row.appendChild(copy); row.appendChild(x); row.appendChild(close);
    function shut() {
      document.removeEventListener('keydown', onKey, true);
      if (back.parentNode) back.parentNode.removeChild(back);
      setTimeout(function () { URL.revokeObjectURL(objUrl); }, 1000);
    }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    close.onclick = shut;
    back.addEventListener('click', function (e) { if (e.target === back) shut(); });
    document.addEventListener('keydown', onKey, true);
    back.appendChild(sheet); document.body.appendChild(back);
    try { close.focus({ preventScroll: true }); } catch (e) {}
  }

  var cache = null, sharing = false;

  function keyOf(o) {
    o = o || {};
    return JSON.stringify([slugOf(o), o.short || '', o.payoff || '', !!o.sleepy, (o.stars || []).map(function (s) { return (s && s[0]) + ':' + (s && s[1]); }).join('|')]);
  }

  function prepare(o) {
    o = o || {};
    var entry = { key: keyOf(o), blob: null, file: null, promise: null };
    entry.promise = card(o).then(function (blob) {
      entry.blob = blob;
      try { entry.file = new File([blob], 'huddle-' + slugOf(o) + '.png', { type: 'image/png' }); } catch (e) {}
      return blob;
    }, function (e) {
      if (cache === entry) cache = null;
      throw e;
    });
    entry.promise.catch(function () {});
    cache = entry;
    return entry.promise;
  }

  // Must be called straight from a tap or click handler: no await or then before it.
  function nativeShare(file, o, fb) {
    if (sharing) return;
    var text = o.text || '', url = o.url || '', p;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        p = navigator.share({ files: [file], text: (text + ' ' + url).trim() });
      } else if (navigator.share) {
        p = navigator.share({ text: text, url: url });
      } else { if (fb) fb(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; if (fb) fb(); return; }
    sharing = true;
    Promise.resolve(p).then(function () { sharing = false; }, function (e) {
      sharing = false;
      if (e && e.name === 'AbortError') return;
      if (fb) fb();
    });
  }

  function open(o) {
    o = o || {};
    try {
      if (sharing) return Promise.resolve();
      var slug = slugOf(o), key = keyOf(o);
      if (cache && cache.key === key && cache.blob) {
        var blob = cache.blob, file = cache.file;
        nativeShare(file, o, function () { fallbackModal(blob, o, slug); });
        return Promise.resolve();
      }
      toast('Making your card…');
      var pr = (cache && cache.key === key) ? cache.promise : prepare(o);
      return pr.then(function (blob) {
        fallbackModal(blob, o, slug);
      }).catch(function () { toast('Could not make the card. Try again.'); });
    } catch (e) { return Promise.resolve(); }
  }

  window.Share = { card: card, prepare: prepare, open: open, toast: toast };
})();
