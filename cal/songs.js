/* ============================================================
   歌手专属歌单 — 歌手页面的「歌单」分页 (cal/index.html)
   资料：calendars/{pin}/usbs/{id}      { name, order, songs:[{no,t}] }
        calendars/{pin}/setlists/{id}  { name, date, songs:[{u,n,no,t,key,ch}] }  key=-4..+4，ch='L'|'R'|''
   ============================================================ */
(function () {
  'use strict';
  var C = window.Cal;
  var $ = function (id) { return document.getElementById(id); };
  var KEY_MAX = 4;

  var pin = null, started = false;
  var usbs = [], usbLoaded = false;
  var lists = [], listLoaded = false;
  var sel = [];            // 目前选的歌 [{k,u,n,no,t,key,ch}]
  var editingId = null;    // 正在修改的歌单
  var current = null;      // 第 3 步显示中的歌单
  var step = 0;
  var usbFilter = 'all';
  var dirty = false;
  var imgBlob = null, imgUrl = null, imgJob = 0;
  var editingUsb = null;
  var usbSheet = $('usbSheet');
  C.wireSheet(usbSheet);

  function onErr(e) {
    console.error(e);
    C.toast('连线出现问题：' + (e && e.message ? e.message : '请检查网络'));
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function songKey(u, no, t) { return u + ':' + no + ':' + t; }
  function usbName(id, fallback) {
    for (var i = 0; i < usbs.length; i++) if (usbs[i].id === id) return usbs[i].name;
    return fallback;
  }
  function dateLabel(d) { return d ? C.dayTitle(d) : ''; }

  /* ---------------- 分页切换 ---------------- */
  function showTab(name) {
    document.querySelectorAll('.main-tabs button').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('tabCal').classList.toggle('hidden', name !== 'cal');
    $('tabSongs').classList.toggle('hidden', name !== 'songs');
    var base = location.pathname + location.search;
    if (name === 'songs') {
      ensureStarted();
      if (location.hash !== '#songs') history.replaceState(null, '', base + '#songs');
    } else if (location.hash === '#songs') {
      history.replaceState(null, '', base);
    }
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.main-tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });

  function onLogin(s) {
    pin = s.pin;
    if (location.hash === '#songs') showTab('songs');
  }
  // cal.js 可能比这个档案更早完成登录，所以两种情况都要处理
  window.addEventListener('cal:login', function (e) { onLogin(e.detail); });
  if (window.calSession) onLogin(window.calSession);

  /* ---------------- 资料订阅 ---------------- */
  function ensureStarted() {
    if (started || !pin) return;
    started = true;
    renderHome();
    C.lazyWatch(function () {
      return C.usbCol(pin).onSnapshot(function (s) {
        usbs = [];
        s.forEach(function (d) { usbs.push(Object.assign({ id: d.id }, d.data())); });
        usbs.forEach(function (u) { u.songs = (u.songs || []).slice().sort(function (a, b) { return a.no - b.no; }); });
        usbs.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        usbLoaded = true;
        renderHome();
        renderUsbList();
        if (step === 1) renderPick();
      }, onErr);
    });
    C.lazyWatch(function () {
      return C.setCol(pin).onSnapshot(function (s) {
        lists = [];
        s.forEach(function (d) { lists.push(Object.assign({ id: d.id }, d.data())); });
        lists.sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        listLoaded = true;
        renderHome();
        if (step === 3 && current && current.id && !lists.some(function (l) { return l.id === current.id; })) goHome();
      }, onErr);
    });
  }

  /* ---------------- 我的歌单（首页） ---------------- */
  function totalSongs() { return usbs.reduce(function (n, u) { return n + u.songs.length; }, 0); }

  function renderHome() {
    var sum = $('libSummary');
    if (!usbLoaded) sum.textContent = '载入中…';
    else if (!usbs.length) sum.textContent = '还没有 USB 歌库，先点「USB 歌库」输入歌曲吧';
    else sum.textContent = usbs.map(function (u) { return u.name + '（' + u.songs.length + ' 首）'; }).join('　');

    var ul = $('slList');
    ul.innerHTML = '';
    if (!listLoaded || !usbLoaded) { ul.appendChild(el('li', 'spinner')); return; }
    if (!lists.length) {
      var e = el('li', 'empty');
      e.appendChild(el('span', 'e-ico', '🎵'));
      e.append('还没有歌单');
      e.appendChild(document.createElement('br'));
      var b = el('button', 'btn btn-sm', totalSongs() ? '＋ 建立第一个歌单' : '🎛️ 先建立 USB 歌库');
      b.type = 'button';
      b.style.marginTop = '12px';
      b.addEventListener('click', totalSongs() ? newList : openUsbSheet);
      e.appendChild(b);
      ul.appendChild(e);
      return;
    }
    lists.forEach(function (l, i) {
      var li = el('li', 'card sl-card');
      li.style.setProperty('--i', i);
      li.tabIndex = 0;
      var badge = el('div', 'sl-badge');
      if (l.date) {
        var d = C.parseYmd(l.date);
        badge.appendChild(el('b', null, d.getDate()));
        badge.appendChild(el('small', null, (d.getMonth() + 1) + '月'));
      } else badge.appendChild(el('b', null, '♪'));
      var main = el('div', 'sl-main');
      main.appendChild(el('h3', null, l.name || '歌单'));
      main.appendChild(el('p', null, [dateLabel(l.date), (l.songs || []).length + ' 首'].filter(Boolean).join(' · ')));
      main.appendChild(el('p', null, (l.songs || []).slice(0, 4).map(function (s) { return s.t; }).join('、')));
      li.append(badge, main, el('span', 'sl-go', '›'));
      var open = function () { openResult(l); };
      li.addEventListener('click', open);
      li.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') open(); });
      ul.appendChild(li);
    });
  }

  function newList() {
    if (!totalSongs()) { C.toast('请先在 USB 歌库输入歌曲'); openUsbSheet(); return; }
    sel = [];
    editingId = null;
    current = null;
    dirty = false;
    $('slName').value = '';
    $('slDate').value = C.today();
    $('songQ').value = '';
    usbFilter = 'all';
    setStep(1);
  }
  $('newListBtn').addEventListener('click', newList);
  $('usbBtn').addEventListener('click', openUsbSheet);

  /* ---------------- 步骤 ---------------- */
  function setStep(n) {
    step = n;
    $('vHome').classList.add('hidden');
    $('vFlow').classList.remove('hidden');
    $('vPick').classList.toggle('hidden', n !== 1);
    $('vConfirm').classList.toggle('hidden', n !== 2);
    $('vResult').classList.toggle('hidden', n !== 3);
    document.querySelectorAll('#steps li').forEach(function (li, i) {
      li.classList.toggle('on', i + 1 === n);
      li.classList.toggle('done', i + 1 < n);
    });
    window.scrollTo(0, 0);
    if (n === 1) renderPick();
    if (n === 2) renderConfirm();
    if (n === 3) renderResult();
  }
  function goHome() {
    step = 0;
    current = null;
    $('vFlow').classList.add('hidden');
    $('vHome').classList.remove('hidden');
    renderHome();
    window.scrollTo(0, 0);
  }
  $('flowBack').addEventListener('click', function () {
    if (step === 2) { setStep(1); return; }
    if (step === 1 && dirty && sel.length && !confirm('还没保存，确定要放弃这次选的歌吗？')) return;
    goHome();
  });

  /* ---------------- 第 1 步：选歌 ---------------- */
  function renderFilters() {
    var f = $('usbFilters');
    f.innerHTML = '';
    if (usbFilter !== 'all' && !usbs.some(function (u) { return u.id === usbFilter; })) usbFilter = 'all';
    [{ id: 'all', name: '全部' }].concat(usbs).forEach(function (u) {
      var b = el('button', 'chip' + (usbFilter === u.id ? ' on' : ''), u.id === 'all' ? '全部' : u.name + ' · ' + u.songs.length);
      b.type = 'button';
      b.addEventListener('click', function () { usbFilter = u.id; $('songQ').value = ''; renderPick(); });
      f.appendChild(b);
    });
  }

  function matches(s, q) {
    if (!q) return true;
    var qn = q.replace(/^no\.?\s*/i, '');
    if (/^\d+$/.test(qn)) return String(s.no) === qn || s.t.toLowerCase().indexOf(q) >= 0;
    return s.t.toLowerCase().indexOf(q) >= 0;
  }

  function renderPick() {
    renderFilters();
    var q = $('songQ').value.trim().toLowerCase();
    var grid = $('songGrid');
    grid.innerHTML = '';
    var frag = document.createDocumentFragment();
    var shown = 0;
    usbs.forEach(function (u) {
      if (usbFilter !== 'all' && usbFilter !== u.id) return;
      var songs = u.songs.filter(function (s) { return matches(s, q); });
      if (!songs.length && q) return;
      var g = el('div', 'sg-group');
      var h = el('h4', null, u.name + ' ');
      h.appendChild(el('small', null, songs.length + ' 首'));
      g.appendChild(h);
      var items = el('div', 'sg-items');
      if (!songs.length) items.appendChild(el('p', 'hint', '这个 USB 还没有歌曲'));
      songs.forEach(function (s) {
        var b = el('button', 'song');
        b.type = 'button';
        b.dataset.k = songKey(u.id, s.no, s.t);
        b.dataset.u = u.id;
        b.dataset.no = s.no;
        b.dataset.t = s.t;
        var no = el('span', 's-no', 'No.');
        no.appendChild(el('b', null, s.no));
        b.append(no, el('span', 's-t', s.t), el('i', 's-ord'));
        var w = el('div', 'song-w');
        w.dataset.k = b.dataset.k;
        var o = buildOpts();
        o.classList.add('sg-opts');
        w.append(b, o);
        items.appendChild(w);
        shown++;
      });
      g.appendChild(items);
      frag.appendChild(g);
    });
    if (!shown && q) {
      var e = el('p', 'empty');
      e.appendChild(el('span', 'e-ico', '🔍'));
      e.append('找不到「' + $('songQ').value.trim() + '」');
      frag.appendChild(e);
    }
    grid.appendChild(frag);
    updateSel(false);
  }

  function updateSel(bump) {
    var idx = {};
    sel.forEach(function (s, i) { idx[s.k] = i + 1; });
    document.querySelectorAll('#songGrid .song-w').forEach(function (w) {
      var b = w.querySelector('.song');
      var n = idx[b.dataset.k];
      b.classList.toggle('on', !!n);
      w.classList.toggle('on', !!n);
      b.setAttribute('aria-pressed', String(!!n));
      b.querySelector('.s-ord').textContent = n || '';
      if (n) paintOpts(w, sel[n - 1]);
    });
    var c = $('pickCount');
    c.textContent = sel.length;
    if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    $('pickNext').disabled = !sel.length;
    $('pickClear').disabled = !sel.length;
  }

  $('songGrid').addEventListener('click', function (e) {
    if (optClick(e)) return;
    var b = e.target.closest('.song');
    if (!b) return;
    var k = b.dataset.k;
    var i = sel.findIndex(function (s) { return s.k === k; });
    if (i >= 0) sel.splice(i, 1);
    else sel.push({ k: k, u: b.dataset.u, n: usbName(b.dataset.u, ''), no: Number(b.dataset.no), t: b.dataset.t, key: 0, ch: '' });
    dirty = true;
    updateSel(true);
  });
  $('songQ').addEventListener('input', renderPick);
  $('pickClear').addEventListener('click', function () {
    if (!sel.length || !confirm('清空已选的 ' + sel.length + ' 首歌？')) return;
    sel = [];
    dirty = true;
    updateSel(true);
  });
  $('pickNext').addEventListener('click', function () { if (sel.length) setStep(2); });

  /* ---------------- 第 2 步：确认 ---------------- */
  function renderConfirm(movedIdx) {
    if (!sel.length) { setStep(1); return; }
    sel.forEach(function (s) { s.n = usbName(s.u, s.n); });
    var ol = $('pickList');
    ol.innerHTML = '';
    sel.forEach(function (s, i) {
      var li = el('li', 'pl-item' + (i === movedIdx ? ' moved' : ''));
      li.dataset.k = s.k;
      if (movedIdx == null) li.style.setProperty('--i', i);
      else li.style.animationDelay = '0s';
      li.appendChild(el('i', 'pl-n', i + 1));
      var main = el('div', 'pl-main');
      main.appendChild(el('b', null, s.t));
      var sm = el('small', null, s.n + ' · ');
      sm.appendChild(el('em', null, 'No.' + s.no));
      main.appendChild(sm);
      li.appendChild(main);
      var acts = el('div', 'pl-acts');
      [['up', '↑', '上移'], ['down', '↓', '下移'], ['rm', '✕', '移除']].forEach(function (a) {
        var b = el('button', a[0], a[1]);
        b.type = 'button';
        b.dataset.act = a[0];
        b.dataset.i = i;
        b.setAttribute('aria-label', a[2]);
        if ((a[0] === 'up' && i === 0) || (a[0] === 'down' && i === sel.length - 1)) b.disabled = true;
        acts.appendChild(b);
      });
      li.appendChild(acts);
      li.appendChild(buildOpts());
      paintOpts(li, s);
      ol.appendChild(li);
    });
  }
  function keyLabel(k) { k = Number(k) || 0; return k > 0 ? '+' + k : String(k); }
  // Key −/+ 与 L/R 控件（选歌步骤和确认步骤共用）；所属歌曲由外层 [data-k] 决定
  function buildOpts() {
    var opts = el('div', 'pl-opts');
    var kw = el('div', 'pl-key');
    kw.appendChild(el('span', 'pl-lbl', 'Key'));
    [['kdn', '−', '降调'], ['kval'], ['kup', '+', '升调']].forEach(function (a) {
      if (a[0] === 'kval') { kw.appendChild(el('b', 'kval')); return; }
      var b = el('button', a[0], a[1]);
      b.type = 'button';
      b.dataset.opt = a[0];
      b.setAttribute('aria-label', a[2]);
      kw.appendChild(b);
    });
    var cw = el('div', 'pl-ch');
    ['L', 'R'].forEach(function (c) {
      var b = el('button', 'ch', c);
      b.type = 'button';
      b.dataset.opt = 'ch';
      b.dataset.c = c;
      cw.appendChild(b);
    });
    opts.append(kw, cw);
    return opts;
  }
  function paintOpts(box, s) {
    var k = Number(s.key) || 0;
    var v = box.querySelector('.kval');
    v.textContent = k ? keyLabel(k) : '原调';
    v.classList.toggle('on', !!k);
    box.querySelector('.kdn').disabled = k <= -KEY_MAX;
    box.querySelector('.kup').disabled = k >= KEY_MAX;
    box.querySelectorAll('.ch').forEach(function (b) {
      var on = s.ch === b.dataset.c;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  function optClick(e) {
    var b = e.target.closest('button[data-opt]');
    if (!b) return false;
    var box = b.closest('[data-k]');
    var s = box && sel.find(function (x) { return x.k === box.dataset.k; });
    if (!s) return true;
    if (b.dataset.opt === 'ch') s.ch = s.ch === b.dataset.c ? '' : b.dataset.c;
    else s.key = Math.max(-KEY_MAX, Math.min(KEY_MAX, (Number(s.key) || 0) + (b.dataset.opt === 'kup' ? 1 : -1)));
    dirty = true;
    paintOpts(box, s);
    return true;
  }
  $('pickList').addEventListener('click', function (e) {
    if (optClick(e)) return;
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var i = Number(b.dataset.i), act = b.dataset.act, j = i;
    if (act === 'rm') {
      sel.splice(i, 1);
      j = null;
    } else {
      j = act === 'up' ? i - 1 : i + 1;
      var t = sel[i]; sel[i] = sel[j]; sel[j] = t;
    }
    dirty = true;
    renderConfirm(j);
  });
  $('backPick').addEventListener('click', function () { setStep(1); });

  $('saveList').addEventListener('click', async function () {
    var date = $('slDate').value;
    var name = $('slName').value.trim() || (date ? (C.parseYmd(date).getMonth() + 1) + '月' + C.parseYmd(date).getDate() + '日 歌单' : '我的歌单');
    var data = {
      name: name,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
      songs: sel.map(function (s) { return { u: s.u, n: s.n, no: s.no, t: s.t, key: Number(s.key) || 0, ch: s.ch || '' }; }),
      updatedAt: Date.now(),
    };
    var btn = this;
    btn.disabled = true;
    try {
      var id = editingId;
      if (id) await C.setCol(pin).doc(id).update(data);
      else {
        data.createdAt = Date.now();
        id = (await C.setCol(pin).add(data)).id;
      }
      current = Object.assign({ id: id }, data);
      editingId = id;
      dirty = false;
      C.toast('✓ 歌单已保存');
      setStep(3);
    } catch (ex) {
      C.toast('保存失败：' + ex.message);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- 第 3 步：图片 / 分享 ---------------- */
  function openResult(l) {
    current = l;
    editingId = l.id;
    setStep(3);
  }

  function singerName() { return (window.calData && window.calData.name) || ''; }

  function buildText(l) {
    var lines = ['🎵 ' + l.name];
    var meta = [singerName(), dateLabel(l.date)].filter(Boolean).join(' · ');
    if (meta) lines.push(meta);
    lines.push('');
    (l.songs || []).forEach(function (s, i) {
      var o = [s.key ? 'Key ' + keyLabel(s.key) : '', s.ch || ''].filter(Boolean).join(', ');
      lines.push((i + 1) + '. ' + s.t + ', ' + s.n + ', No.' + s.no + (o ? ', ' + o : ''));
    });
    lines.push('', '共 ' + (l.songs || []).length + ' 首');
    return lines.join('\n');
  }

  function renderResult() {
    if (!current) { goHome(); return; }
    $('resTitle').textContent = current.name;
    $('resMeta').textContent = [singerName(), dateLabel(current.date), (current.songs || []).length + ' 首'].filter(Boolean).join(' · ');
    $('waText').href = 'https://wa.me/?text=' + encodeURIComponent(buildText(current));
    makeImage(current);
  }

  function fileName() {
    return ('歌单-' + (current ? current.name : '') ).replace(/[\\/:*?"<>|\s]+/g, '_') + '.png';
  }

  function hexRgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return 'rgba(200,168,107,' + a + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rr(x, X, Y, W, H, R) {
    x.beginPath();
    x.moveTo(X + R, Y);
    x.arcTo(X + W, Y, X + W, Y + H, R);
    x.arcTo(X + W, Y + H, X, Y + H, R);
    x.arcTo(X, Y + H, X, Y, R);
    x.arcTo(X, Y, X + W, Y, R);
    x.closePath();
  }
  function fit(x, s, max) {
    s = String(s);
    if (x.measureText(s).width <= max) return s;
    while (s.length > 1 && x.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }

  async function makeImage(l) {
    var job = ++imgJob;
    imgBlob = null;
    $('imgSpin').classList.remove('hidden');
    $('slImg').classList.add('hidden');
    $('shareImg').disabled = $('saveImg').disabled = true;

    var cs = getComputedStyle(document.body);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    var col = { bg: v('--tc') || '#0d0b09', text: v('--text'), muted: v('--muted'), a: v('--accent'), a2: v('--accent-2'), on: v('--on-accent') };
    var SERIF = '"Noto Serif SC","Songti SC","SimSun",serif';
    var SANS = '"Noto Sans SC","Helvetica Neue","Microsoft YaHei",Arial,sans-serif';
    var EN = '"Cormorant Garamond","Times New Roman",serif';
    var songs = l.songs || [];
    var all = l.name + singerName() + songs.map(function (s) { return s.t + s.n; }).join('') + '共首原调星期一二三四五六日月';
    try {
      await timeout(Promise.all([
        document.fonts.load('700 60px "Noto Serif SC"', all),
        document.fonts.load('600 40px "Noto Serif SC"', all),
        document.fonts.load('400 30px "Noto Sans SC"', all),
        document.fonts.load('600 40px "Cormorant Garamond"', 'No.0123456789SETLIST'),
      ]), 4000);
    } catch (e) { /* 字体载入失败就用系统字体 */ }
    if (job !== imgJob) return;

    var singer = singerName();
    var W = 1080, P = 84, ROW = 104, HEAD = singer ? 450 : 380, FOOT = 70;
    var H = HEAD + songs.length * ROW + FOOT;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');

    // 背景 + 光晕
    x.fillStyle = col.bg;
    x.fillRect(0, 0, W, H);
    [[W * 0.9, 0, 760, col.a, 0.3], [0, H, 900, col.a2, 0.2], [W * 0.1, H * 0.35, 520, col.a, 0.08]].forEach(function (g) {
      var gr = x.createRadialGradient(g[0], g[1], 0, g[0], g[1], g[2]);
      gr.addColorStop(0, hexRgba(g[3], g[4]));
      gr.addColorStop(1, hexRgba(g[3], 0));
      x.fillStyle = gr;
      x.fillRect(0, 0, W, H);
    });
    // 外框（双线 + 四角）
    x.strokeStyle = hexRgba(col.a, 0.55); x.lineWidth = 2;
    rr(x, 30, 30, W - 60, H - 60, 38); x.stroke();
    x.strokeStyle = hexRgba(col.a, 0.2); x.lineWidth = 1;
    rr(x, 44, 44, W - 88, H - 88, 30); x.stroke();
    x.fillStyle = col.a;
    [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(function (p) {
      x.save(); x.translate(p[0], p[1]); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore();
    });
    // 大音符装饰
    x.save();
    x.globalAlpha = 0.07; x.fillStyle = col.a; x.font = '360px ' + SERIF; x.textAlign = 'right'; x.textBaseline = 'top';
    x.fillText('♪', W - 40, 10);
    x.restore();

    // 标题区：歌手名字最大，地方（歌单名称）较小
    x.textBaseline = 'alphabetic';
    x.textAlign = 'left';
    x.fillStyle = col.a;
    x.font = '600 28px ' + EN;
    if ('letterSpacing' in x) x.letterSpacing = '10px';
    x.fillText('SETLIST', P, P + 54);
    if ('letterSpacing' in x) x.letterSpacing = '4px';
    var y0 = P + 54;
    if (singer) {
      x.fillStyle = col.text;
      x.font = '700 88px ' + SERIF;
      x.fillText(fit(x, singer, W - P * 2), P, y0 + 108);
      y0 += 108;
    }
    if ('letterSpacing' in x) x.letterSpacing = '1px';
    x.fillStyle = singer ? col.a : col.text;
    x.font = (singer ? '600 40px ' : '700 68px ') + SERIF;
    x.fillText(fit(x, l.name, W - P * 2), P, y0 + (singer ? 66 : 96));
    y0 += singer ? 66 : 96;
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.fillStyle = col.muted;
    x.font = '400 30px ' + SANS;
    x.fillText(fit(x, [dateLabel(l.date), '共 ' + songs.length + ' 首'].filter(Boolean).join('   |   '), W - P * 2), P, y0 + 56);
    var lg = x.createLinearGradient(P, 0, W - P, 0);
    lg.addColorStop(0, col.a); lg.addColorStop(1, hexRgba(col.a, 0));
    x.fillStyle = lg;
    x.fillRect(P, HEAD - 62, W - P * 2, 2);

    // 歌曲
    songs.forEach(function (s, i) {
      var y = HEAD - 30 + i * ROW, h = ROW - 14, cy = y + h / 2;
      if (i % 2 === 0) { x.fillStyle = hexRgba(col.a, 0.07); rr(x, P - 18, y, W - P * 2 + 36, h, 22); x.fill(); }
      var cg = x.createLinearGradient(P, cy - 30, P + 60, cy + 30);
      cg.addColorStop(0, col.a); cg.addColorStop(1, col.a2);
      x.fillStyle = cg;
      x.beginPath(); x.arc(P + 30, cy, 30, 0, Math.PI * 2); x.fill();
      x.fillStyle = col.on; x.font = '700 32px ' + EN; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(i + 1), P + 30, cy + 1);

      x.textAlign = 'right';
      x.font = '700 46px ' + EN;
      var noTxt = 'No.' + s.no;
      var noW = x.measureText(noTxt).width;
      x.fillStyle = col.a;
      x.fillText(noTxt, W - P, cy + 2);
      x.font = '500 24px ' + SANS;
      var uTxt = fit(x, s.n || 'USB', 170);
      var uW = x.measureText(uTxt).width + 30;
      var uX = W - P - noW - 18 - uW;
      x.strokeStyle = hexRgba(col.a, 0.6); x.lineWidth = 1.5;
      rr(x, uX, cy - 20, uW, 40, 20); x.stroke();
      x.textAlign = 'center';
      x.fillText(uTxt, uX + uW / 2, cy + 1);

      // Key / L R 标签（实心，比较醒目）
      var tags = [];
      if (s.ch) tags.push(s.ch);
      if (s.key) tags.push('Key ' + keyLabel(s.key));
      var edge = uX - 12;
      x.font = '700 26px ' + SANS;
      tags.forEach(function (tg) {
        var tw = x.measureText(tg).width + 26;
        edge -= tw;
        x.fillStyle = col.a;
        rr(x, edge, cy - 21, tw, 42, 21); x.fill();
        x.fillStyle = col.on;
        x.fillText(tg, edge + tw / 2, cy + 1);
        edge -= 10;
      });

      x.textAlign = 'left';
      x.fillStyle = col.text;
      x.font = '600 42px ' + SERIF;
      x.fillText(fit(x, s.t, edge - 14 - (P + 84)), P + 84, cy + 2);
    });

    cv.toBlob(function (blob) {
      if (job !== imgJob || !blob) return;
      imgBlob = blob;
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      imgUrl = URL.createObjectURL(blob);
      var img = $('slImg');
      img.src = imgUrl;
      img.classList.remove('hidden');
      $('imgSpin').classList.add('hidden');
      $('shareImg').disabled = $('saveImg').disabled = false;
    }, 'image/png');
  }

  function download() {
    if (!imgUrl) return;
    var a = document.createElement('a');
    a.href = imgUrl;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  $('saveImg').addEventListener('click', function () { download(); C.toast('✓ 图片已下载'); });
  $('shareImg').addEventListener('click', async function () {
    if (!imgBlob) return;
    var file = new File([imgBlob], fileName(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); }
      catch (e) { if (e.name !== 'AbortError') C.toast('分享失败：' + e.message); }
    } else {
      download();
      C.toast('这个浏览器不能直接分享图片，已帮你下载，可以在 WhatsApp 手动发送', 4500);
    }
  });
  $('copyText').addEventListener('click', function () {
    if (!current) return;
    var txt = buildText(current);
    var done = function () { C.toast('✓ 已复制歌单文字'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { C.toast('复制失败'); }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
    else fallback();
  });
  $('editList').addEventListener('click', function () {
    if (!current) return;
    sel = (current.songs || []).map(function (s) { return { k: songKey(s.u, s.no, s.t), u: s.u, n: s.n, no: s.no, t: s.t, key: Number(s.key) || 0, ch: s.ch || '' }; });
    editingId = current.id;
    $('slName').value = current.name || '';
    $('slDate').value = current.date || '';
    $('songQ').value = '';
    dirty = false;
    setStep(2);
  });
  $('delList').addEventListener('click', function () {
    if (!current || !confirm('确定要删除歌单「' + current.name + '」吗？')) return;
    C.setCol(pin).doc(current.id).delete()
      .then(function () { C.toast('已删除'); goHome(); })
      .catch(function (e) { C.toast('删除失败：' + e.message); });
  });
  window.addEventListener('cal:theme', function () { if (step === 3 && current) makeImage(current); });

  /* ---------------- USB 歌库 ---------------- */
  function parseSongs(text) {
    var out = [], next = 1;
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var m = /^(?:no\.?\s*)?(\d{1,4})\s*(?:[.、:：)）\-]\s*|\s+)(.+)$/i.exec(line);
      var no = m ? parseInt(m[1], 10) : next;
      var t = (m ? m[2] : line).trim().slice(0, 80);
      if (!t) return;
      out.push({ no: no, t: t });
      next = no + 1;
    });
    return out;
  }
  function songsText(songs) { return songs.map(function (s) { return s.no + '. ' + s.t; }).join('\n'); }

  function renderUsbList() {
    var ul = $('usbList');
    ul.innerHTML = '';
    if (!usbs.length) {
      var e = el('li', 'empty');
      e.appendChild(el('span', 'e-ico', '🎛️'));
      e.append('还没有 USB，点「新增 USB」开始');
      ul.appendChild(e);
      return;
    }
    usbs.forEach(function (u) {
      var li = el('li', 'usb-row');
      li.appendChild(el('span', 'u-ico', '♪'));
      var d = el('div');
      d.appendChild(el('b', null, u.name));
      var n = u.songs.length;
      d.appendChild(el('small', null, n ? n + ' 首 · No.' + u.songs[0].no + ' – No.' + u.songs[n - 1].no : '还没有歌曲'));
      var b = el('button', 'btn btn-sm', '编辑');
      b.type = 'button';
      b.addEventListener('click', function () { openUsbForm(u); });
      li.append(d, b);
      ul.appendChild(li);
    });
  }

  function openUsbSheet() {
    showUsbList();
    renderUsbList();
    C.openSheet(usbSheet);
  }
  function showUsbList() {
    editingUsb = null;
    $('usbSheetTitle').textContent = '🎛️ USB 歌库';
    $('usbListView').classList.remove('hidden');
    $('usbForm').classList.add('hidden');
  }
  function openUsbForm(u) {
    editingUsb = u;
    $('usbSheetTitle').textContent = u ? '编辑「' + u.name + '」' : '新增 USB';
    $('usbName').value = u ? u.name : 'USB' + (usbs.length + 1);
    $('usbSongs').value = u ? songsText(u.songs) : '';
    $('usbDel').classList.toggle('hidden', !u);
    $('usbListView').classList.add('hidden');
    $('usbForm').classList.remove('hidden');
    updateParse();
    if (!u) setTimeout(function () { $('usbSongs').focus(); }, 300);
  }
  function updateParse() {
    var songs = parseSongs($('usbSongs').value);
    var hint = $('usbParse');
    if (!songs.length) { hint.textContent = '还没有歌曲'; return; }
    var seen = {}, dups = [];
    songs.forEach(function (s) { if (seen[s.no] && dups.indexOf(s.no) < 0) dups.push(s.no); seen[s.no] = 1; });
    var nos = songs.map(function (s) { return s.no; });
    hint.textContent = '✓ 共 ' + songs.length + ' 首（No.' + Math.min.apply(null, nos) + ' – No.' + Math.max.apply(null, nos) + '）' +
      (dups.length ? '　⚠ 编号重复：' + dups.slice(0, 8).join('、') : '');
  }
  $('usbSongs').addEventListener('input', updateParse);
  $('addUsb').addEventListener('click', function () { openUsbForm(null); });
  $('usbCancel').addEventListener('click', showUsbList);
  $('usbForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('usbName').value.trim();
    if (!name) { $('usbName').focus(); C.toast('请填写 USB 名称'); return; }
    var songs = parseSongs($('usbSongs').value);
    if (songs.length > 3000) { C.toast('一个 USB 最多 3000 首'); return; }
    var btn = $('usbSave');
    btn.disabled = true;
    try {
      var data = { name: name, songs: songs, updatedAt: Date.now() };
      if (editingUsb) await C.usbCol(pin).doc(editingUsb.id).update(data);
      else { data.order = Date.now(); await C.usbCol(pin).add(data); }
      C.toast('✓ 已保存「' + name + '」' + songs.length + ' 首');
      showUsbList();
    } catch (ex) {
      C.toast('保存失败：' + ex.message);
    } finally {
      btn.disabled = false;
    }
  });
  $('usbDel').addEventListener('click', function () {
    var u = editingUsb;
    if (!u || !confirm('确定要删除「' + u.name + '」吗？\n（已经保存的歌单不会受影响）')) return;
    C.usbCol(pin).doc(u.id).delete()
      .then(function () { C.toast('已删除「' + u.name + '」'); showUsbList(); })
      .catch(function (ex) { C.toast('删除失败：' + ex.message); });
  });
})();
