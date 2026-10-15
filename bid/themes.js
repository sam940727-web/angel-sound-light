/* ============================================================
   大屏幕动态背景主题引擎
   - window.BID_THEMES：主题列表（控制台选择器使用）
   - window.BidBg.apply(id)：在 display.html 切换背景（淡出淡入）
   ============================================================ */
(function () {
  'use strict';

  window.BID_THEMES = [
    { id: 'classic',   name: '经典香槟', desc: '金色光斑缓缓飘浮，低调奢华' },
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

  /* ---------------- theme implementations ---------------- */
  var IMPLS = {
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
})();
