/* ============================================================
   竞标控制台逻辑 (control.html)
   ============================================================ */
(function () {
  'use strict';
  var BC = window.BidCommon;
  var pin = BC.getPinFromUrl();
  var eventData = null;
  var unsubscribe = null;

  var pinGate = document.getElementById('pinGate');
  var pinError = document.getElementById('pinError');
  var app = document.getElementById('app');

  function itemCount() {
    return eventData && eventData.items ? Object.keys(eventData.items).length : 0;
  }

  function render() {
    if (!eventData) return;
    var idx = eventData.currentIndex || 0;
    var n = itemCount();
    var item = eventData.items[String(idx)] || {};

    document.getElementById('eventName').textContent = eventData.name || '竞标宴会';
    document.getElementById('pinTag').textContent = 'PIN ' + pin;
    document.getElementById('progressTxt').textContent = '第 ' + (idx + 1) + ' / ' + n + ' 样';
    document.getElementById('itemName').textContent = item.name || '—';
    document.getElementById('itemStart').textContent = '起标价 ' + BC.fmt(item.startPrice);
    document.getElementById('curPrice').textContent = BC.fmt(item.currentPrice);
    document.getElementById('itemPhoto').style.backgroundImage = item.imageUrl ? "url('" + item.imageUrl + "')" : 'none';

    var isSold = item.status === 'sold';
    document.getElementById('itemPhoto').classList.toggle('is-sold', isSold);
    var soldBadge = document.getElementById('soldBadge');
    soldBadge.classList.toggle('hidden', !isSold);
    if (isSold) document.getElementById('soldPriceTxt').textContent = BC.fmt(item.soldPrice);

    var priceInput = document.getElementById('priceInput');
    if (document.activeElement !== priceInput) priceInput.value = item.currentPrice || 0;

    document.getElementById('priceForm').querySelector('button').disabled = isSold;
    priceInput.disabled = isSold;
    document.getElementById('soldBtn').classList.toggle('hidden', isSold);
    document.getElementById('undoRow').classList.toggle('hidden', !isSold);

    document.getElementById('prevBtn').disabled = idx <= 0;
    document.getElementById('nextBtn').disabled = idx >= n - 1;

    var dots = document.getElementById('dots');
    dots.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var d = document.createElement('button');
      d.className = 'dot' + (i === idx ? ' is-current' : '') + (eventData.items[String(i)].status === 'sold' ? ' is-sold' : '');
      d.type = 'button';
      d.setAttribute('aria-label', '第 ' + (i + 1) + ' 样');
      d.dataset.idx = i;
      d.addEventListener('click', function () { goTo(+this.dataset.idx); });
      dots.appendChild(d);
    }

    document.getElementById('displayLink').href = 'display.html?pin=' + pin;
  }

  function goTo(idx) {
    var n = itemCount();
    if (idx < 0 || idx >= n) return;
    BC.updateFields(pin, { currentIndex: idx }).catch(function (e) {
      BC.showToast('切换失败：' + e.message);
    });
  }

  function startApp() {
    pinGate.classList.add('hidden');
    app.classList.remove('hidden');
    if (unsubscribe) unsubscribe();
    unsubscribe = BC.subscribeEvent(
      pin,
      function (data) {
        if (!data) {
          BC.showToast('找不到此宴会数据');
          return;
        }
        eventData = data;
        render();
      },
      function () { BC.showToast('连线出现问题，请检查网络'); }
    );
  }

  async function tryPin(p) {
    pinError.textContent = '';
    try {
      var data = await BC.loadEvent(p);
      if (!data) {
        pinError.textContent = '找不到此宴会，请检查 PIN 码是否正确。';
        return;
      }
      pin = p;
      var url = new URL(location.href);
      url.searchParams.set('pin', p);
      history.replaceState(null, '', url);
      startApp();
    } catch (e) {
      pinError.textContent = '连线失败：' + e.message;
    }
  }

  document.getElementById('priceForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var idx = eventData.currentIndex || 0;
    var val = Math.max(0, Math.round(+document.getElementById('priceInput').value || 0));
    var field = {};
    field['items.' + idx + '.currentPrice'] = val;
    BC.updateFields(pin, field)
      .then(function () { BC.showToast('价格已更新为 ' + BC.fmt(val)); })
      .catch(function (e2) { BC.showToast('更新失败：' + e2.message); });
  });

  document.getElementById('soldBtn').addEventListener('click', function () {
    var idx = eventData.currentIndex || 0;
    var item = eventData.items[String(idx)];
    if (!confirm('确定要以 ' + BC.fmt(item.currentPrice) + ' 成交「' + item.name + '」吗？\n成交后价格将会锁定。')) return;
    var field = {};
    field['items.' + idx + '.status'] = 'sold';
    field['items.' + idx + '.soldPrice'] = item.currentPrice;
    BC.updateFields(pin, field)
      .then(function () { BC.showToast('✓ 已成交'); })
      .catch(function (e) { BC.showToast('操作失败：' + e.message); });
  });

  document.getElementById('undoBtn').addEventListener('click', function () {
    var idx = eventData.currentIndex || 0;
    if (!confirm('确定要撤销成交，重新开标吗？')) return;
    var field = {};
    field['items.' + idx + '.status'] = 'pending';
    field['items.' + idx + '.soldPrice'] = null;
    BC.updateFields(pin, field).catch(function (e) { BC.showToast('操作失败：' + e.message); });
  });

  document.getElementById('prevBtn').addEventListener('click', function () { goTo((eventData.currentIndex || 0) - 1); });
  document.getElementById('nextBtn').addEventListener('click', function () { goTo((eventData.currentIndex || 0) + 1); });

  BC.wirePinInputs(document.getElementById('pinInputs'), tryPin);

  if (pin) {
    BC.loadEvent(pin).then(function (data) {
      if (data) startApp();
      else pinError.textContent = '找不到此宴会，请检查 PIN 码是否正确。';
    });
  }
})();
