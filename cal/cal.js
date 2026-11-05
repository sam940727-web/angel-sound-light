/* ============================================================
   歌手行程日历 — 歌手页面 (cal/index.html)
   ============================================================ */
(function () {
  'use strict';
  var C = window.Cal;
  var STORE_KEY = 'angelCalPin';

  var pin = null;
  var cal = null;
  var now = new Date();
  var view = { y: now.getFullYear(), m: now.getMonth() };
  var selected = C.today();
  var byDate = {};
  var monthCount = 0;
  var editingId = null;
  var unsubCal = null, unsubMonth = null, unsubUp = null;

  var $ = function (id) { return document.getElementById(id); };
  var gate = $('gate'), app = $('app');
  var recSheet = $('recSheet'), themeSheet = $('themeSheet');

  C.applyTheme(C.DEFAULT_THEME);
  C.renderLegend($('legend'));
  C.catChips($('fCats'), 'cat');
  C.wireSheet(recSheet);
  C.wireSheet(themeSheet);

  /* ---------------- 登录 ---------------- */
  var pinBox = C.wirePinInputs($('pinInputs'), function (p) { login(p, true); });

  async function login(p, remember, viaLink) {
    $('gateError').textContent = '';
    try {
      var data = await C.getCal(p);
      if (!data || data.movedTo) {
        gate.classList.remove('hidden');
        $('gateError').textContent = data ? '这个 PIN 已经更改，请用新的 PIN 登录。' : '找不到这个 PIN，请向管理员确认。';
        pinBox.shake();
        pinBox.clear();
        if (!remember) localStorage.removeItem(STORE_KEY);
        return;
      }
      pin = p;
      if (remember) localStorage.setItem(STORE_KEY, p);
      // 管理员用 ?pin= 打开时不要求设定
      if (data.needPin && !viaLink) { askNewPin(data); return; }
      start(data);
    } catch (e) {
      gate.classList.remove('hidden');
      $('gateError').textContent = '连线失败：' + e.message;
    }
  }

  /* ---------------- 第一次登录：设定自己的 PIN ---------------- */
  var spGate = $('setPinGate'), spFirst = null, spData = null, spBusy = false;
  var spBox = C.wirePinInputs($('newPinInputs'), onNewPin);
  function spStage(first) {
    spFirst = first;
    $('spTitle').textContent = first ? '再输入一次确认' : '设定你的 PIN';
    $('spSub').textContent = first ? '请再输入一次刚才的 6 位数 PIN' : '请设定一个你自己记得的 6 位数 PIN，以后用它登录';
    $('spBack').classList.toggle('hidden', !first);
    spBox.clear();
  }
  function askNewPin(data) {
    spData = data;
    C.applyTheme(data.theme);
    gate.classList.add('hidden');
    spGate.classList.remove('hidden');
    $('spError').textContent = '';
    spStage(null);
  }
  async function onNewPin(p) {
    if (spBusy) return;
    var err = $('spError');
    err.textContent = '';
    if (!spFirst) {
      if (/^(\d)\1{5}$/.test(p) || '0123456789'.indexOf(p) >= 0 || '9876543210'.indexOf(p) >= 0) {
        err.textContent = '这个 PIN 太容易被猜到，请换一个';
        spBox.shake(); spBox.clear();
        return;
      }
      spStage(p);
      return;
    }
    if (p !== spFirst) {
      err.textContent = '两次输入的 PIN 不一样，请重新设定';
      spBox.shake();
      spStage(null);
      return;
    }
    spBusy = true;
    $('spSub').textContent = '设定中，请稍候…';
    try {
      if (p === pin) {
        await C.calDoc(pin).update({ needPin: firebase.firestore.FieldValue.delete() });
        delete spData.needPin;
      } else {
        if (await C.getCal(p)) {
          err.textContent = '这个 PIN 已经有人使用，请换一个';
          spBox.shake();
          spStage(null);
          return;
        }
        spData = await C.movePin(pin, p, { patch: { needPin: undefined, pinSetAt: Date.now() }, marker: true });
        pin = p;
        localStorage.setItem(STORE_KEY, p);
      }
      spGate.classList.add('hidden');
      C.toast('✓ PIN 已设定为 ' + p + '，请记好', 4000);
      start(spData);
    } catch (e) {
      err.textContent = '设定失败：' + e.message;
      spStage(null);
    } finally {
      spBusy = false;
    }
  }
  $('spBack').addEventListener('click', function () { $('spError').textContent = ''; spStage(null); });
  $('spKeep').addEventListener('click', async function () {
    if (spBusy || !confirm('确定保留目前的 PIN 吗？之后可以请管理员帮你更改。')) return;
    spBusy = true;
    try {
      await C.calDoc(pin).update({ needPin: firebase.firestore.FieldValue.delete() });
      delete spData.needPin;
      spGate.classList.add('hidden');
      start(spData);
    } catch (e) {
      $('spError').textContent = '连线失败：' + e.message;
    } finally {
      spBusy = false;
    }
  });

  function start(data) {
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    onCal(data);
    window.calSession = { pin: pin, data: data };
    window.dispatchEvent(new CustomEvent('cal:login', { detail: window.calSession }));
    unsubCal = C.watchCal(pin, function (d) {
      if (!d || d.movedTo) {
        C.toast('这个 PIN 已失效（可能被管理员更改或删除），请向管理员确认');
        setTimeout(logout, 1500);
        return;
      }
      onCal(d);
    });
    unsubUp = C.watchUpcoming(pin, renderNext, onErr);
    var m = /^#(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
    if (m) selected = m[1];
    var d0 = C.parseYmd(selected);
    setMonth(d0.getFullYear(), d0.getMonth(), 0);
  }

  function onCal(d) {
    cal = d;
    window.calData = d;
    C.applyTheme(d.theme);
    var name = d.name || '歌手';
    $('userName').textContent = name;
    $('avatar').textContent = Array.from(name)[0] || 'A';
    document.title = name + ' 的行程 · Angel Sound & Light';
    document.querySelectorAll('#themeGrid .tp').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.theme === C.themeById(d.theme).id);
    });
  }

  function onErr(e) {
    console.error(e);
    C.toast('连线出现问题：' + (e && e.message ? e.message : '请检查网络'));
  }

  function logout() {
    localStorage.removeItem(STORE_KEY);
    [unsubCal, unsubMonth, unsubUp].forEach(function (u) { if (u) u(); });
    location.href = location.pathname;
  }

  /* ---------------- 月份 / 日历 ---------------- */
  function setMonth(y, m, dir) {
    var d = new Date(y, m, 1);
    view = { y: d.getFullYear(), m: d.getMonth() };
    $('mTitle').textContent = C.CN_MONTH[view.m];
    $('mYear').textContent = view.y;
    byDate = {};
    monthCount = 0;
    if (unsubMonth) unsubMonth();
    unsubMonth = C.watchMonth(pin, view.y, view.m, function (list) {
      byDate = C.groupByDate(list);
      monthCount = list.length;
      renderAll();
    }, onErr);
    renderAll();
    var days = $('days');
    days.classList.remove('anim-next', 'anim-prev');
    if (dir) {
      void days.offsetWidth;
      days.classList.add(dir > 0 ? 'anim-next' : 'anim-prev');
    }
  }

  function renderAll() {
    C.renderGrid($('days'), view.y, view.m, byDate, selected);
    $('monthStat').innerHTML = '';
    var b = document.createElement('b');
    b.textContent = monthCount;
    $('monthStat').append('本月 ', b, ' 个行程');
    renderDay();
  }

  function renderDay() {
    var d = C.parseYmd(selected);
    $('dayBig').textContent = d.getDate();
    $('dayTitle').textContent = C.dayTitle(selected);
    var recs = byDate[selected] || [];
    $('dayCount').textContent = recs.length ? recs.length + ' 个行程' : (selected === C.today() ? '今天' : C.relDays(selected));
    var list = $('recList');
    list.innerHTML = '';
    if (!recs.length) {
      var e = document.createElement('li');
      e.className = 'empty';
      e.innerHTML = '<span class="e-ico">🗓️</span>这天还没有行程<br>';
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn-sm';
      add.style.marginTop = '12px';
      add.textContent = '＋ 添加行程';
      add.addEventListener('click', function () { openRec(null); });
      e.appendChild(add);
      list.appendChild(e);
      return;
    }
    recs.forEach(function (r, i) {
      var li = C.recordEl(r, i);
      li.addEventListener('click', function () { openRec(r); });
      li.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') openRec(r); });
      list.appendChild(li);
    });
  }

  function select(s) {
    selected = s;
    var d = C.parseYmd(s);
    if (d.getFullYear() !== view.y || d.getMonth() !== view.m) {
      var dir = d > new Date(view.y, view.m, 1) ? 1 : -1;
      setMonth(d.getFullYear(), d.getMonth(), dir);
    } else {
      renderAll();
    }
  }

  $('days').addEventListener('click', function (e) {
    var b = e.target.closest('.day');
    if (b) select(b.dataset.date);
  });
  $('prevBtn').addEventListener('click', function () { setMonth(view.y, view.m - 1, -1); });
  $('nextBtn').addEventListener('click', function () { setMonth(view.y, view.m + 1, 1); });
  $('todayBtn').addEventListener('click', function () { select(C.today()); });
  C.wireSwipe($('days'), function () { setMonth(view.y, view.m - 1, -1); }, function () { setMonth(view.y, view.m + 1, 1); });

  /* ---------------- 下一场 ---------------- */
  var nextRec = null;
  function renderNext(list) {
    nextRec = C.nextUpcoming(list);
    var card = $('nextCard');
    card.classList.toggle('hidden', !nextRec);
    if (!nextRec) return;
    var d = C.parseYmd(nextRec.date);
    $('ncDay').textContent = d.getDate();
    $('ncMon').textContent = (d.getMonth() + 1) + '月';
    $('ncTitle').textContent = nextRec.title;
    $('ncMeta').textContent = [nextRec.start || '全天', nextRec.location].filter(Boolean).join(' · ');
    $('ncWhen').textContent = C.relDays(nextRec.date);
  }
  function goNext() { if (nextRec) select(nextRec.date); }
  $('nextCard').addEventListener('click', goNext);
  $('nextCard').addEventListener('keydown', function (e) { if (e.key === 'Enter') goNext(); });

  /* ---------------- 添加 / 编辑 ---------------- */
  function openRec(r) {
    editingId = r ? r.id : null;
    $('recSheetTitle').textContent = r ? '编辑行程' : '添加行程';
    $('fTitle').value = r ? r.title || '' : '';
    $('fDate').value = r ? r.date : selected;
    $('fStart').value = r ? r.start || '' : '';
    $('fEnd').value = r ? r.end || '' : '';
    $('fLoc').value = r ? r.location || '' : '';
    $('fNotes').value = r ? r.notes || '' : '';
    var cat = r ? C.catById(r.cat).id : C.CATS[0].id;
    document.querySelectorAll('#fCats input').forEach(function (i) { i.checked = i.value === cat; });
    $('delBtn').classList.toggle('hidden', !r);
    C.openSheet(recSheet);
    setTimeout(function () { if (!r) $('fTitle').focus(); }, 350);
  }
  $('addBtn').addEventListener('click', function () { openRec(null); });
  $('fab').addEventListener('click', function () { openRec(null); });

  $('recForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('fTitle').value.trim();
    var date = $('fDate').value;
    if (!title) { $('fTitle').focus(); C.toast('请填写标题'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $('fDate').focus(); C.toast('请选择日期'); return; }
    var catInput = document.querySelector('#fCats input:checked');
    var data = {
      title: title,
      date: date,
      start: $('fStart').value || '',
      end: $('fStart').value ? $('fEnd').value || '' : '',
      location: $('fLoc').value.trim(),
      notes: $('fNotes').value.trim(),
      cat: catInput ? catInput.value : 'other',
    };
    var btn = $('saveBtn');
    btn.disabled = true;
    C.saveRecord(pin, editingId, data)
      .then(function () {
        C.toast(editingId ? '✓ 已更新' : '✓ 已添加行程');
        C.closeSheet(recSheet);
        select(date);
      })
      .catch(function (err) { C.toast('保存失败：' + err.message); })
      .finally(function () { btn.disabled = false; });
  });

  $('delBtn').addEventListener('click', function () {
    if (!editingId || !confirm('确定要删除这个行程吗？')) return;
    C.deleteRecord(pin, editingId)
      .then(function () { C.toast('已删除'); C.closeSheet(recSheet); })
      .catch(function (err) { C.toast('删除失败：' + err.message); });
  });

  /* ---------------- 风格 ---------------- */
  C.THEMES.forEach(function (t) {
    var b = C.themePreview(t, false);
    b.addEventListener('click', function () {
      C.applyTheme(t.id);
      document.querySelectorAll('#themeGrid .tp').forEach(function (x) { x.classList.toggle('is-active', x === b); });
      C.calDoc(pin).update({ theme: t.id })
        .then(function () { C.toast('已换成「' + t.name + '」'); })
        .catch(function (err) { C.toast('更换失败：' + err.message); });
    });
    $('themeGrid').appendChild(b);
  });
  $('themeBtn').addEventListener('click', function () { C.openSheet(themeSheet); });
  $('logoutBtn').addEventListener('click', function () {
    if (confirm('确定要登出吗？')) logout();
  });

  /* ---------------- 启动 ---------------- */
  // 网址带 ?pin= 的（例如管理员打开）不记住；自己输入的会记住在这部手机
  var urlPin = new URLSearchParams(location.search).get('pin');
  var saved = localStorage.getItem(STORE_KEY);
  var viaLink = !!(urlPin && /^\d{6}$/.test(urlPin));
  var autoPin = viaLink ? urlPin : saved && /^\d{6}$/.test(saved) ? saved : null;
  if (autoPin) {
    gate.classList.add('hidden');
    login(autoPin, false, viaLink);
  }
})();
