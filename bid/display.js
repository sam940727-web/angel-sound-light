/* ============================================================
   竞标大屏幕展示逻辑 (display.html)
   ============================================================ */
(function () {
  'use strict';
  var BC = window.BidCommon;
  var hasGsap = !!window.gsap;
  var pin = BC.getPinFromUrl();
  var eventData = null;
  var unsubscribe = null;
  var lastIndex = null;
  var lastPrice = null;
  var lastStatus = null;
  var priceObj = { v: 0 };

  var pinGate = document.getElementById('pinGate');
  var pinError = document.getElementById('pinError');
  var app = document.getElementById('app');
  var priceValueEl = document.getElementById('priceValue');

  function itemCount() {
    return eventData && eventData.items ? Object.keys(eventData.items).length : 0;
  }

  function setPriceDisplay(v) {
    priceValueEl.textContent = BC.fmt(Math.round(v)).replace('RM ', '');
  }

  function spawnParticles() {
    var box = document.getElementById('particles');
    var emojis = ['✦', '✧', '★', '🎉', '👏'];
    for (var i = 0; i < 26; i++) {
      (function () {
        var el = document.createElement('span');
        el.className = 'spark';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        var x = Math.random() * 100;
        el.style.left = x + '%';
        el.style.setProperty('--s', 16 + Math.random() * 26 + 'px');
        el.style.color = Math.random() > 0.5 ? '#e2cc9b' : '#c8a86b';
        box.appendChild(el);
        if (hasGsap) {
          gsap.to(el, {
            y: -(window.innerHeight * (0.5 + Math.random() * 0.5)),
            x: (Math.random() - 0.5) * 220,
            rotate: (Math.random() - 0.5) * 240,
            opacity: 1,
            duration: 0.01,
          });
          gsap.to(el, {
            opacity: 0,
            duration: 2.4 + Math.random(),
            delay: Math.random() * 0.6,
            ease: 'power1.out',
            onComplete: function () { el.remove(); },
          });
        } else {
          el.remove();
        }
      })();
    }
  }

  function render() {
    if (!eventData) return;
    var idx = eventData.currentIndex || 0;
    var n = itemCount();
    var item = eventData.items[String(idx)] || {};
    var isSold = item.status === 'sold';

    document.getElementById('eventName').textContent = eventData.name || '';
    document.getElementById('itemBadge').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    document.getElementById('itemName').textContent = item.name || '—';
    document.getElementById('itemStart').textContent = '起标价 ' + BC.fmt(item.startPrice);
    document.getElementById('photoFrame').style.backgroundImage = item.imageUrl ? "url('" + item.imageUrl + "')" : 'none';
    document.getElementById('liveBadge').classList.toggle('hidden', isSold);
    document.getElementById('soldOverlay').classList.toggle('show', isSold);
    document.getElementById('soldInfo').classList.toggle('show', isSold);
    if (isSold) document.getElementById('soldPriceTxt').textContent = BC.fmt(item.soldPrice);

    var priceChanged = lastPrice !== item.currentPrice;
    var indexChanged = lastIndex !== idx;
    var justSold = !lastStatus && isSold;

    if (indexChanged) {
      priceObj.v = item.currentPrice || 0;
      setPriceDisplay(priceObj.v);
      if (hasGsap) {
        gsap.fromTo('.photo-frame', { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' });
        gsap.fromTo(['.info-name', '.info-start', '.price-box'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' });
      }
    } else if (priceChanged && hasGsap) {
      gsap.to(priceObj, {
        v: item.currentPrice || 0, duration: 0.8, ease: 'power2.out',
        onUpdate: function () { setPriceDisplay(priceObj.v); },
      });
      gsap.fromTo('.price-value', { scale: 1.08 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    } else if (priceChanged) {
      priceObj.v = item.currentPrice || 0;
      setPriceDisplay(priceObj.v);
    }

    if (justSold) spawnParticles();

    lastIndex = idx;
    lastPrice = item.currentPrice;
    lastStatus = isSold;

    var dots = document.getElementById('dots');
    dots.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var d = document.createElement('span');
      d.className = 'dot' + (i === idx ? ' is-current' : '') + (eventData.items[String(i)].status === 'sold' ? ' is-sold' : '');
      dots.appendChild(d);
    }
  }

  function startApp() {
    pinGate.classList.add('hidden');
    app.classList.remove('hidden');
    if (unsubscribe) unsubscribe();
    unsubscribe = BC.subscribeEvent(pin, function (data) {
      if (!data) return;
      eventData = data;
      render();
    });
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

  BC.wirePinInputs(document.getElementById('pinInputs'), tryPin);

  if (pin) {
    BC.loadEvent(pin).then(function (data) {
      if (data) startApp();
      else pinError.textContent = '找不到此宴会，请检查 PIN 码是否正确。';
    });
  }
})();
