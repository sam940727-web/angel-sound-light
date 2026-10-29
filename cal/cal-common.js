/* ============================================================
   歌手行程日历 — 共用逻辑（主题、日期、日历格、Firestore）
   数据结构：
     calendars/{pin}                 { name, theme, createdAt }
     calendars/{pin}/records/{id}    { date:'YYYY-MM-DD', start:'HH:MM', end, title, location, notes, cat, createdAt, updatedAt }
     calAdmins/{sha256(密码)}         { createdAt, users: { pin: { name, createdAt } } }
   ============================================================ */
(function () {
  'use strict';

  var THEMES = [
    { id: 'champagne', name: '香槟金', desc: '金色光点缓缓上升', fx: 'bokeh' },
    { id: 'neon', name: '霓虹舞台', desc: '舞台光束来回扫动', fx: 'neon' },
    { id: 'rose', name: '玫瑰晚宴', desc: '玫瑰花瓣轻轻飘落', fx: 'petal' },
    { id: 'midnight', name: '星夜', desc: '繁星闪烁、流星划过', fx: 'star' },
    { id: 'festive', name: '喜庆红', desc: '天灯冉冉升起', fx: 'lantern' },
    { id: 'sakura', name: '樱花', desc: '浅色樱花飘落', fx: 'petal' },
    { id: 'ocean', name: '海洋', desc: '清爽泡泡与海浪', fx: 'bubble' },
    { id: 'mint', name: '薄荷', desc: '柔和色彩缓缓流动', fx: 'blob' },
  ];
  var DEFAULT_THEME = 'champagne';

  var CATS = [
    { id: 'show', name: '演出', color: '#e0a83a' },
    { id: 'temple', name: '神庙庆典', color: '#e5484d' },
    { id: 'wedding', name: '婚宴', color: '#e5609a' },
    { id: 'opening', name: '开幕/开厅', color: '#f07c2e' },
    { id: 'rehearsal', name: '彩排', color: '#3b8fe8' },
    { id: 'private', name: '私人', color: '#2fa876' },
    { id: 'other', name: '其他', color: '#8f84a8' },
  ];

  var CN_MONTH = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  var WD = ['日', '一', '二', '三', '四', '五', '六'];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return themeById(DEFAULT_THEME);
  }
  function catById(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[CATS.length - 1];
  }

  /* ---------------- 日期 ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return ymd(new Date()); }
  function monthRange(y, m) { return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))]; }
  function dayTitle(s) {
    var d = parseYmd(s);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' + WD[d.getDay()];
  }
  function relDays(s) {
    var n = Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === 2) return '后天';
    if (n < 0) return (-n) + ' 天前';
    return n + ' 天后';
  }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function sortRecs(list) {
    return list.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      var sa = a.start || '', sb = b.start || '';
      if (sa !== sb) return sa < sb ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    });
  }
  function groupByDate(list) {
    var out = {};
    sortRecs(list).forEach(function (r) { (out[r.date] = out[r.date] || []).push(r); });
    return out;
  }

  /* ---------------- 主题 + 动态背景 ---------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function buildFx(el, theme) {
    el.innerHTML = '';
    var small = window.innerWidth < 700;
    function add(vars, cls) {
      var i = document.createElement('i');
      if (cls) i.className = cls;
      Object.keys(vars).forEach(function (k) { i.style.setProperty('--' + k, vars[k]); });
      el.appendChild(i);
    }
    var n, k;
    switch (theme.fx) {
      case 'bokeh':
        for (n = small ? 10 : 16, k = 0; k < n; k++) {
          var d1 = rnd(16, 28);
          add({ x: rnd(-5, 100) + '%', s: rnd(30, 120) + 'px', d: d1 + 's', dl: -rnd(0, d1) + 's', sw: rnd(-60, 60) + 'px', o: rnd(0.5, 1).toFixed(2) });
        }
        break;
      case 'petal':
        for (n = small ? 12 : 20, k = 0; k < n; k++) {
          var d2 = rnd(10, 19);
          add({ x: rnd(0, 100) + '%', s: rnd(10, 22) + 'px', d: d2 + 's', dl: -rnd(0, d2) + 's', sw: rnd(-140, 140) + 'px' });
        }
        break;
      case 'star':
        for (n = small ? 45 : 80, k = 0; k < n; k++) {
          add({ x: rnd(0, 100) + '%', y: rnd(0, 100) + '%', s: rnd(1, 3).toFixed(1) + 'px', d: rnd(2, 5.5) + 's', dl: -rnd(0, 5) + 's' });
        }
        break;
      case 'neon':
        [4, 28, 58, 84].forEach(function (x) {
          add({ x: (x - 11) + '%', d: rnd(5, 9) + 's', dl: -rnd(0, 8) + 's' }, 'beam');
        });
        for (n = small ? 20 : 34, k = 0; k < n; k++) {
          add({ x: rnd(0, 100) + '%', y: rnd(0, 100) + '%', d: rnd(1.6, 4) + 's', dl: -rnd(0, 4) + 's' });
        }
        break;
      case 'lantern':
        for (n = small ? 8 : 13, k = 0; k < n; k++) {
          var d3 = rnd(18, 30);
          add({ x: rnd(0, 96) + '%', s: rnd(18, 42) + 'px', d: d3 + 's', dl: -rnd(0, d3) + 's', sw: rnd(-80, 80) + 'px' });
        }
        break;
      case 'bubble':
        for (n = small ? 10 : 18, k = 0; k < n; k++) {
          var d4 = rnd(9, 17);
          add({ x: rnd(0, 100) + '%', s: rnd(8, 34) + 'px', d: d4 + 's', dl: -rnd(0, d4) + 's', sw: rnd(-40, 40) + 'px' });
        }
        break;
      case 'blob':
        ['#7ee8c2', '#b8a5ff', '#9fd8ff', '#ffd6a5', '#a8f0d0'].forEach(function (c) {
          add({ x: rnd(-15, 75) + '%', y: rnd(-15, 70) + '%', s: rnd(260, 440) + 'px', c: c, d: rnd(9, 16) + 's', dl: -rnd(0, 10) + 's', sw: rnd(-18, 18) + 'vw' });
        });
        break;
    }
  }

  var currentTheme = null;
  function applyTheme(id) {
    var t = themeById(id);
    if (currentTheme === t.id) return t;
    THEMES.forEach(function (x) { document.body.classList.remove('cal-theme-' + x.id); });
    document.body.classList.add('cal-theme-' + t.id);
    currentTheme = t.id;
    var bg = document.getElementById('calBg');
    if (bg) buildFx(bg, t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).getPropertyValue('--tc').trim() || '#0d0b09';
    return t;
  }

  // 风格选择小卡片
  function themePreview(t, active) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp cal-theme-' + t.id + (active ? ' is-active' : '');
    b.dataset.theme = t.id;
    var cal = '<span class="tp-cal">';
    for (var i = 0; i < 14; i++) cal += '<i' + (i === 9 ? ' class="a"' : i === 4 ? ' class="b"' : '') + '></i>';
    cal += '</span>';
    b.innerHTML = cal + '<span class="tp-name"></span><span class="tp-desc"></span>';
    b.querySelector('.tp-name').textContent = t.name;
    b.querySelector('.tp-desc').textContent = t.desc;
    return b;
  }

  /* ---------------- 日历格 ---------------- */
  function renderGrid(el, y, m, byDate, selected) {
    var first = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0).getDate();
    var weeks = Math.ceil((first.getDay() + lastDay) / 7);
    var t = today();
    var frag = document.createDocumentFragment();
    for (var i = 0; i < weeks * 7; i++) {
      var d = new Date(y, m, 1 - first.getDay() + i);
      var s = ymd(d);
      var out = d.getMonth() !== m;
      var recs = out ? [] : (byDate[s] || []);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day' + (out ? ' out' : '') + (s === t ? ' today' : '') + (s === selected ? ' sel' : '') + (recs.length ? ' has' : '');
      b.dataset.date = s;
      b.setAttribute('aria-label', dayTitle(s) + (recs.length ? '，' + recs.length + ' 个行程' : ''));
      var dn = document.createElement('span');
      dn.className = 'dn';
      dn.textContent = d.getDate();
      b.appendChild(dn);
      var dots = document.createElement('span');
      dots.className = 'dots';
      recs.slice(0, 3).forEach(function (r) {
        var dot = document.createElement('i');
        dot.style.setProperty('--c', catById(r.cat).color);
        dots.appendChild(dot);
      });
      if (recs.length > 3) {
        var more = document.createElement('span');
        more.className = 'more';
        more.textContent = '+' + (recs.length - 3);
        dots.appendChild(more);
      }
      b.appendChild(dots);
      frag.appendChild(b);
    }
    el.innerHTML = '';
    el.appendChild(frag);
  }

  function renderLegend(el) {
    el.innerHTML = '';
    CATS.forEach(function (c) {
      var s = document.createElement('span');
      var i = document.createElement('i');
      i.style.setProperty('--c', c.color);
      s.appendChild(i);
      s.appendChild(document.createTextNode(c.name));
      el.appendChild(s);
    });
  }

  function catChips(el, name) {
    el.innerHTML = '';
    CATS.forEach(function (c, i) {
      var l = document.createElement('label');
      l.style.setProperty('--c', c.color);
      var inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = name;
      inp.value = c.id;
      if (i === 0) inp.checked = true;
      var sp = document.createElement('span');
      sp.textContent = c.name;
      l.appendChild(inp);
      l.appendChild(sp);
      el.appendChild(l);
    });
  }

  // 一条行程卡片；opts.who 显示歌手名字（管理员总览用）
  function recordEl(r, i, opts) {
    opts = opts || {};
    var cat = catById(r.cat);
    var li = document.createElement('li');
    li.className = 'rec';
    li.style.setProperty('--c', cat.color);
    li.style.setProperty('--i', i);
    li.tabIndex = 0;

    var time = document.createElement('div');
    time.className = 'r-time';
    if (r.start) {
      var b = document.createElement('b');
      b.textContent = r.start;
      time.appendChild(b);
      if (r.end) {
        var sm = document.createElement('small');
        sm.textContent = '– ' + r.end;
        time.appendChild(sm);
      }
    } else {
      var ad = document.createElement('span');
      ad.className = 'allday';
      ad.textContent = '全天';
      time.appendChild(ad);
    }
    li.appendChild(time);

    var top = document.createElement('div');
    top.className = 'r-top';
    if (opts.who) {
      var w = document.createElement('span');
      w.className = 'r-who';
      w.textContent = opts.who;
      top.appendChild(w);
    }
    var tt = document.createElement('span');
    tt.className = 'r-title';
    tt.textContent = r.title || '（无标题）';
    top.appendChild(tt);
    var ct = document.createElement('span');
    ct.className = 'r-cat';
    ct.textContent = cat.name;
    top.appendChild(ct);
    li.appendChild(top);

    var loc = document.createElement('div');
    loc.className = 'r-loc';
    if (r.location) {
      var lt = document.createElement('span');
      lt.textContent = '📍 ' + r.location;
      loc.appendChild(lt);
      var q = encodeURIComponent(r.location);
      [['Google Maps', 'https://www.google.com/maps/search/?api=1&query=' + q], ['Waze', 'https://waze.com/ul?q=' + q + '&navigate=yes']].forEach(function (p) {
        var a = document.createElement('a');
        a.href = p[1];
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = p[0];
        a.addEventListener('click', function (e) { e.stopPropagation(); });
        loc.appendChild(a);
      });
    }
    li.appendChild(loc);

    if (r.notes) {
      var n = document.createElement('div');
      n.className = 'r-notes';
      n.textContent = r.notes;
      li.appendChild(n);
    }
    return li;
  }

  function nextUpcoming(list) {
    var t = today(), hm = nowHM();
    var future = sortRecs(list).filter(function (r) {
      if (r.date > t) return true;
      if (r.date < t) return false;
      return !r.start || (r.end || r.start) >= hm;
    });
    return future[0] || null;
  }

  /* ---------------- Firestore ---------------- */
  function calCol() { return window.db.collection('calendars'); }
  function calDoc(pin) { return calCol().doc(pin); }
  function recCol(pin) { return calDoc(pin).collection('records'); }
  function adminDoc(key) { return window.db.collection('calAdmins').doc(key); }

  // 等匿名登录完成后才开始监听；回传的函数可以随时取消
  function lazyWatch(start) {
    var un = null, dead = false;
    window.authReady.then(function () { if (!dead) un = start(); });
    return function () { dead = true; if (un) un(); };
  }
  function docs(snap) {
    var out = [];
    snap.forEach(function (d) { out.push(Object.assign({ id: d.id }, d.data())); });
    return out;
  }

  async function getCal(pin) {
    await window.authReady;
    var s = await calDoc(pin).get();
    return s.exists ? s.data() : null;
  }
  function watchCal(pin, cb, onErr) {
    return lazyWatch(function () {
      return calDoc(pin).onSnapshot(function (s) { cb(s.exists ? s.data() : null); }, onErr);
    });
  }
  function watchMonth(pin, y, m, cb, onErr) {
    var r = monthRange(y, m);
    return lazyWatch(function () {
      return recCol(pin).where('date', '>=', r[0]).where('date', '<=', r[1])
        .onSnapshot(function (s) { cb(docs(s)); }, onErr);
    });
  }
  function watchUpcoming(pin, cb, onErr) {
    return lazyWatch(function () {
      return recCol(pin).where('date', '>=', today()).orderBy('date').limit(20)
        .onSnapshot(function (s) { cb(docs(s)); }, onErr);
    });
  }
  function saveRecord(pin, id, data) {
    data.updatedAt = Date.now();
    if (id) return recCol(pin).doc(id).update(data);
    data.createdAt = Date.now();
    return recCol(pin).add(data);
  }
  function deleteRecord(pin, id) { return recCol(pin).doc(id).delete(); }

  async function sha256(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  /* ---------------- 小工具 ---------------- */
  function genPin() { return String(Math.floor(100000 + Math.random() * 900000)); }

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }

  function wirePinInputs(container, onComplete) {
    var inputs = Array.prototype.slice.call(container.querySelectorAll('input'));
    function value() { return inputs.map(function (i) { return i.value; }).join(''); }
    function check() { var v = value(); if (/^\d{6}$/.test(v)) onComplete(v); }
    inputs.forEach(function (inp, idx) {
      inp.addEventListener('input', function () {
        inp.value = inp.value.replace(/\D/g, '').slice(-1);
        if (inp.value && inputs[idx + 1]) inputs[idx + 1].focus();
        check();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && inputs[idx - 1]) inputs[idx - 1].focus();
      });
      inp.addEventListener('paste', function (e) {
        var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!text) return;
        e.preventDefault();
        text.slice(0, 6).split('').forEach(function (ch, i) { if (inputs[i]) inputs[i].value = ch; });
        var last = Math.min(text.length, 6) - 1;
        if (inputs[last]) inputs[last].focus();
        check();
      });
    });
    return {
      clear: function () { inputs.forEach(function (i) { i.value = ''; }); if (inputs[0]) inputs[0].focus(); },
      shake: function () {
        container.classList.remove('shake');
        void container.offsetWidth;
        container.classList.add('shake');
      },
    };
  }

  function openSheet(el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeSheet(el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
  function wireSheet(el) {
    el.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { closeSheet(el); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.sheet.open').forEach(closeSheet);
  });

  // 左右滑动换月
  function wireSwipe(el, onPrev, onNext) {
    var x0 = null, y0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? onPrev : onNext)();
    }, { passive: true });
  }

  window.Cal = {
    THEMES: THEMES, CATS: CATS, CN_MONTH: CN_MONTH, DEFAULT_THEME: DEFAULT_THEME,
    themeById: themeById, catById: catById,
    ymd: ymd, parseYmd: parseYmd, today: today, dayTitle: dayTitle, relDays: relDays,
    sortRecs: sortRecs, groupByDate: groupByDate, nextUpcoming: nextUpcoming,
    applyTheme: applyTheme, themePreview: themePreview,
    renderGrid: renderGrid, renderLegend: renderLegend, catChips: catChips, recordEl: recordEl,
    calDoc: calDoc, recCol: recCol, adminDoc: adminDoc,
    getCal: getCal, watchCal: watchCal, watchMonth: watchMonth, watchUpcoming: watchUpcoming,
    saveRecord: saveRecord, deleteRecord: deleteRecord, sha256: sha256,
    genPin: genPin, toast: toast, wirePinInputs: wirePinInputs,
    openSheet: openSheet, closeSheet: closeSheet, wireSheet: wireSheet, wireSwipe: wireSwipe,
  };
})();
