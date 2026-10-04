/* ============================================================
   竞标系统共用函式（control.html / display.html 共用）
   ============================================================ */
window.BidCommon = (function () {
  // 图片改以 Base64 直接存在每样物品自己的文件里（items 子集合），
  // 避免整场宴会塞进单一文件超过 Firestore 1MB 大小限制，
  // 也不需要 Firebase Storage（不用绑信用卡 / 开 Blaze 付费方案）。
  function col() {
    return db.collection('events');
  }

  function itemsCol(pin) {
    return col().doc(pin).collection('items');
  }

  function getPinFromUrl() {
    var m = location.search.match(/[?&]pin=(\d{6})/);
    return m ? m[1] : '';
  }

  async function loadEvent(pin) {
    await window.authReady;
    var snap = await col().doc(pin).get();
    if (!snap.exists) return null;
    var data = snap.data();
    var itemsSnap = await itemsCol(pin).get();
    var items = {};
    itemsSnap.forEach(function (d) { items[d.id] = d.data(); });
    data.items = items;
    return data;
  }

  function subscribeEvent(pin, cb, onError) {
    var eventDoc = null;
    var items = {};
    var gotEvent = false;
    function emit() {
      if (!gotEvent) return;
      if (!eventDoc) { cb(null); return; }
      var merged = Object.assign({}, eventDoc, { items: items });
      cb(merged);
    }
    var unsubEvent = col().doc(pin).onSnapshot(
      function (snap) {
        gotEvent = true;
        eventDoc = snap.exists ? snap.data() : null;
        emit();
      },
      function (err) {
        console.error(err);
        if (onError) onError(err);
      }
    );
    var unsubItems = itemsCol(pin).onSnapshot(
      function (snap) {
        var next = {};
        snap.forEach(function (d) { next[d.id] = d.data(); });
        items = next;
        emit();
      },
      function (err) {
        console.error(err);
        if (onError) onError(err);
      }
    );
    return function () { unsubEvent(); unsubItems(); };
  }

  // data 可以混合「事件层级」字段（如 currentIndex）与
  // 「物品层级」字段（如 'items.0.currentPrice'），会自动拆分写到对的文件。
  function updateFields(pin, data) {
    var eventPatch = {};
    var itemPatches = {};
    Object.keys(data).forEach(function (k) {
      var m = k.match(/^items\.(\d+)\.(.+)$/);
      if (m) {
        var idx = m[1], field = m[2];
        if (!itemPatches[idx]) itemPatches[idx] = {};
        itemPatches[idx][field] = data[k];
      } else {
        eventPatch[k] = data[k];
      }
    });
    var ops = [];
    if (Object.keys(eventPatch).length) ops.push(col().doc(pin).update(eventPatch));
    Object.keys(itemPatches).forEach(function (idx) {
      ops.push(itemsCol(pin).doc(idx).update(itemPatches[idx]));
    });
    return Promise.all(ops);
  }

  // Wires up a row of 6 single-digit <input> boxes with auto-advance / backspace / paste support.
  // Calls onComplete(pinString) once all 6 digits are filled.
  function wirePinInputs(container, onComplete) {
    var inputs = Array.prototype.slice.call(container.querySelectorAll('input'));
    function currentValue() {
      return inputs.map(function (i) { return i.value; }).join('');
    }
    function check() {
      var v = currentValue();
      if (v.length === 6 && /^\d{6}$/.test(v)) onComplete(v);
    }
    inputs.forEach(function (inp, idx) {
      inp.addEventListener('input', function () {
        inp.value = inp.value.replace(/\D/g, '').slice(-1);
        if (inp.value && inputs[idx + 1]) inputs[idx + 1].focus();
        check();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && inputs[idx - 1]) {
          inputs[idx - 1].focus();
        }
      });
      inp.addEventListener('paste', function (e) {
        var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!text) return;
        e.preventDefault();
        text.slice(0, 6).split('').forEach(function (ch, i) {
          if (inputs[i]) inputs[i].value = ch;
        });
        var last = Math.min(text.length, 6) - 1;
        if (inputs[last]) inputs[last].focus();
        check();
      });
    });
    if (inputs[0]) inputs[0].focus();
  }

  function fmt(n) {
    return 'RM ' + Number(n || 0).toLocaleString('en-US');
  }

  function showToast(msg, ms) {
    var t = document.getElementById('toastMsg');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }

  return {
    getPinFromUrl: getPinFromUrl,
    loadEvent: loadEvent,
    subscribeEvent: subscribeEvent,
    updateFields: updateFields,
    wirePinInputs: wirePinInputs,
    fmt: fmt,
    showToast: showToast,
  };
})();
