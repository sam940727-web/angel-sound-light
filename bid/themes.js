/* ============================================================
   大屏幕动态背景主题引擎
   - window.BID_THEMES：主题列表（控制台选择器使用）
   - window.BidBg.apply(id)：在 display.html 切换背景（淡出淡入）
   ============================================================ */
(function () {
  'use strict';

  window.BID_THEMES = [
    { id: 'classic',   name: '经典香槟', desc: '金色光斑缓缓飘浮，低调奢华' },
    { id: 'temple',    name: '神庙祥瑞', desc: '金光流转、祥云飘、对联与香火' },
    { id: 'dragon',    name: '金龙戏珠', desc: '金龙追逐宝珠，气势磅礴' },
    { id: 'fortune',   name: '招财进宝', desc: '金元宝、铜钱从天而降' },
    { id: 'divine',    name: '神光普照', desc: '法轮金光旋转，莲花灯升起' },
    { id: 'firecracker', name: '鞭炮贺岁', desc: '鞭炮噼啪炸响，红纸纷飞' },
    { id: 'festive',   name: '喜庆红金', desc: '红灯笼摇曳，金箔纷飞' },
    { id: 'stage',     name: '舞台灯光', desc: '彩色光束来回扫射，演唱会感' },
    { id: 'starry',    name: '璀璨星空', desc: '繁星闪烁，流星划过' },
    { id: 'aurora',    name: '梦幻极光', desc: '流动的彩色光晕' },
    { id: 'sakura',    name: '浪漫花瓣', desc: '粉色花瓣飘落，适合婚宴' },
    { id: 'fireworks', name: '烟花庆典', desc: '烟花不停绽放' },
  ];
  window.BID_THEME_DEFAULT = 'classic';

  var VALID = {};
  window.BID_THEMES.forEach(function (t) { VALID[t.id] = true; });

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color);
    grd.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.45)'));
    grd.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowCache[color] = c;
    return c;
  }
  function drawGlow(ctx, sprite, x, y, r, a) {
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  }

  var CLOUD_SVG =
    '<svg viewBox="0 0 120 70" aria-hidden="true">' +
    '<path class="cb" d="M14 62C3 62 1 47 12 44C7 31 23 22 34 30C36 15 57 9 66 22C74 11 93 14 95 28C107 25 117 38 109 48C119 52 115 63 104 63Z"/>' +
    '<path class="cc" d="M33 49c-3-8 8-13 13-7c4 5-2 10-6 7M65 42c-3-9 10-14 15-7c4 6-3 11-7 7M91 52c0-6 9-8 11-2"/>' +
    '</svg>';

  function addClouds(deco, n) {
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'xcloud';
      var wv = rand(9, 20);
      c.setAttribute('style',
        'top:' + rand(4, 82).toFixed(1) + '%;width:' + wv.toFixed(1) + 'vw;' +
        '--d:' + rand(55, 95).toFixed(0) + 's;--delay:-' + rand(0, 90).toFixed(0) + 's;--o:' + rand(0.35, 0.8).toFixed(2));
      c.innerHTML = CLOUD_SVG;
      deco.appendChild(c);
    }
  }

  function addRays(deco, top, color) {
    var r = document.createElement('div');
    r.className = 'rays';
    r.setAttribute('style', '--ry:' + top + (color ? ';--rc:' + color : ''));
    deco.appendChild(r);
  }

  function star4(ctx, x, y, r, a) {
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  /* ---------------- theme implementations ---------------- */
  var IMPLS = {
    temple: function () {
      var smoke = [], embers = [];
      var smokeS = glowSprite('rgba(255,236,214,1)');
      var emberS = glowSprite('rgba(255,170,70,1)');
      function resetSmoke(s, w, h) {
        s.x = rand(w * 0.04, w * 0.96); s.y = h + rand(10, 80); s.r = rand(30, 60);
        s.vy = rand(-34, -16); s.ph = rand(0, 6.28); s.life = 0; s.max = rand(8, 13);
        return s;
      }
      return {
        dom: function (deco) {
          addRays(deco, '-12vh');
          addClouds(deco, 7);
          [['left', '风调雨顺'], ['right', '国泰民安']].forEach(function (c) {
            var el = document.createElement('div');
            el.className = 'couplet ' + c[0];
            el.textContent = c[1];
            deco.appendChild(el);
          });
        },
        init: function (w, h) {
          smoke = []; embers = [];
          for (var i = 0; i < 24; i++) {
            var s = resetSmoke({}, w, h);
            s.life = rand(0, s.max);
            s.y = h + 20 + s.vy * s.life;
            smoke.push(s);
          }
          for (var j = 0; j < 45; j++) {
            embers.push({ x: rand(0, w), y: rand(0, h), r: rand(2, 6), vy: rand(-45, -15), ph: rand(0, 6.28), a: rand(0.3, 0.8) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          smoke.forEach(function (s) {
            s.life += dt;
            if (s.life > s.max) resetSmoke(s, w, h);
            s.y += s.vy * dt;
            var k = s.life / s.max;
            var r = s.r * (1 + k * 2.2);
            drawGlow(ctx, smokeS, s.x + Math.sin(t * 0.5 + s.ph) * 40 * k, s.y, r, 0.07 * Math.sin(Math.PI * k));
          });
          ctx.globalCompositeOperation = 'lighter';
          embers.forEach(function (e) {
            e.y += e.vy * dt;
            if (e.y < -10) { e.y = h + 10; e.x = rand(0, w); }
            var fl = 0.6 + 0.4 * Math.sin(t * 6 + e.ph);
            drawGlow(ctx, emberS, e.x + Math.sin(t + e.ph) * 10, e.y, e.r * 2.2, e.a * fl);
          });
        },
      };
    },

    fortune: function () {
      var items = [], twinkles = [];
      var glowS = glowSprite('rgba(255,215,120,1)');
      function drawIngot(ctx, s) {
        var g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.55);
        g.addColorStop(0, '#fff3c0'); g.addColorStop(0.45, '#eab94a'); g.addColorStop(1, '#8c5c10');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#7a4c08';
        ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.32);
        ctx.quadraticCurveTo(-s * 0.85, s * 0.52, 0, s * 0.52);
        ctx.quadraticCurveTo(s * 0.85, s * 0.52, s, -s * 0.32);
        ctx.quadraticCurveTo(s * 0.5, 0, 0, 0);
        ctx.quadraticCurveTo(-s * 0.5, 0, -s, -s * 0.32);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        var g2 = ctx.createLinearGradient(0, -s * 0.45, 0, 0);
        g2.addColorStop(0, '#fffbe0'); g2.addColorStop(1, '#e0a83a');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.44, s * 0.42, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      function drawCoin(ctx, s) {
        var g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 0, 0, 0, s);
        g.addColorStop(0, '#fff3c0'); g.addColorStop(0.55, '#e3ad3e'); g.addColorStop(1, '#9a6a14');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
        ctx.rect(-s * 0.22, -s * 0.22, s * 0.44, s * 0.44);
        ctx.fill('evenodd');
        ctx.strokeStyle = '#7a4c08';
        ctx.lineWidth = Math.max(1, s * 0.07);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeRect(-s * 0.22, -s * 0.22, s * 0.44, s * 0.44);
      }
      return {
        dom: function (deco) { addRays(deco, '-8vh', 'rgba(255,205,110,.12)'); },
        init: function (w, h) {
          items = []; twinkles = [];
          var n = Math.round(Math.min(30, (w * h) / 45000));
          for (var i = 0; i < n; i++) {
            items.push({
              ingot: Math.random() < 0.5, x: rand(0, w), y: rand(-h, h), s: rand(18, 34),
              vy: rand(45, 95), rot: rand(-0.25, 0.25), vr: rand(-0.8, 0.8), ph: rand(0, 6.28), sp: rand(1.5, 3.5),
            });
          }
          for (var j = 0; j < 45; j++) twinkles.push({ x: rand(0, w), y: rand(0, h), r: rand(4, 11), ph: rand(0, 6.28), sp: rand(1, 3) });
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = '#fff4cc';
          twinkles.forEach(function (s) {
            var a = Math.max(0, Math.sin(t * s.sp + s.ph));
            drawGlow(ctx, glowS, s.x, s.y, s.r * 1.6, a * 0.35);
            star4(ctx, s.x, s.y, s.r, a * 0.9);
          });
          ctx.globalCompositeOperation = 'source-over';
          items.forEach(function (it) {
            it.y += it.vy * dt;
            if (it.y > h + 60) { it.y = -60; it.x = rand(0, w); }
            ctx.globalCompositeOperation = 'lighter';
            drawGlow(ctx, glowS, it.x, it.y, it.s * 2, 0.22);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.95;
            ctx.save();
            ctx.translate(it.x + Math.sin(t * 0.8 + it.ph) * 18, it.y);
            ctx.rotate(it.rot + Math.sin(t * 1.3 + it.ph) * it.vr * 0.4);
            if (it.ingot) {
              drawIngot(ctx, it.s);
            } else {
              var f = Math.cos(t * it.sp + it.ph);
              ctx.scale(Math.abs(f) < 0.08 ? 0.08 : f, 1);
              drawCoin(ctx, it.s);
            }
            ctx.restore();
          });
        },
      };
    },

    dragon: function () {
      var N = 48, segs = [], R = 20, SP = 15, LEAD = 60, sparks = [], spT = 0, disc = null;
      var pearlS = glowSprite('rgba(255,244,214,1)');
      var fireS = glowSprite('rgba(255,140,50,1)');
      var goldS = glowSprite('rgba(255,215,120,1)');
      var W0 = 1, H0 = 1;
      function makeDisc() {
        var c = document.createElement('canvas');
        c.width = c.height = 64;
        var g = c.getContext('2d');
        var grd = g.createRadialGradient(26, 22, 2, 32, 32, 32);
        grd.addColorStop(0, '#fff6cf'); grd.addColorStop(0.45, '#efc254'); grd.addColorStop(0.82, '#b07a1c'); grd.addColorStop(1, '#5e3a08');
        g.fillStyle = grd;
        g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(110,66,6,.75)';
        g.lineWidth = 3;
        g.beginPath(); g.arc(14, 32, 26, -0.9, 0.9); g.stroke();
        g.beginPath(); g.arc(-2, 32, 26, -0.7, 0.7); g.stroke();
        return c;
      }
      function pathPos(t) {
        return {
          x: W0 * 0.5 + W0 * 0.43 * Math.sin(t * 0.21),
          y: H0 * 0.5 + H0 * 0.3 * Math.sin(t * 0.34 + 0.8) + H0 * 0.06 * Math.sin(t * 1.1),
        };
      }
      function drawHead(ctx, x, y, a, r, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = '#d8361c';
        [-1, 1].forEach(function (k) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.2, k * r * 0.55);
          ctx.quadraticCurveTo(-r * 1.6, k * r * (1.5 + 0.25 * Math.sin(t * 4 + k)), -r * 2.4, k * r * 0.9);
          ctx.quadraticCurveTo(-r * 1.3, k * r * 0.55, -r * 0.7, k * r * 0.15);
          ctx.fill();
        });
        ctx.strokeStyle = '#f5d27a';
        ctx.lineCap = 'round';
        ctx.lineWidth = r * 0.22;
        [-1, 1].forEach(function (k) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.1, k * r * 0.5);
          ctx.quadraticCurveTo(-r * 0.9, k * r * 1.35, -r * 1.8, k * r * 1.15);
          ctx.stroke();
        });
        var g = ctx.createRadialGradient(r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.7);
        g.addColorStop(0, '#fff3c4'); g.addColorStop(0.5, '#e8b440'); g.addColorStop(1, '#8a5a10');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.88, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 1.0, 0, r * 0.78, r * 0.56, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5e3a08';
        [-1, 1].forEach(function (k) {
          ctx.beginPath(); ctx.arc(r * 1.6, k * r * 0.22, r * 0.08, 0, Math.PI * 2); ctx.fill();
        });
        [-1, 1].forEach(function (k) {
          ctx.fillStyle = '#fff4c8';
          ctx.beginPath(); ctx.ellipse(r * 0.35, k * r * 0.46, r * 0.21, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c8121a';
          ctx.beginPath(); ctx.arc(r * 0.4, k * r * 0.46, r * 0.1, 0, Math.PI * 2); ctx.fill();
        });
        ctx.strokeStyle = 'rgba(255,226,150,.9)';
        ctx.lineWidth = Math.max(1, r * 0.08);
        [-1, 1].forEach(function (k) {
          ctx.beginPath();
          ctx.moveTo(r * 1.45, k * r * 0.35);
          ctx.bezierCurveTo(r * 2.3, k * r * (0.6 + 0.3 * Math.sin(t * 3 + k)), r * 1.3, k * r * (1.7 + 0.3 * Math.sin(t * 2.4 + 1)), r * 2.5, k * r * (2.3 + 0.4 * Math.sin(t * 2)));
          ctx.stroke();
        });
        ctx.restore();
      }
      return {
        dom: function (deco) { addClouds(deco, 8); },
        init: function (w, h) {
          W0 = w; H0 = h;
          var sc = Math.max(0.45, Math.min(w, h) / 900);
          R = 22 * sc; SP = R * 0.72; LEAD = R * 3.2;
          if (!disc) disc = makeDisc();
          var p = pathPos(performance.now() / 1000);
          segs = [];
          for (var i = 0; i < N; i++) segs.push({ x: p.x - LEAD - i * SP, y: p.y });
          sparks = [];
        },
        step: function (ctx, w, h, dt, t) {
          var p = pathPos(t);
          var s0 = segs[0];
          var dx = s0.x - p.x, dy = s0.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d > LEAD) { s0.x = p.x + dx / d * LEAD; s0.y = p.y + dy / d * LEAD; }
          for (var i = 1; i < N; i++) {
            var a = segs[i - 1], b = segs[i];
            var ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey) || 1;
            b.x = a.x + ex / el * SP; b.y = a.y + ey / el * SP;
          }

          spT -= dt;
          if (spT <= 0) {
            spT = 0.05;
            sparks.push({ x: p.x + rand(-R, R), y: p.y + rand(-R, R), vx: rand(-20, 20), vy: rand(-30, 10), life: 0, max: rand(0.8, 1.6) });
          }
          ctx.globalCompositeOperation = 'lighter';
          sparks = sparks.filter(function (s) {
            s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
            var k = 1 - s.life / s.max;
            if (k <= 0) return false;
            drawGlow(ctx, goldS, s.x, s.y, R * 0.35 * k + 2, k * 0.8);
            return true;
          });
          var tail = segs[N - 1];
          drawGlow(ctx, fireS, tail.x, tail.y, R * 2.2, 0.55 + 0.2 * Math.sin(t * 7));

          ctx.globalCompositeOperation = 'source-over';
          for (var j = N - 1; j >= 1; j--) {
            var sg = segs[j], prev = segs[j - 1];
            var ang = Math.atan2(prev.y - sg.y, prev.x - sg.x);
            var taper = 1 - j / N;
            var r = R * (0.25 + 0.75 * Math.pow(taper, 0.55));
            if (j % 3 === 0) {
              var nx = -Math.sin(ang), ny = Math.cos(ang);
              ctx.globalAlpha = 0.85;
              ctx.fillStyle = '#d8401c';
              ctx.beginPath();
              ctx.moveTo(sg.x - Math.cos(ang) * r * 0.6, sg.y - Math.sin(ang) * r * 0.6);
              ctx.lineTo(sg.x - nx * r * 1.7 - Math.cos(ang) * r * 0.9, sg.y - ny * r * 1.7 - Math.sin(ang) * r * 0.9);
              ctx.lineTo(sg.x + Math.cos(ang) * r * 0.6, sg.y + Math.sin(ang) * r * 0.6);
              ctx.fill();
            }
            ctx.globalAlpha = 0.95;
            ctx.save();
            ctx.translate(sg.x, sg.y);
            ctx.rotate(ang);
            ctx.drawImage(disc, -r, -r, r * 2, r * 2);
            ctx.restore();
          }
          var h0 = segs[0], h1 = segs[1];
          ctx.globalAlpha = 1;
          drawHead(ctx, h0.x, h0.y, Math.atan2(h0.y - h1.y, h0.x - h1.x), R * 1.25, t);

          ctx.globalCompositeOperation = 'lighter';
          var pulse = 1 + 0.1 * Math.sin(t * 5);
          drawGlow(ctx, fireS, p.x, p.y, R * 2.2 * pulse, 0.55);
          drawGlow(ctx, pearlS, p.x, p.y, R * 2.8, 0.85);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fffaf0';
          ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.45, 0, Math.PI * 2); ctx.fill();
        },
      };
    },

    divine: function () {
      var lamps = [], dust = [];
      var warmS = glowSprite('rgba(255,200,110,1)');
      var dustS = glowSprite('rgba(255,230,170,1)');
      function mandalaSvg(petals, inner) {
        var s = '<svg viewBox="-100 -100 200 200" fill="none" stroke="#f3d38a" stroke-width="1.1">';
        s += '<circle r="96"/><circle r="90" stroke-dasharray="1.5 4"/>';
        for (var i = 0; i < petals; i++) s += '<ellipse cx="0" cy="-70" rx="7" ry="18" transform="rotate(' + (i * 360 / petals) + ')"/>';
        for (var k = 0; k < inner; k++) s += '<ellipse cx="0" cy="-42" rx="11" ry="22" transform="rotate(' + (k * 360 / inner) + ')"/>';
        s += '<circle r="50"/><circle r="22"/><circle r="12" stroke-dasharray="2 3"/></svg>';
        return s;
      }
      function resetLamp(l, w, h) {
        l.x = rand(w * 0.05, w * 0.95); l.y = h + rand(20, 200); l.s = rand(9, 17);
        l.vy = rand(-28, -14); l.ph = rand(0, 6.28);
        return l;
      }
      function drawLotus(ctx, s) {
        ctx.fillStyle = '#d9a531';
        ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.95, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        for (var i = -2; i <= 2; i++) {
          ctx.save();
          ctx.rotate(i * 0.42);
          ctx.fillStyle = Math.abs(i) === 2 ? '#ff9fb8' : (Math.abs(i) === 1 ? '#ffb9c9' : '#ffd6df');
          ctx.beginPath(); ctx.ellipse(0, -s * 0.45, s * 0.3, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      return {
        dom: function (deco) {
          addRays(deco, '40vh', 'rgba(255,214,130,.11)');
          ['h1', 'h2', 'h3'].forEach(function (c) {
            var h = document.createElement('div');
            h.className = 'halo ' + c;
            deco.appendChild(h);
          });
          var m1 = document.createElement('div');
          m1.className = 'mandala m1';
          m1.innerHTML = mandalaSvg(24, 12);
          deco.appendChild(m1);
          var m2 = document.createElement('div');
          m2.className = 'mandala m2';
          m2.innerHTML = mandalaSvg(16, 8);
          deco.appendChild(m2);
        },
        init: function (w, h) {
          lamps = []; dust = [];
          for (var i = 0; i < 14; i++) {
            var l = resetLamp({}, w, h);
            l.y = rand(0, h);
            lamps.push(l);
          }
          for (var j = 0; j < 60; j++) dust.push({ x: rand(0, w), y: rand(0, h), r: rand(1.5, 4), vy: rand(-12, -4), ph: rand(0, 6.28) });
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          dust.forEach(function (d) {
            d.y += d.vy * dt;
            if (d.y < -5) { d.y = h + 5; d.x = rand(0, w); }
            drawGlow(ctx, dustS, d.x + Math.sin(t * 0.6 + d.ph) * 12, d.y, d.r * 2, 0.3 + 0.3 * Math.sin(t * 2 + d.ph));
          });
          lamps.forEach(function (l) {
            l.y += l.vy * dt;
            if (l.y < -60) resetLamp(l, w, h);
            var x = l.x + Math.sin(t * 0.5 + l.ph) * 20;
            ctx.globalCompositeOperation = 'lighter';
            drawGlow(ctx, warmS, x, l.y, l.s * 3.2, 0.45 + 0.15 * Math.sin(t * 3 + l.ph));
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.9;
            ctx.save();
            ctx.translate(x, l.y);
            ctx.rotate(Math.sin(t + l.ph) * 0.12);
            drawLotus(ctx, l.s);
            ctx.restore();
            ctx.globalCompositeOperation = 'lighter';
            drawGlow(ctx, warmS, x, l.y - l.s * 0.5, l.s * 0.6, 0.9);
          });
        },
      };
    },

    firecracker: function () {
      var deco0 = null, ends = [], bursts = [], bits = [], confetti = [], nextPop = 0.4, side = 0;
      var flashS = glowSprite('rgba(255,240,200,1)');
      var sparkS = glowSprite('rgba(255,200,90,1)');
      var smokeS = glowSprite('rgba(220,210,200,1)');
      var reds = ['#e8262e', '#c8121a', '#ff4b3e', '#f3d27a'];
      return {
        dom: function (deco) {
          deco0 = deco;
          ['left', 'right'].forEach(function (sd) {
            var s = document.createElement('div');
            s.className = 'crackers ' + sd;
            var html = '<i class="ck-str"></i><div class="ck-knot"><span>福</span></div>';
            for (var i = 0; i < 30; i++) html += '<i class="ck"></i>';
            html += '<i class="ck-end"></i>';
            s.innerHTML = html;
            deco.appendChild(s);
          });
        },
        init: function (w, h) {
          ends = [];
          if (deco0) {
            deco0.querySelectorAll('.ck-end').forEach(function (e) {
              var r = e.getBoundingClientRect();
              if (r.width || r.height) ends.push({ x: r.left + r.width / 2, y: r.bottom });
            });
          }
          if (!ends.length) ends = [{ x: w * 0.04, y: h * 0.5 }, { x: w * 0.96, y: h * 0.5 }];
          bursts = []; bits = []; confetti = [];
          var n = Math.round(Math.min(55, (w * h) / 26000));
          for (var i = 0; i < n; i++) {
            confetti.push({ x: rand(0, w), y: rand(-h, h), s: rand(5, 10), vy: rand(30, 70), sw: rand(10, 35), ph: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-3, 3), c: pick(reds) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          nextPop -= dt;
          if (nextPop <= 0) {
            nextPop = rand(0.18, 0.7);
            side = (side + 1) % ends.length;
            var e = ends[side];
            var bx = e.x + rand(-10, 10), by = e.y + rand(-6, 14);
            bursts.push({ x: bx, y: by, life: 0 });
            for (var i = 0; i < 18; i++) {
              var a = rand(0, 6.283), sp = rand(120, 320);
              bits.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(0.35, 0.7), spark: true });
            }
            for (var j = 0; j < 8; j++) {
              bits.push({ x: bx, y: by, vx: rand(-140, 140), vy: rand(-220, -60), life: 0, max: rand(1.4, 2.4), s: rand(4, 8), rot: rand(0, 6), vr: rand(-10, 10), c: pick(reds) });
            }
            bits.push({ x: bx, y: by, vx: rand(-10, 10), vy: -30, life: 0, max: 2.2, smoke: true });
          }

          ctx.globalCompositeOperation = 'source-over';
          confetti.forEach(function (f) {
            f.y += f.vy * dt; f.rot += f.vr * dt;
            if (f.y > h + 20) { f.y = -20; f.x = rand(0, w); }
            ctx.save();
            ctx.translate(f.x + Math.sin(t * 1.2 + f.ph) * f.sw, f.y);
            ctx.rotate(f.rot);
            ctx.scale(1, Math.cos(t * 3 + f.ph));
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = f.c;
            ctx.fillRect(-f.s / 2, -f.s / 2, f.s, f.s * 0.7);
            ctx.restore();
          });

          bits = bits.filter(function (b) {
            b.life += dt;
            var k = 1 - b.life / b.max;
            if (k <= 0) return false;
            if (b.smoke) {
              b.y += b.vy * dt; b.x += b.vx * dt;
              ctx.globalCompositeOperation = 'source-over';
              drawGlow(ctx, smokeS, b.x, b.y, 30 + (1 - k) * 60, 0.12 * k);
            } else if (b.spark) {
              b.vx *= Math.pow(0.1, dt); b.vy = b.vy * Math.pow(0.1, dt) + 200 * dt;
              b.x += b.vx * dt; b.y += b.vy * dt;
              ctx.globalCompositeOperation = 'lighter';
              drawGlow(ctx, sparkS, b.x, b.y, 3 + 5 * k, k);
            } else {
              b.vy += 260 * dt; b.vx *= Math.pow(0.4, dt);
              b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
              ctx.globalCompositeOperation = 'source-over';
              ctx.save();
              ctx.translate(b.x, b.y); ctx.rotate(b.rot);
              ctx.globalAlpha = Math.min(1, k * 1.5);
              ctx.fillStyle = b.c;
              ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6);
              ctx.restore();
            }
            return true;
          });

          ctx.globalCompositeOperation = 'lighter';
          bursts = bursts.filter(function (b) {
            b.life += dt;
            var k = 1 - b.life / 0.22;
            if (k <= 0) return false;
            drawGlow(ctx, flashS, b.x, b.y, 70 * (1.2 - k * 0.4), k);
            return true;
          });
        },
      };
    },

    classic: function () {
      var parts = [];
      var sprites = [glowSprite('rgba(226,204,155,1)'), glowSprite('rgba(200,168,107,1)'), glowSprite('rgba(255,236,190,1)')];
      return {
        init: function (w, h) {
          parts = [];
          var n = Math.round(Math.min(60, (w * h) / 26000));
          for (var i = 0; i < n; i++) {
            parts.push({
              x: rand(0, w), y: rand(0, h), r: rand(8, 46),
              vx: rand(-8, 8), vy: rand(-14, -3), a: rand(0.08, 0.35),
              ph: rand(0, 6.28), sp: rand(0.4, 1.2), s: pick(sprites),
            });
          }
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          parts.forEach(function (p) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.y < -p.r) { p.y = h + p.r; p.x = rand(0, w); }
            if (p.x < -p.r) p.x = w + p.r; else if (p.x > w + p.r) p.x = -p.r;
            drawGlow(ctx, p.s, p.x, p.y, p.r, p.a * (0.6 + 0.4 * Math.sin(t * p.sp + p.ph)));
          });
        },
      };
    },

    festive: function () {
      var foil = [], embers = [];
      var foilColors = ['#f3d27a', '#e2b04a', '#ffe5a0', '#ff6b4a'];
      var emberSprite = glowSprite('rgba(255,140,60,1)');
      return {
        dom: function (deco) {
          var defs = [
            { cls: 'left', style: 'left:clamp(4px,1.4vw,28px)', len: '22vh', d: '4.2s' },
            { cls: 'center', style: 'left:calc(50% - 23px)', len: '14px', d: '3.6s' },
            { cls: 'right', style: 'right:clamp(4px,1.4vw,28px)', len: '28vh', d: '4.8s' },
          ];
          defs.forEach(function (L) {
            var el = document.createElement('div');
            el.className = 'lantern ' + L.cls;
            el.setAttribute('style', L.style + ';--len:' + L.len + ';--d:' + L.d);
            el.innerHTML = '<div class="str"></div><div class="cap"></div><div class="lbody">福</div><div class="cap"></div><div class="tassel"></div>';
            deco.appendChild(el);
          });
        },
        init: function (w, h) {
          foil = []; embers = [];
          var n = Math.round(Math.min(70, (w * h) / 22000));
          for (var i = 0; i < n; i++) {
            foil.push({
              x: rand(0, w), y: rand(-h, h), s: rand(4, 10), vy: rand(25, 60), sw: rand(10, 40),
              ph: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-3, 3), c: pick(foilColors),
            });
          }
          for (var j = 0; j < 30; j++) {
            embers.push({ x: rand(0, w), y: rand(0, h), r: rand(3, 9), vy: rand(-40, -15), a: rand(0.2, 0.6) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          embers.forEach(function (e) {
            e.y += e.vy * dt;
            if (e.y < -10) { e.y = h + 10; e.x = rand(0, w); }
            drawGlow(ctx, emberSprite, e.x + Math.sin(t + e.r) * 6, e.y, e.r, e.a);
          });
          ctx.globalCompositeOperation = 'source-over';
          foil.forEach(function (f) {
            f.y += f.vy * dt; f.rot += f.vr * dt;
            if (f.y > h + 20) { f.y = -20; f.x = rand(0, w); }
            var x = f.x + Math.sin(t * 1.3 + f.ph) * f.sw;
            ctx.save();
            ctx.translate(x, f.y);
            ctx.rotate(f.rot);
            ctx.scale(1, Math.cos(t * 3 + f.ph));
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = f.c;
            ctx.fillRect(-f.s / 2, -f.s / 2, f.s, f.s * 0.6);
            ctx.restore();
          });
        },
      };
    },

    stage: function () {
      var dust = [];
      var dustSprite = glowSprite('rgba(255,255,255,1)');
      return {
        dom: function (deco) {
          var beams = [
            { x: 12, c: 'rgba(255,80,200,.9)', a1: '-28deg', a2: '18deg', d: '6.5s', delay: '0s' },
            { x: 30, c: 'rgba(80,200,255,.9)', a1: '22deg', a2: '-20deg', d: '7.5s', delay: '-2s' },
            { x: 50, c: 'rgba(255,236,190,.95)', a1: '-16deg', a2: '16deg', d: '5.5s', delay: '-1s' },
            { x: 70, c: 'rgba(170,100,255,.9)', a1: '20deg', a2: '-24deg', d: '8s', delay: '-3s' },
            { x: 88, c: 'rgba(255,150,60,.9)', a1: '-18deg', a2: '28deg', d: '6.8s', delay: '-4s' },
          ];
          beams.forEach(function (b) {
            var beam = document.createElement('div');
            beam.className = 'beam';
            beam.setAttribute('style', 'left:' + b.x + '%;--c:' + b.c + ';--a1:' + b.a1 + ';--a2:' + b.a2 + ';--d:' + b.d + ';--delay:' + b.delay);
            deco.appendChild(beam);
            var fx = document.createElement('div');
            fx.className = 'fixture';
            fx.setAttribute('style', 'left:' + b.x + '%;--c:' + b.c);
            deco.appendChild(fx);
          });
          var floor = document.createElement('div');
          floor.className = 'stage-floor';
          deco.appendChild(floor);
        },
        init: function (w, h) {
          dust = [];
          for (var i = 0; i < 70; i++) {
            dust.push({ x: rand(0, w), y: rand(0, h), r: rand(1, 3), vx: rand(-6, 6), vy: rand(-6, 6), ph: rand(0, 6.28) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          dust.forEach(function (d) {
            d.x = (d.x + d.vx * dt + w) % w;
            d.y = (d.y + d.vy * dt + h) % h;
            drawGlow(ctx, dustSprite, d.x, d.y, d.r * 3, 0.12 + 0.12 * Math.sin(t * 1.5 + d.ph));
          });
        },
      };
    },

    starry: function () {
      var stars = [], shooters = [], nextShoot = 1;
      var starSprite = glowSprite('rgba(220,232,255,1)');
      return {
        init: function (w, h) {
          stars = [];
          var n = Math.round(Math.min(260, (w * h) / 6000));
          for (var i = 0; i < n; i++) {
            stars.push({ x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.8), ph: rand(0, 6.28), sp: rand(0.8, 3), b: rand(0.3, 1) });
          }
          shooters = [];
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          stars.forEach(function (s) {
            var a = s.b * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph));
            ctx.globalAlpha = Math.max(0, a);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, 6.283);
            ctx.fill();
            if (s.r > 1.4) drawGlow(ctx, starSprite, s.x, s.y, s.r * 5, a * 0.5);
          });
          nextShoot -= dt;
          if (nextShoot <= 0) {
            nextShoot = rand(1.2, 3.5);
            var ang = rand(0.45, 0.75);
            var sp = rand(700, 1100);
            shooters.push({ x: rand(w * 0.1, w * 0.9), y: rand(-20, h * 0.35), vx: -Math.cos(ang) * sp * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(ang) * sp, life: 0, max: rand(0.7, 1.2) });
          }
          ctx.lineCap = 'round';
          shooters = shooters.filter(function (m) {
            m.life += dt;
            m.x += m.vx * dt; m.y += m.vy * dt;
            var k = 1 - m.life / m.max;
            if (k <= 0) return false;
            var tx = m.x - m.vx * 0.12, ty = m.y - m.vy * 0.12;
            var grd = ctx.createLinearGradient(m.x, m.y, tx, ty);
            grd.addColorStop(0, 'rgba(255,255,255,' + k + ')');
            grd.addColorStop(1, 'rgba(160,190,255,0)');
            ctx.globalAlpha = 1;
            ctx.strokeStyle = grd;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
            drawGlow(ctx, starSprite, m.x, m.y, 8, k);
            return true;
          });
        },
      };
    },

    aurora: function () {
      var sparks = [];
      var sp = [glowSprite('rgba(120,255,210,1)'), glowSprite('rgba(180,140,255,1)'), glowSprite('rgba(255,255,255,1)')];
      return {
        dom: function (deco) {
          ['b1', 'b2', 'b3', 'b4'].forEach(function (c) {
            var b = document.createElement('div');
            b.className = 'blob ' + c;
            deco.appendChild(b);
          });
        },
        init: function (w, h) {
          sparks = [];
          for (var i = 0; i < 55; i++) {
            sparks.push({ x: rand(0, w), y: rand(0, h), r: rand(2, 6), vy: rand(-18, -6), ph: rand(0, 6.28), s: pick(sp) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          sparks.forEach(function (s) {
            s.y += s.vy * dt;
            if (s.y < -10) { s.y = h + 10; s.x = rand(0, w); }
            drawGlow(ctx, s.s, s.x + Math.sin(t * 0.7 + s.ph) * 14, s.y, s.r * 2, 0.25 + 0.25 * Math.sin(t * 2 + s.ph));
          });
        },
      };
    },

    sakura: function () {
      var petals = [], bokeh = [];
      var colors = ['#ffc1d0', '#ffb0c4', '#ffd4de', '#ff9fb8', '#fff0f4'];
      var pinkSprite = glowSprite('rgba(255,170,200,1)');
      function drawPetal(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.6, 0, s);
        ctx.bezierCurveTo(-s * 0.7, s * 0.6, -s * 0.9, -s * 0.6, 0, -s);
        ctx.fill();
      }
      return {
        init: function (w, h) {
          petals = []; bokeh = [];
          var n = Math.round(Math.min(65, (w * h) / 24000));
          for (var i = 0; i < n; i++) {
            petals.push({
              x: rand(0, w), y: rand(-h, h), s: rand(5, 11), vy: rand(30, 70), vx: rand(10, 40),
              sw: rand(15, 50), ph: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-1.6, 1.6), c: pick(colors),
            });
          }
          for (var j = 0; j < 18; j++) {
            bokeh.push({ x: rand(0, w), y: rand(0, h), r: rand(20, 60), a: rand(0.06, 0.18), ph: rand(0, 6.28), vx: rand(-6, 6) });
          }
        },
        step: function (ctx, w, h, dt, t) {
          ctx.globalCompositeOperation = 'lighter';
          bokeh.forEach(function (b) {
            b.x = (b.x + b.vx * dt + w) % w;
            drawGlow(ctx, pinkSprite, b.x, b.y, b.r, b.a * (0.7 + 0.3 * Math.sin(t * 0.8 + b.ph)));
          });
          ctx.globalCompositeOperation = 'source-over';
          petals.forEach(function (p) {
            p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt;
            if (p.y > h + 20 || p.x > w + 30) { p.y = -20; p.x = rand(-w * 0.2, w); }
            ctx.save();
            ctx.translate(p.x + Math.sin(t + p.ph) * p.sw, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(t * 1.6 + p.ph)));
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = p.c;
            drawPetal(ctx, p.s);
            ctx.restore();
          });
        },
      };
    },

    fireworks: function () {
      var rockets = [], sparks = [], nextLaunch = 0.3;
      var palette = ['255,215,120', '255,120,200', '120,220,255', '180,255,150', '255,150,80', '210,160,255'];
      var spriteCache = {};
      function sprite(rgb) {
        if (!spriteCache[rgb]) spriteCache[rgb] = glowSprite('rgba(' + rgb + ',1)');
        return spriteCache[rgb];
      }
      return {
        init: function () { rockets = []; sparks = []; },
        step: function (ctx, w, h, dt) {
          nextLaunch -= dt;
          if (nextLaunch <= 0) {
            nextLaunch = rand(0.5, 1.3);
            rockets.push({ x: rand(w * 0.12, w * 0.88), y: h + 10, vy: -rand(h * 0.75, h * 1.05), tY: rand(h * 0.12, h * 0.45), c: pick(palette) });
          }
          ctx.globalCompositeOperation = 'lighter';
          rockets = rockets.filter(function (r) {
            r.y += r.vy * dt;
            drawGlow(ctx, sprite(r.c), r.x, r.y, 6, 0.9);
            if (r.y <= r.tY) {
              var n = Math.round(rand(45, 75));
              var base = rand(140, 260);
              for (var i = 0; i < n; i++) {
                var a = (i / n) * 6.283 + rand(-0.05, 0.05);
                var s = base * rand(0.6, 1);
                sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(1.2, 2), c: Math.random() < 0.15 ? '255,255,255' : r.c });
              }
              return false;
            }
            return true;
          });
          sparks = sparks.filter(function (p) {
            p.life += dt;
            var k = 1 - p.life / p.max;
            if (k <= 0) return false;
            p.vx *= Math.pow(0.35, dt); p.vy = p.vy * Math.pow(0.35, dt) + 60 * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            drawGlow(ctx, sprite(p.c), p.x, p.y, 2 + 4 * k, k);
            return true;
          });
          if (sparks.length > 1500) sparks.splice(0, sparks.length - 1500);
        },
      };
    },
  };

  /* ---------------- engine ---------------- */
  var layer, deco, canvas, ctx, impl = null, current = null, target = null;
  var W = 0, H = 0, DPR = 1, last = 0, rafId = 0, resizeTimer = 0, applyToken = 0;

  function ensure() {
    if (layer) return true;
    layer = document.getElementById('bgLayer');
    if (!layer) return false;
    deco = layer.querySelector('.bg-deco');
    canvas = layer.querySelector('.bg-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); if (impl) impl.init(W, H); }, 200);
    });
    rafId = requestAnimationFrame(loop);
    return true;
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    var t = now / 1000;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (impl) {
      try { impl.step(ctx, W, H, dt, t); } catch (e) { console.error(e); impl = null; }
    }
  }

  function swap(id) {
    window.BID_THEMES.forEach(function (th) { document.body.classList.remove('theme-' + th.id); });
    document.body.classList.add('theme-' + id);
    deco.innerHTML = '';
    impl = IMPLS[id]();
    if (impl.dom) impl.dom(deco);
    impl.init(W, H);
    current = id;
  }

  function apply(id) {
    if (!VALID[id]) id = window.BID_THEME_DEFAULT;
    if (!ensure() || id === target) return;
    target = id;
    var token = ++applyToken;
    if (current === null) { swap(id); return; }
    layer.classList.add('is-fading');
    setTimeout(function () {
      if (token !== applyToken) return;
      if (id !== current) swap(id);
      layer.classList.remove('is-fading');
    }, 700);
  }

  window.BidBg = {
    apply: apply,
    current: function () { return current; },
  };

  /* ---------------- photo frames ---------------- */
  window.BID_FRAMES = [
    { id: 'simple',  name: '简约细边', desc: '干净简单' },
    { id: 'gold',    name: '金边回纹', desc: '流光金框 + 中式回纹角花' },
    { id: 'temple',  name: '红金牌匾', desc: '朱红门框、金门钉、吉祥牌匾' },
    { id: 'cloud',   name: '祥云金框', desc: '四角祥云轻轻浮动' },
    { id: 'marquee', name: '跑马灯',   desc: '一圈灯泡来回闪烁' },
    { id: 'flow',    name: '流光溢彩', desc: '金色光芒绕框流转' },
  ];
  window.BID_FRAME_DEFAULT = 'simple';

  var CORNER_HUI =
    '<svg viewBox="0 0 60 60" fill="none" stroke="#f0d48a" stroke-width="3" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M3 57V3h54"/><path d="M11 50V11h39"/><path d="M19 42V19h23v15H27v-7h7"/></svg>';
  var CORNERS = ['tl', 'tr', 'bl', 'br'];

  var FRAME_HTML = {
    simple: '',
    gold: '<i class="ring outer"></i><i class="ring inner"></i>' +
      CORNERS.map(function (c) { return '<i class="corner ' + c + '">' + CORNER_HUI + '</i>'; }).join(''),
    temple: '<i class="ring lacquer"></i><i class="ring studs"></i><i class="ring gl1"></i><i class="ring gl2"></i>' +
      '<i class="plaque">吉祥如意</i>',
    cloud: '<i class="ring outer"></i>' +
      CORNERS.map(function (c) { return '<i class="cl ' + c + '">' + CLOUD_SVG + '</i>'; }).join(''),
    marquee: '<i class="ring base"></i><i class="ring bulbs a"></i><i class="ring bulbs b"></i><i class="ring edge"></i>',
    flow: '<i class="ring base"></i><i class="ring flow"><i class="spin"></i></i>',
  };

  function applyFrame(wrap, id) {
    if (!wrap) return;
    if (!FRAME_HTML.hasOwnProperty(id)) id = window.BID_FRAME_DEFAULT;
    if (wrap.dataset.frame === id) return;
    window.BID_FRAMES.forEach(function (f) { wrap.classList.remove('frame-' + f.id); });
    wrap.classList.add('frame-' + id);
    var deco = wrap.querySelector('.frame-deco');
    if (deco) deco.innerHTML = FRAME_HTML[id];
    wrap.dataset.frame = id;
  }

  window.BidFrame = { apply: applyFrame };
})();
