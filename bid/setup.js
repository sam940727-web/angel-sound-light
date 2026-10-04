/* ============================================================
   建立新宴会竞标逻辑 (setup.html)
   ============================================================ */
(function () {
  'use strict';
  var BC = window.BidCommon;
  var pwGate = document.getElementById('pwGate');
  var pwForm = document.getElementById('pwForm');
  var pwError = document.getElementById('pwError');
  var app = document.getElementById('app');
  var itemsList = document.getElementById('itemsList');
  var pinDisplay = document.getElementById('pinDisplay');
  var currentPin = '';
  var itemSeq = 0;

  /* ---------- password gate ---------- */
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
    generatePin();
    if (!itemsList.children.length) {
      for (var i = 0; i < 3; i++) addItemBlock();
    }
  }

  /* ---------- PIN generation ---------- */
  function randomPin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  async function generatePin() {
    pinDisplay.textContent = '------';
    await window.authReady;
    var tries = 0;
    var p = randomPin();
    while (tries < 8) {
      var snap = await db.collection('events').doc(p).get();
      if (!snap.exists) break;
      p = randomPin();
      tries++;
    }
    currentPin = p;
    pinDisplay.textContent = p;
  }
  document.getElementById('reshufflePin').addEventListener('click', generatePin);

  /* ---------- item blocks ----------
     图片直接转成 Base64 字符串存进 Firestore（不用 Firebase Storage，
     不需要绑信用卡 / 开 Blaze 付费方案）。压缩到较小尺寸确保每样物品
     都远低于 Firestore 单一文件 1MB 的上限。 */
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var maxW = 1000;
        var scale = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = function () { reject(new Error('无法读取图片')); };
      img.src = url;
    });
  }

  function addItemBlock(data) {
    var id = 'it' + ++itemSeq;
    var wrap = document.createElement('div');
    wrap.className = 'item-block';
    wrap.dataset.id = id;
    wrap.innerHTML =
      '<div class="item-thumb" id="' + id + '-thumb">点击上传<br>照片</div>' +
      '<div class="item-fields">' +
      '<input type="text" placeholder="物品名称（例如：茅台酒一瓶）" class="f-name" value="' + (data && data.name ? data.name : '') + '">' +
      '<input type="number" placeholder="起标价 RM" min="0" step="1" class="f-price" value="' + (data && data.startPrice ? data.startPrice : '') + '">' +
      '<input type="file" accept="image/*" class="f-file" style="display:none">' +
      '</div>' +
      '<button type="button" class="item-remove" title="移除此物品">✕</button>';
    itemsList.appendChild(wrap);

    var thumb = wrap.querySelector('.item-thumb');
    var fileInput = wrap.querySelector('.f-file');
    thumb.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        thumb.style.backgroundImage = "url('" + reader.result + "')";
        thumb.textContent = '';
      };
      reader.readAsDataURL(f);
    });
    wrap.querySelector('.item-remove').addEventListener('click', function () {
      if (itemsList.children.length <= 1) {
        BC.showToast('至少需要保留一样物品');
        return;
      }
      wrap.remove();
    });
  }
  document.getElementById('addItemBtn').addEventListener('click', function () { addItemBlock(); });

  /* ---------- submit ---------- */
  document.getElementById('submitBtn').addEventListener('click', async function () {
    var errEl = document.getElementById('submitError');
    errEl.textContent = '';
    var name = document.getElementById('eventName').value.trim();
    if (!name) { errEl.textContent = '请输入宴会名称。'; return; }

    var blocks = Array.prototype.slice.call(itemsList.children);
    var itemsRaw = [];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var fname = b.querySelector('.f-name').value.trim();
      var fprice = +b.querySelector('.f-price').value;
      var file = b.querySelector('.f-file').files[0];
      if (!fname || !fprice || fprice <= 0 || !file) {
        errEl.textContent = '第 ' + (i + 1) + ' 样物品请填妥：照片、名称、起标价（大于 0）。';
        return;
      }
      itemsRaw.push({ name: fname, startPrice: Math.round(fprice), file: file });
    }

    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '创建中…请稍候';
    var progressWrap = document.getElementById('progressWrap');
    var progressBar = document.getElementById('progressBar');
    progressWrap.style.display = 'block';

    try {
      await window.authReady;
      var pin = currentPin;
      var eventRef = db.collection('events').doc(pin);

      await eventRef.set({
        name: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        currentIndex: 0,
      });

      for (var idx = 0; idx < itemsRaw.length; idx++) {
        var it = itemsRaw[idx];
        var dataUrl = await resizeImage(it.file);
        await eventRef.collection('items').doc(String(idx)).set({
          name: it.name,
          startPrice: it.startPrice,
          currentPrice: it.startPrice,
          imageUrl: dataUrl,
          status: 'pending',
          soldPrice: null,
        });
        progressBar.style.width = Math.round(((idx + 1) / itemsRaw.length) * 100) + '%';
      }

      document.getElementById('successPin').textContent = pin;
      document.getElementById('openControlLink').href = 'control.html?pin=' + pin;
      document.getElementById('openDisplayLink').href = 'display.html?pin=' + pin;
      document.getElementById('formScreen').style.display = 'none';
      document.getElementById('successScreen').classList.add('show');
    } catch (e) {
      console.error(e);
      errEl.textContent = '创建失败：' + e.message;
      btn.disabled = false;
      btn.textContent = '创建宴会竞标';
      progressWrap.style.display = 'none';
    }
  });

  document.getElementById('createAnotherBtn').addEventListener('click', function () {
    document.getElementById('eventName').value = '';
    itemsList.innerHTML = '';
    for (var i = 0; i < 3; i++) addItemBlock();
    generatePin();
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').textContent = '创建宴会竞标';
    document.getElementById('progressWrap').style.display = 'none';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('successScreen').classList.remove('show');
    document.getElementById('formScreen').style.display = 'block';
  });
})();
