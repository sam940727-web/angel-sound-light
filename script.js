/* Angel Sound & Light — Elegant Edition */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let lenis = null;

  /* ---------- basics (work without GSAP) ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menuBtn.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));

  // Smooth anchor scrolling
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 && $(id);
      if (!target) return;
      e.preventDefault();
      if (menu.classList.contains('is-open')) setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.8 });
      else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // Lightbox
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  const openLb = (item) => {
    const img = $('img', item);
    let src = img.currentSrc || img.src;
    src = src.replace(/w=\d+/, 'w=1800');
    lbImg.src = src;
    lbImg.alt = img.alt;
    lbCap.textContent = item.dataset.caption || '';
    lb.classList.add('is-open');
    if (lenis) lenis.stop();
  };
  const closeLb = () => {
    lb.classList.remove('is-open');
    if (lenis) lenis.start();
  };
  $$('.singer, .g-item').forEach((item) => item.addEventListener('click', () => openLb(item)));
  $('#lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lb.classList.contains('is-open')) closeLb();
    if (menu.classList.contains('is-open')) setMenu(false);
  });

  // Booking form -> WhatsApp (Sharon)
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => ($('#' + id).value || '').trim();
    const msg =
      '您好 Sharon，我想咨询/预约天使娱乐机构的服务：\n' +
      '姓名：' + v('fName') + '\n' +
      '电话：' + v('fPhone') + '\n' +
      '活动类型：' + v('fType') + '\n' +
      '活动日期：' + (v('fDate') || '待定') + '\n' +
      '详情：' + (v('fMsg') || '-');
    window.open('https://wa.me/60176336239?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ---------- reviews: live social-proof effects ---------- */
  (function reviewsFx() {
    const section = $('#reviews');
    if (!section) return;
    // Duplicate each column's cards for a seamless infinite loop
    $$('.r-track', section).forEach((t) => {
      Array.from(t.children).forEach((c) => {
        const clone = c.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        t.appendChild(clone);
      });
    });
    if (reduceMotion) return;

    const reactionsBox = $('#reactions');
    const likeEl = $('#likeCount');
    const toastZone = $('#toastZone');
    let likes = parseInt(likeEl.textContent.replace(/\D/g, ''), 10) || 0;
    const emojis = ['👍', '👍', '👍', '❤️', '❤️', '😍', '👏', '🥰'];
    const names = ['陈小姐', '林先生', '黄太太', '张先生', '李小姐', '吴先生', '王小姐', '刘先生', '郑小姐', '何先生',
      '杨小姐', '许先生', '蔡太太', '周小姐', '谢先生', '曾小姐', '罗先生', 'Jessie', 'Kelvin', 'Amy'];
    const actions = [
      { ico: '👍', cls: '', txt: '赞了 <b>天使娱乐机构</b>' },
      { ico: '❤️', cls: 'love', txt: '对你的贴文表达了 <b>大爱</b>' },
      { ico: '💬', cls: '', txt: '留言：<b>“服务一流，五星好评！”</b>' },
      { ico: '💬', cls: '', txt: '留言：<b>“音响效果超赞 👍”</b>' },
      { ico: '⭐', cls: '', txt: '推荐了 <b>天使娱乐机构</b>' },
    ];
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    function spawnReaction() {
      const el = document.createElement('span');
      el.className = 'reaction';
      el.textContent = pick(emojis);
      el.style.setProperty('--x', rand(5, 90) + '%');
      el.style.setProperty('--dx', rand(-50, 50) + 'px');
      el.style.setProperty('--s', rand(20, 38) + 'px');
      el.style.setProperty('--d', rand(3.2, 5) + 's');
      el.addEventListener('animationend', () => el.remove());
      reactionsBox.appendChild(el);
    }
    function bumpLikes() {
      likes += Math.ceil(Math.random() * 3);
      likeEl.textContent = likes.toLocaleString('en-US');
      likeEl.classList.remove('bump'); void likeEl.offsetWidth; likeEl.classList.add('bump');
      const cards = $$('.r-like', section);
      const c = pick(cards);
      const n = $('.r-n', c);
      n.textContent = (+n.textContent || 0) + 1;
      c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    }
    function showToast() {
      const a = pick(actions);
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = '<span class="t-ico ' + a.cls + '">' + a.ico + '</span><span><b>' + pick(names) + '</b> ' + a.txt + '<small>刚刚</small></span>';
      toastZone.appendChild(t);
      while (toastZone.children.length > 3) toastZone.firstElementChild.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 700); }, 3800);
    }

    let timers = [];
    const start = () => {
      if (timers.length) return;
      timers = [
        setInterval(spawnReaction, 420),
        setInterval(bumpLikes, 1600),
        setInterval(showToast, 2600),
      ];
      showToast();
    };
    const stop = () => { timers.forEach(clearInterval); timers = []; };
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting && !document.hidden ? start() : stop()));
    }, { threshold: 0.15 }).observe(section);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  })();

  /* ---------- no-animation fallback ---------- */
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    root.classList.remove('is-loading');
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- smooth scroll (Lenis) ---------- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------- helpers ---------- */
  // Split text into per-character spans, preserving inner elements like <em>
  function splitNode(el, wrap) {
    const chars = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          Array.from(child.textContent).forEach((ch) => {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
            const c = document.createElement('span');
            c.className = 'char';
            c.textContent = ch;
            chars.push(c);
            if (wrap) {
              const w = document.createElement('span');
              w.className = 'char-wrap';
              w.appendChild(c);
              frag.appendChild(w);
            } else {
              frag.appendChild(c);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return chars;
  }

  const heroChars = splitNode($('.hero-title'), true);
  const introChars = splitNode($('.intro-text'), false);
  const footerChars = splitNode($('.footer-big'), true);

  /* ---------- preloader + hero intro ---------- */
  const countEl = $('.loader-count');
  const counter = { v: 0 };
  const intro = gsap.timeline({
    onComplete: () => {
      root.classList.remove('is-loading');
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    },
  });
  intro
    .to(counter, {
      v: 100, duration: 1.6, ease: 'power2.inOut',
      onUpdate: () => { countEl.textContent = String(Math.round(counter.v)).padStart(2, '0'); },
    })
    .to('.loader-bar span', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
    .to('.loader-inner', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' })
    .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
    .from('.hero-media img', { scale: 1.25, duration: 2.2, ease: 'expo.out' }, '-=0.6')
    .from(heroChars, { yPercent: 110, duration: 1.3, stagger: 0.07, ease: 'expo.out' }, '<0.1')
    .from(['.hero-eyebrow', '.hero-bottom > *', '.scroll-cue'],
      { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out' }, '<0.3')
    .from(['.nav .brand', '.nav-links', '.menu-btn'],
      { y: -20, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' }, '<');

  /* ---------- global scroll: progress + nav ---------- */
  const nav = $('#nav');
  const progress = $('.scroll-progress');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(progress, { scaleX: self.progress });
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 60);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.8 && !menu.classList.contains('is-open'));
    },
  });

  /* ---------- hero parallax ---------- */
  gsap.to('.hero-media', {
    yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero-inner', {
    yPercent: -30, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* ---------- intro: text lights up as you scroll ---------- */
  gsap.fromTo(introChars, { opacity: 0.12 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '.intro-text', start: 'top 75%', end: 'bottom 45%', scrub: 1 },
  });
  gsap.from('.intro-label', {
    y: 20, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.intro', start: 'top 75%' },
  });

  /* ---------- services: pinned horizontal scroll ---------- */
  const mm = gsap.matchMedia();
  const services = $('.services');
  const track = $('.h-track', services);
  const panels = $$('.panel', track);

  mm.add('(min-width: 900px)', () => {
    const bar = $('.h-progress .bar span', services);
    const cur = $('.h-current', services);
    const dist = () => track.scrollWidth - window.innerWidth;

    const hTween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: services,
        pin: true,
        start: 'top top',
        end: () => '+=' + dist(),
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(bar, { scaleX: self.progress });
          const i = Math.round(self.progress * (panels.length - 1)) + 1;
          cur.textContent = String(i).padStart(2, '0');
        },
      },
    });

    panels.forEach((panel) => {
      const media = $('.panel-media', panel);
      const inner = $('.media-inner', panel);

      gsap.fromTo(inner, { xPercent: -6 }, {
        xPercent: 6, ease: 'none',
        scrollTrigger: { trigger: panel, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true },
      });

      // Panels already on screen at load use a vertical trigger (containerAnimation start would be clamped)
      const visibleAtStart = panel.offsetLeft < window.innerWidth * 0.9;
      const st = visibleAtStart
        ? { trigger: services, start: 'top 55%' }
        : { trigger: panel, containerAnimation: hTween, start: 'left 92%' };

      gsap.timeline({ scrollTrigger: st })
        .fromTo(media, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out' })
        .from(inner, { scale: 1.3, duration: 1.6, ease: 'expo.out' }, 0)
        .from($$('.panel-info > *', panel), { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.3);
    });

    // Columns of singers drift at different speeds
    const cols = $$('.singer-col');
    const shifts = [[0, -80], [100, -200], [0, -40]];
    cols.forEach((col, i) => {
      gsap.fromTo(col, { y: shifts[i][0] }, {
        y: shifts[i][1], ease: 'none',
        scrollTrigger: { trigger: '.singer-cols', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  });

  mm.add('(max-width: 899px)', () => {
    panels.forEach((panel) => {
      gsap.from(panel, {
        y: 60, opacity: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: panel, start: 'top 88%' },
      });
    });
  });

  /* ---------- line reveals ---------- */
  $$('.reveal-lines').forEach((el) => {
    gsap.from($$('.line > span', el), {
      yPercent: 110, rotate: 2, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  /* ---------- soft fades ---------- */
  $$('[data-fade]').forEach((el) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ---------- marquee driven by scroll ---------- */
  const mq = { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 0.6 };
  gsap.fromTo('.marquee-row.r1', { xPercent: 0 }, { xPercent: -35, ease: 'none', scrollTrigger: mq });
  gsap.fromTo('.marquee-row.r2', { xPercent: -35 }, { xPercent: 0, ease: 'none', scrollTrigger: { ...mq } });

  /* ---------- image curtain reveals (singers + gallery) ---------- */
  $$('.img-reveal').forEach((el) => {
    const inner = $('.media-inner', el);
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } })
      .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
      .fromTo(inner, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.15);
  });
  $$('.singer figcaption').forEach((cap) => {
    gsap.from(cap.children, {
      y: 20, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: cap, start: 'top 95%' },
    });
  });

  /* ---------- founder ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.founder', start: 'top 65%' } })
    .fromTo('.arch', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
    .from('.founder-img', { y: 120, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0.5)
    .from('.orbit', { opacity: 0, duration: 2, ease: 'power2.out' }, 0.3);
  gsap.to('.founder-visual', {
    yPercent: -8, ease: 'none',
    scrollTrigger: { trigger: '.founder', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.from('.sign-line', {
    scaleX: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.founder-sign', start: 'top 92%' },
  });
  gsap.from('.sign-name', {
    x: -20, opacity: 0, duration: 1.2, delay: 0.3, ease: 'power3.out',
    scrollTrigger: { trigger: '.founder-sign', start: 'top 92%' },
  });

  /* ---------- stats count-up ---------- */
  $$('.stat-num').forEach((el) => {
    const n = $('.n', el);
    const target = +el.dataset.target || 0;
    const obj = { v: 0 };
    n.textContent = '0';
    gsap.to(obj, {
      v: target, duration: 2.2, ease: 'power3.out',
      onUpdate: () => { n.textContent = Math.round(obj.v); },
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  gsap.from('.stat', {
    y: 50, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out',
    scrollTrigger: { trigger: '.stats', start: 'top 80%' },
  });

  /* ---------- reviews entrance ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.reviews', start: 'top 65%' } })
    .from('.stars i', { scale: 0, rotate: -90, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(2.5)' })
    .fromTo({ v: 0 }, { v: 0 }, { v: 5, duration: 1.4, ease: 'power2.out',
      onUpdate() { $('.rating-score').textContent = this.targets()[0].v.toFixed(1); } }, 0);
  gsap.from('.reviews-wall', {
    y: 100, opacity: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.reviews-wall', start: 'top 85%' },
  });
  gsap.fromTo('.r-col.up', { y: 40 }, {
    y: -40, ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.r-col.down', { y: -40 }, {
    y: 40, ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* ---------- footer big word ---------- */
  gsap.from(footerChars, {
    yPercent: 100, ease: 'none', stagger: 0.08,
    scrollTrigger: { trigger: '.footer-big', start: 'top 100%', end: 'bottom bottom', scrub: 1 },
  });

  /* ---------- custom cursor ---------- */
  if (finePointer) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor-dot');
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3.out' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    gsap.set([cursor, dot], { opacity: 0 });
    window.addEventListener('mousemove', (e) => {
      cx(e.clientX); cy(e.clientY); dx(e.clientX); dy(e.clientY);
      gsap.to([cursor, dot], { opacity: 1, duration: 0.3, overwrite: 'auto' });
    });
    document.addEventListener('mouseleave', () => gsap.to([cursor, dot], { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseover', (e) => {
      const view = e.target.closest('[data-cursor="view"]');
      const link = !view && e.target.closest('a, button, select, label');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !!link);
    });

    // Magnetic buttons
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * 0.35,
          y: (e.clientY - (r.top + r.height / 2)) * 0.35,
          duration: 0.6, ease: 'power3.out',
        });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  /* ---------- keep measurements fresh ---------- */
  ScrollTrigger.sort();
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
