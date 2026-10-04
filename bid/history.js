/* ============================================================
   历史宴会记录逻辑 (history.html)
   ============================================================ */
(function () {
  'use strict';
  var BC = window.BidCommon;
  var pwGate = document.getElementById('pwGate');
  var pwForm = document.getElementById('pwForm');
  var pwError = document.getElementById('pwError');
  var app = document.getElementById('app');
  var listWrap = document.getElementById('listWrap');
  var emptyMsg = document.getElementById('emptyMsg');
  var loadedItems = {};

  /* ---------- password gate (与 setup.html 共用同一组密码/登入状态) ---------- */
  if (sessionStorage.getItem('bidSetupOk') === '1') unlock();
  pwForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = document.getElementById('pwInput').value;
    if (v === window.SETUP_PASSWORD) {
      sessionStorage.setItem('bidSetupOk', '1');
      unlock();
    } else {
      pwError.textContent = '密码错误，请重试。';
    }
  });
  function unlock() {
    pwGate.classList.add('hidden');
    app.classList.remove('hidden');
    loadList();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDate(ts) {
    if (!ts || !ts.toDate) return '—';
    var d = ts.toDate();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  async function loadList() {
    listWrap.innerHTML = '<p class="loading-msg">载入中…</p>';
    emptyMsg.classList.add('hidden');
    try {
      await window.authReady;
      var snap = await db.collection('events').orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        listWrap.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
      }
      listWrap.innerHTML = '';
      snap.forEach(function (doc) {
        var data = doc.data();
        var pin = doc.id;
        var card = document.createElement('div');
        card.className = 'ev-card';
        card.innerHTML =
          '<div class="ev-head">' +
            '<div>' +
              '<div class="ev-name">' + escapeHtml(data.name || '（未命名宴会）') + '</div>' +
              '<div class="ev-meta">PIN ' + pin + ' · ' + fmtDate(data.createdAt) + '</div>' +
            '</div>' +
            '<div class="ev-actions">' +
              '<a class="btn btn-ghost btn-sm" href="control.html?pin=' + pin + '" target="_blank" rel="noopener">打开控制台</a>' +
              '<a class="btn btn-ghost btn-sm" href="display.html?pin=' + pin + '" target="_blank" rel="noopener">打开大屏幕</a>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-pin="' + pin + '">查看物品 ▾</button>' +
            '</div>' +
          '</div>' +
          '<div class="ev-items hidden" id="items-' + pin + '"></div>';
        listWrap.appendChild(card);
      });
      listWrap.addEventListener('click', onListClick);
    } catch (e) {
      listWrap.innerHTML = '<p class="loading-msg">载入失败：' + escapeHtml(e.message) + '</p>';
    }
  }

  async function onListClick(e) {
    var btn = e.target.closest('button[data-pin]');
    if (!btn) return;
    var pin = btn.dataset.pin;
    var box = document.getElementById('items-' + pin);
    var willShow = box.classList.contains('hidden');
    box.classList.toggle('hidden');
    btn.textContent = willShow ? '隐藏物品 ▴' : '查看物品 ▾';
    if (!willShow || loadedItems[pin]) return;
    loadedItems[pin] = true;
    box.innerHTML = '<p class="loading-msg" style="padding:16px 0">载入中…</p>';
    try {
      var itemsSnap = await db.collection('events').doc(pin).collection('items').get();
      var docs = itemsSnap.docs.slice().sort(function (a, b) { return (+a.id) - (+b.id); });
      if (!docs.length) {
        box.innerHTML = '<p class="loading-msg" style="padding:16px 0">没有物品记录。</p>';
        return;
      }
      var total = 0;
      var rows = '';
      docs.forEach(function (d) {
        var it = d.data();
        var sold = it.status === 'sold';
        if (sold) total += (it.soldPrice || 0);
        rows +=
          '<div class="item-row">' +
            '<span class="ir-name">' + escapeHtml(it.name) + '</span>' +
            '<span class="ir-start">起标 ' + BC.fmt(it.startPrice) + '</span>' +
            '<span class="ir-status ' + (sold ? 'is-sold' : 'is-pending') + '">' +
              (sold ? ('✓ 成交 ' + BC.fmt(it.soldPrice)) : '未成交') +
            '</span>' +
          '</div>';
      });
      box.innerHTML = rows + '<div class="ir-total">已成交总额：' + BC.fmt(total) + '</div>';
    } catch (err) {
      box.innerHTML = '<p class="loading-msg" style="padding:16px 0">载入失败：' + escapeHtml(err.message) + '</p>';
      loadedItems[pin] = false;
    }
  }
})();
