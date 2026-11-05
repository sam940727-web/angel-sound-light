/* ============================================================
   歌手行程日历 — 管理员页面 (cal/admin.html)
   ============================================================ */
(function () {
  'use strict';
  var C = window.Cal;
  var SESSION_KEY = 'angelCalAdmin';

  var adminKey = null;
  var users = {};
  var cals = {};
  var monthRecs = {};
  var calSubs = {}, monthSubs = {};
  var hidden = {};
  var now = new Date();
  var view = { y: now.getFullYear(), m: now.getMonth() };
  var selected = C.today();
  var editingPin = null;
  var confirmMode = false;
  var rafId = 0;

  var $ = function (id) { return document.getElementById(id); };
  var userSheet = $('userSheet');

  C.applyTheme('champagne');
  C.renderLegend($('legend'));
  C.wireSheet(userSheet);

  /* ---------------- 管理员密码 ---------------- */
  function hashPw(pw) { return C.sha256('angel-cal-admin:' + pw); }

  function setConfirmMode(on) {
    confirmMode = on;
    $('pwConfirmBox').classList.toggle('hidden', !on);
    $('pwBtn').textContent = on ? '建立管理员' : '进入';
    if (on) { $('pw2').value = ''; $('pw2').focus(); }
  }
  $('pw').addEventListener('input', function () { if (confirmMode) setConfirmMode(false); });

  $('pwForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var pw = $('pw').value;
    var err = $('gateError');
    err.textContent = '';
    if (pw.length < 6) { err.textContent = '密码至少要 6 个字'; return; }
    $('pwBtn').disabled = true;
    try {
      var key = await hashPw(pw);
      if (confirmMode) {
        if ($('pw2').value !== pw) { err.textContent = '两次输入的密码不一样'; return; }
        await C.adminDoc(key).set({ createdAt: Date.now(), users: {} });
        C.toast('✓ 管理员已建立，请记好你的密码');
        enter(key);
        return;
      }
      await window.authReady;
      var snap = await C.adminDoc(key).get();
      if (snap.exists) enter(key);
      else setConfirmMode(true);
    } catch (ex) {
      err.textContent = '连线失败：' + ex.message;
    } finally {
      $('pwBtn').disabled = false;
    }
  });

  function enter(key) {
    adminKey = key;
    sessionStorage.setItem(SESSION_KEY, key);
    $('gate').classList.add('hidden');
    $('app').classList.remove('hidden');
    setMonth(view.y, view.m, 0);
    window.authReady.then(function () {
      C.adminDoc(key).onSnapshot(function (s) {
        if (!s.exists) { logout(); return; }
        users = s.data().users || {};
        syncSubs();
        scheduleRender();
      }, onErr);
    });
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }
  $('logoutBtn').addEventListener('click', logout);

  function onErr(e) {
    console.error(e);
    C.toast('连线出现问题：' + (e && e.message ? e.message : '请检查网络'));
  }

  /* ---------------- 订阅每位歌手 ---------------- */
  function watchMonthFor(pin) {
    if (monthSubs[pin]) monthSubs[pin]();
    monthRecs[pin] = [];
    monthSubs[pin] = C.watchMonth(pin, view.y, view.m, function (list) {
      monthRecs[pin] = list;
      scheduleRender();
    }, onErr);
  }

  function syncSubs() {
    Object.keys(users).forEach(function (pin) {
      if (calSubs[pin]) return;
      calSubs[pin] = C.watchCal(pin, function (d) {
        if (d && d.movedTo) { adoptMove(pin, d.movedTo); return; }
        cals[pin] = d;
        scheduleRender();
      }, onErr);
      watchMonthFor(pin);
    });
    Object.keys(calSubs).forEach(function (pin) {
      if (users[pin]) return;
      calSubs[pin]();
      if (monthSubs[pin]) monthSubs[pin]();
      delete calSubs[pin]; delete monthSubs[pin]; delete cals[pin]; delete monthRecs[pin];
    });
  }

  // 歌手自己改了 PIN：旧 PIN 会留下 { movedTo }，这里把名单换成新 PIN 并清除记号
  var adopting = {};
  async function adoptMove(oldPin, newPin) {
    if (adopting[oldPin] || !users[oldPin]) return;
    adopting[oldPin] = true;
    try {
      var name = nameOf(oldPin);
      var u = {};
      u[newPin] = Object.assign({}, users[oldPin]);
      u[oldPin] = firebase.firestore.FieldValue.delete();
      await C.adminDoc(adminKey).set({ users: u }, { merge: true });
      await C.calDoc(oldPin).delete();
      C.toast('「' + name + '」已自己设定新 PIN：' + newPin, 4500);
    } catch (ex) {
      onErr(ex);
    } finally {
      delete adopting[oldPin];
    }
  }

  function scheduleRender() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () { renderUsers(); renderOverview(); });
  }

  function pinsSorted() {
    return Object.keys(users).sort(function (a, b) { return (users[a].createdAt || 0) - (users[b].createdAt || 0); });
  }
  function nameOf(pin) { return (cals[pin] && cals[pin].name) || (users[pin] && users[pin].name) || pin; }

  /* ---------------- 歌手列表 ---------------- */
  function renderUsers() {
    var grid = $('userGrid');
    grid.innerHTML = '';
    pinsSorted().forEach(function (pin, i) {
      var d = cals[pin] || {};
      var t = C.themeById(d.theme);
      var name = nameOf(pin);
      var card = document.createElement('div');
      card.className = 'card u-card cal-theme-' + t.id;
      card.style.setProperty('--i', i);

      var banner = document.createElement('div');
      banner.className = 'u-banner';
      var av = document.createElement('span');
      av.className = 'avatar';
      av.textContent = Array.from(name)[0] || '?';
      banner.appendChild(av);
      card.appendChild(banner);

      var body = document.createElement('div');
      body.className = 'u-body';
      var h = document.createElement('h3');
      h.textContent = name;
      body.appendChild(h);
      var meta = document.createElement('div');
      meta.className = 'u-meta';
      var pinSpan = document.createElement('span');
      var pb = document.createElement('b');
      pb.textContent = pin;
      pinSpan.append('PIN ', pb);
      var cnt = document.createElement('span');
      cnt.textContent = (view.m + 1) + '月：' + (monthRecs[pin] || []).length + ' 个行程';
      var th = document.createElement('span');
      th.textContent = '🎨 ' + t.name;
      meta.append(pinSpan, cnt, th);
      if (d.needPin) {
        var wait = document.createElement('span');
        wait.className = 'u-wait';
        wait.textContent = '⏳ 等待歌手设定 PIN';
        meta.appendChild(wait);
      }
      if (cals[pin] === null) {
        var miss = document.createElement('span');
        miss.style.color = '#e5484d';
        miss.textContent = '⚠ 日历资料不存在';
        meta.appendChild(miss);
      }
      body.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'u-actions';
      var open = document.createElement('a');
      open.className = 'btn btn-solid btn-sm';
      open.href = 'index.html?pin=' + pin;
      open.target = '_blank';
      open.rel = 'noopener';
      open.textContent = '打开日历';
      acts.appendChild(open);
      var songs = document.createElement('a');
      songs.className = 'btn btn-sm';
      songs.href = 'index.html?pin=' + pin + '#songs';
      songs.target = '_blank';
      songs.rel = 'noopener';
      songs.textContent = '歌单';
      acts.appendChild(songs);
      [['分享', function () { showShare(pin, name, false); }],
        ['编辑', function () { openUser(pin); }],
        ['删除', function () { removeUser(pin); }]].forEach(function (a, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-sm ' + (k === 2 ? 'btn-danger' : 'btn-ghost');
        b.textContent = a[0];
        b.addEventListener('click', a[1]);
        acts.appendChild(b);
      });
      body.appendChild(acts);
      card.appendChild(body);
      grid.appendChild(card);
    });

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'card u-add';
    add.innerHTML = '<span>＋</span>新增歌手';
    add.addEventListener('click', function () { openUser(null); });
    grid.appendChild(add);
    // 只有第一次显示时播放进场动画，之后资料更新不再闪动
    setTimeout(function () { grid.classList.add('settled'); }, 900);
  }

  /* ---------------- 新增 / 编辑 歌手 ---------------- */
  var uThemeId = C.DEFAULT_THEME;
  C.THEMES.forEach(function (t) {
    var b = C.themePreview(t, false);
    b.addEventListener('click', function () { pickTheme(t.id); });
    $('uThemes').appendChild(b);
  });
  function pickTheme(id) {
    uThemeId = id;
    document.querySelectorAll('#uThemes .tp').forEach(function (b) { b.classList.toggle('is-active', b.dataset.theme === id); });
  }

  function openUser(pin) {
    editingPin = pin;
    $('userFields').classList.remove('hidden');
    $('shareView').classList.add('hidden');
    $('userSheetTitle').textContent = pin ? '编辑歌手' : '新增歌手';
    $('uSave').textContent = pin ? '保存' : '建立';
    $('uName').value = pin ? nameOf(pin) : '';
    $('uPin').value = pin || C.genPin();
    $('uPinHint').classList.toggle('hidden', !pin);
    $('uSelfPin').checked = pin ? !!(cals[pin] && cals[pin].needPin) : true;
    pickTheme(pin && cals[pin] ? C.themeById(cals[pin].theme).id : C.DEFAULT_THEME);
    C.openSheet(userSheet);
    setTimeout(function () { $('uName').focus(); }, 350);
  }
  $('uPinShuffle').addEventListener('click', function () { $('uPin').value = C.genPin(); });
  $('uPin').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); });

  function usersPatch(pin, value) {
    var u = {};
    u[pin] = value;
    return C.adminDoc(adminKey).set({ users: u }, { merge: true });
  }

  $('userForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('uName').value.trim();
    if (!name) { $('uName').focus(); C.toast('请填写歌手名字'); return; }
    var pin = $('uPin').value;
    if (!/^\d{6}$/.test(pin)) { $('uPin').focus(); C.toast('PIN 必须是 6 位数字'); return; }
    var btn = $('uSave');
    var selfPin = $('uSelfPin').checked;
    btn.disabled = true;
    try {
      if (editingPin && pin === editingPin) {
        await C.calDoc(editingPin).update({ name: name, theme: uThemeId, needPin: selfPin ? true : firebase.firestore.FieldValue.delete() });
        await usersPatch(editingPin, { name: name });
        C.toast('✓ 已保存');
        C.closeSheet(userSheet);
        return;
      }
      if (await C.getCal(pin)) {
        $('uPin').focus();
        C.toast('PIN ' + pin + ' 已经被使用，请换一个');
        return;
      }
      if (editingPin) {
        if (!confirm('确定要把「' + name + '」的 PIN 从 ' + editingPin + ' 改成 ' + pin + ' 吗？\n\n行程和歌单会一起搬过去。旧 PIN 会马上失效，歌手需要用新 PIN 重新登录。')) return;
        btn.textContent = '搬移中…';
        await changePin(editingPin, pin, name, selfPin);
        showShare(pin, name, false, selfPin);
        $('userSheetTitle').textContent = '✓ PIN 已改成 ' + pin;
        return;
      }
      var t = Date.now();
      var data = { name: name, theme: uThemeId, createdAt: t };
      if (selfPin) data.needPin = true;
      await C.calDoc(pin).set(data);
      await usersPatch(pin, { name: name, createdAt: t });
      showShare(pin, name, true, selfPin);
    } catch (ex) {
      C.toast('保存失败：' + ex.message);
    } finally {
      btn.disabled = false;
      btn.textContent = editingPin ? '保存' : '建立';
    }
  });

  async function changePin(oldPin, newPin, name, selfPin) {
    adopting[oldPin] = true;
    try {
      await C.movePin(oldPin, newPin, {
        patch: { name: name, theme: uThemeId, needPin: selfPin ? true : undefined },
        beforeCleanup: function () {
          var u = {};
          u[newPin] = Object.assign({}, users[oldPin] || {}, { name: name });
          u[oldPin] = firebase.firestore.FieldValue.delete();
          return C.adminDoc(adminKey).set({ users: u }, { merge: true });
        },
      });
    } finally {
      delete adopting[oldPin];
    }
  }

  function shareText(pin, name, selfPin) {
    var link = new URL('index.html', location.href).href;
    return name + ' 你好！这是你的行程日历 📅\n' + link + '\n登录 PIN 码：' + pin +
      (selfPin ? '\n（第一次登录后，请设定你自己的 6 位数 PIN）' : '');
  }

  function showShare(pin, name, isNew, selfPin) {
    if (selfPin == null) selfPin = !!(cals[pin] && cals[pin].needPin);
    $('userFields').classList.add('hidden');
    $('shareView').classList.remove('hidden');
    $('userSheetTitle').textContent = isNew ? '✓ 已建立「' + name + '」' : '分享给「' + name + '」';
    $('shareName').textContent = name;
    $('sharePin').textContent = pin;
    $('shareLink').textContent = new URL('index.html', location.href).href;
    var txt = shareText(pin, name, selfPin);
    $('waBtn').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
    $('copyBtn').onclick = function () { copy(txt); };
    C.openSheet(userSheet);
  }

  function copy(txt) {
    var done = function () { C.toast('✓ 已复制，可以贴给歌手'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { C.toast('复制失败，请手动复制'); }
      ta.remove();
    }
  }

  async function removeUser(pin) {
    var name = nameOf(pin);
    if (!confirm('确定要删除「' + name + '」吗？\n这位歌手的所有行程和歌单都会一起删除，不能复原。')) return;
    try {
      var snaps = await Promise.all([C.recCol(pin).get(), C.usbCol(pin).get(), C.setCol(pin).get()]);
      await Promise.all(snaps.reduce(function (a, s) { return a.concat(s.docs); }, []).map(function (d) { return d.ref.delete(); }));
      await C.calDoc(pin).delete();
      await usersPatch(pin, firebase.firestore.FieldValue.delete());
      C.toast('已删除「' + name + '」');
    } catch (ex) {
      C.toast('删除失败：' + ex.message);
    }
  }

  /* ---------------- 总览日历 ---------------- */
  function setMonth(y, m, dir) {
    var d = new Date(y, m, 1);
    view = { y: d.getFullYear(), m: d.getMonth() };
    $('mTitle').textContent = C.CN_MONTH[view.m];
    $('mYear').textContent = view.y;
    Object.keys(users).forEach(watchMonthFor);
    renderUsers();
    renderOverview();
    var days = $('days');
    days.classList.remove('anim-next', 'anim-prev');
    if (dir) {
      void days.offsetWidth;
      days.classList.add(dir > 0 ? 'anim-next' : 'anim-prev');
    }
  }

  function combined() {
    var all = [];
    Object.keys(monthRecs).forEach(function (pin) {
      if (hidden[pin] || !users[pin]) return;
      monthRecs[pin].forEach(function (r) { all.push(Object.assign({ _pin: pin }, r)); });
    });
    return all;
  }

  function renderFilters() {
    var f = $('filters');
    f.innerHTML = '';
    pinsSorted().forEach(function (pin) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (hidden[pin] ? '' : ' on');
      b.textContent = nameOf(pin);
      b.setAttribute('aria-pressed', String(!hidden[pin]));
      b.addEventListener('click', function () { hidden[pin] = !hidden[pin]; renderOverview(); });
      f.appendChild(b);
    });
  }

  function renderOverview() {
    renderFilters();
    var all = combined();
    var byDate = C.groupByDate(all);
    C.renderGrid($('days'), view.y, view.m, byDate, selected);
    $('monthStat').innerHTML = '';
    var b = document.createElement('b');
    b.textContent = all.length;
    $('monthStat').append('本月共 ', b, ' 个行程');

    var d = C.parseYmd(selected);
    $('dayBig').textContent = d.getDate();
    $('dayTitle').textContent = C.dayTitle(selected);
    var recs = byDate[selected] || [];
    $('dayCount').textContent = recs.length ? recs.length + ' 个行程（点一下可打开该歌手的日历）' : '';
    var list = $('recList');
    list.innerHTML = '';
    if (!Object.keys(users).length) {
      list.innerHTML = '<li class="empty"><span class="e-ico">👤</span>还没有歌手，先到「歌手」新增吧</li>';
      return;
    }
    if (!recs.length) {
      list.innerHTML = '<li class="empty"><span class="e-ico">🗓️</span>这天没有任何歌手的行程</li>';
      return;
    }
    recs.forEach(function (r, i) {
      var li = C.recordEl(r, i, { who: nameOf(r._pin) });
      var open = function () { window.open('index.html?pin=' + r._pin + '#' + r.date, '_blank', 'noopener'); };
      li.addEventListener('click', open);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
      list.appendChild(li);
    });
  }

  function select(s) {
    selected = s;
    var d = C.parseYmd(s);
    if (d.getFullYear() !== view.y || d.getMonth() !== view.m) {
      setMonth(d.getFullYear(), d.getMonth(), d > new Date(view.y, view.m, 1) ? 1 : -1);
    } else renderOverview();
  }

  $('days').addEventListener('click', function (e) {
    var b = e.target.closest('.day');
    if (b) select(b.dataset.date);
  });
  $('prevBtn').addEventListener('click', function () { setMonth(view.y, view.m - 1, -1); });
  $('nextBtn').addEventListener('click', function () { setMonth(view.y, view.m + 1, 1); });
  $('todayBtn').addEventListener('click', function () { select(C.today()); });
  C.wireSwipe($('days'), function () { setMonth(view.y, view.m - 1, -1); }, function () { setMonth(view.y, view.m + 1, 1); });

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (x) {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-selected', String(x === b));
      });
      $('tabUsers').classList.toggle('hidden', b.dataset.tab !== 'users');
      $('tabOverview').classList.toggle('hidden', b.dataset.tab !== 'overview');
    });
  });

  /* ---------------- 启动 ---------------- */
  var savedKey = sessionStorage.getItem(SESSION_KEY);
  if (savedKey) {
    window.authReady.then(function () { return C.adminDoc(savedKey).get(); })
      .then(function (s) { if (s.exists) enter(savedKey); else sessionStorage.removeItem(SESSION_KEY); })
      .catch(function () { sessionStorage.removeItem(SESSION_KEY); });
  }
})();
