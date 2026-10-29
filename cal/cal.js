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

  async function login(p, remember) {
    $('gateError').textContent = '';
    try {
      var data = await C.getCal(p);
      if (!data) {
        gate.classList.remove('hidden');
        $('gateError').textContent = '找不到这个 PIN，请向管理员确认。';
        pinBox.shake();
        pinBox.clear();
        if (!remember) localStorage.removeItem(STORE_KEY);
        return;
      }
      pin = p;
      if (remember) localStorage.setItem(STORE_KEY, p);
      start(data);
    } catch (e) {
      gate.classList.remove('hidden');
      $('gateError').textContent = '连线失败：' + e.message;
    }
  }

  function start(data) {
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    onCal(data);
    unsubCal = C.watchCal(pin, function (d) {
      if (!d) {
        C.toast('这个日历已被管理员删除');
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
  var autoPin = urlPin && /^\d{6}$/.test(urlPin) ? urlPin : saved && /^\d{6}$/.test(saved) ? saved : null;
  if (autoPin) {
    gate.classList.add('hidden');
    login(autoPin, false);
  }
})();
